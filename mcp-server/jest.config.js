/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.test.ts"],
  moduleFileExtensions: ["ts", "js", "json"],
  moduleNameMapper: {
    // Strip .js extensions so ts-jest can find .ts files
    "^(\\.\\.?/.*)\\.js$": "$1",
    // Map @modelcontextprotocol/sdk subpaths to CJS dist
    "^@modelcontextprotocol/sdk/(.*)$":
      "<rootDir>/node_modules/@modelcontextprotocol/sdk/dist/cjs/$1",
  },
};
