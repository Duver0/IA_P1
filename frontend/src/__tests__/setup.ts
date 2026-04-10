jest.mock("@/config/env", () => ({
  env: {
    API_BASE_URL: "http://localhost:3000",
    WS_URL: "http://localhost:3000",
    CONSULTORIOS_TOTAL: 5,
  },
}));

import "@testing-library/jest-dom";
