import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';

const config = [
  {
    ignores: ['.next/**', 'node_modules/**', 'dist/**', 'build/**'],
  },
  ...nextCoreWebVitals,
  {
    rules: {
      // This rule is overly strict for this codebase and triggers on valid UI patterns.
      'react-hooks/set-state-in-effect': 'off',

      // Allow suppressions without warning spam (common in API route glue code).
      'eslint-comments/no-unused-disable': 'off',

      // Allow default export in config files and simple modules.
      'import/no-anonymous-default-export': 'off',

      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      'prefer-const': 'off',
      'react/jsx-no-undef': 'off',
      'react/no-unescaped-entities': 'off',
      'react-hooks/exhaustive-deps': 'off',
      '@next/next/no-img-element': 'warn',
      'jsx-a11y/alt-text': 'warn',
    },
  },
];

export default config;

