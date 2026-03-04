// Jest config para pruebas de COMPONENTE (Caja Blanca)
// Solo recolecta cobertura de hooks/ y components/ — las capas que este nivel prueba.
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
    'src/hooks/**/*.{ts,tsx}',
    'src/components/**/*.{ts,tsx}',
  ],
  coverageDirectory: './coverage/component',
  coverageReporters: ['text', 'text-summary', 'lcov', 'clover'],
};

export default config;
