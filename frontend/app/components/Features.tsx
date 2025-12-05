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
          className="group bg-zinc-900/50 backdrop-blur-sm rounded-2xl p-5 border border-zinc-800/50 hover:border-emerald-500/30 transition-all duration-300"
        >
          <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-emerald-500/20 transition-colors">
            <feature.icon className="w-5 h-5 text-emerald-400" />
          </div>
          <h3 className="text-white font-semibold mb-2">{feature.title}</h3>
          <p className="text-zinc-500 text-sm leading-relaxed">{feature.description}</p>
        </div>
      ))}
    </div>
  );
}
