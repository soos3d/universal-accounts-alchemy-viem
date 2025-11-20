import { useEffect, useState } from "react";
import {
  ExternalLink,
  Copy,
  ArrowRightLeft,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatAddress } from "@/lib/utils";
import {
  useUser,
  useSmartAccountClient,
  useAccount,
  useSigner,
} from "@account-kit/react";
import { Interface, getBytes } from "ethers";
import { AssetBreakdownDialog } from "./asset-breakdown-dialog";

// ============================================================================
// USER INFO CARD - ALCHEMY + UNIVERSAL ACCOUNTS INTEGRATION
// ============================================================================
// This component demonstrates the key integration points:
//
// 1. ALCHEMY ACCOUNT KIT provides:
//    - useUser() → user profile (email, etc.)
//    - useAccount() → Smart Contract Account (SCA) address
//    - useSigner() → EOA signer (THIS IS WHAT WE NEED!)
//
// 2. UNIVERSAL ACCOUNTS uses the EOA:
//    - Initialize UniversalAccount with user.address (EOA)
//    - Sign transactions with the EOA signer
//    - Universal Accounts creates its own multi-chain smart accounts
//
// KEY CONCEPT: Alchemy's SCA and Universal Account's SCA are DIFFERENT!
// We use Alchemy for auth/EOA, then Universal Accounts for cross-chain.
// ============================================================================

// Helper function to safely format balance values
const formatBalance = (value: any, decimals: number = 2): string => {
  try {
    if (typeof value === "string") {
      return parseFloat(value).toFixed(decimals);
    } else if (typeof value === "number") {
      return value.toFixed(decimals);
    }
    return decimals === 2 ? "0.00" : "0." + "0".repeat(decimals);
  } catch (e) {
    return decimals === 2 ? "0.00" : "0." + "0".repeat(decimals);
  }
};

import {
  UniversalAccount,
  IAssetsResponse,
  CHAIN_ID,
} from "@particle-network/universal-account-sdk";

export default function UserInfo() {
  // ============================================================================
  // STEP 1: GET EOA AND USER INFO FROM ALCHEMY ACCOUNT KIT
  // ============================================================================

  // Get user profile (email, etc.)
  const user = useUser();
  const userEmail = user?.email ?? "anon";

  // Get Alchemy's Smart Contract Account (SCA) address
  const { address } = useAccount({
    type: "ModularAccountV2",
  });

  // Get the Alchemy smart account client (for chain info, etc.)
  const { client } = useSmartAccountClient({});

  // ⭐ IMPORTANT: Get the EOA signer - this is what Universal Accounts needs!
  // user.address = EOA address (the actual wallet)
  // address = Alchemy's SCA address (for gasless txs on Base)
  const signer = useSigner();

  console.log("Alchemy SCA Address:", address);
  console.log("EOA Address (for Universal Accounts):", user?.address);

  // ============================================================================
  // STEP 2: INITIALIZE UNIVERSAL ACCOUNTS WITH THE EOA
  // ============================================================================

  const [universalAccount, setUniversalAccount] =
    useState<UniversalAccount | null>(null);
  const [accountInfo, setAccountInfo] = useState<{
    ownerAddress: string;
    evmSmartAccount: string;
    solanaSmartAccount: string;
  } | null>(null);
  const [primaryAssets, setPrimaryAssets] = useState<IAssetsResponse | null>(
    null
  );

  // ============================================================================
  // UI STATE
  // ============================================================================

  const [isCopied, setIsCopied] = useState(false);
  const [isTransacting, setIsTransacting] = useState(false);
  const [transactionSuccess, setTransactionSuccess] = useState(false);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [transactionError, setTransactionError] = useState<string | null>(null);
  const [eoaSignature, setEoaSignature] = useState<string | null>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(address ?? "");
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // ============================================================================
  // STEP 3: CREATE UNIVERSAL ACCOUNT INSTANCE
  // ============================================================================
  // Once we have the EOA from Alchemy, we initialize Universal Accounts.
  // Universal Accounts will create its own smart accounts on multiple chains,
  // all controlled by this EOA.

  useEffect(() => {
    if (!address || !user?.address) {
      return;
    }

    console.log("=== INITIALIZING UNIVERSAL ACCOUNTS ===");
    console.log("Using EOA Address:", user.address);
    console.log("(Alchemy SCA is separate:", address, ")");

    // Create Universal Account instance with the EOA as the owner
    const ua = new UniversalAccount({
      projectId: process.env.NEXT_PUBLIC_PROJECT_ID!,
      projectClientKey: process.env.NEXT_PUBLIC_CLIENT_KEY!,
      projectAppUuid: process.env.NEXT_PUBLIC_APP_ID!,
      ownerAddress: user.address as `0x${string}`, // ⭐ Use EOA, NOT Alchemy's SCA!
      tradeConfig: {
        slippageBps: 100, // 1% slippage tolerance for swaps
      },
    });

    console.log("✅ Universal Account instance created");
    setUniversalAccount(ua);
  }, [address, user]);

  // ============================================================================
  // STEP 4: FETCH UNIVERSAL ACCOUNT ADDRESSES
  // ============================================================================
  // Universal Accounts creates smart accounts on multiple chains.
  // This fetches all the addresses created by Universal Accounts.

  useEffect(() => {
    const fetchSmartAccountAddresses = async () => {
      if (!universalAccount || !address) return;

      try {
        console.log("=== FETCHING UNIVERSAL ACCOUNT ADDRESSES ===");

        // Get all Universal Account addresses
        const smartAccountOptions =
          await universalAccount.getSmartAccountOptions();

        const accountInfo = {
          ownerAddress: smartAccountOptions.ownerAddress, // The EOA (same as user.address)
          evmSmartAccount: smartAccountOptions.smartAccountAddress || "", // Universal Account's EVM smart account
          solanaSmartAccount:
            smartAccountOptions.solanaSmartAccountAddress || "", // Universal Account's Solana smart account
        };

        console.log("✅ Universal Account Addresses:", accountInfo);
        setAccountInfo(accountInfo);
      } catch (error) {
        console.error("❌ Error fetching smart account addresses:", error);
      }
    };

    fetchSmartAccountAddresses();
  }, [universalAccount, address]);

  // ============================================================================
  // STEP 5: FETCH UNIFIED BALANCE
  // ============================================================================
  // Universal Accounts aggregates balances across all chains into a single view.

  useEffect(() => {
    const fetchPrimaryAssets = async () => {
      if (!universalAccount || !address) return;

      try {
        console.log("=== FETCHING UNIFIED BALANCE ===");

        // Get aggregated balance across all chains
        const primaryAssets = await universalAccount.getPrimaryAssets();

        console.log("✅ Primary Assets:", primaryAssets);
        setPrimaryAssets(primaryAssets);
      } catch (error) {
        console.error("❌ Error fetching primary assets:", error);
      }
    };

    fetchPrimaryAssets();
  }, [universalAccount, address]);

  // ============================================================================
  // STEP 6: EXECUTE UNIVERSAL TRANSACTION
  // ============================================================================
  // This demonstrates how to execute a cross-chain transaction:
  // 1. Create a Universal Transaction (can include swaps, bridges, etc.)
  // 2. Sign with the EOA signer from Alchemy
  // 3. Send through Universal Accounts infrastructure

  const handleMintNft = async () => {
    try {
      setIsTransacting(true);
      setTransactionSuccess(false);
      setTransactionError(null);
      setTransactionId(null);

      if (!universalAccount) {
        throw new Error("Universal Account not initialized");
      }

      if (!signer) {
        throw new Error("EOA signer not available");
      }

      console.log("=== EXECUTING UNIVERSAL TRANSACTION ===");

      // NFT contract on Polygon
      const CONTRACT_ADDRESS = "0x0287f57A1a17a725428689dfD9E65ECA01d82510";
      const contractInterface = new Interface(["function mint() external"]);

      // Step 1: Create Universal Transaction
      console.log("1. Creating Universal Transaction...");
      const transaction = await universalAccount.createUniversalTransaction({
        chainId: CHAIN_ID.POLYGON_MAINNET,
        expectTokens: [],
        transactions: [
          {
            to: CONTRACT_ADDRESS,
            data: contractInterface.encodeFunctionData("mint"),
          },
        ],
      });
      console.log("   Transaction created. Root hash:", transaction.rootHash);

      // Step 2: Sign with EOA signer (from Alchemy)
      console.log("2. Signing with EOA signer...");
      const signature = await signer.signMessage({
        raw: getBytes(transaction.rootHash),
      });
      console.log("   ✅ Signature:", signature);

      // Step 3: Send transaction through Universal Accounts
      console.log("3. Sending transaction...");
      const sendResult = await universalAccount.sendTransaction(
        transaction,
        signature
      );
      console.log("   ✅ Transaction sent:", sendResult.transactionId);

      const explorerUrl = `https://universalx.app/activity/details?id=${sendResult.transactionId}`;
      console.log("   Explorer:", explorerUrl);

      setTransactionSuccess(true);
      setTransactionId(sendResult.transactionId);

      // Refresh assets after transaction
      const updatedAssets = await universalAccount.getPrimaryAssets();
      setPrimaryAssets(updatedAssets);
    } catch (error: unknown) {
      console.error("❌ Transaction error:", error);
      setTransactionError(
        typeof error === "object" && error !== null && "message" in error
          ? (error as Error).message
          : "Unknown error occurred"
      );
    } finally {
      setIsTransacting(false);
    }
  };

  const handleSignMessageWithEOA = async () => {
    if (!signer) {
      console.error("EOA signer not available");
      return;
    }

    try {
      const message = "Hello from my EOA!";
      const signature = await signer.signMessage(message);
      setEoaSignature(signature);
      console.log("EOA Signature:", signature);
    } catch (error) {
      console.error("Error signing with EOA:", error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Alchemy + Universal Accounts Demo</CardTitle>
        <CardDescription>
          This demo shows how Alchemy Account Kit and Universal Accounts work
          together
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* ============================================================
            SECTION 1: USER INFO FROM ALCHEMY
            ============================================================ */}
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">
            Email (from Alchemy)
          </p>
          <p className="font-medium">{userEmail}</p>
        </div>

        {/* ============================================================
            SECTION 2: ALCHEMY SMART ACCOUNT ADDRESS
            ============================================================
            This is Alchemy's Smart Contract Account on Base chain.
            Used for gasless transactions on Base.
            ============================================================ */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-medium text-muted-foreground">
              Alchemy Smart Account (Base)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-xs py-1 px-2">
              {formatAddress(address ?? "")}
            </Badge>
            <TooltipProvider>
              <Tooltip open={isCopied}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={handleCopy}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Copied!</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => {
                if (address && client?.chain?.blockExplorers?.default?.url) {
                  window.open(
                    `${client.chain.blockExplorers.default.url}/address/${address}`,
                    "_blank"
                  );
                }
              }}
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* ============================================================
            SECTION 3: UNIVERSAL ACCOUNT ADDRESSES
            ============================================================
            These are the smart accounts created by Universal Accounts.
            They are DIFFERENT from Alchemy's smart account above.
            All controlled by the same EOA from Alchemy.
            ============================================================ */}
        {accountInfo && (
          <div className="border-t pt-4">
            <h3 className="text-sm font-medium mb-3">
              Universal Account Addresses (Multi-Chain)
            </h3>

            <div className="space-y-3">
              {/* EVM Smart Account */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Universal Account - EVM
                </p>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="font-mono text-xs py-1 px-2"
                  >
                    {formatAddress(accountInfo.evmSmartAccount)}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        accountInfo.evmSmartAccount
                      );
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Solana Smart Account */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Universal Account - Solana
                </p>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="font-mono text-xs py-1 px-2"
                  >
                    {accountInfo.solanaSmartAccount
                      ? formatAddress(accountInfo.solanaSmartAccount)
                      : "Not available"}
                  </Badge>
                  {accountInfo.solanaSmartAccount && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => {
                        navigator.clipboard.writeText(
                          accountInfo.solanaSmartAccount
                        );
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
            SECTION 4: UNIFIED BALANCE
            ============================================================
            Universal Accounts aggregates balances across all chains.
            This shows the total value in USD.
            ============================================================ */}
        {primaryAssets && (
          <div className="border-t pt-4">
            <h3 className="text-sm font-medium mb-3">
              Unified Balance (All Chains)
            </h3>
            <div className="space-y-2">
              <div className="flex items-center gap-4">
                <p className="text-4xl font-bold">
                  ${formatBalance(primaryAssets?.totalAmountInUSD ?? 0)}
                </p>
                {primaryAssets && primaryAssets.assets.length > 0 && (
                  <AssetBreakdownDialog
                    assets={primaryAssets.assets}
                    trigger={<Button variant="outline">View Breakdown</Button>}
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
            SECTION 5: SIGN WITH EOA
            ============================================================
            Demonstrates accessing the EOA signer from Alchemy.
            This is the same signer used by Universal Accounts.
            ============================================================ */}
        <div className="border-t pt-4">
          <h3 className="text-sm font-medium mb-3">
            Sign with EOA (from Alchemy)
          </h3>
          <div className="space-y-4">
            <div className="flex flex-col">
              <p className="text-sm text-muted-foreground mb-2">
                This uses the EOA signer from Alchemy Account Kit - the same one
                that controls Universal Accounts
              </p>
              <Button onClick={handleSignMessageWithEOA} disabled={!signer}>
                Sign Message with EOA
              </Button>

              {eoaSignature && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-blue-700 break-all">
                    <span className="font-medium">EOA Signature:</span>
                    <span className="ml-1">{eoaSignature}</span>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ============================================================
            SECTION 6: UNIVERSAL TRANSACTION
            ============================================================
            Demonstrates the full flow:
            1. Create Universal Transaction
            2. Sign with EOA (from Alchemy)
            3. Execute via Universal Accounts
            ============================================================ */}
        <div className="border-t pt-4">
          <h3 className="text-sm font-medium mb-3">
            Universal Transaction Demo
          </h3>
          <div className="space-y-4">
            <div className="flex flex-col">
              <p className="text-sm text-muted-foreground mb-2">
                Mint an NFT on Polygon using Universal Accounts. The transaction
                is signed with your EOA from Alchemy.
              </p>
              <Button
                onClick={handleMintNft}
                disabled={isTransacting || !universalAccount}
                className="relative overflow-hidden"
              >
                {isTransacting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing Transaction...
                  </>
                ) : (
                  <>
                    <ArrowRightLeft className="mr-2 h-4 w-4" />
                    Mint NFT on Polygon
                  </>
                )}
              </Button>

              {transactionSuccess && transactionId && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md flex items-center justify-between">
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    <span className="text-sm text-green-700">
                      Transaction successful!
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => {
                      window.open(
                        `https://universalx.app/activity/details?id=${transactionId}`,
                        "_blank"
                      );
                    }}
                  >
                    View Details
                    <ExternalLink className="ml-1 h-3 w-3" />
                  </Button>
                </div>
              )}

              {transactionError && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-700 flex items-center">
                    <span className="font-medium">Error:</span>
                    <span className="ml-1">{transactionError}</span>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
