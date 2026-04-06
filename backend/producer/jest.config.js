module.exports = {
  displayName: '🚀 PRODUCER',
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/main.ts',
    '!src/app.module.ts',
    '!src/**/*.module.ts',
    '!src/**/*.schema.ts',
    '!src/**/index.ts',
    '!src/**/*.types.ts',
    '!src/**/*.type.ts',
    '!src/**/*.mock.ts',
    '!src/**/__mocks__/**',
    '!src/**/mocks/**',
    '!src/config/**',
  ],
  // Jest detecta todos los archivos en src/ pero solo ejecuta un sub-set, 
  // bajando artificialmente el reporte global por debajo del 90%.
  coverageThreshold: !process.argv.some(arg => arg.includes('--testPathPatterns')) ? {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  } : undefined,
  coverageDirectory: './coverage',
  coverageReporters: ['text', 'text-summary', 'lcov', 'clover'],
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/test'],
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
  },
};
