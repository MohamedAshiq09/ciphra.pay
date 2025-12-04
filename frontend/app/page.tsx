"use client";

import { WalletConnect, SwapInterface, Features } from "./components";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      {/* Header */}
      <header className="border-b border-purple-500/20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">X</span>
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                X402 Privacy Wallet
              </span>
            </div>
            <WalletConnect />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
            Cross-Chain{" "}
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Privacy Swaps
            </span>
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Swap STRK and ZEC with complete privacy using atomic swaps.
            Trustless, secure, and decentralized.
          </p>
        </div>

        {/* Swap Interface */}
        <div className="flex justify-center mb-16">
          <SwapInterface />
        </div>

        {/* Features */}
        <Features />

        {/* Info Section */}
        <div className="mt-16 grid md:grid-cols-3 gap-6">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-purple-500/20">
            <h3 className="text-lg font-semibold text-white mb-2">
              🔒 How It Works
            </h3>
            <p className="text-gray-400 text-sm">
              Atomic swaps use hash time-locked contracts (HTLCs) to ensure both
              parties complete the swap or neither does. No intermediaries
              needed.
            </p>
          </div>
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-purple-500/20">
            <h3 className="text-lg font-semibold text-white mb-2">
              ⚡ Supported Networks
            </h3>
            <p className="text-gray-400 text-sm">
              Currently supporting Starknet (STRK) and Zcash (ZEC) on testnet.
              More networks coming soon including NEAR, Mina, and Aztec.
            </p>
          </div>
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-purple-500/20">
            <h3 className="text-lg font-semibold text-white mb-2">
              🛡️ Privacy First
            </h3>
            <p className="text-gray-400 text-sm">
              Zcash provides shielded transactions for complete privacy. Your
              swap details remain confidential on the blockchain.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-purple-500/20 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              © 2024 X402 Privacy Wallet. Built for privacy.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-purple-400 transition-colors"
              >
                GitHub
              </a>
              <a
                href="https://docs.starknet.io"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-purple-400 transition-colors"
              >
                Starknet Docs
              </a>
              <a
                href="https://z.cash"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-purple-400 transition-colors"
              >
                Zcash
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
