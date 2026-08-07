module.exports = {
  root: true,
  env: {
    node: true,
    browser: true,
    es2022: true,
  },
  extends: [
    'plugin:vue/vue3-recommended',
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  parser: 'vue-eslint-parser',
  parserOptions: {
    parser: '@typescript-eslint/parser',
    ecmaVersion: 'latest',
    sourceType: 'module',
    requireConfigFile: false,
  },
  rules: {
    // Vue.js rules
    'vue/multi-word-component-names': 'warn',
    'vue/no-unused-vars': 'warn',
    'vue/no-unused-components': 'off',
    'vue/require-default-prop': 'off',
    'vue/require-prop-types': 'warn',
    'vue/require-explicit-emits': 'off',
    'vue/prop-name-casing': 'off',
    'vue/no-v-html': 'off',
    'vue/no-template-shadow': 'off',
    'vue/component-name-in-template-casing': ['warn', 'PascalCase'],
    'vue/html-self-closing': ['warn', {
      html: {
        void: 'always',
        normal: 'always',
        component: 'always',
      },
    }],
    'vue/max-attributes-per-line': 'off',
    'vue/html-indent': 'off',
    'vue/script-indent': 'off',
    
    // JavaScript rules
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-unused-vars': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-require-imports': 'off',
    '@typescript-eslint/no-this-alias': 'off',
    'prefer-rest-params': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
    }],
    'no-var': 'error',
    'prefer-const': 'warn',
    'prefer-arrow-callback': 'warn',
    'prefer-template': 'warn',
    'object-shorthand': 'warn',
    'quote-props': ['warn', 'as-needed'],
    
    // Code quality
    'eqeqeq': 'off',
    'no-duplicate-imports': 'error',
    'no-useless-return': 'warn',
    'no-else-return': 'warn',
    'consistent-return': 'off', // Pode ser restritivo demais
    
    // Style (opcional - ajuste conforme preferência)
    'indent': 'off',
    'quotes': ['warn', 'double', { avoidEscape: true }],
    'semi': ['warn', 'always'],
    'comma-dangle': ['warn', 'always-multiline'],
    'arrow-spacing': 'warn',
    'space-before-function-paren': ['warn', {
      anonymous: 'always',
      named: 'never',
      asyncArrow: 'always',
    }],
  },
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'dist-mobile/',
    'dev-dist/',
    '*.min.js',
  ],
};
