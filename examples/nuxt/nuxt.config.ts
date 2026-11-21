// The Vue components render on the server too, so the placeholders are in
// the first HTML, before any JavaScript runs.
export default defineNuxtConfig({
  compatibilityDate: '2026-11-01',
  devtools: { enabled: false },
  telemetry: false,
  css: ['~/assets/styles.css'],
  app: {
    head: {
      title: 'Dotquilt with Nuxt',
      htmlAttrs: { lang: 'en' },
    },
  },
  // `nuxt build` type-checks the templates with vue-tsc.
  typescript: { typeCheck: 'build' },
  vite: {
    // Hydration mismatches are reported in full, so tests/nuxt can catch one.
    define: { __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'true' },
  },
});
