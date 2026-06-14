# PRD Inisialisasi — Asisten AI IACCLM × SATUSEHAT

## Ringkasan Produk

Asisten AI untuk **Indonesian Association for Clinical Chemistry and Laboratory Medicine (IACCLM)**, terintegrasi dengan platform **SATUSEHAT Kementerian Kesehatan RI**.

---

## Fitur & Modul Utama

1. **AI Chat & Interpretasi SATUSEHAT (Eksisting)**
   * **Fungsi**: AI Chat untuk konsultasi klinis, penjelasan LOINC/FHIR, dan generator draf `DiagnosticReport` dan `Observation` FHIR R4 yang terintegrasi dengan SATUSEHAT.

2. **QC Anomaly Detector & Predictor**
   * **Fungsi**: Menganalisis data quality control harian dari berbagai lab anggota untuk mendeteksi drift, bias, atau imprecision secara real-time, bahkan memprediksi kegagalan QC sebelum terjadi.
   * **Output**: Notifikasi otomatis ke penanggung jawab lab, saran tindakan korektif, dan laporan tren untuk pemantauan akreditasi (sesuai SNI ISO 15189).

3. **Automated Lab Test Interpreter for Primary Care**
   * **Fungsi**: AI agent yang membaca hasil panel lab (misal fungsi hati, ginjal, diabetes), lalu menghasilkan draf interpretasi dalam Bahasa Indonesia yang mudah dipahami dokter puskesmas/klinik.
   * **Value**: Mengurangi misdiagnosis akibat interpretasi terbatas, terutama di daerah dengan akses spesialis patologi klinik minim.

4. **Virtual Mentor for Continuous Education**
   * **Fungsi**: Asisten belajar adaptif untuk teknisi & analis lab. Memberikan kuis harian, studi kasus, dan update metode terbaru (misal cara validasi metode photometri, atau troubleshooting hematology analyzer).
   * **Fitur**: Melacak progres individu, menyarankan modul berdasarkan kelemahan pengguna, serta terintegrasi dengan sistem SKP (Surat Keterangan Pengalaman) IACCLM.

5. **AI-Based Drug-Laboratory Interaction Checker**
   * **Fungsi**: Memeriksa potensi interaksi obat dengan hasil pemeriksaan laboratorium (misal obat vitamin C mengganggu pemeriksaan glukosa metode GOD-PAP, atau biotin memengaruhi immunoassay).
   * **Pengguna**: Dokter, apoteker, dan analis lab untuk mencegah false result dan kesalahan interpretasi.

6. **Predictive Reference Range Updater**
   * **Fungsi**: Mengumpulkan data lab anonim dari multiple anggota, lalu menggunakan machine learning untuk mengusulkan reference interval yang lebih spesifik berdasarkan usia, jenis kelamin, regional, dan kondisi metabolik populasi Indonesia.
   * **Output**: Rekomendasi untuk pembaruan pedoman nasional secara berkala.

---

## Pengetahuan Domain

### ANDA HARUS MENGETAHUI:

- Data laboratorium dalam ekosistem SATUSEHAT menggunakan format **FHIR (Fast Healthcare Interoperability Resources)**
- **Observation resource** mencatat setiap parameter dengan **LOINC coding**
- **DiagnosticReport** mengelompokkan hasil lab lengkap dengan `conclusion`

---

## Panduan Interpretasi

### KETIKA MENJELASKAN INTERPRETASI:

1. Gunakan Bahasa Indonesia medis yang formal
2. Rujuk ke reference intervals populasi Indonesia (sesuai data IACCLM)
3. Sebutkan kode LOINC jika relevan (contoh: `LOINC 2160-0` untuk kreatinin)
4. Jangan memberikan diagnosis final — hanya interpretasi hasil lab
5. Sebutkan sumber referensi (pedoman IACCLM, jurnal, atau standar internasional)

### CONTOH RESPONSE YANG BAIK:

> _"Berdasarkan hasil pemeriksaan kreatinin (LOINC 2160-0) dengan nilai 140 μmol/L,
> terdapat peningkatan di atas nilai rujukan normal populasi Indonesia (61–107 μmol/L).
> Interpretasi: ..."_

---

## API Endpoint (Express)

### Chat Endpoint

```typescript
// backend/src/routes/chat.ts
import { Router } from 'express';
import { OpenRouterClient } from '../services/openrouter.js';
import { VectorSearchService } from '../services/vectorSearch.js';

const router = Router();

router.post('/api/chat', async (req, res) => {
  const { messages, conversationId, includeFHIRContext } = req.body;

  // 1. Vector search untuk RAG
  const lastUserMessage = messages[messages.length - 1].content;
  const relevantChunks = await vectorSearchService.search(lastUserMessage);

  // 2. Tambahkan FHIR context jika diminta
  let fhirContext = '';
  if (includeFHIRContext) {
    fhirContext = getFHIRContextGuidance();
  }

  // 3. Streaming response via SSE
  const stream = await openRouterClient.streamChat({
    messages: [
      { role: 'system', content: SYSTEM_PROMPT + fhirContext },
      ...messages
    ],
    sources: relevantChunks
  });

  // 4. Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');

  for await (const chunk of stream) {
    res.write(`data: ${JSON.stringify(chunk)}\n\n`);
  }
  res.end();
});

export { router as chatRouter };
```

---

## User Flow dengan SATUSEHAT

```mermaid
flowchart TD
    A[Dokter input IHS Number] --> B[Backend call SATUSEHAT GET Patient]
    B --> C{Valid?}
    C -->|No| D[Tampilkan error: Patient not found]
    C -->|Yes| E[Tampilkan data pasien otomatis]
    E --> F[Dokter input hasil lab]
    F --> G[Backend generate Observation resources]
    G --> H[Backend create DiagnosticReport]
    H --> I[Tampilkan draf interpretasi]
    I --> J{Dokter setuju?}
    J -->|Ya| K[POST ke SATUSEHAT FHIR server]
    J -->|Edit| L[Edit conclusion text]
    L --> K
    K --> M[Store reference ke PostgreSQL]
    M --> N[Generate PDF jika diperlukan]
```

---

## API Endpoint untuk Interpretasi

```typescript
// backend/src/routes/panel.ts
import { Router } from 'express';
import { FhirService } from '../services/fhir.js';

const router = Router();

router.post('/api/panel/interpret', async (req, res) => {
  const {
    patientIhsNumber,
    labResults,          // Array of { loincCode, value, unit }
    practitionerId,
    organizationId
  } = req.body;

  // 1. Validasi patient ke SATUSEHAT MPI
  const patient = await fhirService.getPatient(patientIhsNumber);
  if (!patient) {
    return res.status(404).json({ error: 'Patient IHS number tidak ditemukan' });
  }

  // 2. Generate Observation resources
  const observations = [];
  for (const result of labResults) {
    const observation = await fhirService.createObservation({
      patientIhsNumber,
      loincCode: result.loincCode,
      value: result.value,
      unit: result.unit,
      referenceRange: getReferenceRange(result.loincCode)
    });
    observations.push(observation);
  }

  // 3. Generate interpretasi dengan AI (FHIR-aware prompt)
  const interpretation = await generateInterpretation(labResults);

  // 4. Create DiagnosticReport
  const diagnosticReport = await fhirService.createDiagnosticReport({
    patientIhsNumber,
    observations: observations.map(o => o.id),
    conclusion: interpretation.conclusion,
    performer: practitionerId,
    organization: organizationId
  });

  // 5. Optional: Submit ke SATUSEHAT (dengan user consent)
  let submissionResult = null;
  if (req.body.submitToSatusehat) {
    submissionResult = await fhirService.submitBundle(diagnosticReport, observations);
  }

  res.json({
    diagnosticReport,
    observations,
    interpretation: interpretation.text,
    submissionResult
  });
});

export { router as panelRouter };
```

---

## LOINC Code Mapping untuk Parameter Umum

| Parameter        | LOINC Code | Satuan   | Reference Range (Laki-laki) |
|------------------|------------|----------|-----------------------------|
| Glukosa puasa    | 15545-5    | mg/dL    | 70–99                       |
| Glukosa 2 jam PP | 15546-3    | mg/dL    | <140                        |
| Kreatinin        | 2160-0     | μmol/L   | 61–107                      |
| Ureum            | 3094-0     | mmol/L   | 2.22–4.99                   |
| Asam Urat        | 3084-1     | μmol/L   | 230–527                     |
| SGOT (AST)       | 1920-8     | U/L      | 15–37                       |
| SGPT (ALT)       | 1742-6     | U/L      | 10–45                       |
| Kolesterol total | 2093-3     | mg/dL    | <200                        |
| Trigliserida     | 2571-8     | mg/dL    | <150                        |
| HDL              | 2085-9     | mg/dL    | >40                         |
| LDL              | 18262-6    | mg/dL    | <100                        |

---

## Struktur Direktori (Vite Only)

```
iacclm-ai-lab/
├── frontend/                        # Vite + React app
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── pages/
│   │   │   ├── Chat.tsx            # Modul 1
│   │   │   ├── Interpreter.tsx     # Modul 3
│   │   │   └── Login.tsx
│   │   ├── components/
│   │   │   ├── chat/
│   │   │   ├── interpreter/
│   │   │   └── ui/                 # shadcn/ui
│   │   ├── services/
│   │   │   └── api.ts              # REST API client
│   │   └── stores/
│   │       └── chatStore.ts        # Zustand store
│   └── dist/                       # Build output
│
├── backend/                         # Standalone REST API
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── index.ts                # Express app entry
│   │   ├── routes/
│   │   │   ├── chat.ts
│   │   │   ├── panel.ts
│   │   │   └── fhir.ts
│   │   ├── services/
│   │   │   ├── openrouter.ts       # AI service
│   │   │   ├── vectorSearch.ts     # RAG + pgvector
│   │   │   ├── fhir.ts             # SATUSEHAT FHIR client
│   │   │   └── pdfGenerator.ts
│   │   ├── middleware/
│   │   │   └── auth.ts
│   │   └── types/
│   │       └── fhir.types.ts       # FHIR type definitions
│   └── dist/
│
├── docker-compose.yml               # Frontend + Backend + PostgreSQL
└── .env
```

---

## Spesifikasi Teknis Backend (Express + FHIR)

### 7.1 SATUSEHAT FHIR Client Implementation

```typescript
// backend/src/services/fhir.ts
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

export class FhirService {
  private baseUrl: string;
  private clientId: string;
  private clientSecret: string;

  constructor() {
    this.baseUrl = process.env.SATUSEHAT_FHIR_URL!;
    this.clientId = process.env.SATUSEHAT_CLIENT_ID!;
    this.clientSecret = process.env.SATUSEHAT_CLIENT_SECRET!;
  }

  async getPatient(ihsNumber: string): Promise<any> {
    const response = await axios.get(
      `${this.baseUrl}/Patient?identifier=https://fhir.kemkes.go.id/id/patient-ihs-number|${ihsNumber}`,
      { headers: await this.getAuthHeaders() }
    );
    return response.data.entry?.[0]?.resource || null;
  }

  async createObservation(data: ObservationData): Promise<any> {
    const observation = {
      resourceType: 'Observation',
      id: `obs-${uuidv4()}`,
      status: 'final',
      category: [{
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/observation-category',
          code: 'laboratory'
        }]
      }],
      code: {
        coding: [{
          system: 'http://loinc.org',
          code: data.loincCode
        }]
      },
      subject: {
        reference: `Patient/${data.patientIhsNumber}`
      },
      effectiveDateTime: new Date().toISOString(),
      valueQuantity: {
        value: data.value,
        unit: data.unit,
        system: 'http://unitsofmeasure.org'
      },
      referenceRange: [{
        low: { value: data.referenceRange.low, unit: data.unit },
        high: { value: data.referenceRange.high, unit: data.unit }
      }]
    };

    const response = await axios.post(
      `${this.baseUrl}/Observation`,
      observation,
      { headers: await this.getAuthHeaders() }
    );
    return response.data;
  }

  async createDiagnosticReport(data: DiagnosticReportData): Promise<any> {
    const report = {
      resourceType: 'DiagnosticReport',
      id: `dr-${uuidv4()}`,
      status: 'final',
      code: {
        coding: [{
          system: 'http://loinc.org',
          code: '11502-2',
          display: 'Laboratory report'
        }]
      },
      subject: { reference: `Patient/${data.patientIhsNumber}` },
      effectiveDateTime: new Date().toISOString(),
      issued: new Date().toISOString(),
      performer: [{ reference: `Organization/${data.organizationId}` }],
      result: data.observationIds.map(id => ({ reference: `Observation/${id}` })),
      conclusion: data.conclusion
    };

    const response = await axios.post(
      `${this.baseUrl}/DiagnosticReport`,
      report,
      { headers: await this.getAuthHeaders() }
    );
    return response.data;
  }

  private async getAuthHeaders() {
    // Implement OAuth2 client credentials untuk SATUSEHAT
    const token = await this.getAccessToken();
    return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  }
}
```

---

### 7.2 Environment Variables

```env
# Backend
PORT=3001
NODE_ENV=production

# Database (InsForge)
DATABASE_URL=postgresql://user:pass@postgres:5432/iacclm

# AI
OPENROUTER_API_KEY=your_key
OPENROUTER_MODEL=openai/gpt-4o-mini

# SATUSEHAT FHIR
SATUSEHAT_FHIR_URL=https://api-satusehat.kemkes.go.id/fhir-r4/v1
SATUSEHAT_CLIENT_ID=your_client_id
SATUSEHAT_CLIENT_SECRET=your_client_secret

# Patient MPI (untuk lookup)
SATUSEHAT_MPI_URL=https://api-satusehat.kemkes.go.id/mpi/v1

# Frontend URL (CORS)
FRONTEND_URL=http://localhost:5173
```
