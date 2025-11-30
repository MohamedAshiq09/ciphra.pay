import { Controller, Post, Get, Body, Logger } from '@nestjs/common';
import { HashOracleService } from './hash-oracle.service';
import { ConvertHashDto, GenerateSecretDto, VerifySecretDto } from './dto/hash.dto';

/**
 * Hash Oracle Controller
 *
 * Exposes hash conversion API for X402 cross-chain swaps.
 * This is the "magic" that makes cross-chain atomic swaps possible!
 */
@Controller('hash-oracle')
export class HashOracleController {
  private readonly logger = new Logger(HashOracleController.name);

  constructor(private readonly hashOracleService: HashOracleService) {}

  /**
   * GET /api/hash-oracle/health
   * Check if hash oracle is working
   */
  @Get('health')
  getHealth() {
    return {
      status: 'healthy',
      service: 'Hash Oracle',
      algorithms: ['sha256', 'poseidon', 'pedersen'],
      chains: {
        sha256: 'NEAR, Zcash',
        poseidon: 'Starknet, Mina',
        pedersen: 'Aztec',
      },
      description: 'Cross-chain hash conversion for atomic swaps',
    };
  }

  /**
   * POST /api/hash-oracle/generate
   * Generate a random secret and all hash variants
   *
   * Request body: { length?: number }
   * Response: {
   *   secret: string,
   *   sha256: string,
   *   poseidon: string,
   *   pedersen: string
   * }
   */
  @Post('generate')
  generateSecret(@Body() dto: GenerateSecretDto) {
    this.logger.log('Generating secret and computing all hashes');

    const result = this.hashOracleService.generateSecretAndHashes(
      dto.length || 32,
    );

    this.logger.log(
      `Secret generated: ${result.secret.substring(0, 10)}...`,
    );

    return {
      secret: result.secret,
      hashes: {
        sha256: result.sha256,
        poseidon: result.poseidon,
        pedersen: result.pedersen,
      },
      usage: {
        sha256: 'Use this for NEAR and Zcash contracts',
        poseidon: 'Use this for Starknet and Mina contracts',
        pedersen: 'Use this for Aztec contracts',
      },
      note: 'All hashes are computed from the SAME secret - this enables atomic swaps!',
    };
  }

  /**
   * POST /api/hash-oracle/convert
   * Convert a secret to all hash variants
   *
   * Request body: { secret: string }
   * Response: {
   *   sha256: string,
   *   poseidon: string,
   *   pedersen: string
   * }
   */
  @Post('convert')
  convertSecret(@Body() dto: ConvertHashDto) {
    this.logger.log(
      `Converting secret: ${dto.secret.substring(0, 10)}...`,
    );

    const hashes = this.hashOracleService.getAllHashes(dto.secret);

    return {
      input: {
        secret: dto.secret.substring(0, 10) + '...' + dto.secret.substring(dto.secret.length - 6),
        length: dto.secret.length,
      },
      hashes: {
        sha256: hashes.sha256,
        poseidon: hashes.poseidon,
        pedersen: hashes.pedersen,
      },
      chains: {
        near: { algorithm: 'SHA256', hash: hashes.sha256 },
        zcash: { algorithm: 'SHA256', hash: hashes.sha256 },
        starknet: { algorithm: 'Poseidon', hash: hashes.poseidon },
        mina: { algorithm: 'Poseidon', hash: hashes.poseidon },
        aztec: { algorithm: 'Pedersen', hash: hashes.pedersen },
      },
      note: 'Same secret → Different hashes for different chains!',
    };
  }

  /**
   * POST /api/hash-oracle/verify
   * Verify that a secret matches a hash for a specific algorithm
   *
   * Request body: {
   *   secret: string,
   *   hashLock: string,
   *   algorithm: 'sha256' | 'poseidon' | 'pedersen'
   * }
   */
  @Post('verify')
  verifySecret(@Body() dto: VerifySecretDto) {
    this.logger.log(
      `Verifying secret against ${dto.algorithm} hash`,
    );

    const isValid = this.hashOracleService.verifySecret(
      dto.secret,
      dto.hashLock,
      dto.algorithm,
    );

    return {
      valid: isValid,
      algorithm: dto.algorithm,
      message: isValid
        ? `✅ Secret matches ${dto.algorithm} hash`
        : `❌ Secret does NOT match ${dto.algorithm} hash`,
    };
  }

  /**
   * POST /api/hash-oracle/convert-for-swap
   * Convert secret for cross-chain atomic swap
   * Returns hashes needed for specific chain pairs
   *
   * Request body: {
   *   secret: string,
   *   sourceChain: 'starknet' | 'aztec' | 'near' | 'zcash' | 'mina',
   *   destChain: 'starknet' | 'aztec' | 'near' | 'zcash' | 'mina'
   * }
   */
  @Post('convert-for-swap')
  convertForSwap(@Body() dto: { secret: string; sourceChain: string; destChain: string }) {
    this.logger.log(
      `Converting secret for swap: ${dto.sourceChain} → ${dto.destChain}`,
    );

    const allHashes = this.hashOracleService.getAllHashes(dto.secret);

    // Map chains to their hash algorithms
    const chainToHash = {
      near: { algorithm: 'SHA256', hash: allHashes.sha256 },
      zcash: { algorithm: 'SHA256', hash: allHashes.sha256 },
      starknet: { algorithm: 'Poseidon', hash: allHashes.poseidon },
      mina: { algorithm: 'Poseidon', hash: allHashes.poseidon },
      aztec: { algorithm: 'Pedersen', hash: allHashes.pedersen },
    };

    const sourceHash = chainToHash[dto.sourceChain.toLowerCase()];
    const destHash = chainToHash[dto.destChain.toLowerCase()];

    if (!sourceHash || !destHash) {
      return {
        error: 'Invalid chain specified',
        supportedChains: ['near', 'zcash', 'starknet', 'mina', 'aztec'],
      };
    }

    return {
      swap: {
        from: dto.sourceChain,
        to: dto.destChain,
      },
      sourceChain: {
        chain: dto.sourceChain,
        algorithm: sourceHash.algorithm,
        hashLock: sourceHash.hash,
        instruction: `User locks funds with ${sourceHash.algorithm} hash on ${dto.sourceChain}`,
      },
      destChain: {
        chain: dto.destChain,
        algorithm: destHash.algorithm,
        hashLock: destHash.hash,
        instruction: `Backend locks funds with ${destHash.algorithm} hash on ${dto.destChain}`,
      },
      flow: [
        `1. User initiates swap on ${dto.sourceChain} with ${sourceHash.algorithm} hash`,
        `2. Backend detects event and creates counterparty swap on ${dto.destChain}`,
        `3. Backend uses ${destHash.algorithm} hash (same secret, different hash!)`,
        `4. User reveals secret on ${dto.destChain} to claim funds`,
        `5. Backend uses revealed secret to complete ${dto.sourceChain} side`,
        `6. ✅ Atomic swap complete!`,
      ],
      note: 'This is the X402 cross-chain atomic swap protocol!',
    };
  }
}
