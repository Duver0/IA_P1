import { CircuitBreaker } from "@/infrastructure/http/CircuitBreaker";

describe("CircuitBreaker", () => {
  let cb: CircuitBreaker;

  beforeEach(() => {
    cb = new CircuitBreaker(3, 1000);
  });

  it("starts in CLOSED state", () => {
    expect(cb.getState()).toBe("CLOSED");
    expect(cb.canRequest()).toBe(true);
  });

  it("stays CLOSED when failures are below threshold", () => {
    cb.fail();
    cb.fail();
    expect(cb.getState()).toBe("CLOSED");
    expect(cb.canRequest()).toBe(true);
  });

  it("transitions to OPEN after reaching failure threshold", () => {
    cb.fail();
    cb.fail();
    cb.fail();
    expect(cb.getState()).toBe("OPEN");
    expect(cb.canRequest()).toBe(false);
  });

  it("resets failures on success()", () => {
    cb.fail();
    cb.fail();
    cb.success();
    expect(cb.getState()).toBe("CLOSED");

    cb.fail();
    cb.fail();
    expect(cb.getState()).toBe("CLOSED");
  });

  it("transitions to HALF_OPEN after cooldown expires", () => {
    cb.fail();
    cb.fail();
    cb.fail();
    expect(cb.getState()).toBe("OPEN");


    jest.spyOn(Date, "now").mockReturnValue(Date.now() + 2000);

    expect(cb.canRequest()).toBe(true);
    expect(cb.getState()).toBe("HALF_OPEN");

    jest.restoreAllMocks();
  });

  it("returns to CLOSED from HALF_OPEN on success", () => {
    cb.fail();
    cb.fail();
    cb.fail();

    jest.spyOn(Date, "now").mockReturnValue(Date.now() + 2000);
    cb.canRequest();

    cb.success();
    expect(cb.getState()).toBe("CLOSED");

    jest.restoreAllMocks();
  });

  it("returns to OPEN from HALF_OPEN on fail", () => {
    cb.fail();
    cb.fail();
    cb.fail();

    const base = Date.now();
    jest.spyOn(Date, "now").mockReturnValue(base + 2000);
    cb.canRequest();


    cb.fail();
    cb.fail();
    cb.fail();
    expect(cb.getState()).toBe("OPEN");

    jest.restoreAllMocks();
  });

  it("uses default threshold and cooldown", () => {
    const defaultCb = new CircuitBreaker();
    for (let i = 0; i < 5; i++) defaultCb.fail();
    expect(defaultCb.getState()).toBe("OPEN");
  });
});
