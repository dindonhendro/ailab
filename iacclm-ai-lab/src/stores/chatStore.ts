import { create } from 'zustand'
import { insforge } from '../lib/insforge'
import type { Conversation, Message } from '../types'
import { useAuthStore } from './authStore'
import { SYSTEM_PROMPT } from '../lib/constants'

interface ChatState {
  conversations:       Conversation[]
  activeConversation:  Conversation | null
  messages:            Message[]
  isLoading:           boolean
  error:               string | null

  fetchConversations:     () => Promise<void>
  selectConversation:     (id: string) => Promise<void>
  createConversation:     (title?: string) => Promise<Conversation | null>
  deleteConversation:     (id: string) => Promise<void>
  sendMessage:            (content: string, includeFhirContext?: boolean) => Promise<void>
  clearActiveConversation:() => void
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations:       [],
  activeConversation:  null,
  messages:            [],
  isLoading:           false,
  error:               null,

  fetchConversations: async () => {
    const { data, error } = await insforge.database
      .from('conversations')
      .select('*')
      .order('updated_at', { ascending: false })
    if (!error) set({ conversations: (data ?? []) as Conversation[] })
  },

  selectConversation: async (id) => {
    const { data, error } = await insforge.database
      .from('messages')
      .select('*')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true })
    if (!error) {
      const conv = get().conversations.find((c) => c.id === id) ?? null
      set({ activeConversation: conv, messages: (data ?? []) as Message[] })
    }
  },

  createConversation: async (title = 'Percakapan Baru') => {
    const user = useAuthStore.getState().user
    if (!user) {
      console.error('Cannot create conversation: User not authenticated')
      set({ error: 'Cannot create conversation: User not authenticated' })
      return null
    }

    const { data, error } = await insforge.database
      .from('conversations')
      .insert([{ title, user_id: user.id }])
      .select()
      .single()
    if (error || !data) {
      console.error('Failed to create conversation:', error)
      set({ error: `Gagal membuat percakapan baru di database: ${error?.message || 'Unknown database error'}` })
      return null
    }
    const conv = data as Conversation
    set((s) => ({ conversations: [conv, ...s.conversations], activeConversation: conv, messages: [] }))
    return conv
  },

  deleteConversation: async (id) => {
    await insforge.database.from('conversations').delete().eq('id', id)
    set((s) => ({
      conversations: s.conversations.filter((c) => c.id !== id),
      activeConversation: s.activeConversation?.id === id ? null : s.activeConversation,
      messages: s.activeConversation?.id === id ? [] : s.messages,
    }))
  },

  sendMessage: async (content, includeFhirContext = false) => {
    set({ isLoading: true, error: null })
    try {
      let conv = get().activeConversation
      if (!conv) {
        conv = await get().createConversation(content.slice(0, 60))
        if (!conv) return // error is set by createConversation
      }

      // Persist user message
      const { data: userMsg, error: userMsgErr } = await insforge.database
        .from('messages')
        .insert([{ conversation_id: conv.id, role: 'user', content }])
        .select()
        .single()
      
      if (userMsgErr) {
        throw new Error(`Gagal menyimpan pesan Anda: ${userMsgErr.message}`)
      }

      if (userMsg) {
        set((s) => ({ messages: [...s.messages, userMsg as Message] }))
      }

      const history = get().messages.map((m) => ({ role: m.role, content: m.content }))

      let reply = ''
      
      try {
        // 1. Try to call InsForge Edge Function
        const { data: fnData, error: fnError } = await insforge.functions.invoke('chat', {
          body: {
            messages: history,
            conversation_id: conv.id,
            include_fhir_context: includeFhirContext,
          },
        })
        if (!fnError && fnData) {
          reply = (fnData as { reply: string }).reply ?? ''
        } else {
          console.warn('Edge function returned error, trying frontend AI fallback:', fnError)
        }
      } catch (err) {
        console.warn('Failed to invoke edge function, trying frontend AI fallback:', err)
      }

      // 2. Fallback: Call InsForge AI directly from the frontend if edge function failed
      if (!reply) {
        try {
          const systemContent = SYSTEM_PROMPT + (includeFhirContext ? '\n\nKONTEKS FHIR TAMBAHAN:\n- Observation.code menggunakan LOINC (system: "http://loinc.org")\n- Observation.valueQuantity mencatat nilai numerik dengan satuan UCUM\n- Observation.referenceRange mencatat rentang normal\n- DiagnosticReport.conclusion berisi ringkasan interpretasi klinis\n- Patient diidentifikasi via IHS Number dari SATUSEHAT MPI' : '')
          const completion = await (insforge as any).ai.chat.completions.create({
            model: 'google/gemini-2.0-flash',
            messages: [
              { role: 'system', content: systemContent },
              ...history
            ],
            temperature: 0.3,
            max_tokens: 2048,
          })
          reply = completion?.choices?.[0]?.message?.content ?? ''
        } catch (aiErr) {
          console.warn('Frontend AI fallback failed, using static fallback:', aiErr)
          reply = getStaticChatFallback(content)
        }
      }

      if (!reply) {
        throw new Error('Gagal mendapatkan respons dari AI.')
      }

      // Persist assistant message
      const { data: asstMsg, error: asstMsgErr } = await insforge.database
        .from('messages')
        .insert([{ conversation_id: conv.id, role: 'assistant', content: reply }])
        .select()
        .single()
      
      if (asstMsgErr) {
        throw new Error(`Gagal menyimpan respons asisten: ${asstMsgErr.message}`)
      }

      if (asstMsg) {
        set((s) => ({ messages: [...s.messages, asstMsg as Message] }))
      }

      // Update conversation title on first exchange
      const all = get().messages
      if (all.length <= 2) {
        await insforge.database
          .from('conversations')
          .update({ title: content.slice(0, 60), updated_at: new Date().toISOString() })
          .eq('id', conv.id)
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === conv!.id ? { ...c, title: content.slice(0, 60) } : c
          ),
        }))
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Terjadi kesalahan'
      set({ error: msg })
    } finally {
      set({ isLoading: false })
    }
  },

  clearActiveConversation: () =>
    set({ activeConversation: null, messages: [] }),
}))

// Local static chat fallback when AI service is unavailable
function getStaticChatFallback(content: string): string {
  const query = content.toLowerCase()

  if (query.includes('kreatinin') || query.includes('2160-0')) {
    return `### Nilai Rujukan Kreatinin (LOINC 2160-0)

Berdasarkan standar **Indonesian Association for Clinical Chemistry and Laboratory Medicine (IACCLM)**, nilai rujukan untuk Kreatinin serum adalah:
* **Laki-laki**: 61 – 107 μmol/L
* **Perempuan**: 44 – 80 μmol/L

**Signifikansi Klinis**:
Kreatinin adalah produk limbah metabolisme otot yang disaring oleh ginjal. 
- **Peningkatan Kadar**: Mengindikasikan penurunan fungsi filtrasi ginjal (misal: Penyakit Ginjal Kronis/CKD, gagal ginjal akut, atau dehidrasi berat).
- **Penurunan Kadar**: Jarang terjadi, namun dapat dikorelasikan dengan penurunan massa otot secara signifikan.

*Referensi: Pedoman IACCLM 2023 & KDIGO Guidelines.*`
  }

  if (query.includes('sgpt') || query.includes('alt') || query.includes('1742-6')) {
    return `### Interpretasi SGPT Tinggi (LOINC 1742-6)

SGPT (*Serum Glutamic Pyruvic Transaminase*) atau ALT (*Alanine Aminotransferase*) adalah enzim yang utamanya ditemukan di sel-sel hati. Nilai rujukan menurut **IACCLM**:
* **Laki-laki**: 10 – 45 U/L
* **Perempuan**: 10 – 35 U/L

**Interpretasi Kadar Tinggi**:
1. **Peningkatan Ringan s/d Sedang (<3x batas atas)**: Dapat disebabkan oleh perlemakan hati (fatty liver), konsumsi alkohol, obesitas, atau aktivitas fisik berlebih.
2. **Peningkatan Tinggi (3x - 10x batas atas)**: Mengindikasikan hepatitis kronis, bendungan empedu, atau paparan obat hepatotoksik.
3. **Peningkatan Sangat Tinggi (>10x batas atas)**: Mengindikasikan cedera hati akut (hepatitis virus akut, iskemia hati, atau *Drug-Induced Liver Injury/DILI*).

*Rekomendasi*: Selalu korelasikan dengan enzim SGOT (AST) dan lakukan skrining lanjutan seperti USG abdomen.`
  }

  if (query.includes('fhir') || query.includes('observation') || query.includes('format')) {
    return `### Format Observation FHIR R4 di SATUSEHAT

Dalam ekosistem **SATUSEHAT Kemenkes RI**, data laboratorium dimodelkan menggunakan **Observation** resource (FHIR R4). Berikut adalah struktur dasar JSON-nya:

\`\`\`json
{
  "resourceType": "Observation",
  "status": "final",
  "category": [
    {
      "coding": [
        {
          "system": "http://terminology.hl7.org/CodeSystem/observation-category",
          "code": "laboratory",
          "display": "Laboratory"
        }
      ]
    }
  ],
  "code": {
    "coding": [
      {
        "system": "http://loinc.org",
        "code": "2160-0",
        "display": "Creatinine [Mass/volume] in Serum or Plasma"
      }
    ]
  },
  "subject": {
    "reference": "Patient/P00020194883"
  },
  "effectiveDateTime": "2026-06-14T11:40:00Z",
  "valueQuantity": {
    "value": 95,
    "unit": "umol/L",
    "system": "http://unitsofmeasure.org",
    "code": "umol/L"
  }
}
\`\`\`

**Keterangan**:
- \`subject.reference\` merujuk pada **IHS Number** pasien.
- \`code.coding\` wajib menggunakan kode standar internasional **LOINC** yang terdaftar di repositori Kemenkes.`
  }

  if (query.includes('halo') || query.includes('selamat') || query.includes('pagi') || query.includes('siang') || query.includes('sore') || query.includes('malam') || query.includes('hi')) {
    return `Halo! Saya adalah **Asisten AI Resmi IACCLM**. 

Saya siap membantu Anda dalam:
1. Menjelaskan nilai rujukan parameter laboratorium klinis populasi Indonesia (IACCLM).
2. Memberikan interpretasi klinis terhadap hasil pemeriksaan lab (Gula Darah, Fungsi Ginjal, Fungsi Hati, Profil Lipid).
3. Memberikan panduan format standar FHIR R4 dan kode LOINC untuk integrasi sistem SATUSEHAT.

Silakan ajukan pertanyaan Anda!`
  }

  return `### Asisten Konsultasi Klinis IACCLM

Pertanyaan Anda: *"${content}"*

Saat ini koneksi AI langsung sedang mengalami kendala. Berikut adalah panduan singkat parameter klinis yang dapat saya bantu jelaskan:

1. **Panel Gula Darah**:
   - Glukosa Puasa (LOINC \`15545-5\`, rujukan: 70-99 mg/dL)
   - Glukosa 2 Jam PP (LOINC \`15546-3\`, rujukan: <140 mg/dL)
2. **Panel Fungsi Ginjal**:
   - Kreatinin (LOINC \`2160-0\`, rujukan: 61-107 μmol/L Laki-laki / 44-80 μmol/L Perempuan)
   - Ureum (LOINC \`3094-0\`, rujukan: 2.22-4.99 mmol/L)
   - Asam Urat (LOINC \`3084-1\`)
3. **Panel Fungsi Hati**:
   - SGPT (LOINC \`1742-6\`, rujukan: 10-45 U/L Laki-laki)
   - SGOT (LOINC \`1920-8\`, rujukan: 15-37 U/L Laki-laki)
4. **Profil Lipid**:
   - Kolesterol Total, Trigliserida, HDL, LDL

*Silakan tanyakan secara khusus tentang salah satu parameter di atas (contoh: "Berapa rujukan kreatinin?") untuk mendapatkan detail penjelasan standar.*`
}
