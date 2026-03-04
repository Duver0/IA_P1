// Jest config para pruebas de INTEGRACIÓN (Caja Negra)
// Solo recolecta cobertura de infrastructure/, presentation/, scheduler/ y notifications/.
const base = require('./jest.config');

module.exports = {
  ...base,
  collectCoverageFrom: [
    'src/infrastructure/**/*.(t|j)s',
    'src/presentation/**/*.(t|j)s',
    'src/scheduler/**/*.(t|j)s',
    'src/notifications/**/*.(t|j)s',
  ],
  coverageDirectory: './coverage/integration',
};
