import coreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

// eslint-config-next v16 exports native flat-config arrays, so FlatCompat is unnecessary
// (and in fact fails: routing these through @eslint/eslintrc throws on a circular plugin ref).
const eslintConfig = [
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'build/**',
      'coverage/**',
      'test-results/**',
      'playwright-report/**',
      'tmp/**',
      'next-env.d.ts',
    ],
  },
  ...coreWebVitals,
  ...nextTypescript,
  {
    rules: {
      // Allow `const { dropMe: _dropMe, ...rest } = obj` — discarding a key by destructuring
      // is intentional, not a forgotten variable.
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
    },
  },
];

export default eslintConfig;
