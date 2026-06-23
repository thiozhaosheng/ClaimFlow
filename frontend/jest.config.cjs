/**
 * Jest config for the ClaimFlow client.
 *
 * The project is ESM (package.json "type":"module") and uses JSX, so we
 * transpile test files with babel-jest. Babel presets are passed inline here
 * rather than via a project-wide babel.config so Vite's own React plugin is
 * left untouched.
 */
module.exports = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.cjs"],
  roots: ["<rootDir>/src"],
  testMatch: ["**/*.test.{js,jsx}"],
  transform: {
    "^.+\\.[jt]sx?$": [
      "babel-jest",
      {
        presets: [
          ["@babel/preset-env", { targets: { node: "current" } }],
          ["@babel/preset-react", { runtime: "automatic" }],
        ],
      },
    ],
  },
  moduleNameMapper: {
    // Stub CSS/asset imports so component tests don't choke on them.
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",
  },
  clearMocks: true,
};
