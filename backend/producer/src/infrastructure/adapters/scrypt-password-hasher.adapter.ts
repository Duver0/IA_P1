import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { IPasswordHasher } from '../../application/ports/IPasswordHasher';


export class ScryptPasswordHasherAdapter implements IPasswordHasher {
  async hash(value: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    const digest = scryptSync(value, salt, 64).toString('hex');
    return `${salt}:${digest}`;
  }

  async compare(candidate: string, hashed: string): Promise<boolean> {
    const parts = hashed.split(':');
    if (parts.length !== 2) {
      return false;
    }

    const [salt, storedDigest] = parts;
    const candidateDigest = scryptSync(candidate, salt, 64).toString('hex');

    return timingSafeEqual(Buffer.from(candidateDigest, 'hex'), Buffer.from(storedDigest, 'hex'));
  }
}