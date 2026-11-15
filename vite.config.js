import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// base: './' => kisi bhi GitHub repo naam par chal jayega
export default defineConfig({
  base: './',
  build: { chunkSizeWarningLimit: 1000 },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png', 'favicon-64.png'],
      manifest: {
        name: 'Kharcha – Daily Expense Tracker',
        short_name: 'Kharcha',
        description: 'Daily expenses, salary balance & reports. Data saved in your Google Drive.',
        theme_color: '#6366f1',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: './',
        scope: './',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png}'],
        navigateFallbackDenylist: [/^\/__/]
      }
    })
  ]
})
