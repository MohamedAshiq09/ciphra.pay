import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { SwapCoordinatorService } from './swap-coordinator.service';
import { AztecService } from '../aztec/aztec.service';
import { StarknetService } from '../starknet/starknet.service';
import { HashOracleService } from '../hash-oracle/hash-oracle.service';
import {
  InitiateCrossChainSwapDto,
  GetSwapQuoteDto,
  SwapChain,
  SwapInitiationResponse,
  SwapQuoteResponse,
} from './dto/swap.dto';

@Controller('swap')
export class SwapController {
  private readonly logger = new Logger(SwapController.name);

  constructor(
    private swapCoordinator: SwapCoordinatorService,
    private aztecService: AztecService,
    private starknetService: StarknetService,
    private hashOracleService: HashOracleService,
  ) {}

  /**
   * Get swap mapping by ID
   */
  @Get(':swapId')
  async getSwap(@Param('swapId') swapId: string) {
    const mapping = this.swapCoordinator.getSwapMapping(swapId);

    if (!mapping) {
      return {
        success: false,
        message: 'Swap not found',
      };
    }

    return {
      success: true,
      data: mapping,
    };
  }

  /**
   * Get all swaps
   */
  @Get()
  async getAllSwaps() {
    const swaps = this.swapCoordinator.getAllSwapMappings();
    const stats = this.swapCoordinator.getStats();

    return {
      success: true,
      data: {
        swaps,
        stats,
      },
    };
  }

  /**
   * Get bridge statistics
   */
  @Get('bridge/stats')
  async getBridgeStats() {
    const [totalSwaps, completedSwaps, feePercentage] = await Promise.all([
      this.aztecService.getTotalSwaps(),
      this.aztecService.getCompletedSwaps(),
      this.aztecService.getFeePercentage(),
    ]);

    const coordinatorStats = this.swapCoordinator.getStats();

    return {
      success: true,
      data: {
        aztec: {
          totalSwaps: totalSwaps.toString(),
          completedSwaps: completedSwaps.toString(),
          feePercentage: feePercentage.toString(),
        },
        coordinator: coordinatorStats,
      },
    };
  }

  /**
   * POST /api/swap/quote
   * Get a price quote for a cross-chain swap
   */
  @Post('quote')
  @HttpCode(HttpStatus.OK)
  async getQuote(@Body() dto: GetSwapQuoteDto): Promise<SwapQuoteResponse> {
    this.logger.log(
      `Quote request: ${dto.sourceChain} → ${dto.destChain}, amount: ${dto.sourceAmount}`,
    );

    // Validate chain pair
    if (dto.sourceChain === dto.destChain) {
      return {
        success: false,
        sourceChain: dto.sourceChain,
        destChain: dto.destChain,
        sourceAmount: dto.sourceAmount,
        destAmount: '0',
        exchangeRate: '0',
        fees: {
          serviceFee: '0',
          serviceFeePercent: '0',
          networkFee: '0',
        },
        estimatedTime: '0',
        validUntil: new Date(),
      };
    }

    // Calculate exchange rate (simplified - in production, use oracle)
    const exchangeRates: Record<string, Record<string, number>> = {
      starknet: { aztec: 0.04, near: 0.25, zcash: 0.015 },
      aztec: { starknet: 25, near: 6.25, zcash: 0.375 },
      near: { starknet: 4, aztec: 0.16, zcash: 0.06 },
      zcash: { starknet: 66.67, aztec: 2.67, near: 16.67 },
    };

    const rate = exchangeRates[dto.sourceChain]?.[dto.destChain] || 1;
    const sourceAmountNum = parseFloat(dto.sourceAmount);
    const destAmountNum = sourceAmountNum * rate;

    // Service fee: 0.3%
    const serviceFeePercent = 0.003;
    const serviceFee = sourceAmountNum * serviceFeePercent;
    const networkFee = 0.001; // Fixed network fee

    return {
      success: true,
      sourceChain: dto.sourceChain,
      destChain: dto.destChain,
      sourceAmount: dto.sourceAmount,
      destAmount: destAmountNum.toFixed(6),
      exchangeRate: rate.toString(),
      fees: {
        serviceFee: serviceFee.toFixed(6),
        serviceFeePercent: (serviceFeePercent * 100).toString() + '%',
        networkFee: networkFee.toString(),
      },
      estimatedTime: '2-5 minutes',
      validUntil: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
    };
  }

  /**
   * POST /api/swap/initiate
   *
   * MAIN ENDPOINT: Initiate a cross-chain atomic swap
   *
   * Flow:
   * 1. Generate secret and compute hashes for all chains
   * 2. Create swap IDs
   * 3. Return parameters to user
   * 4. User locks funds on source chain with returned hash
   * 5. Backend detects event and creates counterparty on dest chain
   * 6. User reveals secret on dest chain to claim
   * 7. Backend extracts secret and completes source chain
   */
  @Post('initiate')
  @HttpCode(HttpStatus.CREATED)
  async initiateSwap(
    @Body() dto: InitiateCrossChainSwapDto,
  ): Promise<SwapInitiationResponse> {
    this.logger.log(
      `🚀 Initiating swap: ${dto.sourceChain} → ${dto.destChain}`,
    );
    this.logger.log(`   Amount: ${dto.sourceAmount}`);
    this.logger.log(`   User addresses: ${JSON.stringify(dto.userAddresses)}`);

    // Validate chain pair
    if (dto.sourceChain === dto.destChain) {
      throw new Error('Source and destination chains must be different');
    }

    // Validate user addresses
    const sourceAddress = dto.userAddresses[dto.sourceChain];
    const destAddress = dto.userAddresses[dto.destChain];

    if (!sourceAddress || !destAddress) {
      throw new Error(
        `Missing addresses: need ${dto.sourceChain} and ${dto.destChain} addresses`,
      );
    }

    // Generate or use provided secret
    let secret: string;
    let hashes: { sha256: string; poseidon: string; pedersen: string };

    if (dto.secret) {
      secret = dto.secret;
      hashes = this.hashOracleService.getAllHashes(secret);
    } else {
      const generated = this.hashOracleService.generateSecretAndHashes(32);
      secret = generated.secret;
      hashes = {
        sha256: generated.sha256,
        poseidon: generated.poseidon,
        pedersen: generated.pedersen,
      };
    }

    this.logger.log(`   Secret: ${secret.substring(0, 10)}...`);
    this.logger.log(`   Poseidon hash: ${hashes.poseidon.substring(0, 20)}...`);
    this.logger.log(`   Pedersen hash: ${hashes.pedersen.substring(0, 20)}...`);

    // Generate unique swap IDs
    const timestamp = Date.now();
    const sourceSwapId = `${dto.sourceChain}_${timestamp}`;
    const destSwapId = `${dto.destChain}_${timestamp}`;

    // Calculate time locks
    const sourceTimeLock = dto.timeLockSeconds || 7200; // 2 hours
    const destTimeLock = Math.floor(sourceTimeLock / 2); // Half of source (1 hour)

    // Calculate destination amount (simplified exchange rate)
    const exchangeRates: Record<string, Record<string, number>> = {
      starknet: { aztec: 0.04, near: 0.25, zcash: 0.015 },
      aztec: { starknet: 25, near: 6.25, zcash: 0.375 },
      near: { starknet: 4, aztec: 0.16, zcash: 0.06 },
      zcash: { starknet: 66.67, aztec: 2.67, near: 16.67 },
    };

    const rate = exchangeRates[dto.sourceChain]?.[dto.destChain] || 1;
    const sourceAmountNum = parseFloat(dto.sourceAmount);
    const destAmountNum = sourceAmountNum * rate * 0.997; // Apply 0.3% fee

    // Calculate fees
    const serviceFee = sourceAmountNum * 0.003;
    const networkFee = 0.001;

    // Store swap metadata
    await this.swapCoordinator.createSwapMetadata({
      id: sourceSwapId,
      sourceChain: dto.sourceChain,
      destChain: dto.destChain,
      sourceSwapId,
      destSwapId,
      sourceAmount: dto.sourceAmount,
      destAmount: destAmountNum.toFixed(6),
      userSourceAddress: sourceAddress,
      userDestAddress: destAddress,
      secret,
      sha256Hash: hashes.sha256,
      poseidonHash: hashes.poseidon,
      pedersenHash: hashes.pedersen,
      sourceTimeLock,
      destTimeLock,
    });

    // Get hash for source chain
    const getHashForChain = (chain: SwapChain) => {
      switch (chain) {
        case SwapChain.STARKNET:
          return hashes.poseidon;
        case SwapChain.AZTEC:
          return hashes.pedersen;
        case SwapChain.NEAR:
        case SwapChain.ZCASH:
          return hashes.sha256;
        default:
          return hashes.sha256;
      }
    };

    const sourceHash = getHashForChain(dto.sourceChain);
    const destHash = getHashForChain(dto.destChain);

    this.logger.log(`✅ Swap initiated: ${sourceSwapId}`);
    this.logger.log(
      `   Source hash (${dto.sourceChain}): ${sourceHash.substring(0, 20)}...`,
    );
    this.logger.log(
      `   Dest hash (${dto.destChain}): ${destHash.substring(0, 20)}...`,
    );

    return {
      success: true,
      swapId: sourceSwapId,

      hashes: {
        sha256: hashes.sha256,
        poseidon: hashes.poseidon,
        pedersen: hashes.pedersen,
      },

      secret,

      sourceChain: dto.sourceChain,
      destChain: dto.destChain,
      sourceAmount: dto.sourceAmount,
      destAmount: destAmountNum.toFixed(6),
      exchangeRate: rate.toString(),

      sourceTimeLock,
      destTimeLock,

      sourceSwapId,
      destSwapId,

      instructions: {
        step1: `Lock ${dto.sourceAmount} on ${dto.sourceChain} using hash: ${sourceHash}`,
        step2: `Wait for backend to create counterparty swap on ${dto.destChain}`,
        step3: `Reveal secret on ${dto.destChain} to claim ${destAmountNum.toFixed(6)} tokens`,
      },

      fees: {
        serviceFee: serviceFee.toFixed(6),
        networkFee: networkFee.toString(),
        totalFee: (serviceFee + networkFee).toFixed(6),
      },
    };
  }

  /**
   * POST /api/swap/complete
   * Manually complete a swap with revealed secret
   * (Normally auto-completed by event listeners)
   */
  @Post('complete')
  @HttpCode(HttpStatus.OK)
  async completeSwap(@Body() dto: { swapId: string; secret: string }) {
    this.logger.log(`Manual complete request: ${dto.swapId}`);

    const result = await this.swapCoordinator.completeSwapWithSecret(
      dto.swapId,
      dto.secret,
    );

    return {
      success: result.success,
      message: result.message,
      txHash: result.txHash,
    };
  }

  /**
   * GET /api/swap/supported-chains
   * Get list of supported chains
   */
  @Get('supported/chains')
  getSupportedChains() {
    return {
      success: true,
      chains: [
        {
          id: SwapChain.STARKNET,
          name: 'Starknet',
          hashAlgorithm: 'poseidon',
          nativeToken: 'STRK',
          status: 'active',
        },
        {
          id: SwapChain.AZTEC,
          name: 'Aztec',
          hashAlgorithm: 'pedersen',
          nativeToken: 'ETH',
          status: 'active',
        },
        {
          id: SwapChain.NEAR,
          name: 'NEAR',
          hashAlgorithm: 'sha256',
          nativeToken: 'NEAR',
          status: 'coming_soon',
        },
        {
          id: SwapChain.ZCASH,
          name: 'Zcash',
          hashAlgorithm: 'sha256',
          nativeToken: 'ZEC',
          status: 'coming_soon',
        },
      ],
      pairs: [
        { source: SwapChain.STARKNET, dest: SwapChain.AZTEC, status: 'active' },
        { source: SwapChain.AZTEC, dest: SwapChain.STARKNET, status: 'active' },
        {
          source: SwapChain.STARKNET,
          dest: SwapChain.NEAR,
          status: 'coming_soon',
        },
        {
          source: SwapChain.NEAR,
          dest: SwapChain.STARKNET,
          status: 'coming_soon',
        },
      ],
    };
  }

  /**
   * POST /api/swap/test-initiate
   *
   * TEST ENDPOINT (no X402 payment required)
   * Same as /initiate but for development testing
   */
  @Post('test-initiate')
  @HttpCode(HttpStatus.CREATED)
  async testInitiateSwap(
    @Body() dto: InitiateCrossChainSwapDto,
  ): Promise<SwapInitiationResponse> {
    this.logger.log(
      `🧪 TEST: Initiating swap: ${dto.sourceChain} → ${dto.destChain}`,
    );
    return this.initiateSwap(dto);
  }
}
