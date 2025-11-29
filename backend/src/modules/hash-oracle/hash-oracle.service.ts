import { Injectable, Logger } from '@nestjs/common';
import { randomBytes, createHash } from 'crypto';
import { hash } from 'starknet';
import { Fr } from '@aztec/aztec.js';
import { HashAlgorithm, SecretHashes } from './dto/hash.dto';

/**
 * Hash Oracle Service
 * 
 * Converts secrets and hashes between different hash functions:
 * - SHA256 (NEAR)
 * - Poseidon (Starknet)
 * - Pedersen (Aztec)
 * 
 * This is CRITICAL for cross-chain atomic swaps because:
 * - Same secret produces different hashes on different chains
 * - Backend needs to convert hashes for cross-chain coordination
 */
@Injectable()
export class HashOracleService {
  private readonly logger = new Logger(HashOracleService.name);

  /**
   * Generate a random secret and compute all hashes
   * 
   * @param length - Length of secret in bytes (default: 32)
   * @returns Secret and all hash variants
   */
  generateSecretAndHashes(length: number = 32): SecretHashes {
    const secret = randomBytes(length).toString('hex');
    
    this.logger.debug(`Generated secret of length ${length * 2} hex chars`);
    
    return {
      secret,
      sha256: this.computeSHA256(secret),
      poseidon: this.computePoseidon(secret),
      pedersen: this.computePedersen(secret),
    };
  }

  /**
   * SHA256 hash for NEAR
   * 
   * @param secret - Secret string (hex)
   * @returns SHA256 hash (hex string)
   */
  computeSHA256(secret: string): string {
    const hash = createHash('sha256')
      .update(Buffer.from(secret, 'hex'))
      .digest('hex');
    
    this.logger.debug(`SHA256: ${secret.substring(0, 10)}... -> ${hash.substring(0, 10)}...`);
    return hash;
  }

  /**
   * Poseidon hash for Starknet
   * 
   * @param secret - Secret string (hex)
   * @returns Poseidon hash (hex string with 0x prefix)
   */
  computePoseidon(secret: string): string {
    try {
      // Convert hex secret to BigInt
      const secretBuffer = Buffer.from(secret, 'hex');
      const secretBigInt = BigInt('0x' + secretBuffer.toString('hex'));
      
      // Compute Poseidon hash using Starknet.js
      const poseidonHash = hash.computeHashOnElements([secretBigInt]);
      
      this.logger.debug(`Poseidon: ${secret.substring(0, 10)}... -> ${poseidonHash.substring(0, 10)}...`);
      return poseidonHash;
    } catch (error) {
      this.logger.error(`Failed to compute Poseidon hash: ${error.message}`);
      throw new Error(`Poseidon hash computation failed: ${error.message}`);
    }
  }

  /**
   * Pedersen hash for Aztec
   * 
   * NOTE: Pedersen hashing is handled internally by Aztec contracts.
   * This function converts the secret to a Field element format.
   * The actual Pedersen hash is computed by the Aztec contract.
   * 
   * @param secret - Secret string (hex)
   * @returns Field element representation (hex string with 0x prefix)
   */
  computePedersen(secret: string): string {
    try {
      // Convert hex secret to Field element
      const secretBuffer = Buffer.from(secret, 'hex');
      const secretField = Fr.fromBuffer(secretBuffer);
      
      // Return the Field element representation
      // Actual Pedersen hash is computed by Aztec contract
      const hashString = '0x' + secretField.toString();
      this.logger.debug(`Pedersen (Field): ${secret.substring(0, 10)}... -> ${hashString.substring(0, 10)}...`);
      
      return hashString;
    } catch (error) {
      this.logger.error(`Failed to compute Pedersen field: ${error.message}`);
      throw new Error(`Pedersen field computation failed: ${error.message}`);
    }
  }

  /**
   * Verify that a secret matches a given hash
   * 
   * @param secret - Secret to verify
   * @param hashLock - Expected hash
   * @param algorithm - Hash algorithm used
   * @returns True if secret matches hash
   */
  verifySecret(
    secret: string,
    hashLock: string,
    algorithm: HashAlgorithm,
  ): boolean {
    try {
      let computedHash: string;

      switch (algorithm) {
        case HashAlgorithm.SHA256:
          computedHash = this.computeSHA256(secret);
          break;
        case HashAlgorithm.POSEIDON:
          computedHash = this.computePoseidon(secret);
          break;
        case HashAlgorithm.PEDERSEN:
          computedHash = this.computePedersen(secret);
          break;
        default:
          throw new Error(`Unsupported algorithm: ${algorithm}`);
      }

      const isValid = computedHash.toLowerCase() === hashLock.toLowerCase();
      
      this.logger.debug(
        `Verify ${algorithm}: ${isValid ? '✅ VALID' : '❌ INVALID'}`,
      );
      
      return isValid;
    } catch (error) {
      this.logger.error(`Secret verification failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Convert Pedersen hash to Poseidon hash
   * 
   * NOTE: This requires knowing the original secret!
   * Hash functions are one-way, so we need the secret to convert.
   * 
   * @param secret - Original secret
   * @returns Object with both hashes
   */
  convertPedersenToPoseidon(secret: string): {
    pedersen: string;
    poseidon: string;
  } {
    return {
      pedersen: this.computePedersen(secret),
      poseidon: this.computePoseidon(secret),
    };
  }

  /**
   * Convert Poseidon hash to Pedersen hash
   * 
   * NOTE: This requires knowing the original secret!
   * 
   * @param secret - Original secret
   * @returns Object with both hashes
   */
  convertPoseidonToPedersen(secret: string): {
    poseidon: string;
    pedersen: string;
  } {
    return {
      poseidon: this.computePoseidon(secret),
      pedersen: this.computePedersen(secret),
    };
  }

  /**
   * Get all hash variants for a secret
   * Useful for cross-chain swap coordination
   * 
   * @param secret - Secret to hash
   * @returns All hash variants
   */
  getAllHashes(secret: string): Omit<SecretHashes, 'secret'> {
    return {
      sha256: this.computeSHA256(secret),
      poseidon: this.computePoseidon(secret),
      pedersen: this.computePedersen(secret),
    };
  }
}
