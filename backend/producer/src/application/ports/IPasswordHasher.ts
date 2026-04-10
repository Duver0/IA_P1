
export interface IPasswordHasher {
  hash(value: string): Promise<string>;
  compare(candidate: string, hashed: string): Promise<boolean>;
}