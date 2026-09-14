import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // The dashboard intentionally keeps shared context hooks, provider
      // components, and small pure helpers together. These names are stable
      // exports, not accidental Fast Refresh boundaries.
      'react-refresh/only-export-components': [
        'warn',
        {
          allowConstantExport: true,
          allowExportNames: [
            'LOCALE_META',
            'gatewayLine',
            'sidecarSessionCreateParams',
            'useI18n',
            'useTheme',
          ],
        },
      ],
      // React Compiler's v7 advisory rules are not applicable to this
      // deliberately stateful dashboard layer: effects synchronize API and
      // gateway state, refs hold imperative terminal/portal handles, and
      // existing useMemo boundaries protect large derived route trees. The
      // behavioral contracts are covered by the web Vitest suite.
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      'react-hooks/static-components': 'off',
    },
  },
])
