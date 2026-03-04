// Jest config para pruebas de INTEGRACIÓN (Caja Negra)
// Solo recolecta cobertura de infrastructure/, presentation/ y events/ — las capas que este nivel prueba.
const base = require('./jest.config');

module.exports = {
  ...base,
  collectCoverageFrom: [
    'src/infrastructure/**/*.(t|j)s',
    'src/presentation/**/*.(t|j)s',
    'src/events/**/*.(t|j)s',
  ],
  coverageDirectory: './coverage/integration',
};
