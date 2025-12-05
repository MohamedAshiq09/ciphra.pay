"use client";

import { WalletConnect, SwapInterface, Features } from "./components";

export default function Home() {
  return (
    <div className="min-h-screen bg-black">
      {/* Subtle gradient overlay */}
      <div className="fixed inset-0 bg-gradient-to-br from-black via-zinc-950 to-black pointer-events-none" />
      
      {/* Animated background glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-50 border-b border-zinc-800/50 backdrop-blur-xl bg-black/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-5">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <span className="text-black font-black text-xl">C</span>
              </div>
              <div>
                <span className="text-2xl font-bold text-white tracking-tight">
                  Ciphra<span className="text-emerald-400">.pay</span>
                </span>
                <p className="text-xs text-zinc-500 font-medium">Cross-Chain Privacy Protocol</p>
              </div>
            </div>
            <WalletConnect />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <div className="inline-flex items-center px-4 py-2 bg-zinc-900/80 border border-zinc-800 rounded-full mb-6">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse mr-2" />
            <span className="text-sm text-zinc-400 font-medium">Live on Testnet</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 tracking-tight">
            The Future of
            <br />
            <span className="bg-gradient-to-r from-emerald-400 via-emerald-300 to-teal-400 bg-clip-text text-transparent">
              Private Swaps
            </span>
          </h1>
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Swap assets across chains with complete privacy. Zero knowledge, 
            zero trust required. Powered by atomic swaps.
          </p>
          
          {/* Stats */}
          <div className="flex justify-center gap-12 mt-10">
            <div className="text-center">
              <p className="text-3xl font-bold text-white">$2.4B+</p>
              <p className="text-sm text-zinc-500">Total Volume</p>
            </div>
            <div className="text-center border-l border-zinc-800 pl-12">
              <p className="text-3xl font-bold text-white">140K+</p>
              <p className="text-sm text-zinc-500">Transactions</p>
            </div>
            <div className="text-center border-l border-zinc-800 pl-12">
              <p className="text-3xl font-bold text-white">4</p>
              <p className="text-sm text-zinc-500">Chains</p>
            </div>
          </div>
        </div>

        {/* Swap Interface */}
        <div className="flex justify-center mb-20">
          <SwapInterface />
        </div>

        {/* Features */}
        <Features />

        {/* Info Section */}
        <div className="mt-20 grid md:grid-cols-3 gap-6">
          <div className="group bg-zinc-900/50 backdrop-blur-sm rounded-2xl p-8 border border-zinc-800/50 hover:border-emerald-500/30 transition-all duration-300">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-emerald-500/20 transition-colors">
              <span className="text-2xl">🔐</span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-3">
              Atomic Swaps
            </h3>
            <p className="text-zinc-500 text-sm leading-relaxed">
              Hash time-locked contracts ensure both parties complete the swap or neither does. 
              No intermediaries, no trust required.
            </p>
          </div>
          <div className="group bg-zinc-900/50 backdrop-blur-sm rounded-2xl p-8 border border-zinc-800/50 hover:border-emerald-500/30 transition-all duration-300">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-emerald-500/20 transition-colors">
              <span className="text-2xl">⚡</span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-3">
              Multi-Chain
            </h3>
            <p className="text-zinc-500 text-sm leading-relaxed">
              Starknet, Zcash, NEAR, and Mina. Swap across chains seamlessly 
              with our unified protocol.
            </p>
          </div>
          <div className="group bg-zinc-900/50 backdrop-blur-sm rounded-2xl p-8 border border-zinc-800/50 hover:border-emerald-500/30 transition-all duration-300">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-emerald-500/20 transition-colors">
              <span className="text-2xl">🛡️</span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-3">
              Privacy First
            </h3>
            <p className="text-zinc-500 text-sm leading-relaxed">
              Zcash shielded transactions for complete privacy. 
              Your swap details remain confidential.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-zinc-800/50 mt-20 bg-black/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-3 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-lg flex items-center justify-center">
                <span className="text-black font-black text-sm">C</span>
              </div>
              <span className="text-zinc-400 text-sm">
                © 2025 Ciphra.pay · Built for the privacy-first future
              </span>
            </div>
            <div className="flex space-x-8">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-500 hover:text-emerald-400 transition-colors text-sm font-medium"
              >
                GitHub
              </a>
              <a
                href="https://docs.starknet.io"
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-500 hover:text-emerald-400 transition-colors text-sm font-medium"
              >
                Docs
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-500 hover:text-emerald-400 transition-colors text-sm font-medium"
              >
                Twitter
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
