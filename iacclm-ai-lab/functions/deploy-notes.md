# ============================================================
#  InsForge Functions — Deployment Config
#  Jalankan perintah berikut via InsForge MCP untuk deploy.
# ============================================================

# Deploy function: chat
# insforge functions create chat --entry functions/chat/index.ts
# insforge functions env set chat AI_PROVIDER=insforge
# insforge functions env set chat AI_MODEL=google/gemini-2.0-flash
# insforge functions env set chat INSFORGE_URL=https://qb9k5tnn.ap-southeast.insforge.app/
# insforge functions env set chat INSFORGE_ANON_KEY=ik_b1a7e494e3cce1c11b01742fa218c210

# Deploy function: interpret
# insforge functions create interpret --entry functions/interpret/index.ts
# insforge functions env set interpret AI_PROVIDER=insforge
# insforge functions env set interpret AI_MODEL=google/gemini-2.0-flash
# insforge functions env set interpret INSFORGE_URL=https://qb9k5tnn.ap-southeast.insforge.app/
# insforge functions env set interpret INSFORGE_ANON_KEY=ik_b1a7e494e3cce1c11b01742fa218c210
# insforge functions env set interpret SATUSEHAT_FHIR_URL=https://api-satusehat.kemkes.go.id/fhir-r4/v1
# insforge functions env set interpret SATUSEHAT_CLIENT_ID=your_client_id
# insforge functions env set interpret SATUSEHAT_CLIENT_SECRET=your_client_secret

# Deploy function: fhir-patient
# insforge functions create fhir-patient --entry functions/fhir-patient/index.ts
# insforge functions env set fhir-patient SATUSEHAT_FHIR_URL=https://api-satusehat.kemkes.go.id/fhir-r4/v1
# insforge functions env set fhir-patient SATUSEHAT_MPI_URL=https://api-satusehat.kemkes.go.id/mpi/v1
# insforge functions env set fhir-patient SATUSEHAT_CLIENT_ID=your_client_id
# insforge functions env set fhir-patient SATUSEHAT_CLIENT_SECRET=your_client_secret

# ─── Ganti model (opsional) ──────────────────────────────────────────────────
# Untuk Claude:
#   AI_MODEL=anthropic/claude-3.5-haiku   ← cepat
#   AI_MODEL=anthropic/claude-3.5-sonnet  ← terbaik
#
# Untuk Gemini terbaik:
#   AI_MODEL=google/gemini-2.5-pro
