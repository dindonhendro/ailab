// InsForge Serverless Function: fhir-patient
// Endpoint: POST /functions/v1/fhir-patient
// Looks up a patient from SATUSEHAT Master Patient Index (MPI)
// using IHS Number and returns normalized PatientData

interface RequestBody {
  ihs_number: string
}

interface PatientData {
  ihs_number: string
  name?: string
  birth_date?: string
  gender?: 'male' | 'female' | 'unknown'
  address?: string
  phone?: string
  fhir_resource?: Record<string, unknown>
}

async function getSatusehatToken(clientId: string, clientSecret: string): Promise<string | null> {
  const res = await fetch(
    'https://api-satusehat.kemkes.go.id/oauth2/v1/accesstoken?grant_type=client_credentials',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret }),
    }
  )
  if (!res.ok) return null
  const data = await res.json() as { access_token?: string }
  return data.access_token ?? null
}

function normalizeFHIRPatient(fhirResource: Record<string, unknown>, ihsNumber: string): PatientData {
  const names = fhirResource.name as Array<{ use?: string; text?: string; family?: string; given?: string[] }> | undefined
  const officialName = names?.find((n) => n.use === 'official') ?? names?.[0]
  const name =
    officialName?.text ??
    [officialName?.given?.join(' '), officialName?.family].filter(Boolean).join(' ') ??
    undefined

  const telecom = fhirResource.telecom as Array<{ system?: string; value?: string }> | undefined
  const phone = telecom?.find((t) => t.system === 'phone')?.value

  const addresses = fhirResource.address as Array<{ text?: string; city?: string; country?: string }> | undefined
  const address = addresses?.[0]?.text

  const genderRaw = fhirResource.gender as string | undefined
  const gender: 'male' | 'female' | 'unknown' =
    genderRaw === 'male' ? 'male' : genderRaw === 'female' ? 'female' : 'unknown'

  return {
    ihs_number: ihsNumber,
    name,
    birth_date: fhirResource.birthDate as string | undefined,
    gender,
    address,
    phone,
    fhir_resource: fhirResource,
  }
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  try {
    const body: RequestBody = await req.json()
    const { ihs_number } = body

    if (!ihs_number?.trim()) {
      return new Response(JSON.stringify({ error: 'ihs_number is required' }), { status: 400 })
    }

    const clientId     = Deno.env.get('SATUSEHAT_CLIENT_ID')
    const clientSecret = Deno.env.get('SATUSEHAT_CLIENT_SECRET')
    const fhirBaseUrl  = Deno.env.get('SATUSEHAT_FHIR_URL') ?? 'https://api-satusehat.kemkes.go.id/fhir-r4/v1'

    // If credentials not configured → return mock patient for development
    if (!clientId || !clientSecret) {
      const mockPatient: PatientData = {
        ihs_number: ihs_number.trim(),
        name: 'Pasien Demo (Konfigurasi SATUSEHAT belum aktif)',
        birth_date: '1985-03-15',
        gender: 'male',
        address: 'Jakarta Selatan, DKI Jakarta',
        phone: '+628123456789',
      }
      return new Response(JSON.stringify(mockPatient), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Get access token
    const token = await getSatusehatToken(clientId, clientSecret)
    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Gagal mendapatkan akses token SATUSEHAT' }),
        { status: 502 }
      )
    }

    // Query SATUSEHAT FHIR MPI
    const searchUrl = `${fhirBaseUrl}/Patient?identifier=https://fhir.kemkes.go.id/id/patient-ihs-number|${encodeURIComponent(ihs_number.trim())}`
    const fhirRes = await fetch(searchUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    })

    if (!fhirRes.ok) {
      return new Response(
        JSON.stringify({ error: `SATUSEHAT API error: ${fhirRes.status}` }),
        { status: fhirRes.status }
      )
    }

    const bundle = await fhirRes.json() as { entry?: Array<{ resource: Record<string, unknown> }>; total?: number }

    if (!bundle.entry?.length || bundle.total === 0) {
      return new Response(
        JSON.stringify({ error: 'Patient IHS number tidak ditemukan di SATUSEHAT' }),
        { status: 404 }
      )
    }

    const fhirResource = bundle.entry[0].resource
    const patient = normalizeFHIRPatient(fhirResource, ihs_number.trim())

    return new Response(JSON.stringify(patient), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error'
    return new Response(JSON.stringify({ error: msg }), { status: 500 })
  }
}
