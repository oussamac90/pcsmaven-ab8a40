module.exports = {
  root: true,
  parser: '@typescript-eslint/parser', // v5.59.2
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true
    },
    project: './tsconfig.json'
  },

  env: {
    browser: true,
    es2022: true,
    node: true,
    jest: true
  },

  settings: {
    react: {
      version: 'detect'
    },
    'import/resolver': {
      typescript: {}
    }
  },

  extends: [
    'eslint:recommended', // v8.40.0
    'plugin:@typescript-eslint/recommended', // v5.59.2
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:react/recommended', // v7.32.2
    'plugin:react-hooks/recommended', // v4.6.0
    'plugin:jsx-a11y/recommended', // v6.7.1
    'plugin:import/errors', // v2.27.5
    'plugin:import/warnings',
    'plugin:import/typescript',
    'prettier' // v8.8.0
  ],

  plugins: [
    '@typescript-eslint',
    'react',
    'react-hooks',
    'jsx-a11y',
    'import'
  ],

  rules: {
    // TypeScript specific rules
    '@typescript-eslint/explicit-function-return-type': 'error',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': ['error', {
      'argsIgnorePattern': '^_'
    }],
    '@typescript-eslint/strict-null-checks': 'error',
    '@typescript-eslint/no-non-null-assertion': 'error',
    '@typescript-eslint/no-floating-promises': 'error',

    // React specific rules
    'react/react-in-jsx-scope': 'off', // Not needed in React 17+
    'react/prop-types': 'off', // Using TypeScript for prop validation
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',

    // Import ordering and organization
    'import/order': ['error', {
      'groups': [
        'builtin',
        'external',
        'internal',
        'parent',
        'sibling',
        'index'
      ],
      'newlines-between': 'always',
      'alphabetize': {
        'order': 'asc',
        'caseInsensitive': true
      }
    }],

    // General code quality rules
    'no-console': ['warn', {
      'allow': ['warn', 'error']
    }],

    // Accessibility rules
    'jsx-a11y/anchor-is-valid': ['error', {
      'components': ['Link'],
      'specialLink': ['to']
    }]
  }
};