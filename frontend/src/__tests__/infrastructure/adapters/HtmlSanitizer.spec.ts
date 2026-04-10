import { HtmlSanitizer } from "@/infrastructure/adapters/HtmlSanitizer";

describe("HtmlSanitizer", () => {
  let sanitizer: HtmlSanitizer;

  beforeEach(() => {
    sanitizer = new HtmlSanitizer();
  });

  it("removes angle brackets", () => {
    expect(sanitizer.sanitize("<div>hello</div>")).toBe("divhello/div");
  });

  it('removes "script" keyword (case-insensitive)', () => {
    expect(sanitizer.sanitize("alert(Script)")).toBe("alert()");
    expect(sanitizer.sanitize("SCRIPT")).toBe("");
    expect(sanitizer.sanitize("ScRiPt")).toBe("");
  });

  it("trims whitespace", () => {
    expect(sanitizer.sanitize("  hello  ")).toBe("hello");
  });

  it("handles combined XSS attempt", () => {
    const input = '<script>alert("xss")</script>';
    const result = sanitizer.sanitize(input);
    expect(result).not.toContain("<");
    expect(result).not.toContain(">");
    expect(result.toLowerCase()).not.toContain("script");
  });

  it("returns empty string for whitespace-only input", () => {
    expect(sanitizer.sanitize("   ")).toBe("");
  });

  it("passes through clean strings unchanged", () => {
    expect(sanitizer.sanitize("Carlos Pérez")).toBe("Carlos Pérez");
  });



  it("removes MongoDB $gt operator", () => {
    expect(sanitizer.sanitize("$gt")).toBe("");
  });

  it("removes MongoDB $where operator", () => {
    expect(sanitizer.sanitize("$where")).toBe("");
  });

  it("removes MongoDB $regex operator", () => {
    expect(sanitizer.sanitize("$regex")).toBe("");
  });

  it("strips NoSQL injection payload embedded in a string", () => {

    const result = sanitizer.sanitize("admin@eps.com$gt");
    expect(result).not.toContain("$");
  });

  it("removes multiple NoSQL operators in a single input", () => {
    const result = sanitizer.sanitize("$gt$where$regex");
    expect(result).toBe("");
  });



  it("removes __proto__ pollution attempt", () => {
    expect(sanitizer.sanitize("__proto__")).toBe("");
  });

  it("removes constructor pollution attempt", () => {
    expect(sanitizer.sanitize("constructor")).toBe("");
  });
});
