module.exports = {
	root: true,
	"env": {
        "es2021": true
    },
	"parser": '@typescript-eslint/parser',
		"parserOptions": {
		"ecmaVersion": 12,
		"sourceType": 'module',
		tsconfigRootDir: __dirname,
		project: ['./tsconfig.json'],
	},
	"plugins": [
        "@typescript-eslint"
    ],
    "extends": [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
		"plugin:@typescript-eslint/recommended-requiring-type-checking"
    ],
    "rules": {
		"quotes": ["error", "double"],
		"semi": ["error"],
		"@typescript-eslint/explicit-module-boundary-types": "off",
		"no-var": "error",
		"prefer-const": "error",
		"@typescript-eslint/no-unsafe-assignment": "off",
		"@typescript-eslint/no-unsafe-member-access": "off",
    },
	"overrides": [
    {
      // enable the rule specifically for TypeScript files
      "files": ["*.ts", "*.tsx"],
      "rules": {
        "@typescript-eslint/explicit-module-boundary-types": ["error"]
      }
    }
  ]
};
