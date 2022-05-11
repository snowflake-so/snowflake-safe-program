import { SHA256 } from 'crypto-js';
import create from 'keccak';

export class HashService {
  static keckka256(input: string | Buffer): Buffer {
    return create('keccak256').update(input).digest();
  }

  static sha256(message: string): Buffer {
    return Buffer.from(SHA256(message).toString(), 'hex');
  }
}
