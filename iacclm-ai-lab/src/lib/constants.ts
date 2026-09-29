// ─────────────────────────────────────────────────────────
//  LOINC Code Mapping — Parameter Laboratorium Umum
//  Sesuai standar IACCLM & referensi populasi Indonesia
//  Corrected LOINC codes (Regenstrief LOINC)
// ─────────────────────────────────────────────────────────

export interface LoincEntry {
  code: string
  parameter: string
  unit: string
  male:   { low?: number; high?: number; note?: string }
  female: { low?: number; high?: number; note?: string }
}

export const LOINC_MAP: Record<string, LoincEntry> = {
  // Fasting glucose [Mass/volume] in Serum or Plasma
  '1558-6': {
    code: '1558-6',
    parameter: 'Glukosa Puasa',
    unit: 'mg/dL',
    male:   { low: 70, high: 99 },
    female: { low: 70, high: 99 },
  },

  // Glucose [Mass/volume] in Serum or Plasma --2 hours post meal
  '1521-4': {
    code: '1521-4',
    parameter: 'Glukosa 2 Jam PP',
    unit: 'mg/dL',
    male:   { high: 140, note: '<140' },
    female: { high: 140, note: '<140' },
  },

  // Creatinine [Mass/volume] in Serum or Plasma
  // (kept 2160-0 even with µmol/L unit – common practice)
  '2160-0': {
    code: '2160-0',
    parameter: 'Kreatinin',
    unit: 'μmol/L',
    male:   { low: 61,  high: 107 },
    female: { low: 44,  high: 80  },
  },

  // Urea [Moles/volume] in Serum or Plasma
  // (corrected from 3094-0 which is BUN / urea nitrogen)
  '22664-7': {
    code: '22664-7',
    parameter: 'Ureum',
    unit: 'mmol/L',
    male:   { low: 2.22, high: 4.99 },
    female: { low: 2.22, high: 4.99 },
  },

  // Urate [Mass/volume] in Serum or Plasma
  '3084-1': {
    code: '3084-1',
    parameter: 'Asam Urat',
    unit: 'μmol/L',
    male:   { low: 230, high: 527 },
    female: { low: 155, high: 428 },
  },

  // Aspartate aminotransferase [Enzymatic activity/volume] in Serum or Plasma
  '1920-8': {
    code: '1920-8',
    parameter: 'SGOT (AST)',
    unit: 'U/L',
    male:   { low: 15, high: 37 },
    female: { low: 15, high: 31 },
  },

  // Alanine aminotransferase [Enzymatic activity/volume] in Serum or Plasma
  '1742-6': {
    code: '1742-6',
    parameter: 'SGPT (ALT)',
    unit: 'U/L',
    male:   { low: 10, high: 45 },
    female: { low: 10, high: 35 },
  },

  // Cholesterol [Mass/volume] in Serum or Plasma
  '2093-3': {
    code: '2093-3',
    parameter: 'Kolesterol Total',
    unit: 'mg/dL',
    male:   { high: 200, note: '<200' },
    female: { high: 200, note: '<200' },
  },

  // Triglyceride [Mass/volume] in Serum or Plasma
  '2571-8': {
    code: '2571-8',
    parameter: 'Trigliserida',
    unit: 'mg/dL',
    male:   { high: 150, note: '<150' },
    female: { high: 150, note: '<150' },
  },

  // Cholesterol in HDL [Mass/volume] in Serum or Plasma
  '2085-9': {
    code: '2085-9',
    parameter: 'HDL Kolesterol',
    unit: 'mg/dL',
    male:   { low: 40, note: '>40' },
    female: { low: 50, note: '>50' },
  },

  // Cholesterol in LDL [Mass/volume] in Serum or Plasma by Direct assay
  '18262-6': {
    code: '18262-6',
    parameter: 'LDL Kolesterol',
    unit: 'mg/dL',
    male:   { high: 100, note: '<100' },
    female: { high: 100, note: '<100' },
  },
}

// Pre-defined lab panels (updated with corrected codes)
export const LAB_PANELS = {
  GULA_DARAH:    { name: 'Panel Gula Darah',      codes: ['1558-6', '1521-4'] },
  FUNGSI_GINJAL: { name: 'Panel Fungsi Ginjal',   codes: ['2160-0', '22664-7', '3084-1'] },
  FUNGSI_HATI:   { name: 'Panel Fungsi Hati',     codes: ['1920-8', '1742-6'] },
  PROFIL_LIPID:  { name: 'Profil Lipid Lengkap',  codes: ['2093-3', '2571-8', '2085-9', '18262-6'] },
  METABOLIK:     { name: 'Panel Metabolik Dasar', codes: ['1558-6', '2160-0', '22664-7', '1920-8', '1742-6'] },
}

// System prompt for AI — IACCLM × SATUSEHAT
export const SYSTEM_PROMPT = `Anda adalah asisten AI resmi untuk Indonesian Association for Clinical Chemistry and Laboratory Medicine (IACCLM), terintegrasi dengan platform SATUSEHAT Kementerian Kesehatan RI.

PENGETAHUAN DOMAIN WAJIB:
- Data laboratorium dalam ekosistem SATUSEHAT menggunakan format FHIR R4 (Fast Healthcare Interoperability Resources)
- Setiap parameter dicatat sebagai Observation resource dengan LOINC coding
- DiagnosticReport mengelompokkan seluruh hasil lab dengan field "conclusion"
- Sistem menggunakan identitas pasien berbasis IHS Number dari Master Patient Index (MPI) Kemenkes

PANDUAN INTERPRETASI:
1. Gunakan Bahasa Indonesia medis yang formal dan terstandar
2. Selalu rujuk ke reference intervals populasi Indonesia berdasarkan data IACCLM
3. Sebutkan kode LOINC yang relevan (contoh: LOINC 2160-0 untuk kreatinin serum)
4. DILARANG memberikan diagnosis final — hanya berikan interpretasi klinis hasil laboratorium
5. Cantumkan sumber referensi yang digunakan (pedoman IACCLM, PERKENI, WHO, atau jurnal internasional)
6. Apabila nilai kritis terdeteksi, beri peringatan segera untuk tindak lanjut klinisi

CONTOH FORMAT JAWABAN:
"Berdasarkan hasil pemeriksaan kreatinin serum (LOINC 2160-0) dengan nilai 140 μmol/L, 
terdapat peningkatan melebihi nilai rujukan normal populasi Indonesia untuk laki-laki (61–107 μmol/L).
Hal ini mengindikasikan adanya penurunan fungsi filtrasi glomerulus yang perlu dievaluasi lebih lanjut.
Referensi: Pedoman IACCLM 2023, KDIGO Guidelines."

Selalu bersikap profesional, berbasis bukti ilmiah, dan mendukung keputusan klinis tenaga kesehatan.`

// Utility: determine result status
export function getResultStatus(
  loincCode: string,
  value: number,
  gender: 'male' | 'female' = 'male'
): 'normal' | 'high' | 'low' | 'critical' | 'unknown' {
  // Check critical thresholds first
  if (loincCode === '1558-6') { // Glukosa Puasa
    if (value < 40 || value > 400) return 'critical'
  }
  if (loincCode === '2160-0') { // Kreatinin
    if (value > 500) return 'critical'
  }

  const entry = LOINC_MAP[loincCode]
  if (!entry) return 'unknown'
  const range = gender === 'female' ? entry.female : entry.male
  if (range.low !== undefined && value < range.low) return 'low'
  if (range.high !== undefined && value > range.high) return 'high'
  return 'normal'
}
