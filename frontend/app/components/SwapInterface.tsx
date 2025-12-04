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

  // Generate random hex
  const generateHex = (bytes: number) => {
    const array = new Uint8Array(bytes);
    crypto.getRandomValues(array);
    return "0x" + Array.from(array).map(b => b.toString(16).padStart(2, "0")).join("");
  };

  // Initiate STRK to ZEC swap
  const initiateStrkToZec = async () => {
    if (!address || !amount || !zcashAddress) return;

    try {
      setSwapState(prev => ({ ...prev, status: "initiating", error: "" }));

      // Generate swap parameters
      const swapId = generateHex(31);
      const secret = generateHex(31);
      
      // Call backend to initiate swap
      const response = await axios.post("http://localhost:3000/api/swap/strk-to-zec", {
        senderAddress: address,
        recipientZcashAddress: zcashAddress,
        amount: amount,
        swapId,
        secret
      });

      if (response.data.success) {
        setSwapState({
          status: "completed",
          swapId: response.data.swapId,
          secret: response.data.secret,
          starknetTxHash: response.data.starknetTxHash,
          zcashTxId: response.data.zcashTxId,
          error: ""
        });
      }
    } catch (error: any) {
      setSwapState(prev => ({
        ...prev,
        status: "error",
        error: error.response?.data?.message || error.message || "Swap failed"
      }));
    }
  };

  // Initiate ZEC to STRK swap
  const initiateZecToStrk = async () => {
    if (!address || !amount) return;

    try {
      setSwapState(prev => ({ ...prev, status: "initiating", error: "" }));

      const response = await axios.post("http://localhost:3000/api/swap/zec-to-strk", {
        recipientStarknetAddress: address,
        amount: amount
      });

      if (response.data.success) {
        setSwapState({
          status: "waiting_zcash",
          swapId: response.data.swapId,
          secret: "",
          starknetTxHash: "",
          zcashTxId: "",
          error: ""
        });
      }
    } catch (error: any) {
      setSwapState(prev => ({
        ...prev,
        status: "error",
        error: error.response?.data?.message || error.message || "Swap failed"
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
      <div className="bg-gray-800/50 backdrop-blur-xl rounded-3xl border border-gray-700/50 p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Cross-Chain Swap</h2>
          <span className="px-3 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
            Testnet
          </span>
        </div>

        {/* From Token */}
        <div className="bg-gray-900/50 rounded-2xl p-4 mb-2">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-400">From</span>
            <span className="text-sm text-gray-400">
              {direction === "STRK_TO_ZEC" ? "Starknet" : "Zcash"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="number"
              placeholder="0.0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="flex-1 bg-transparent text-3xl text-white outline-none placeholder:text-gray-600"
              disabled={swapState.status !== "idle"}
            />
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-700/50 rounded-xl">
              <div className={`w-6 h-6 rounded-full ${direction === "STRK_TO_ZEC" ? "bg-purple-500" : "bg-yellow-500"}`} />
              <span className="text-white font-medium">
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
            className="p-2 bg-gray-700 hover:bg-gray-600 rounded-xl border-4 border-gray-800 transition-all disabled:opacity-50"
          >
            <ArrowDownUp className="w-5 h-5 text-purple-400" />
          </button>
        </div>

        {/* To Token */}
        <div className="bg-gray-900/50 rounded-2xl p-4 mt-2 mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-400">To</span>
            <span className="text-sm text-gray-400">
              {direction === "STRK_TO_ZEC" ? "Zcash" : "Starknet"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="0.0"
              value={amount ? (parseFloat(amount) * 0.95).toFixed(4) : ""}
              className="flex-1 bg-transparent text-3xl text-white outline-none placeholder:text-gray-600"
              disabled
            />
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-700/50 rounded-xl">
              <div className={`w-6 h-6 rounded-full ${direction === "STRK_TO_ZEC" ? "bg-yellow-500" : "bg-purple-500"}`} />
              <span className="text-white font-medium">
                {direction === "STRK_TO_ZEC" ? "ZEC" : "STRK"}
              </span>
            </div>
          </div>
        </div>

        {/* Recipient Address (for STRK to ZEC) */}
        {direction === "STRK_TO_ZEC" && swapState.status === "idle" && (
          <div className="mb-4">
            <label className="text-sm text-gray-400 mb-2 block">Zcash Recipient Address</label>
            <input
              type="text"
              placeholder="t1..."
              value={zcashAddress}
              onChange={(e) => setZcashAddress(e.target.value)}
              className="w-full bg-gray-900/50 rounded-xl p-3 text-white outline-none border border-gray-700 focus:border-purple-500 transition-colors"
            />
          </div>
        )}

        {/* Swap Details */}
        <div className="bg-gray-900/30 rounded-xl p-3 mb-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Rate</span>
            <span className="text-white">1 {direction === "STRK_TO_ZEC" ? "STRK" : "ZEC"} ≈ 0.95 {direction === "STRK_TO_ZEC" ? "ZEC" : "STRK"}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Fee</span>
            <span className="text-white">~5%</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Estimated Time</span>
            <span className="text-white">~2 min</span>
          </div>
        </div>

        {/* Status Messages */}
        {swapState.status === "error" && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <span className="text-red-400 text-sm">{swapState.error}</span>
          </div>
        )}

        {swapState.status === "completed" && (
          <div className="mb-4 p-4 bg-green-500/20 border border-green-500/50 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-green-400">
              <Check className="w-5 h-5" />
              <span className="font-medium">Swap Completed!</span>
            </div>
            {swapState.starknetTxHash && (
              <a
                href={`https://sepolia.starkscan.co/tx/${swapState.starknetTxHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-blue-400 hover:underline"
              >
                View Starknet TX <ExternalLink className="w-3 h-3" />
              </a>
            )}
            {swapState.zcashTxId && (
              <p className="text-sm text-gray-400">
                Zcash TX: {swapState.zcashTxId.slice(0, 16)}...
              </p>
            )}
          </div>
        )}

        {/* Swap Button */}
        {!isConnected ? (
          <div className="text-center py-4 text-gray-400">
            Connect your wallet to swap
          </div>
        ) : swapState.status === "completed" ? (
          <button
            onClick={resetSwap}
            className="w-full py-4 bg-gray-700 hover:bg-gray-600 rounded-2xl text-white font-semibold transition-all"
          >
            New Swap
          </button>
        ) : (
          <button
            onClick={handleSwap}
            disabled={!amount || swapState.status !== "idle" || (direction === "STRK_TO_ZEC" && !zcashAddress)}
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed rounded-2xl text-white font-semibold transition-all flex items-center justify-center gap-2"
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
