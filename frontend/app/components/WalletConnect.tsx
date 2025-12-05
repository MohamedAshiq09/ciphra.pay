"use client";

import { useAccount, useConnect, useDisconnect } from "@starknet-react/core";
import { Wallet, LogOut, ChevronDown } from "lucide-react";
import { useState } from "react";

export function WalletConnect() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const [showDropdown, setShowDropdown] = useState(false);

  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (isConnected && address) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-2 px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white font-medium hover:bg-zinc-700 transition-all"
        >
          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          {truncateAddress(address)}
          <ChevronDown className="w-4 h-4 text-zinc-400" />
        </button>
        
        {showDropdown && (
          <div className="absolute top-full right-0 mt-2 w-48 bg-zinc-900 rounded-xl border border-zinc-800 shadow-2xl overflow-hidden z-50">
            <div className="p-3 border-b border-zinc-800">
              <p className="text-xs text-zinc-500">Connected</p>
              <p className="text-sm text-white font-mono">{truncateAddress(address)}</p>
            </div>
            <button
              onClick={() => {
                disconnect();
                setShowDropdown(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-3 text-red-400 hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Disconnect
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 rounded-xl text-black font-semibold transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
      >
        <Wallet className="w-4 h-4" />
        Connect
      </button>

      {showDropdown && connectors.length > 0 && (
        <div className="absolute top-full right-0 mt-2 w-56 bg-zinc-900 rounded-xl border border-zinc-800 shadow-2xl overflow-hidden z-50">
          <div className="p-3 border-b border-zinc-800">
            <p className="text-sm text-zinc-400">Select Wallet</p>
          </div>
          {connectors.map((connector) => (
            <button
              key={connector.id}
              onClick={() => {
                connect({ connector });
                setShowDropdown(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-3 text-white hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <div className="w-8 h-8 bg-zinc-800 rounded-lg flex items-center justify-center border border-zinc-700">
                <Wallet className="w-4 h-4 text-emerald-400" />
              </div>
              <span className="capitalize font-medium">{connector.id}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
