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
  // ⚕️ HUMAN CHECK - En CI, Jest se ejecuta por sub-conjuntos de directorios
  // para optimizar tiempos. Al ejecutar solo algunos tests, el total de
  // archivos recolectados permanece constante pero su cobertura baja,
  // causando fallos. Se deshabilita el umbral global en CI si se pasan argumentos de filtrado.
  coverageThreshold: !process.argv.some(arg => arg.includes('--testPathPatterns')) ? {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  } : undefined,
  coverageReporters: ["text", "text-summary", "lcov", "clover"],
};

export default config;
