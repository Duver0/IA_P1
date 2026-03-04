// Jest config para pruebas de COMPONENTE (Caja Blanca)
// Solo recolecta cobertura de domain/ y application/ — las capas que este nivel prueba.
const base = require('./jest.config');

module.exports = {
  ...base,
  collectCoverageFrom: [
    'src/domain/**/*.(t|j)s',
    'src/application/**/*.(t|j)s',
  ],
  coverageDirectory: './coverage/component',
};
