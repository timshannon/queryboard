/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
const esModules = ['@cds', "lit", "@lit", "ramda"].join('|'); 
module.exports = {
	preset: 'ts-jest',
	testURL: 'http://localhost:8080/',
	testEnvironment: 'jsdom',
	transform: {
	"^.+\\.vue$": "@vue/vue3-jest",
	'^.+\\.js$': 'babel-jest',
	},
	transformIgnorePatterns: [`/node_modules/(?!${esModules})`],
	globals: {
	  'vue-jest': {
		compilerOptions: {
		  isCustomElement: (tag) => tag.startsWith("cds-"),
		},
	  },
	},
	setupFilesAfterEnv: ["./test/jest.setup.js"],
};

