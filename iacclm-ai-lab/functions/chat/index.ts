// InsForge Serverless Function: chat
// Endpoint: POST /functions/v1/chat
// Menggunakan InsForge AI — tidak perlu OpenRouter key terpisah.
// InsForge menyediakan akses ke Claude, Gemini, GPT, dll via platform.
//
// Pilihan model (set via env AI_MODEL):
//   google/gemini-2.0-flash       ← default, cepat & hemat
//   anthropic/claude-3.5-haiku    ← Claude cepat
//   anthropic/claude-3.5-sonnet   ← Claude terbaik
//   google/gemini-2.5-pro         ← Gemini terbaik

// deno-lint-ignore-file no-explicit-any
import { createClient } from 'npm:@insforge/sdk@latest'

const SYSTEM_PROMPT = `Anda adalah asisten AI resmi untuk Indonesian Association for Clinical Chemistry and Laboratory Medicine (IACCLM), terintegrasi dengan platform SATUSEHAT Kementerian Kesehatan RI.

PENGETAHUAN DOMAIN WAJIB:
- Data laboratorium dalam ekosistem SATUSEHAT menggunakan format FHIR R4 (Fast Healthcare Interoperability Resources)
- Setiap parameter dicatat sebagai Observation resource dengan LOINC coding
- DiagnosticReport mengelompokkan seluruh hasil lab dengan field "conclusion"

PANDUAN INTERPRETASI:
1. Gunakan Bahasa Indonesia medis yang formal dan terstandar
2. Selalu rujuk ke reference intervals populasi Indonesia berdasarkan data IACCLM
3. Sebutkan kode LOINC yang relevan (contoh: LOINC 2160-0 untuk kreatinin serum)
4. DILARANG memberikan diagnosis final — hanya berikan interpretasi klinis
5. Cantumkan sumber referensi (pedoman IACCLM, PERKENI, WHO, atau jurnal internasional)
6. Apabila nilai kritis terdeteksi, beri peringatan segera untuk tindak lanjut klinisi

Selalu bersikap profesional, berbasis bukti ilmiah, dan mendukung keputusan klinis tenaga kesehatan.`

const FHIR_CONTEXT = `

KONTEKS FHIR TAMBAHAN:
- Observation.code menggunakan LOINC (system: "http://loinc.org")
- Observation.valueQuantity mencatat nilai numerik dengan satuan UCUM
- Observation.referenceRange mencatat rentang normal
- DiagnosticReport.conclusion berisi ringkasan interpretasi klinis
- Patient diidentifikasi via IHS Number dari SATUSEHAT MPI`

interface RequestBody {
  messages: Array<{ role: string; content: string }>
  conversation_id?: string
  include_fhir_context?: boolean
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const body: RequestBody = await req.json()
    const { messages, include_fhir_context } = body

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'messages array is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const model    = Deno.env.get('AI_MODEL')    ?? 'google/gemini-2.0-flash'
    const provider = Deno.env.get('AI_PROVIDER') ?? 'insforge'
    const systemContent = SYSTEM_PROMPT + (include_fhir_context ? FHIR_CONTEXT : '')

    let reply = ''

    if (provider === 'gemini' && Deno.env.get('GEMINI_API_KEY')) {
      // ── Opsi B: Gemini API langsung (gratis di aistudio.google.com) ──────
      reply = await callGeminiDirect(Deno.env.get('GEMINI_API_KEY')!, model, systemContent, messages)
    } else if (provider === 'anthropic' && Deno.env.get('ANTHROPIC_API_KEY')) {
      // ── Opsi C: Claude / Anthropic API langsung ───────────────────────────
      reply = await callAnthropicDirect(Deno.env.get('ANTHROPIC_API_KEY')!, model, systemContent, messages)
    } else {
      // ── Opsi A: InsForge AI (default — tidak perlu key eksternal) ─────────
      const insforge = createClient({
        baseUrl: Deno.env.get('INSFORGE_URL') ?? '',
        anonKey:  Deno.env.get('INSFORGE_ANON_KEY') ?? '',
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const completion = await (insforge as any).ai.chat.completions.create({
        model,
        messages: [{ role: 'system', content: systemContent }, ...messages],
        temperature: 0.3,
        max_tokens: 2048,
      })
      reply = completion?.choices?.[0]?.message?.content ?? 'Maaf, tidak ada respons.'
    }

    return new Response(JSON.stringify({ reply }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error'
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

// ─── Helper: Gemini via OpenAI-compatible endpoint ─────────────────────────────
// Key gratis di: https://aistudio.google.com/app/apikey
async function callGeminiDirect(
  apiKey: string,
  model: string,
  systemPrompt: string,
  messages: Array<{ role: string; content: string }>
): Promise<string> {
  const geminiModel = model.startsWith('google/') ? model.replace('google/', '') : 'gemini-2.0-flash'
  const res = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: geminiModel,
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        temperature: 0.3,
        max_tokens: 2048,
      }),
    }
  )
  // deno-lint-ignore no-explicit-any
  const data = await res.json() as any
  return data?.choices?.[0]?.message?.content ?? 'Tidak ada respons dari Gemini.'
}

// ─── Helper: Claude via Anthropic Messages API ─────────────────────────────────
// Key dari: https://console.anthropic.com
async function callAnthropicDirect(
  apiKey: string,
  model: string,
  systemPrompt: string,
  messages: Array<{ role: string; content: string }>
): Promise<string> {
  const claudeModel = model.startsWith('anthropic/') ? model.replace('anthropic/', '') : 'claude-3-5-haiku-20241022'
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: claudeModel,
      system: systemPrompt,
      messages: messages.filter((m) => m.role !== 'system'),
      max_tokens: 2048,
    }),
  })
  // deno-lint-ignore no-explicit-any
  const data = await res.json() as any
  return data?.content?.[0]?.text ?? 'Tidak ada respons dari Claude.'
}
