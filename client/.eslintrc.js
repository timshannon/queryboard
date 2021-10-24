module.exports = {
	root: true,
    "env": {
        "es2021": true
    },
    "extends": [
        "eslint:recommended",
        "plugin:vue/essential",
		"plugin:vue/vue3-recommended",
        "plugin:@typescript-eslint/recommended",
		"plugin:@typescript-eslint/recommended-requiring-type-checking"
    ],
	"parser": "vue-eslint-parser",
    "parserOptions": {
        "ecmaVersion": 2020,
        "parser": "@typescript-eslint/parser",
		project: ["./tsconfig.json"],
        "sourceType": "module",
		extraFileExtensions: [".vue"],
    },
    "plugins": [
        "vue",
        "@typescript-eslint"
    ],
    "rules": {
		"quotes": ["error", "double", "avoid-escape"],
		"semi": ["error"],
		"no-var": "error",
		"prefer-const": "error",
		"@typescript-eslint/explicit-module-boundary-types": "off",
		"@typescript-eslint/no-unsafe-assignment": "off",
		"@typescript-eslint/no-unsafe-member-access": "off",
		"@typescript-eslint/no-unsafe-argument": "off",
		"@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
		"@typescript-eslint/restrict-template-expressions": "off",
		"@typescript-eslint/no-unsafe-call": "off",
		"vue/singleline-html-element-content-newline": "off",
		"vue/html-self-closing": "off",
		 "vue/max-attributes-per-line": "off",
    },
	"overrides": []
};
