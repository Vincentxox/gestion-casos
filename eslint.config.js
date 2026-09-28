// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config')
const expoConfig = require('eslint-config-expo/flat')

module.exports = defineConfig([
  expoConfig,
  {
    // Las Edge Functions corren en Deno y se verifican en su propio paso de CI.
    ignores: ['dist/*', 'supabase/functions/*'],
  },
])
