/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: 'ts-jest',
  testURL: 'http://localhost:8080/',
  testEnvironment: 'jsdom',
  transform: {
    "^.+\\.vue$": "@vue/vue3-jest",
  },
};

