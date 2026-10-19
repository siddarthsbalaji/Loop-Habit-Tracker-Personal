import {
  combinePresetAndAppleSplashScreens,
  defineConfig,
  minimal2023Preset,
} from '@vite-pwa/assets-generator/config';

const BACKGROUND = '#0B0D12';

/**
 * Generates favicon.ico, pwa-64/192/512, maskable-icon-512, apple-touch-icon-180
 * and iOS apple-touch-startup-image splash screens from `public/logo.svg`.
 *
 * Used automatically by vite-plugin-pwa (`pwaAssets.config: true`) during
 * `vite build` / `vite dev`, or standalone via `npm run generate-pwa-assets`.
 */
export default defineConfig({
  headLinkOptions: {
    preset: '2023',
  },
  preset: combinePresetAndAppleSplashScreens(
    {
      ...minimal2023Preset,
      maskable: {
        ...minimal2023Preset.maskable,
        padding: 0.2,
        resizeOptions: { background: BACKGROUND },
      },
      apple: {
        ...minimal2023Preset.apple,
        padding: 0,
        resizeOptions: { background: BACKGROUND },
      },
    },
    {
      padding: 0.6,
      resizeOptions: { background: BACKGROUND, fit: 'contain' },
      darkResizeOptions: { background: BACKGROUND, fit: 'contain' },
      linkMediaOptions: {
        log: true,
        addMediaScreen: true,
        basePath: '/',
        xhtml: false,
      },
      png: { compressionLevel: 9, quality: 70 },
    },
    [
      'iPhone SE 4.7"',
      'iPhone 13 mini',
      'iPhone 14',
      'iPhone 14 Plus',
      'iPhone 15 Pro',
      'iPhone 15 Pro Max',
      'iPhone 16 Pro',
      'iPhone 16 Pro Max',
      'iPhone 17 Pro',
      'iPhone Air',
    ],
  ),
  images: ['public/logo.svg'],
});
