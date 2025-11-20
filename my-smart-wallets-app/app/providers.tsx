"use client";
import { config, queryClient } from "@/config";
import { AlchemyClientState } from "@account-kit/core";
import { AlchemyAccountProvider } from "@account-kit/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { PropsWithChildren } from "react";

// ============================================================================
// PROVIDERS - ALCHEMY ACCOUNT KIT SETUP
// ============================================================================
// This component wraps the entire app with necessary providers:
// 1. QueryClientProvider - for React Query (async state management)
// 2. AlchemyAccountProvider - makes Alchemy Account Kit hooks available
//
// The initialState prop enables SSR by persisting auth state in cookies.
// ============================================================================

export const Providers = (
  props: PropsWithChildren<{ initialState?: AlchemyClientState }>
) => {
  return (
    <QueryClientProvider client={queryClient}>
      <AlchemyAccountProvider
        config={config}
        queryClient={queryClient}
        initialState={props.initialState}
      >
        {props.children}
      </AlchemyAccountProvider>
    </QueryClientProvider>
  );
};
