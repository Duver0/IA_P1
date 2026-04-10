
export interface IAccessTokenVerifier {
  verifyToken(token: string): Record<string, unknown> | null;
}