import { insforge } from '../lib/insforge'
import type { LabSession, InterpretResponse, PatientData } from '../types'

// ─── Patient lookup via SATUSEHAT MPI ────────────────────────
export async function getPatientByIhs(
  ihsNumber: string
): Promise<{ data?: PatientData; error?: string }> {
  const trimmed = ihsNumber.trim()

  // 1. Predefined dummy patients for offline/development testing
  const dummyPatients: Record<string, PatientData> = {
    'P00020194883': {
      ihs_number: 'P00020194883',
      name: 'Budi Santoso',
      birth_date: '1968-08-24',
      gender: 'male',
      address: 'Jakarta Pusat, DKI Jakarta',
      phone: '+628121111111',
    },
    'P00010992348': {
      ihs_number: 'P00010992348',
      name: 'Siti Aminah',
      birth_date: '1959-11-12',
      gender: 'female',
      address: 'Surabaya, Jawa Timur',
      phone: '+628122222222',
    },
    'P00030588231': {
      ihs_number: 'P00030588231',
      name: 'Joko Prasetyo',
      birth_date: '1975-04-05',
      gender: 'male',
      address: 'Bandung, Jawa Barat',
      phone: '+628123333333',
    },
    'P00040293812': {
      ihs_number: 'P00040293812',
      name: 'Rian Hidayat',
      birth_date: '1988-12-02',
      gender: 'male',
      address: 'Medan, Sumatera Utara',
      phone: '+628124444444',
    },
    'P00050812934': {
      ihs_number: 'P00050812934',
      name: 'Ratna Sari',
      birth_date: '1980-05-18',
      gender: 'female',
      address: 'Semarang, Jawa Tengah',
      phone: '+628125555555',
    },
    'P00060932847': {
      ihs_number: 'P00060932847',
      name: 'Dewi Lestari',
      birth_date: '1993-09-30',
      gender: 'female',
      address: 'Yogyakarta, DIY',
      phone: '+628126666666',
    },
    'P00070154823': {
      ihs_number: 'P00070154823',
      name: 'Bambang Wijaya',
      birth_date: '1947-01-15',
      gender: 'male',
      address: 'Malang, Jawa Timur',
      phone: '+628127777777',
    },
    'P00080722349': {
      ihs_number: 'P00080722349',
      name: 'Hendra Wijaya',
      birth_date: '1982-07-22',
      gender: 'male',
      address: 'Makassar, Sulawesi Selatan',
      phone: '+628128888888',
    },
    'P00091014856': {
      ihs_number: 'P00091014856',
      name: 'Amanda Putri',
      birth_date: '1998-10-14',
      gender: 'female',
      address: 'Denpasar, Bali',
      phone: '+628129999999',
    },
    'P00100308293': {
      ihs_number: 'P00100308293',
      name: 'Ahmad Fauzi',
      birth_date: '1971-03-08',
      gender: 'male',
      address: 'Palembang, Sumatera Selatan',
      phone: '+628120000000',
    },
  }

  if (dummyPatients[trimmed]) {
    return { data: dummyPatients[trimmed] }
  }

  // 2. Query database `lab_sessions` table to see if this patient was previously saved
  try {
    const { data: dbData, error: dbError } = await insforge.database
      .from('lab_sessions')
      .select('patient_name, patient_gender, patient_data')
      .eq('patient_ihs_number', trimmed)
      .order('created_at', { ascending: false })
      .limit(1)

    if (!dbError && dbData && dbData.length > 0) {
      const record = dbData[0]
      const patientData: PatientData = (record.patient_data as PatientData) || {
        ihs_number: trimmed,
        name: record.patient_name || undefined,
        gender: record.patient_gender as any,
      }
      return { data: patientData }
    }
  } catch (e) {
    console.error('Error fetching patient from database:', e)
  }

  // 3. Fallback: call edge function
  const { data, error } = await insforge.functions.invoke('fhir-patient', {
    body: { ihs_number: ihsNumber },
  })
  if (error) return { error: error.message }
  return { data: data as PatientData }
}

// ─── Lab interpretation + FHIR resource generation ───────────
export async function interpretLabResults(
  session: LabSession,
  submitToSatusehat = false
): Promise<{ data?: InterpretResponse; error?: string }> {
  try {
    // 1. Try invoking the deployed edge function
    const { data, error } = await insforge.functions.invoke('interpret', {
      body: { ...session, submit_to_satusehat: submitToSatusehat },
    })
    if (!error && data) {
      return { data: data as InterpretResponse }
    }
    console.warn('Edge function returned error, falling back to frontend interpretation:', error)
  } catch (err) {
    console.warn('Failed to invoke edge function, falling back to frontend interpretation:', err)
  }

  // 2. Local/Frontend fallback (uses InsForge AI directly or static templates)
  try {
    const data = await generateFrontendInterpretation(session)
    return { data }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Unknown error'
    return { error: `Gagal menghasilkan interpretasi: ${errMsg}` }
  }
}

// Generate UUID v4 for frontend
const uuidv4 = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

// Generate interpretation locally in the client
async function generateFrontendInterpretation(
  session: LabSession
): Promise<InterpretResponse> {
  const patientName = session.patient_name ?? 'Pasien'
  const gender = session.patient_gender ?? 'male'

  const labSummary = session.lab_results
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

Nama Pasien: ${patientName}
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

  let interpretation = ''
  let conclusion = ''

  try {
    // Attempt to call InsForge AI directly from the frontend
    const comp1 = await (insforge as any).ai.chat.completions.create({
      model: 'google/gemini-2.0-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.2,
      max_tokens: 2000,
    })
    interpretation = comp1?.choices?.[0]?.message?.content ?? ''

    if (interpretation) {
      const comp2 = await (insforge as any).ai.chat.completions.create({
        model: 'google/gemini-2.0-flash',
        messages: [
          { role: 'system', content: 'Anda adalah asisten ringkasan medis.' },
          { role: 'user', content: `Buat ringkasan kesimpulan klinis dalam 2-3 kalimat dari interpretasi berikut. Bahasa Indonesia formal.\n\n${interpretation}` }
        ],
        temperature: 0.2,
        max_tokens: 300,
      })
      conclusion = comp2?.choices?.[0]?.message?.content ?? ''
    }
  } catch (err) {
    console.warn('Failed to call InsForge AI directly from frontend, using template fallback.', err)
  }

  // If AI call failed or returned empty, use static template-based fallback
  if (!interpretation) {
    const fallback = getStaticFallbackInterpretation(session)
    interpretation = fallback.interpretation
    conclusion = fallback.conclusion
  }

  // Build simulated FHIR Observations
  const observations: any[] = session.lab_results.map((r) => ({
    resourceType: 'Observation' as const,
    id: `obs-${uuidv4()}`,
    status: 'final' as const,
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
      coding: [{ system: 'http://loinc.org', code: r.loinc_code }],
      text: r.parameter_name,
    },
    subject: { reference: `Patient/${session.patient_ihs_number}` },
    effectiveDateTime: new Date().toISOString(),
    valueQuantity: {
      value: r.value,
      unit: r.unit,
      system: 'http://unitsofmeasure.org',
    },
    referenceRange: [
      {
        low: r.reference_range_low !== undefined ? { value: r.reference_range_low, unit: r.unit } : undefined,
        high: r.reference_range_high !== undefined ? { value: r.reference_range_high, unit: r.unit } : undefined,
        text: r.reference_range_note,
      },
    ],
    interpretation: r.status && r.status !== 'normal' && r.status !== 'unknown'
      ? [
          {
            coding: [
              {
                system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation',
                code: r.status === 'high' ? 'H' : r.status === 'low' ? 'L' : 'A',
                display: r.status === 'high' ? 'High' : r.status === 'low' ? 'Low' : 'Abnormal',
              },
            ],
          },
        ]
      : undefined,
  }))

  const diagnosticReport = {
    resourceType: 'DiagnosticReport' as const,
    id: `dr-${uuidv4()}`,
    status: 'draft' as const,
    code: {
      coding: [{ system: 'http://loinc.org', code: '11502-2', display: 'Laboratory report' }],
    },
    subject: { reference: `Patient/${session.patient_ihs_number}` },
    effectiveDateTime: new Date().toISOString(),
    issued: new Date().toISOString(),
    performer: [],
    result: observations.map((o) => ({ reference: `Observation/${o.id}` })),
    conclusion,
  }

  return {
    diagnostic_report: diagnosticReport as any,
    observations,
    interpretation,
  }
}

// Structured mock interpretation templates for the 10 dummy patients
function getStaticFallbackInterpretation(session: LabSession): { interpretation: string; conclusion: string } {
  const ihs = session.patient_ihs_number
  const name = session.patient_name ?? 'Pasien'

  if (ihs === 'P00020194883' || name.toLowerCase().includes('budi')) {
    return {
      interpretation: `INTERPRETASI KLINIS LABORATORIUM (MOCK AI)
Nama Pasien: Budi Santoso
Jenis Kelamin: Laki-laki
Skenario: Diabetes Melitus Tipe 2 (Hiperglikemia Berat)

1. Interpretasi Parameter:
- Glukosa Puasa (LOINC 15545-5): 185 mg/dL. Nilai ini menunjukkan peningkatan yang signifikan di atas rentang rujukan (70-99 mg/dL).
- Glukosa 2 Jam PP (LOINC 15546-3): 270 mg/dL. Nilai ini sangat tinggi dan jauh melebihi batas rujukan normal (<140 mg/dL).

2. Korelasi Parameter:
Terdapat korelasi kuat antara peningkatan Glukosa Puasa dan Glukosa 2 Jam PP, yang menunjukkan kegagalan regulasi glukosa darah tubuh secara menyeluruh.

3. Pola Klinis:
Pola ini sangat konsisten dengan Hiperglikemia berat yang mengarah pada diagnosis Diabetes Melitus yang belum terkontrol dengan baik.

4. Rekomendasi Tindak Lanjut:
- Segera lakukan pemeriksaan HbA1c untuk mengetahui rata-rata kontrol gula darah dalam 3 bulan terakhir.
- Konsultasi dengan Dokter Spesialis Penyakit Dalam atau Sp.PD-KEMD untuk terapi farmakologis.
- Konseling nutrisi medis dan pengaturan pola diet rendah karbohidrat.

5. Referensi:
Pedoman Pengelolaan dan Pencegahan Diabetes Melitus Tipe 2 Dewasa di Indonesia (PERKENI 2021).`,
      conclusion: `Pasien menunjukkan kondisi hiperglikemia berat dengan glukosa puasa 185 mg/dL dan glukosa 2 jam PP 270 mg/dL. Pola ini mengarah pada kondisi diabetes melitus tidak terkontrol. Direkomendasikan pemeriksaan HbA1c dan konsultasi klinis segera.`
    }
  }

  if (ihs === 'P00010992348' || name.toLowerCase().includes('siti')) {
    return {
      interpretation: `INTERPRETASI KLINIS LABORATORIUM (MOCK AI)
Nama Pasien: Siti Aminah
Jenis Kelamin: Perempuan
Skenario: Gagal Ginjal Kronis (CKD)

1. Interpretasi Parameter:
- Kreatinin Serum (LOINC 2160-0): 245 μmol/L. Nilai ini sangat tinggi melebihi batas rujukan normal perempuan (44-80 μmol/L).
- Ureum Serum (LOINC 3094-0): 18.5 mmol/L. Terjadi peningkatan yang signifikan di atas nilai rujukan normal (2.22-4.99 mmol/L).
- Asam Urat (LOINC 3084-1): 510 μmol/L. Nilai ini meningkat melebihi nilai rujukan perempuan (155-428 μmol/L).

2. Korelasi Parameter:
Peningkatan kreatinin dan ureum secara bersamaan mengonfirmasi adanya akumulasi zat sisa nitrogen dalam darah (azotemia), yang berkorelasi dengan penurunan fungsi filtrasi ginjal. Peningkatan asam urat (hiperurisemia sekunder) juga sering menyertai penurunan klirens ginjal.

3. Pola Klinis:
Pola ini menunjukkan disfungsi ginjal derajat sedang hingga berat yang konsisten dengan Chronic Kidney Disease (CKD) atau Acute Kidney Injury (AKI) superimpose.

4. Rekomendasi Tindak Lanjut:
- Hitung Laju Filtrasi Glomerulus (eGFR) menggunakan rumus CKD-EPI.
- Lakukan urinalisis untuk memeriksa keberadaan proteinuria atau hematuria.
- Konsultasikan dengan Dokter Spesialis Penyakit Dalam (Sp.PD-KGH).

5. Referensi:
KDIGO Clinical Practice Guideline for Acute Kidney Injury & Pedoman IACCLM 2023.`,
      conclusion: `Ditemukan azotemia berat dengan Kreatinin 245 μmol/L dan Ureum 18.5 mmol/L, disertai hiperurisemia. Kondisi ini mengindikasikan penurunan fungsi filtrasi ginjal yang signifikan (Chronic Kidney Disease). Diperlukan konsultasi nefrologi.`
    }
  }

  if (ihs === 'P00030588231' || name.toLowerCase().includes('joko')) {
    return {
      interpretation: `INTERPRETASI KLINIS LABORATORIUM (MOCK AI)
Nama Pasien: Joko Prasetyo
Jenis Kelamin: Laki-laki
Skenario: Hiperurisemia / Gout

1. Interpretasi Parameter:
- Asam Urat (LOINC 3084-1): 640 μmol/L. Nilai ini meningkat signifikan di atas batas rujukan normal untuk laki-laki (230-527 μmol/L).
- Kreatinin (LOINC 2160-0): 95 μmol/L. Nilai ini berada dalam batas normal (61-107 μmol/L).

2. Korelasi Parameter:
Kreatinin yang normal menunjukkan fungsi filtrasi ginjal yang masih baik, mengindikasikan bahwa hiperurisemia ini kemungkinan disebabkan oleh kelebihan produksi purin atau penurunan ekskresi asam urat terisolasi.

3. Pola Klinis:
Hiperurisemia terisolasi tanpa disertai penurunan fungsi ginjal yang nyata. Pasien memiliki risiko tinggi menderita Gout Arthritis atau nefrolitiasis asam urat.

4. Rekomendasi Tindak Lanjut:
- Modifikasi gaya hidup dengan membatasi konsumsi makanan tinggi purin (seperti jeroan, seafood, dan daging merah) serta menghindari alkohol.
- Evaluasi gejala klinis nyeri sendi terutama pada ibu jari kaki (podagra).
- Kontrol kadar asam urat secara berkala.

5. Referensi:
Rekomendasi Perhimpunan Reumatologi Indonesia (IRA) untuk Pengelolaan Gout Artritis.`,
      conclusion: `Kadar asam urat meningkat tinggi (640 μmol/L) dengan fungsi ginjal normal (kreatinin 95 μmol/L). Kondisi ini mengarah pada hiperurisemia yang meningkatkan risiko Gout Arthritis. Disarankan modifikasi diet rendah purin.`
    }
  }

  if (ihs === 'P00040293812' || name.toLowerCase().includes('rian')) {
    return {
      interpretation: `INTERPRETASI KLINIS LABORATORIUM (MOCK AI)
Nama Pasien: Rian Hidayat
Jenis Kelamin: Laki-laki
Skenario: Kerusakan Hati Akut / Hepatitis

1. Interpretasi Parameter:
- SGOT / AST (LOINC 1920-8): 420 U/L. Mengalami peningkatan sangat tinggi (>10x batas atas normal 37 U/L).
- SGPT / ALT (LOINC 1742-6): 580 U/L. Mengalami peningkatan sangat tinggi (>12x batas atas normal 45 U/L).

2. Korelasi Parameter:
Peningkatan luar biasa pada kedua enzim transaminase hepatoseluler ini mengonfirmasi adanya kerusakan sel parenkim hati yang masif dan akut. Rasio SGOT/SGPT yang condong ke SGPT lebih tinggi sering ditemukan pada hepatitis virus akut atau drug-induced liver injury.

3. Pola Klinis:
Cedera hepatoseluler akut berat. Nilai ini dikategorikan sebagai nilai kritis yang memerlukan perhatian medis segera.

4. Rekomendasi Tindak Lanjut:
- Lakukan skrining hepatitis virus lengkap (HBsAg, Anti-HCV, Anti-HAV IgM).
- Anamnesis riwayat konsumsi obat-obatan hepatotoksik, suplemen, atau alkohol dalam waktu dekat.
- Segera rujuk ke Dokter Spesialis Penyakit Dalam.

5. Referensi:
Pedoman IACCLM untuk Nilai Kritis Laboratorium & EASL Clinical Practice Guidelines on Acute Liver Failure.`,
      conclusion: `Enzim hati SGOT (420 U/L) dan SGPT (580 U/L) meningkat drastis melebihi 10 kali limit normal, menunjukkan kerusakan sel hati akut (hepatitis/DILI). Pasien memerlukan evaluasi medis dan skrining hepatitis segera.`
    }
  }

  if (ihs === 'P00050812934' || name.toLowerCase().includes('ratna')) {
    return {
      interpretation: `INTERPRETASI KLINIS LABORATORIUM (MOCK AI)
Nama Pasien: Ratna Sari
Jenis Kelamin: Perempuan
Skenario: Dislipidemia Berat

1. Interpretasi Parameter:
- Kolesterol Total (LOINC 2093-3): 290 mg/dL. Sangat tinggi melebihi batas optimal (<200 mg/dL).
- Trigliserida (LOINC 2571-8): 210 mg/dL. Meningkat di atas batas rujukan (<150 mg/dL).
- LDL Kolesterol (LOINC 18262-6): 185 mg/dL. Sangat tinggi melebihi batas optimal (<100 mg/dL).
- HDL Kolesterol (LOINC 2085-9): 38 mg/dL. Rendah di bawah batas pelindung kardiovaskular untuk perempuan (>50 mg/dL).

2. Korelasi Parameter:
Kombinasi kolesterol total, trigliserida, dan LDL yang tinggi disertai HDL yang rendah membentuk profil lipid aterogenik yang sangat meningkatkan risiko penyakit jantung koroner (PJK) dan stroke.

3. Pola Klinis:
Dislipidemia campuran tipe IIb (menurut klasifikasi Fredrickson), yang merupakan faktor risiko utama penyakit kardiovaskular aterosklerotik (ASCVD).

4. Rekomendasi Tindak Lanjut:
- Hitung skor risiko kardiovaskular 10-tahun (misal: skor Framingham atau ASCVD Risk Estimator).
- Modifikasi gaya hidup sehat (diet rendah lemak jenuh, olahraga aerobik 150 menit/minggu).
- Pertimbangkan inisiasi terapi statin intensitas sedang-tinggi setelah diskusi dengan klinisi.

5. Referensi:
Panduan Tatalaksana Dislipidemia (PERKENI 2019) & ACC/AHA Cholesterol Guidelines.`,
      conclusion: `Pasien mengalami dislipidemia berat dengan peningkatan Kolesterol Total (290 mg/dL), LDL (185 mg/dL), Trigliserida (210 mg/dL), serta penurunan HDL (38 mg/dL). Profil ini meningkatkan risiko kardiovaskular secara bermakna.`
    }
  }

  // Generic fallback if patient name or IHS doesn't match any specific template
  const abnormalParameters = session.lab_results.filter((r) => r.status !== 'normal' && r.status !== 'unknown')
  const statusDetails = abnormalParameters
    .map(r => `- ${r.parameter_name} (LOINC ${r.loinc_code}): ${r.value} ${r.unit} (Status: ${r.status})`)
    .join('\n')

  return {
    interpretation: `INTERPRETASI KLINIS LABORATORIUM (MOCK AI)
Nama Pasien: ${name}
Jenis Kelamin: ${session.patient_gender === 'female' ? 'Perempuan' : 'Laki-laki'}

1. Interpretasi Parameter:
${session.lab_results.map(r => `- ${r.parameter_name} (LOINC ${r.loinc_code}): ${r.value} ${r.unit} (Status: ${r.status ?? 'normal'}).`).join('\n')}

2. Korelasi Parameter:
${abnormalParameters.length > 0 
  ? `Terdapat beberapa parameter abnormal yaitu:\n${statusDetails}\nParameter ini perlu dikorelasikan dengan riwayat klinis pasien.`
  : `Seluruh parameter metabolik yang diperiksa berada dalam batas normal rujukan populasi Indonesia.`}

3. Pola Klinis:
${abnormalParameters.length > 0 ? 'Ditemukan indikasi deviasi metabolik ringan/sedang.' : 'Tidak ditemukan deviasi metabolik yang signifikan.'}

4. Rekomendasi Tindak Lanjut:
- Lakukan konsultasi dengan dokter keluarga atau dokter pengirim untuk korelasi anamnesis dan pemeriksaan fisik.
- Evaluasi laboratorium berkala sesuai anjuran klinisi.
- Pertahankan pola hidup sehat dan nutrisi seimbang.

5. Referensi:
Pedoman IACCLM (Indonesian Association for Clinical Chemistry and Laboratory Medicine) 2023.`,
    conclusion: abnormalParameters.length > 0
      ? `Ditemukan beberapa nilai parameter laboratorium yang abnormal (${abnormalParameters.map(r => r.parameter_name).join(', ')}). Direkomendasikan evaluasi klinis lanjutan.`
      : `Seluruh hasil laboratorium yang diperiksa berada dalam batas rujukan normal. Tidak diperlukan tindakan medis darurat.`
  }
}

// ─── Dashboard stats from database ───────────────────────────
export async function getDashboardStats() {
  const [convRes, sessionRes] = await Promise.all([
    insforge.database.from('conversations').select('id', { count: 'exact', head: true }),
    insforge.database.from('lab_sessions').select('id', { count: 'exact', head: true }),
  ])
  return {
    totalConversations: convRes.count ?? 0,
    totalLabSessions:   sessionRes.count ?? 0,
  }
}

// ─── Persist lab session to database ─────────────────────────
export async function saveLabSession(session: LabSession) {
  const { data, error } = await insforge.database
    .from('lab_sessions')
    .insert([{
      patient_ihs_number: session.patient_ihs_number,
      patient_name:       session.patient_name,
      patient_data:       session.patient_data,
    }])
    .select()
    .single()
  if (error) return { error: error.message }
  return { data }
}

// ─── Persist diagnostic report to database ───────────────────
export async function saveDiagnosticReport(
  sessionId: string,
  interpretText: string,
  conclusion: string,
  satusehatId?: string
) {
  const { data, error } = await insforge.database
    .from('diagnostic_reports')
    .insert([{
      session_id:           sessionId,
      interpretation_text:  interpretText,
      conclusion,
      satusehat_report_id:  satusehatId,
      status:               satusehatId ? 'submitted' : 'draft',
      submitted_at:         satusehatId ? new Date().toISOString() : null,
    }])
    .select()
    .single()
  if (error) return { error: error.message }
  return { data }
}

// ─── Seed 10 dummy patient scenarios into database ───────────
export async function seedDummyData(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!userId) {
      return { success: false, error: 'Anda harus masuk (login) terlebih dahulu untuk mengisi data dummy.' }
    }

    // 2. Prepare 10 patient scenarios
  const scenarios = [
    {
      ihs: 'P00020194883',
      name: 'Budi Santoso',
      gender: 'male',
      birth: '1968-08-24',
      address: 'Jakarta Pusat, DKI Jakarta',
      phone: '+628121111111',
      results: [
        { loinc: '15545-5', name: 'Glukosa Puasa', val: 185, unit: 'mg/dL', low: 70, high: 99, status: 'high' },
        { loinc: '15546-3', name: 'Glukosa 2 Jam PP', val: 270, unit: 'mg/dL', high: 140, status: 'high' }
      ],
      conclusion: 'Pasien menunjukkan kondisi hiperglikemia berat dengan glukosa puasa 185 mg/dL dan glukosa 2 jam PP 270 mg/dL. Pola ini mengarah pada kondisi diabetes melitus tidak terkontrol. Direkomendasikan pemeriksaan HbA1c dan konsultasi klinis segera.',
      interpretation: 'Hasil menunjukkan peningkatan Glukosa Puasa (185 mg/dL) dan Glukosa 2 Jam PP (270 mg/dL). Hal ini secara konsisten mengindikasikan adanya penyakit Diabetes Melitus yang belum terkontrol.'
    },
    {
      ihs: 'P00010992348',
      name: 'Siti Aminah',
      gender: 'female',
      birth: '1959-11-12',
      address: 'Surabaya, Jawa Timur',
      phone: '+628122222222',
      results: [
        { loinc: '2160-0', name: 'Kreatinin', val: 245, unit: 'μmol/L', low: 44, high: 80, status: 'high' },
        { loinc: '3094-0', name: 'Ureum', val: 18.5, unit: 'mmol/L', low: 2.22, high: 4.99, status: 'high' },
        { loinc: '3084-1', name: 'Asam Urat', val: 510, unit: 'μmol/L', low: 155, high: 428, status: 'high' }
      ],
      conclusion: 'Ditemukan azotemia berat dengan Kreatinin 245 μmol/L and Ureum 18.5 mmol/L, disertai hiperurisemia. Kondisi ini mengindikasikan penurunan fungsi filtrasi ginjal yang signifikan (Chronic Kidney Disease). Diperlukan konsultasi nefrologi.',
      interpretation: 'Terdapat peningkatan berat pada Kreatinin Serum (245 μmol/L) dan Ureum Serum (18.5 mmol/L) yang mengindikasikan azotemia akibat kegagalan filtrasi ginjal. Kadar asam urat juga meningkat sekunder.'
    },
    {
      ihs: 'P00030588231',
      name: 'Joko Prasetyo',
      gender: 'male',
      birth: '1975-04-05',
      address: 'Bandung, Jawa Barat',
      phone: '+628123333333',
      results: [
        { loinc: '3084-1', name: 'Asam Urat', val: 640, unit: 'μmol/L', low: 230, high: 527, status: 'high' },
        { loinc: '2160-0', name: 'Kreatinin', val: 95, unit: 'μmol/L', low: 61, high: 107, status: 'normal' }
      ],
      conclusion: 'Kadar asam urat meningkat tinggi (640 μmol/L) dengan fungsi ginjal normal (kreatinin 95 μmol/L). Kondisi ini mengarah pada hiperurisemia yang meningkatkan risiko Gout Arthritis. Disarankan modifikasi diet rendah purin.',
      interpretation: 'Hasil Asam Urat tinggi (640 μmol/L) dengan Kreatinin normal (95 μmol/L), konsisten dengan kondisi Hiperurisemia terisolasi tanpa penurunan fungsi ginjal.'
    },
    {
      ihs: 'P00040293812',
      name: 'Rian Hidayat',
      gender: 'male',
      birth: '1988-12-02',
      address: 'Medan, Sumatera Utara',
      phone: '+628124444444',
      results: [
        { loinc: '1920-8', name: 'SGOT (AST)', val: 420, unit: 'U/L', low: 15, high: 37, status: 'high' },
        { loinc: '1742-6', name: 'SGPT (ALT)', val: 580, unit: 'U/L', low: 10, high: 45, status: 'high' }
      ],
      conclusion: 'Enzim hati SGOT (420 U/L) dan SGPT (580 U/L) meningkat drastis melebihi 10 kali lipat batas normal, menunjukkan kerusakan sel hati akut (hepatitis/DILI). Pasien memerlukan evaluasi medis dan skrining hepatitis segera.',
      interpretation: 'Terjadi peningkatan enzim transaminase hati SGOT (420 U/L) dan SGPT (580 U/L) secara signifikan (>10x batas normal). Ini menandakan cedera hepatoseluler akut yang memerlukan perhatian medis segera.'
    },
    {
      ihs: 'P00050812934',
      name: 'Ratna Sari',
      gender: 'female',
      birth: '1980-05-18',
      address: 'Semarang, Jawa Tengah',
      phone: '+628125555555',
      results: [
        { loinc: '2093-3', name: 'Kolesterol Total', val: 290, unit: 'mg/dL', high: 200, status: 'high' },
        { loinc: '2571-8', name: 'Trigliserida', val: 210, unit: 'mg/dL', high: 150, status: 'high' },
        { loinc: '2085-9', name: 'HDL Kolesterol', val: 38, unit: 'mg/dL', low: 50, status: 'low' },
        { loinc: '18262-6', name: 'LDL Kolesterol', val: 185, unit: 'mg/dL', high: 100, status: 'high' }
      ],
      conclusion: 'Pasien mengalami dislipidemia berat dengan peningkatan Kolesterol Total (290 mg/dL), LDL (185 mg/dL), Trigliserida (210 mg/dL), serta penurunan HDL (38 mg/dL). Profil ini meningkatkan risiko kardiovaskular secara bermakna.',
      interpretation: 'Profil lipid pasien bersifat aterogenik dengan kolesterol total, LDL, trigliserida tinggi dan HDL rendah, meningkatkan risiko penyakit kardiovaskular.'
    },
    {
      ihs: 'P00060932847',
      name: 'Dewi Lestari',
      gender: 'female',
      birth: '1993-09-30',
      address: 'Yogyakarta, DIY',
      phone: '+628126666666',
      results: [
        { loinc: '15545-5', name: 'Glukosa Puasa', val: 105, unit: 'mg/dL', low: 70, high: 99, status: 'high' },
        { loinc: '15546-3', name: 'Glukosa 2 Jam PP', val: 165, unit: 'mg/dL', high: 140, status: 'high' }
      ],
      conclusion: 'Pasien menunjukkan hasil glukosa darah borderline tinggi (Puasa 105 mg/dL, 2 Jam PP 165 mg/dL). Profil ini dapat menandakan intoleransi glukosa atau kecenderungan diabetes melitus gestasional (jika hamil).',
      interpretation: 'Kadar glukosa puasa 105 mg/dL dan gula 2 jam PP 165 mg/dL menunjukkan adanya intoleransi glukosa darah (prediabetes).'
    },
    {
      ihs: 'P00070154823',
      name: 'Bambang Wijaya',
      gender: 'male',
      birth: '1947-01-15',
      address: 'Malang, Jawa Timur',
      phone: '+628127777777',
      results: [
        { loinc: '2160-0', name: 'Kreatinin', val: 120, unit: 'μmol/L', low: 61, high: 107, status: 'high' },
        { loinc: '3094-0', name: 'Ureum', val: 6.2, unit: 'mmol/L', low: 2.22, high: 4.99, status: 'high' }
      ],
      conclusion: 'Peningkatan kreatinin ringan (120 μmol/L) pada pasien geriatri. Disarankan pemantauan fungsi ginjal berkala dan penyesuaian dosis obat-obatan nefrotoksik.',
      interpretation: 'Sedikit peningkatan pada Kreatinin (120 μmol/L) dan Ureum (6.2 mmol/L), umum ditemukan pada pasien usia lanjut namun tetap memerlukan pengawasan.'
    },
    {
      ihs: 'P00080722349',
      name: 'Hendra Wijaya',
      gender: 'male',
      birth: '1982-07-22',
      address: 'Makassar, Sulawesi Selatan',
      phone: '+628128888888',
      results: [
        { loinc: '1742-6', name: 'SGPT (ALT)', val: 68, unit: 'U/L', low: 10, high: 45, status: 'high' },
        { loinc: '1920-8', name: 'SGOT (AST)', val: 48, unit: 'U/L', low: 15, high: 37, status: 'high' },
        { loinc: '2571-8', name: 'Trigliserida', val: 285, unit: 'mg/dL', high: 150, status: 'high' }
      ],
      conclusion: 'Peningkatan enzim hati ringan dengan hipertrigliseridemia (285 mg/dL), mengindikasikan kecurigaan awal perlemakan hati (fatty liver). Disarankan modifikasi nutrisi.',
      interpretation: 'Hasil menunjukkan peningkatan ringan SGPT (68 U/L) & SGOT (48 U/L) disertai dengan Trigliserida tinggi (285 mg/dL), mengarah pada fatty liver.'
    },
    {
      ihs: 'P00091014856',
      name: 'Amanda Putri',
      gender: 'female',
      birth: '1998-10-14',
      address: 'Denpasar, Bali',
      phone: '+628129999999',
      results: [
        { loinc: '15545-5', name: 'Glukosa Puasa', val: 82, unit: 'mg/dL', low: 70, high: 99, status: 'normal' },
        { loinc: '2160-0', name: 'Kreatinin', val: 62, unit: 'μmol/L', low: 44, high: 80, status: 'normal' },
        { loinc: '3094-0', name: 'Ureum', val: 3.2, unit: 'mmol/L', low: 2.22, high: 4.99, status: 'normal' }
      ],
      conclusion: 'Seluruh hasil laboratorium yang diperiksa berada dalam batas rujukan normal. Tidak diperlukan tindakan medis darurat.',
      interpretation: 'Semua nilai parameter metabolik utama (Glukosa, Kreatinin, Ureum) berada dalam batas normal rujukan.'
    },
    {
      ihs: 'P00100308293',
      name: 'Ahmad Fauzi',
      gender: 'male',
      birth: '1971-03-08',
      address: 'Palembang, Sumatera Selatan',
      phone: '+628120000000',
      results: [
        { loinc: '3084-1', name: 'Asam Urat', val: 580, unit: 'μmol/L', low: 230, high: 527, status: 'high' },
        { loinc: '18262-6', name: 'LDL Kolesterol', val: 162, unit: 'mg/dL', high: 100, status: 'high' },
        { loinc: '2093-3', name: 'Kolesterol Total', val: 240, unit: 'mg/dL', high: 200, status: 'high' }
      ],
      conclusion: 'Ditemukan kombinasi asam urat tinggi (580 μmol/L) dan LDL tinggi (162 mg/dL). Pola ini menandakan risiko metabolik ganda yang memerlukan pemantauan gaya hidup.',
      interpretation: 'Hasil laboratorium menunjukkan hiperurisemia ringan disertai dengan hiperkolesterolemia.'
    }
  ]

  // 3. Insert each scenario
  let successCount = 0
  let lastErrorMsg = ''

  for (const sc of scenarios) {
      // Create session
      const patientData = {
        ihs_number: sc.ihs,
        name: sc.name,
        birth_date: sc.birth,
        gender: sc.gender,
        address: sc.address,
        phone: sc.phone
      }

      const { data: sessData, error: sessErr } = await insforge.database
        .from('lab_sessions')
        .insert([{
          user_id: userId,
          patient_ihs_number: sc.ihs,
          patient_name: sc.name,
          patient_gender: sc.gender,
          patient_data: patientData
        }])
        .select()
        .single()

      if (sessErr || !sessData) {
        const errMsg = sessErr?.message ?? 'Gagal membuat sesi.'
        console.error('Failed to insert session for', sc.name, sessErr)
        lastErrorMsg = `Sesi (${sc.name}): ${errMsg}`
        continue
      }

      const sessionId = (sessData as { id: string }).id

      // Create lab results
      const resultsToInsert = sc.results.map((r) => ({
        session_id: sessionId,
        loinc_code: r.loinc,
        parameter_name: r.name,
        value: r.val,
        unit: r.unit,
        reference_range_low: r.low ?? null,
        reference_range_high: r.high ?? null,
        status: r.status
      }))

      const { error: resErr } = await insforge.database
        .from('lab_results')
        .insert(resultsToInsert)

      if (resErr) {
        console.error('Failed to insert results for', sc.name, resErr)
        lastErrorMsg = `Hasil Lab (${sc.name}): ${resErr.message}`
      }

      // Create diagnostic report
      const { error: repErr } = await insforge.database
        .from('diagnostic_reports')
        .insert([{
          session_id: sessionId,
          interpretation_text: sc.interpretation,
          conclusion: sc.conclusion,
          status: 'draft',
          satusehat_report_id: `dr-mock-${uuidv4().substring(0,8)}`
        }])

      if (repErr) {
        console.error('Failed to insert report for', sc.name, repErr)
        lastErrorMsg = `Laporan Diag (${sc.name}): ${repErr.message}`
      }

      successCount++
    }

    if (successCount === 0) {
      return { success: false, error: `Gagal memasukkan data dummy ke database: ${lastErrorMsg}` }
    }

    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown seeding error'
    return { success: false, error: msg }
  }
}
