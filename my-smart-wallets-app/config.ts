import {
  AlchemyAccountsUIConfig,
  cookieStorage,
  createConfig,
} from "@account-kit/react";
import { alchemy, base } from "@account-kit/infra";
import { QueryClient } from "@tanstack/react-query";

// ============================================================================
// ALCHEMY ACCOUNT KIT CONFIGURATION
// ============================================================================
// This file sets up Alchemy's Account Kit for authentication and smart accounts.
// Account Kit provides:
// 1. Authentication (email, passkey, social login)
// 2. Smart Contract Accounts (SCA) for gasless transactions
// 3. Access to the underlying EOA (Externally Owned Account) signer
//
// For Universal Accounts, we need the EOA signer, NOT the smart account!
// ============================================================================

// Get API keys from environment variables
const API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
if (!API_KEY) {
  throw new Error("NEXT_PUBLIC_ALCHEMY_API_KEY is not set");
}

const SPONSORSHIP_POLICY_ID = process.env.NEXT_PUBLIC_ALCHEMY_POLICY_ID;
if (!SPONSORSHIP_POLICY_ID) {
  throw new Error("NEXT_PUBLIC_ALCHEMY_POLICY_ID is not set");
}

// Configure the authentication UI
// This determines which login methods are available to users
const uiConfig: AlchemyAccountsUIConfig = {
  illustrationStyle: "outline",
  auth: {
    sections: [
      [{ type: "email" }], // Email authentication
      [
        { type: "passkey" }, // Passkey authentication
        { type: "social", authProviderId: "google", mode: "popup" },
        { type: "social", authProviderId: "facebook", mode: "popup" },
      ],
    ],
    addPasskeyOnSignup: false,
  },
};

// Create the Account Kit configuration
export const config = createConfig(
  {
    transport: alchemy({ apiKey: API_KEY }),
    chain: base, // Using Base chain
    ssr: true, // Enable server-side rendering
    storage: cookieStorage, // Persist auth state in cookies
    enablePopupOauth: true, // Use popup for social login (not redirect)
    policyId: SPONSORSHIP_POLICY_ID, // Gas sponsorship policy
  },
  uiConfig
);

// React Query client for managing async state
export const queryClient = new QueryClient();
