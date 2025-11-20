"use client";

import { useSignerStatus } from "@account-kit/react";
import UserInfoCard from "./components/user-info-card";
import LoginCard from "./components/login-card";
import Header from "./components/header";

// ============================================================================
// MAIN PAGE - ROUTING LOGIC
// ============================================================================
// This page shows different content based on authentication status:
// - Not logged in → LoginCard (Alchemy authentication)
// - Logged in → UserInfoCard (shows Alchemy + Universal Accounts integration)
// ============================================================================

export default function Home() {
  // Check if user is authenticated with Alchemy Account Kit
  const signerStatus = useSignerStatus();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <Header />
      <div className="bg-bg-main bg-cover bg-center bg-no-repeat h-[calc(100vh-4rem)]">
        <main className="container mx-auto px-4 py-8 h-full">
          {signerStatus.isConnected ? (
            // User is logged in - show the main demo
            <div className="flex justify-center">
              <UserInfoCard />
            </div>
          ) : (
            // User is not logged in - show login card
            <div className="flex justify-center items-center h-full pb-[4rem]">
              <LoginCard />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
