"use client";

import { Activity, ArrowRightLeft, Shield, Zap } from "lucide-react";

const features = [
  {
    icon: Shield,
    title: "Privacy-First",
    description: "Leveraging Zcash's shielded transactions for maximum privacy"
  },
  {
    icon: ArrowRightLeft,
    title: "Cross-Chain",
    description: "Seamless swaps between Starknet and Zcash networks"
  },
  {
    icon: Zap,
    title: "Fast & Secure",
    description: "Atomic swaps ensure trustless, instant exchanges"
  },
  {
    icon: Activity,
    title: "Real Transactions",
    description: "Operating on live testnets with real confirmations"
  }
];

export function Features() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12">
      {features.map((feature, i) => (
        <div
          key={i}
          className="bg-gray-800/30 backdrop-blur-sm rounded-2xl p-4 border border-gray-700/50 hover:border-purple-500/50 transition-all"
        >
          <feature.icon className="w-8 h-8 text-purple-400 mb-3" />
          <h3 className="text-white font-semibold mb-1">{feature.title}</h3>
          <p className="text-gray-400 text-sm">{feature.description}</p>
        </div>
      ))}
    </div>
  );
}
