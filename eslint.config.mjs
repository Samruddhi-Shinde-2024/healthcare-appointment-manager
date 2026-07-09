// import eslint from '@eslint/js';
// import prettier from 'eslint-config-prettier';
// import globals from 'globals';
// import tseslint from 'typescript-eslint';

// export default tseslint.config(
//   {
//     ignores: ['**/dist/**', '**/coverage/**', '**/node_modules/**'],
//   },
//   eslint.configs.recommended,
//   ...tseslint.configs.recommendedTypeChecked,
//   {
//     files: ['**/*.ts', '**/*.tsx'],
//     languageOptions: {
//       parserOptions: {
//         projectService: true,
//         tsconfigRootDir: import.meta.dirname,
//       },
//       globals: {
//         ...globals.node,
//         ...globals.browser,
//       },
//     },
//     rules: {
//       '@typescript-eslint/consistent-type-imports': 'error',
//       '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: false }],
//     },
//   },
//   prettier,
// );

import eslint from '@eslint/js';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/coverage/**',
      '**/node_modules/**',

      '**/*.config.js',
      '**/*.config.cjs',
      '**/*.config.mjs',

      '**/postcss.config.js',

      '**/tailwind.config.ts',
      '**/vite.config.ts',
    ],
  },

  eslint.configs.recommended,

  {
    files: ['**/*.ts', '**/*.tsx'],

    extends: [...tseslint.configs.recommendedTypeChecked],

    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },

      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },

    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-misused-promises': [
        'error',
        {
          checksVoidReturn: false,
        },
      ],

      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
        },
      ],
    },
  },

  prettier,
);
