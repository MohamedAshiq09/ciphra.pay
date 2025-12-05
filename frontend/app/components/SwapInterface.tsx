"use client";

import { useState } from "react";
import { useAccount } from "@starknet-react/core";
import { ArrowDownUp, Loader2, Check, ExternalLink, AlertCircle } from "lucide-react";
import axios from "axios";

// Contract address on Starknet Sepolia
const SWAP_CONTRACT = "0x11309470c5e1b3cfa615303b7710ea8d4069894c54963087e5ebcdc7af82104";

// Swap ABI
const SWAP_ABI = [
  {
    name: "initiate_swap",
    type: "function",
    inputs: [
      { name: "swap_id", type: "felt252" },
      { name: "recipient", type: "core::starknet::contract_address::ContractAddress" },
      { name: "hash_lock", type: "felt252" },
      { name: "time_lock", type: "core::integer::u64" },
      { name: "amount", type: "core::integer::u256" }
    ],
    outputs: [],
    state_mutability: "external"
  },
  {
    name: "complete_swap",
    type: "function",
    inputs: [
      { name: "swap_id", type: "felt252" },
      { name: "secret", type: "felt252" }
    ],
    outputs: [],
    state_mutability: "external"
  }
];

type SwapDirection = "STRK_TO_ZEC" | "ZEC_TO_STRK";
type SwapStatus = "idle" | "initiating" | "waiting_zcash" | "completing" | "completed" | "error";

interface SwapState {
  status: SwapStatus;
  swapId: string;
  secret: string;
  starknetTxHash: string;
  zcashTxId: string;
  error: string;
}

export function SwapInterface() {
  const { address, isConnected } = useAccount();
  const [direction, setDirection] = useState<SwapDirection>("STRK_TO_ZEC");
  const [amount, setAmount] = useState("");
  const [zcashAddress, setZcashAddress] = useState("");
  const [swapState, setSwapState] = useState<SwapState>({
    status: "idle",
    swapId: "",
    secret: "",
    starknetTxHash: "",
    zcashTxId: "",
    error: ""
  });

  // Backend API base URL
  const API_BASE = "http://localhost:3000/api";

  // Initiate STRK to ZEC swap
  const initiateStrkToZec = async () => {
    if (!address || !amount || !zcashAddress) return;

    try {
      setSwapState(prev => ({ ...prev, status: "initiating", error: "" }));

      // Call backend /api/swap/initiate endpoint
      const response = await axios.post(`${API_BASE}/swap/initiate`, {
        sourceChain: "starknet",
        destChain: "zcash",
        sourceAmount: amount,
        userAddresses: {
          starknet: address,
          zcash: zcashAddress
        },
        timeLockSeconds: 7200 // 2 hours
      });

      if (response.data.success) {
        setSwapState({
          status: "completed",
          swapId: response.data.swapId,
          secret: response.data.secret,
          starknetTxHash: response.data.sourceSwapId || "",
          zcashTxId: response.data.destSwapId || "",
          error: ""
        });
      } else {
        throw new Error(response.data.error || "Swap initiation failed");
      }
    } catch (error: any) {
      setSwapState(prev => ({
        ...prev,
        status: "error",
        error: error.response?.data?.message || error.response?.data?.error || error.message || "Swap failed"
      }));
    }
  };

  // Initiate ZEC to STRK swap
  const initiateZecToStrk = async () => {
    if (!address || !amount || !zcashAddress) return;

    try {
      setSwapState(prev => ({ ...prev, status: "initiating", error: "" }));

      // Call backend /api/swap/initiate endpoint
      const response = await axios.post(`${API_BASE}/swap/initiate`, {
        sourceChain: "zcash",
        destChain: "starknet",
        sourceAmount: amount,
        userAddresses: {
          starknet: address,
          zcash: zcashAddress
        },
        timeLockSeconds: 7200 // 2 hours
      });

      if (response.data.success) {
        setSwapState({
          status: "waiting_zcash",
          swapId: response.data.swapId,
          secret: response.data.secret,
          starknetTxHash: "",
          zcashTxId: "",
          error: ""
        });
      } else {
        throw new Error(response.data.error || "Swap initiation failed");
      }
    } catch (error: any) {
      setSwapState(prev => ({
        ...prev,
        status: "error",
        error: error.response?.data?.message || error.response?.data?.error || error.message || "Swap failed"
      }));
    }
  };

  const handleSwap = () => {
    if (direction === "STRK_TO_ZEC") {
      initiateStrkToZec();
    } else {
      initiateZecToStrk();
    }
  };

  const resetSwap = () => {
    setSwapState({
      status: "idle",
      swapId: "",
      secret: "",
      starknetTxHash: "",
      zcashTxId: "",
      error: ""
    });
    setAmount("");
    setZcashAddress("");
  };

  const toggleDirection = () => {
    setDirection(prev => prev === "STRK_TO_ZEC" ? "ZEC_TO_STRK" : "STRK_TO_ZEC");
    resetSwap();
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-zinc-900/80 backdrop-blur-xl rounded-3xl border border-zinc-800 p-6 shadow-2xl shadow-black/50">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Swap</h2>
          <span className="px-3 py-1.5 bg-emerald-500/10 text-emerald-400 text-xs font-medium rounded-full border border-emerald-500/20">
            Testnet
          </span>
        </div>

        {/* From Token */}
        <div className="bg-black/40 rounded-2xl p-4 mb-2 border border-zinc-800/50">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-zinc-500">From</span>
            <span className="text-sm text-zinc-500">
              {direction === "STRK_TO_ZEC" ? "Starknet" : "Zcash"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="number"
              placeholder="0.0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="flex-1 bg-transparent text-3xl text-white outline-none placeholder:text-zinc-700 font-medium"
              disabled={swapState.status !== "idle"}
            />
            <div className="flex items-center gap-2 px-4 py-2.5 bg-zinc-800 rounded-xl border border-zinc-700/50">
              <div className={`w-6 h-6 rounded-full ${direction === "STRK_TO_ZEC" ? "bg-gradient-to-br from-purple-400 to-purple-600" : "bg-gradient-to-br from-yellow-400 to-yellow-600"}`} />
              <span className="text-white font-semibold">
                {direction === "STRK_TO_ZEC" ? "STRK" : "ZEC"}
              </span>
            </div>
          </div>
        </div>

        {/* Swap Direction Button */}
        <div className="flex justify-center -my-2 relative z-10">
          <button
            onClick={toggleDirection}
            disabled={swapState.status !== "idle"}
            className="p-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-xl border-4 border-zinc-900 transition-all disabled:opacity-50 group"
          >
            <ArrowDownUp className="w-5 h-5 text-emerald-400 group-hover:rotate-180 transition-transform duration-300" />
          </button>
        </div>

        {/* To Token */}
        <div className="bg-black/40 rounded-2xl p-4 mt-2 mb-4 border border-zinc-800/50">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-zinc-500">To</span>
            <span className="text-sm text-zinc-500">
              {direction === "STRK_TO_ZEC" ? "Zcash" : "Starknet"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="0.0"
              value={amount ? (parseFloat(amount) * 0.95).toFixed(4) : ""}
              className="flex-1 bg-transparent text-3xl text-white outline-none placeholder:text-zinc-700 font-medium"
              disabled
            />
            <div className="flex items-center gap-2 px-4 py-2.5 bg-zinc-800 rounded-xl border border-zinc-700/50">
              <div className={`w-6 h-6 rounded-full ${direction === "STRK_TO_ZEC" ? "bg-gradient-to-br from-yellow-400 to-yellow-600" : "bg-gradient-to-br from-purple-400 to-purple-600"}`} />
              <span className="text-white font-semibold">
                {direction === "STRK_TO_ZEC" ? "ZEC" : "STRK"}
              </span>
            </div>
          </div>
        </div>

        {/* Recipient Address - required for both directions */}
        {swapState.status === "idle" && (
          <div className="mb-4">
            <label className="text-sm text-zinc-500 mb-2 block">
              {direction === "STRK_TO_ZEC" ? "Zcash Recipient Address" : "Your Zcash Address (for sending ZEC)"}
            </label>
            <input
              type="text"
              placeholder="t1... or tmK3..."
              value={zcashAddress}
              onChange={(e) => setZcashAddress(e.target.value)}
              className="w-full bg-black/40 rounded-xl p-3.5 text-white outline-none border border-zinc-800 focus:border-emerald-500/50 transition-colors placeholder:text-zinc-600"
            />
          </div>
        )}

        {/* Swap Details */}
        <div className="bg-black/20 rounded-xl p-4 mb-4 space-y-3 border border-zinc-800/30">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-500">Rate</span>
            <span className="text-white font-medium">1 {direction === "STRK_TO_ZEC" ? "STRK" : "ZEC"} ≈ 0.95 {direction === "STRK_TO_ZEC" ? "ZEC" : "STRK"}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-zinc-500">Fee</span>
            <span className="text-white font-medium">~5%</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-zinc-500">Estimated Time</span>
            <span className="text-white font-medium">~2 min</span>
          </div>
        </div>

        {/* Status Messages */}
        {swapState.status === "error" && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <span className="text-red-400 text-sm">{swapState.error}</span>
          </div>
        )}

        {swapState.status === "completed" && (
          <div className="mb-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-3">
            <div className="flex items-center gap-2 text-emerald-400">
              <Check className="w-5 h-5" />
              <span className="font-semibold">Swap Completed!</span>
            </div>
            {swapState.starknetTxHash && (
              <a
                href={`https://sepolia.starkscan.co/tx/${swapState.starknetTxHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-emerald-400 hover:underline"
              >
                View Starknet TX <ExternalLink className="w-3 h-3" />
              </a>
            )}
            {swapState.zcashTxId && (
              <p className="text-sm text-zinc-400">
                Zcash TX: {swapState.zcashTxId.slice(0, 16)}...
              </p>
            )}
          </div>
        )}

        {/* Swap Button */}
        {!isConnected ? (
          <div className="text-center py-4 text-zinc-500 bg-zinc-800/30 rounded-2xl border border-zinc-800/50">
            Connect your wallet to swap
          </div>
        ) : swapState.status === "completed" ? (
          <button
            onClick={resetSwap}
            className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 rounded-2xl text-white font-semibold transition-all border border-zinc-700/50"
          >
            New Swap
          </button>
        ) : (
          <button
            onClick={handleSwap}
            disabled={!amount || swapState.status !== "idle" || !zcashAddress}
            className="w-full py-4 bg-linear-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:from-zinc-700 disabled:to-zinc-700 disabled:cursor-not-allowed rounded-2xl text-black font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 disabled:shadow-none"
          >
            {swapState.status === "initiating" ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : swapState.status === "waiting_zcash" ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Waiting for Zcash...
              </>
            ) : (
              `Swap ${direction === "STRK_TO_ZEC" ? "STRK → ZEC" : "ZEC → STRK"}`
            )}
          </button>
        )}
      </div>
    </div>
  );
}
