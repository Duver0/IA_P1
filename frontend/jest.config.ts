import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  roots: ["<rootDir>/src"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  setupFilesAfterEnv: ["<rootDir>/src/__tests__/setup.ts"],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.json",
        jsx: "react-jsx",
      },
    ],
    ".+\\.(css|styl|less|sass|scss)$": "jest-transform-stub",
  },
  testMatch: ["**/__tests__/**/*.spec.ts", "**/__tests__/**/*.spec.tsx"],
  collectCoverage: true,
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/**/index.{ts,tsx}",
    "!src/**/*.types.{ts,tsx}",
    "!src/**/*.type.{ts,tsx}",
    "!src/**/*.mock.{ts,tsx}",
    "!src/**/__mocks__/**",
    "!src/**/mocks/**",
    "!src/__tests__/**",
    "!src/app/layout.tsx",
    "!src/styles/**",
    "!src/config/**",
    "!src/proxy.ts",
  ],
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
  coverageReporters: ["text", "text-summary", "lcov", "clover"],
};

export default config;
