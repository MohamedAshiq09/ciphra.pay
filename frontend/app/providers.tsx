"use client";

import { ReactNode } from "react";
import { sepolia } from "@starknet-react/chains";
import {
  StarknetConfig,
  publicProvider,
  argent,
  braavos,
  useInjectedConnectors,
} from "@starknet-react/core";

export function StarknetProvider({ children }: { children: ReactNode }) {
  const { connectors } = useInjectedConnectors({
    recommended: [argent(), braavos()],
    includeRecommended: "onlyIfNoConnectors",
  });

  return (
    <StarknetConfig
      chains={[sepolia]}
      provider={publicProvider()}
      connectors={connectors}
    >
      {children}
    </StarknetConfig>
  );
}
