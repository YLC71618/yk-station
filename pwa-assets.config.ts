import { defineConfig } from '@vite-pwa/assets-generator/config'

// Run `npm run icons` after changing public/icon.svg. The PNGs are committed.
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    transparent: { sizes: [64, 192, 512], favicons: [[48, 'favicon.ico']], padding: 0 },
    maskable: { sizes: [512], padding: 0.1, resizeOptions: { background: '#F7B6C2' } },
    apple: { sizes: [180], padding: 0, resizeOptions: { background: '#F7B6C2' } },
  },
  images: ['public/icon.svg'],
})
