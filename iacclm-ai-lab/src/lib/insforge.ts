import { createClient } from '@insforge/sdk'

const rawUrl = import.meta.env.VITE_INSFORGE_URL as string
const insforgeAnonKey = import.meta.env.VITE_INSFORGE_ANON_KEY as string

const insforgeUrl = (rawUrl ?? '').trim().replace(/\/$/, '')

if (!insforgeUrl || !insforgeAnonKey) {
  console.warn(
    '[InsForge] VITE_INSFORGE_URL dan VITE_INSFORGE_ANON_KEY belum dikonfigurasi. ' +
      'Salin .env.example ke .env dan isi nilai yang sesuai.'
  )
}

export const insforge = createClient({
  baseUrl: insforgeUrl,
  anonKey: insforgeAnonKey ?? '',
})
