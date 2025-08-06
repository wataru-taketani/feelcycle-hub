module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true,
    jest: true,  // For test files
    browser: false,
  },
  extends: [
    'eslint:recommended',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    'no-console': 'off',  // Allow console in backend
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': 'off',  // Turn off for CI/CD
    'no-undef': 'off',  // Turn off for testing globals
  },
  ignorePatterns: [
    'dist/',
    'node_modules/',
    '*.js',
    'temp-*/',
    'lambda-*/',
    'cdk.out/',
    'layer*/',
    'function*/',
    'response*.json',
    'payload*.json',
    'test-*.json',
    'scripts/',
    'design/',
    'infrastructure/',
  ],
};