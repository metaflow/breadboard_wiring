module.exports = {
  roots: [
    "<rootDir>/client"
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testMatch: [
    "**/__tests__/**/*.+(ts|tsx|js)",
    "**/?(*.)+(spec|test).+(ts|tsx|js)"
  ],
  transform: {
    "^.+\\.(ts|tsx)$": "ts-jest"
  },
  // preset: "jest-puppeteer",
  // verbose: true,
};