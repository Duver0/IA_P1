function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) throw new Error(`Missing env variable: ${name}`);
  return value;
}

function positiveInteger(name: string, fallback: number): number {
  const rawValue = process.env[name];
  const parsed = rawValue ? Number(rawValue) : fallback;
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

export const env = {
  get API_BASE_URL(): string {
    return required("NEXT_PUBLIC_API_BASE_URL", "http://localhost:3000");
  },
  get WS_URL(): string {
    return required("NEXT_PUBLIC_WS_URL", "http://localhost:3000");
  },
  get CONSULTORIOS_TOTAL(): number {
    return positiveInteger("NEXT_PUBLIC_CONSULTORIOS_TOTAL", 5);
  },
};
