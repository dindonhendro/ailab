// InsForge Serverless Function: interpret
// Endpoint: POST /functions/v1/interpret
// Menggunakan InsForge AI — tidak perlu OpenRouter key terpisah.
// Mendukung InsForge AI (default), Gemini, atau Claude.
//
// Set env AI_MODEL ke:
//   google/gemini-2.0-flash       ← default
//   anthropic/claude-3.5-haiku    ← Claude cepat
//   anthropic/claude-3.5-sonnet   ← Claude terbaik

// deno-lint-ignore-file no-explicit-any
import { createClient } from 'npm:@insforge/sdk@latest'

// UUID v4 — tersedia di Deno std tanpa npm
function uuidv4(): string {
  return crypto.randomUUID()
}

interface LabResult {
  loinc_code: string
  parameter_name: string
  value: number
  unit: string
  reference_range_low?: number
  reference_range_high?: number
  reference_range_note?: string
  status?: string
}

interface RequestBody {
  patient_ihs_number: string
  patient_name?: string
  patient_gender?: 'male' | 'female'
  lab_results: LabResult[]
  practitioner_id?: string
  organization_id?: string
  submit_to_satusehat?: boolean
}

function buildFHIRObservation(patientIhs: string, result: LabResult) {
  return {
    resourceType: 'Observation',
    id: `obs-${uuidv4()}`,
    status: 'final',
    category: [
      {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/observation-category',
            code: 'laboratory',
            display: 'Laboratory',
          },
        ],
      },
    ],
    code: {
      coding: [{ system: 'http://loinc.org', code: result.loinc_code }],
      text: result.parameter_name,
    },
    subject: { reference: `Patient/${patientIhs}` },
    effectiveDateTime: new Date().toISOString(),
    valueQuantity: {
      value: result.value,
      unit: result.unit,
      system: 'http://unitsofmeasure.org',
    },
    referenceRange: [
      {
        low:  result.reference_range_low  !== undefined ? { value: result.reference_range_low,  unit: result.unit } : undefined,
        high: result.reference_range_high !== undefined ? { value: result.reference_range_high, unit: result.unit } : undefined,
        text: result.reference_range_note,
      },
    ],
    interpretation: result.status && result.status !== 'normal' && result.status !== 'unknown'
      ? [
          {
            coding: [
              {
                system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation',
                code: result.status === 'high' ? 'H' : result.status === 'low' ? 'L' : 'A',
                display: result.status === 'high' ? 'High' : result.status === 'low' ? 'Low' : 'Abnormal',
              },
            ],
          },
        ]
      : undefined,
  }
}

async function generateAIInterpretation(
  labResults: LabResult[],
  patientName: string,
  gender: string
): Promise<{ interpretation: string; conclusion: string }> {
  const model    = Deno.env.get('AI_MODEL')    ?? 'google/gemini-2.0-flash'
  const provider = Deno.env.get('AI_PROVIDER') ?? 'insforge'

  const labSummary = labResults
    .map((r) => {
      const ref = r.reference_range_note ?? (
        r.reference_range_low !== undefined && r.reference_range_high !== undefined
          ? `${r.reference_range_low}–${r.reference_range_high} ${r.unit}`
          : 'tidak tersedia'
      )
      return `- ${r.parameter_name} (LOINC ${r.loinc_code}): ${r.value} ${r.unit} [Rujukan: ${ref}] — Status: ${r.status ?? 'unknown'}`
    })
    .join('\n')

  const systemPrompt = `Anda adalah konsultan patologi klinik IACCLM. Berikan interpretasi laboratorium 
yang akurat, berbasis bukti, menggunakan bahasa Indonesia medis formal. 
Rujuk nilai normal populasi Indonesia. Jangan memberikan diagnosis final.`

  const userPrompt = `Berikan interpretasi klinis laboratorium LENGKAP untuk pasien berikut:

Nama Pasien: ${patientName ?? 'Tidak diketahui'}
Jenis Kelamin: ${gender === 'female' ? 'Perempuan' : 'Laki-laki'}

HASIL LABORATORIUM:
${labSummary}

Mohon berikan:
1. Interpretasi setiap parameter (sebutkan kode LOINC)
2. Korelasi antar parameter jika ada
3. Pola klinis yang teridentifikasi
4. Rekomendasi tindak lanjut (TANPA diagnosis final)
5. Sumber referensi yang digunakan

Format jawaban menggunakan Bahasa Indonesia medis yang formal.`

  const messages = [{ role: 'user' as const, content: userPrompt }]
  const conclusionMessages = (interp: string) => [
    { role: 'user' as const, content: `Buat ringkasan kesimpulan klinis dalam 2-3 kalimat dari interpretasi berikut. Bahasa Indonesia formal.\n\n${interp}` },
  ]

  let interpretation = ''
  let conclusion = ''

  if (provider === 'gemini' && Deno.env.get('GEMINI_API_KEY')) {
    // ── Gemini API langsung ───────────────────────────────────────
    const geminiModel = model.startsWith('google/') ? model.replace('google/', '') : 'gemini-2.0-flash'
    interpretation = await callOpenAICompatible(
      'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
      Deno.env.get('GEMINI_API_KEY')!,
      geminiModel, systemPrompt, messages, 3000
    )
    conclusion = await callOpenAICompatible(
      'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
      Deno.env.get('GEMINI_API_KEY')!,
      geminiModel, 'Anda adalah asisten ringkasan medis.', conclusionMessages(interpretation), 300
    )
  } else if (provider === 'anthropic' && Deno.env.get('ANTHROPIC_API_KEY')) {
    // ── Anthropic / Claude langsung ────────────────────────────────
    const claudeModel = model.startsWith('anthropic/') ? model.replace('anthropic/', '') : 'claude-3-5-haiku-20241022'
    interpretation = await callAnthropicDirect(Deno.env.get('ANTHROPIC_API_KEY')!, claudeModel, systemPrompt, messages, 3000)
    conclusion = await callAnthropicDirect(
      Deno.env.get('ANTHROPIC_API_KEY')!, claudeModel,
      'Anda adalah asisten ringkasan medis.', conclusionMessages(interpretation), 300
    )
  } else {
    // ── InsForge AI (default — tidak perlu key eksternal) ───────────
    const insforge = createClient({
      baseUrl: Deno.env.get('INSFORGE_URL') ?? '',
      anonKey: Deno.env.get('INSFORGE_ANON_KEY') ?? '',
    })
    const comp1 = await (insforge as any).ai.chat.completions.create({
      model, messages: [{ role: 'system', content: systemPrompt }, ...messages],
      temperature: 0.2, max_tokens: 3000,
    })
    interpretation = comp1?.choices?.[0]?.message?.content ?? 'Interpretasi tidak tersedia.'

    const comp2 = await (insforge as any).ai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: 'Anda adalah asisten ringkasan medis.' },
        ...conclusionMessages(interpretation),
      ],
      temperature: 0.2, max_tokens: 300,
    })
    conclusion = comp2?.choices?.[0]?.message?.content ?? ''
  }

  return { interpretation, conclusion }
}

// ─── Helper: generic OpenAI-compatible endpoint ────────────────────────────────
async function callOpenAICompatible(
  endpoint: string,
  apiKey: string,
  model: string,
  systemPrompt: string,
  messages: Array<{ role: string; content: string }>,
  maxTokens = 2048
): Promise<string> {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      temperature: 0.2, max_tokens: maxTokens,
    }),
  })
  const data = await res.json() as any
  return data?.choices?.[0]?.message?.content ?? 'Tidak ada respons.'
}

// ─── Helper: Anthropic Messages API ───────────────────────────────────────────
async function callAnthropicDirect(
  apiKey: string,
  model: string,
  systemPrompt: string,
  messages: Array<{ role: string; content: string }>,
  maxTokens = 2048
): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      system: systemPrompt,
      messages: messages.filter((m) => m.role !== 'system'),
      max_tokens: maxTokens,
    }),
  })
  const data = await res.json() as any
  return data?.content?.[0]?.text ?? 'Tidak ada respons dari Claude.'
}

async function submitToSatusehat(bundle: object): Promise<{ success: boolean; id?: string }> {
  const baseUrl   = Deno.env.get('SATUSEHAT_FHIR_URL')
  const clientId  = Deno.env.get('SATUSEHAT_CLIENT_ID')
  const clientSecret = Deno.env.get('SATUSEHAT_CLIENT_SECRET')

  if (!baseUrl || !clientId || !clientSecret) {
    return { success: false }
  }

  // Get OAuth2 token
  const tokenRes = await fetch('https://api-satusehat.kemkes.go.id/oauth2/v1/accesstoken?grant_type=client_credentials', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret }),
  })

  if (!tokenRes.ok) return { success: false }
  const { access_token } = await tokenRes.json() as { access_token: string }

  const res = await fetch(`${baseUrl}/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(bundle),
  })

  if (!res.ok) return { success: false }
  const data = await res.json() as { id?: string }
  return { success: true, id: data.id }
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  try {
    const body: RequestBody = await req.json()
    const {
      patient_ihs_number,
      patient_name,
      patient_gender = 'male',
      lab_results,
      practitioner_id,
      organization_id,
      submit_to_satusehat = false,
    } = body

    if (!patient_ihs_number || !lab_results?.length) {
      return new Response(
        JSON.stringify({ error: 'patient_ihs_number and lab_results are required' }),
        { status: 400 }
      )
    }

    // 1. Build FHIR Observation resources
    const observations = lab_results.map((r) => buildFHIRObservation(patient_ihs_number, r))

    // 2. Generate AI interpretation
    const { interpretation, conclusion } = await generateAIInterpretation(
      lab_results,
      patient_name ?? 'Pasien',
      patient_gender
    )

    // 3. Build DiagnosticReport
    const diagnosticReport = {
      resourceType: 'DiagnosticReport',
      id: `dr-${uuidv4()}`,
      status: 'final',
      code: {
        coding: [{ system: 'http://loinc.org', code: '11502-2', display: 'Laboratory report' }],
      },
      subject: { reference: `Patient/${patient_ihs_number}` },
      effectiveDateTime: new Date().toISOString(),
      issued: new Date().toISOString(),
      performer: organization_id ? [{ reference: `Organization/${organization_id}` }] : [],
      resultsInterpreter: practitioner_id ? [{ reference: `Practitioner/${practitioner_id}` }] : [],
      result: observations.map((o) => ({ reference: `Observation/${o.id}` })),
      conclusion,
    }

    // 4. Optional: submit FHIR Bundle to SATUSEHAT
    let submissionResult = null
    if (submit_to_satusehat) {
      const bundle = {
        resourceType: 'Bundle',
        type: 'transaction',
        entry: [
          ...observations.map((obs) => ({
            fullUrl: `urn:uuid:${obs.id}`,
            resource: obs,
            request: { method: 'POST', url: 'Observation' },
          })),
          {
            fullUrl: `urn:uuid:${diagnosticReport.id}`,
            resource: diagnosticReport,
            request: { method: 'POST', url: 'DiagnosticReport' },
          },
        ],
      }
      submissionResult = await submitToSatusehat(bundle)
    }

    return new Response(
      JSON.stringify({
        diagnostic_report: {
          ...diagnosticReport,
          satusehat_report_id: (submissionResult as { id?: string } | null)?.id,
          status: submissionResult ? 'submitted' : 'draft',
        },
        observations,
        interpretation,
        submission_result: submissionResult,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error'
    return new Response(JSON.stringify({ error: msg }), { status: 500 })
  }
}
