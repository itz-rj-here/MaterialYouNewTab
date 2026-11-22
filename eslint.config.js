export default [
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "coverage/**",
      "data/**"
    ]
  },
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      globals: {
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        console: "readonly",
        localStorage: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        fetch: "readonly",
        chrome: "readonly",
        browser: "readonly",
        process: "readonly"
      }
    },
    rules: {
      "no-unused-vars": "off",
      "no-undef": "off"
    }
  }
];
