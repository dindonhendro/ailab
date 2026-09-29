# Dokumen Kebutuhan Produk (PRD)
## Migrasi Supabase Cloud & Standarisasi Klinis IACCLM AI Lab

> [!IMPORTANT]
> Dokumen ini disusun sebagai panduan teknis dan fungsional untuk memigrasikan backend **IACCLM AI Lab** dari **InsForge** ke **Supabase Cloud**, serta mengimplementasikan fitur kecerdasan buatan berbasis **RAG (Retrieval-Augmented Generation)** dan standarisasi operasional laboratorium klinik.

---

## 1. Ringkasan Proyek & Tujuan

Proyek ini bertujuan untuk meningkatkan performa, kendali keamanan, akurasi interpretasi klinis, dan kepatuhan hukum pada aplikasi **IACCLM AI Lab**. 

### Tujuan Utama:
1. **Migrasi Infrastruktur:** Memindahkan penyimpanan data, autentikasi, dan serverless functions ke platform **Supabase Cloud** untuk kontrol penuh atas database PostgreSQL dan skema migrasi.
2. **Implementasi RAG Medis:** Memanfaatkan ekstensi `pgvector` di database Supabase untuk menyematkan (*embed*) dokumen pedoman resmi patologi klinik (seperti panduan IACCLM, PERKENI, KDIGO) sehingga AI Chat dapat memberikan interpretasi berbasis bukti ilmiah (*evidence-based*).
3. **Standarisasi Laboratorium (ISO 15189 & SATUSEHAT):**
   * Menerapkan peran pengguna (*role-based*) yang membedakan analis lab (*inputter*) dan dokter spesialis patologi klinik (*validator*).
   * Menambahkan sistem deteksi dan alarm untuk Nilai Kritis (*Critical Values*).
   * Merekam seluruh riwayat perubahan data melalui jejak audit (*Audit Trail*).

---

## 2. Parameter Kredensial Supabase

Berikut adalah kredensial proyek Supabase Cloud yang akan digunakan selama proses migrasi infrastruktur:

| Parameter | Nilai Kredensial |
| :--- | :--- |
| **Project ID** | `jhpouxabojzvggoqwlju` |
| **API Base URL** | `https://jhpouxabojzvggoqwlju.supabase.co` |
| **Anon Public Key** | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpocG91eGFib2p6dmdnb3F3bGp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxMzk3ODAsImV4cCI6MjEwMjcxNTc4MH0.qEtjOTdsP61GTaBs1LzyX4h7OzD13do7-bOwbEpYnB8` |

---

## 3. Peta Jalan Pengembangan (Roadmap)

### TAHAP 1: Migrasi Infrastruktur Dasar

Tahap ini berfokus pada perpindahan platform backend tanpa mengubah alur logika bisnis utama di frontend.

#### 1. Inisialisasi Proyek Supabase
* Menghubungkan aplikasi ke proyek Supabase dengan Project ID `jhpouxabojzvggoqwlju`.
* Menyiapkan file konfigurasi lingkungan (`.env`) baru di frontend dan Edge Functions untuk merujuk pada endpoint Supabase.

#### 2. Migrasi Skema Database
* Menjalankan kueri pembuatan tabel dasar dari [schema.sql](file:///c:/Users/Lenovo/Documents/cc_lab/iacclm-ai-lab/database/schema.sql) ke database PostgreSQL Supabase Cloud.
* Memastikan kebijakan keamanan baris database (*Row Level Security* - RLS) aktif dan berfungsi dengan baik menggunakan skema autentikasi Supabase.

#### 3. Pembaruan Frontend SDK
* Menghapus dependensi SDK InsForge:
  ```bash
  npm uninstall @insforge/sdk
  ```
* Memasang dependensi SDK resmi Supabase Client:
  ```bash
  npm install @supabase/supabase-js
  ```
* Menyesuaikan berkas inisialisasi client dari [insforge.ts](file:///c:/Users/Lenovo/Documents/cc_lab/iacclm-ai-lab/src/lib/insforge.ts) menjadi client Supabase yang mengekspor instance `supabase`.
* Memperbarui seluruh kueri database (Zustand store [chatStore.ts](file:///c:/Users/Lenovo/Documents/cc_lab/iacclm-ai-lab/src/stores/chatStore.ts) dan service API [api.ts](file:///c:/Users/Lenovo/Documents/cc_lab/iacclm-ai-lab/src/services/api.ts)) agar menggunakan sintaksis `supabase.from('table').select(...)`.

---

### TAHAP 2: Implementasi RAG untuk AI Chat

Tahap ini bertujuan untuk membekali AI dengan kemampuan pencarian dokumen pedoman laboratorium secara semantik menggunakan database vektor.

#### 1. Aktivasi Ekstensi `pgvector`
* Mengaktifkan ekstensi vektor pada database Supabase:
  ```sql
  CREATE EXTENSION IF NOT EXISTS vector;
  ```

#### 2. Desain Skema Tabel Dokumen Rujukan (`reference_documents`)
* Membuat tabel untuk menampung teks referensi ilmiah medis beserta nilai representasi vektornya (embeddings):
  ```sql
  CREATE TABLE IF NOT EXISTS reference_documents (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title       TEXT NOT NULL,
    category    TEXT NOT NULL, -- Contoh: 'kreatinin', 'glukosa', 'pedoman-umum'
    content     TEXT NOT NULL, -- Potongan paragraf pedoman medis
    embedding   vector(1536),  -- Menggunakan model text-embedding-3-small (1536 dimensi)
    created_at  TIMESTAMPTZ DEFAULT NOW()
  );
  ```

#### 3. Fungsi Database untuk Pencarian Semantik (`match_documents`)
* Membuat fungsi PostgreSQL di Supabase untuk menghitung *cosine similarity* dan mengambil dokumen terdekat:
  ```sql
  CREATE OR REPLACE FUNCTION match_documents (
    query_embedding vector(1536),
    match_threshold float,
    match_count int,
    filter_category text DEFAULT NULL
  ) RETURNS TABLE (
    id uuid,
    title text,
    category text,
    content text,
    similarity float
  ) AS $$
    SELECT
      id,
      title,
      category,
      content,
      1 - (embedding <=> query_embedding) AS similarity
    FROM reference_documents
    WHERE 1 - (embedding <=> query_embedding) > match_threshold
      AND (filter_category IS NULL OR category = filter_category)
    ORDER BY embedding <=> query_embedding LIMIT match_count;
  $$ LANGUAGE plpgsql;
  ```

#### 4. Integrasi Pipeline RAG di Edge Function
* Memperbarui Edge Function `chat` agar menerima pesan dari user, mengubah teks pesan terakhir menjadi embedding vektor via OpenAI Embeddings API, menjalankan fungsi `match_documents` di database, menyuntikkan dokumen referensi yang ditemukan ke dalam System Prompt AI, dan mengembalikan jawaban yang ilmiah.

---

### TAHAP 3: Penerapan Standarisasi Laboratorium Klinik

Tahap ini menerapkan fitur kepatuhan operasional medis agar aplikasi dapat digunakan dengan aman di lingkungan laboratorium riil.

#### 1. Verifikasi Berjenjang (Role-Based Access Control)
* Membagi hak akses pengguna berdasarkan profil:
  * **Analis Lab (Inputter):** Hanya dapat menginput hasil pemeriksaan, mengedit draf, dan mengirimkan draf ke supervisor. Tidak dapat memicu tombol pengiriman ke SATUSEHAT.
  * **Dokter Sp.PK (Validator):** Dapat membaca draf, melakukan penyuntingan kesimpulan medis, memvalidasi hasil lab (*release/release status*), dan melakukan pengiriman data final ke SATUSEHAT.
* Menerapkan kontrol kueri database menggunakan Supabase RLS (Row Level Security) agar tabel `diagnostic_reports` hanya dapat diubah statusnya menjadi `verified` oleh user dengan klaim role `dokter`.

#### 2. Sistem Peringatan Nilai Kritis (Critical Values Alerting)
* **Kriteria Deteksi:** Menambahkan kolom penentu nilai kritis pada basis data atau aturan di frontend. Misalnya:
  * Glukosa Darah Puasa: < 40 mg/dL atau > 400 mg/dL (Kritis).
  * Kreatinin Serum: > 500 μmol/L (Kritis).
* **Fitur Peringatan:**
  * **Frontend:** Jika analis memasukkan nilai yang masuk kategori kritis, layar akan memunculkan alarm pop-up berkedip merah terang dan memblokir sementara inputan sampai analis memberikan alasan konfirmasi verbal.
  * **Database/Backend:** Menyimpan status flag `is_critical` pada tabel `lab_results`.

#### 3. Log Audit Medis (Medical Audit Trail)
* Membuat tabel khusus untuk mencahat histori perubahan data penting untuk akreditasi ISO 15189:
  ```sql
  CREATE TABLE IF NOT EXISTS medical_audit_logs (
    id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id       UUID REFERENCES auth.users(id),
    session_id    UUID NOT NULL,
    action_type   TEXT NOT NULL, -- 'CREATE', 'UPDATE', 'VALIDATE', 'SUBMIT_SATUSEHAT'
    old_values    JSONB,
    new_values    JSONB,
    created_at    TIMESTAMPTZ DEFAULT NOW()
  );
  ```
* Membuat trigger PostgreSQL otomatis yang mencatat riwayat perubahan setiap kali ada kueri `UPDATE` pada tabel `lab_results` or `diagnostic_reports`.

---

## 4. Diagram Alur Data Validasi & SATUSEHAT

```mermaid
sequenceDiagram
    autonumber
    actor Analis as Analis Lab (Inputter)
    actor Dokter as Dokter Sp.PK (Validator)
    participant App as Frontend (React Client)
    participant DB as Supabase DB
    participant SH as SATUSEHAT API

    Analis->>App: Input IHS Pasien & Nilai Lab
    App->>App: Cek Batas Nilai Kritis
    alt Nilai Kritis Terdeteksi
        App-->>Analis: Tampilkan Alarm Merah & Form Konfirmasi Verbal
    end
    Analis->>App: Simpan Draf
    App->>DB: INSERT lab_sessions (status=draft)
    DB-->>App: Sukses
    Note over App,DB: Hasil Lab Siap Di-review
    
    Dokter->>App: Buka Halaman Review Sesi
    App->>DB: Fetch Sesi Status Draft
    DB-->>App: Return Data
    Dokter->>App: Review & Edit Kesimpulan AI
    Dokter->>App: Klik "Validasi & Kirim SATUSEHAT"
    App->>DB: UPDATE diagnostic_reports (status=verified)
    App->>SH: POST FHIR Bundle (Observation & DiagnosticReport)
    SH-->>App: Return SATUSEHAT Report ID
    App->>DB: UPDATE diagnostic_reports (status=submitted, satusehat_id)
    DB-->>App: Sukses
    App-->>Dokter: Tampilkan Laporan Berhasil Dikirim
```

---

## 5. Rencana Pengujian & Verifikasi

Sebelum aplikasi dirilis, serangkaian pengujian wajib dilakukan untuk memastikan integritas data medis:

### A. Tes Fungsional (Functional Testing)
1. **Verifikasi Autentikasi:** Memastikan pengguna dengan role `analis` ditolak (Error 403 / Access Denied) saat mencoba memvalidasi atau mengirim data ke SATUSEHAT.
2. **Peringatan Nilai Kritis:** Menginput data glukosa puasa bernilai `30` (hipoglikemia kritis) dan memastikan UI menampilkan komponen pop-up merah serta menyimpan flag kritis ke database.
3. **Pencarian RAG:** Menanyakan *"Berapa nilai rujukan Ureum untuk wanita?"* pada fitur AI Chat dan memastikan respon mengandung kalimat kutipan dokumen referensi yang tersimpan di tabel `reference_documents`.

### B. Tes Keamanan & Audit (Security & Audit Testing)
1. **Trigger Audit Log:** Melakukan perubahan (*update*) pada nilai lab salah satu pasien, lalu memverifikasi bahwa tabel `medical_audit_logs` merekam entri baru yang menunjukkan data lama (*old_value*) dan data baru (*new_value*).
2. **Uji Kebocoran RLS:** Memastikan pengguna A tidak dapat melihat draf hasil laboratorium pasien milik pengguna B dengan menembak API Supabase secara langsung tanpa token otorisasi yang valid.
