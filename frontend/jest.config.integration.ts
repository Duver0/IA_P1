// Jest config para pruebas de INTEGRACIÓN (Caja Negra)
// Solo recolecta cobertura de infrastructure/, providers/ y app/.
import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  transform: {
    '^.+\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.json', jsx: 'react-jsx' }],
    '.+\\.(css|styl|less|sass|scss)$': 'jest-transform-stub',
  },
  testMatch: ['**/__tests__/**/*.spec.ts', '**/__tests__/**/*.spec.tsx'],
  collectCoverageFrom: [
    'src/infrastructure/**/*.{ts,tsx}',
    'src/providers/**/*.{ts,tsx}',
    'src/app/**/*.{ts,tsx}',
    '!src/app/layout.tsx',
  ],
  coverageDirectory: './coverage/integration',
  coverageReporters: ['text', 'text-summary', 'lcov', 'clover'],
};

export default config;
