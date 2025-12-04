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
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl text-white font-medium hover:opacity-90 transition-all"
        >
          <Wallet className="w-4 h-4" />
          {truncateAddress(address)}
          <ChevronDown className="w-4 h-4" />
        </button>
        
        {showDropdown && (
          <div className="absolute top-full right-0 mt-2 w-48 bg-gray-800 rounded-xl border border-gray-700 shadow-xl overflow-hidden z-50">
            <div className="p-3 border-b border-gray-700">
              <p className="text-xs text-gray-400">Connected</p>
              <p className="text-sm text-white font-mono">{truncateAddress(address)}</p>
            </div>
            <button
              onClick={() => {
                disconnect();
                setShowDropdown(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-red-400 hover:bg-gray-700 transition-colors"
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
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl text-white font-medium hover:opacity-90 transition-all"
      >
        <Wallet className="w-4 h-4" />
        Connect Wallet
      </button>

      {showDropdown && (
        <div className="absolute top-full right-0 mt-2 w-56 bg-gray-800 rounded-xl border border-gray-700 shadow-xl overflow-hidden z-50">
          <div className="p-3 border-b border-gray-700">
            <p className="text-sm text-gray-400">Select Wallet</p>
          </div>
          {connectors.map((connector) => (
            <button
              key={connector.id}
              onClick={() => {
                connect({ connector });
                setShowDropdown(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-3 text-white hover:bg-gray-700 transition-colors"
            >
              <div className="w-8 h-8 bg-gray-700 rounded-lg flex items-center justify-center">
                <Wallet className="w-4 h-4" />
              </div>
              <span className="capitalize">{connector.id}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
