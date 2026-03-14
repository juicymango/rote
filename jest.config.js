module.exports = {
  testEnvironment: "node",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  transform: {
    "^.+\\.(ts|tsx)$": ["ts-jest", {
      tsconfig: "tsconfig.test.json",
    }],
    "^.+\\.(js|jsx)$": ["babel-jest"],
  },
  testMatch: [
    "**/__tests__/**/*.test.ts",
  ],
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/**/*.test.ts",
  ],
  transformIgnorePatterns: [
    "node_modules/(?!(@next-auth|next-test-api-route-handler|@faker-js|@prisma|@supabase)/)",
  ],
  testTimeout: 10000,
};