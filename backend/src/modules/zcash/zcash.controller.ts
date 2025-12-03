import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ZcashService } from './zcash.service';
import {
    GetAddressDto,
    CreatePaymentInstructionsDto,
    SendZcashDto,
    GetBalanceDto,
    EstimateFeeDto
} from './dto/zcash.dto.js';

/**
 * Zcash Controller
 * 
 * REST API endpoints for Zcash operations:
 * - Wallet address management
 * - Payment instructions for Zashi integration
 * - Balance queries
 * - Transaction broadcasting
 */
@Controller('zcash')
export class ZcashController {
    constructor(private zcashService: ZcashService) { }

    /**
     * Get ZEC address for user
     * Used for wallet display and basic receiving
     */
    @Get('address/:userId')
    async getAddress(@Param('userId') userId: string) {
        try {
            const addressInfo = await this.zcashService.getAddressForUser(userId);

            return {
                success: true,
                data: addressInfo,
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
            };
        }
    }

    /**
     * Create payment instructions for Zashi wallet
     * Returns QR code data and deep link for mobile integration
     */
    @Post('payment-instructions')
    async createPaymentInstructions(@Body() dto: CreatePaymentInstructionsDto) {
        try {
            const instructions = await this.zcashService.getPaymentInstructions(
                dto.userId,
                dto.amount,
                dto.memo,
            );

            // Generate Zashi deep link
            const zashiDeepLink = `zashi://pay?address=${instructions.address}&amount=${dto.amount}&memo=${encodeURIComponent(dto.memo)}`;

            return {
                success: true,
                data: {
                    ...instructions,
                    zashiDeepLink,
                    qrCode: instructions.qrPayload,
                    instructions: {
                        step1: 'Open Zashi wallet on your mobile device',
                        step2: 'Scan the QR code or click the Zashi link',
                        step3: 'Confirm the payment in Zashi',
                        step4: 'Wait for confirmation (usually 2-3 minutes)',
                    },
                },
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
            };
        }
    }

    /**
     * Get ZEC balance for address
     */
    @Get('balance/:address')
    async getBalance(@Param('address') address: string) {
        try {
            const balance = await this.zcashService.getBalance(address);

            return {
                success: true,
                data: balance,
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
            };
        }
    }

    /**
     * Estimate transaction fee
     */
    @Post('estimate-fee')
    async estimateFee(@Body() dto: EstimateFeeDto) {
        try {
            const feeEstimate = await this.zcashService.estimateFee({
                fromAddress: dto.fromAddress,
                toAddress: dto.toAddress,
                amount: dto.amount,
            });

            return {
                success: true,
                data: feeEstimate,
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
            };
        }
    }

    /**
     * Send ZEC from facilitator wallet
     * Used for payouts in swaps and P2P transfers
     */
    @Post('send')
    async sendZcash(@Body() dto: SendZcashDto) {
        try {
            const txid = await this.zcashService.sendFromFacilitator(
                dto.toAddress,
                dto.amount,
                dto.memo,
            );

            return {
                success: true,
                data: {
                    txid,
                    message: 'Transaction broadcasted successfully',
                },
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
            };
        }
    }

    /**
     * Broadcast raw transaction
     */
    @Post('broadcast')
    async broadcastTransaction(@Body() body: { rawTransaction: string }) {
        try {
            const txid = await this.zcashService.broadcastRawTransaction(body.rawTransaction);

            return {
                success: true,
                data: {
                    txid,
                    message: 'Transaction broadcasted successfully',
                },
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
            };
        }
    }

    /**
     * Get Zcash network info
     */
    @Get('network-info')
    async getNetworkInfo() {
        try {
            return {
                success: true,
                data: {
                    network: process.env.ZCASH_NETWORK || 'testnet',
                    lightwalletdUrl: process.env.ZCASH_LIGHTWALLETD_URL,
                    facilitatorAddress: process.env.ZCASH_FACILITATOR_ADDRESS,
                    supportedWallets: ['Zashi', 'Ywallet', 'Nighthawk'],
                    features: {
                        shieldedTransactions: true,
                        memos: true,
                        atomicSwaps: true,
                        p2pTransfers: true,
                    },
                },
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
            };
        }
    }
}