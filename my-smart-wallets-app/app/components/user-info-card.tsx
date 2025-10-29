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
  useSignMessage,
} from "@account-kit/react";

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
  const [isCopied, setIsCopied] = useState(false);
  const [isTransacting, setIsTransacting] = useState(false);
  const [transactionSuccess, setTransactionSuccess] = useState(false);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [transactionError, setTransactionError] = useState<string | null>(null);

  const user = useUser();
  console.log(user);
  const userEmail = user?.email ?? "anon";
  const { client } = useSmartAccountClient({});
  const address = user?.address; //client?.account?.address;
  const [accountInfo, setAccountInfo] = useState<{
    ownerAddress: string;
    evmSmartAccount: string;
    solanaSmartAccount: string;
  } | null>(null);
  const [universalAccount, setUniversalAccount] =
    useState<UniversalAccount | null>(null);
  const [primaryAssets, setPrimaryAssets] = useState<IAssetsResponse | null>(
    null
  );

  const {
    signMessage,
    signMessageAsync,
    signedMessage,
    isSigningMessage,
    error,
  } = useSignMessage({
    client,
    // these are optional
    onSuccess: (result) => {
      // do something on success
    },
    onError: (error) => console.error(error),
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(address ?? "");
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  /**
   * Initialize UniversalAccount instance when user connects.
   * This is the first step in using Universal Accounts - creating an instance
   * with the user's EOA address and project configuration.
   */
  useEffect(() => {
    if (!address) {
      return;
    }
    console.log("Initializing UniversalAccount");
    console.log(user);

    console.log(address);
    const ua = new UniversalAccount({
      projectId: process.env.NEXT_PUBLIC_PROJECT_ID!,
      projectClientKey: process.env.NEXT_PUBLIC_CLIENT_KEY!,
      projectAppUuid: process.env.NEXT_PUBLIC_APP_ID!,
      ownerAddress: address as `0x${string}`,
      // If not set it will use auto-slippage
      tradeConfig: {
        slippageBps: 100, // 1% slippage tolerance
        //usePrimaryTokens: [SUPPORTED_TOKEN_TYPE.SOL], // Specify token to use as source (only for swaps)
      },
    });
    setUniversalAccount(ua);
  }, [address, user]);

  /**
   * Fetch Universal Account addresses.
   * This effect demonstrates getSmartAccountOptions():
   * Retrieves all account addresses:
   * - Owner EOA (from Particle Auth)
   * - EVM Universal Account
   * - Solana Universal Account
   */
  useEffect(() => {
    const fetchSmartAccountAddresses = async () => {
      if (!universalAccount || !address) return;

      try {
        const smartAccountOptions =
          await universalAccount.getSmartAccountOptions();
        const accountInfo = {
          ownerAddress: address,
          evmSmartAccount: smartAccountOptions.smartAccountAddress || "",
          solanaSmartAccount:
            smartAccountOptions.solanaSmartAccountAddress || "",
        };
        console.log("Smart Account Options:", accountInfo);
        setAccountInfo(accountInfo);
      } catch (error) {
        console.error("Error fetching smart account addresses:", error);
      }
    };

    fetchSmartAccountAddresses();
  }, [universalAccount, address]);

  /**
   * Fetch Universal Account balances.
   * This effect demonstrates getPrimaryAssets():
   * Returns a JSON object containing all primary assets held on supported chains,
   * including native tokens and major assets like USDC, USDT, etc.
   */
  useEffect(() => {
    const fetchPrimaryAssets = async () => {
      if (!universalAccount || !address) return;

      try {
        const primaryAssets = await universalAccount.getPrimaryAssets();
        // console.log("Primary Assets:", JSON.stringify(primaryAssets, null, 2));
        setPrimaryAssets(primaryAssets);
      } catch (error) {
        console.error("Error fetching primary assets:", error);
      }
    };

    fetchPrimaryAssets();
  }, [universalAccount, address]);

  const handleSwapToUsdt = async () => {
    try {
      setIsTransacting(true);
      setTransactionSuccess(false);
      setTransactionError(null);
      setTransactionId(null);

      if (!universalAccount) {
        throw new Error("Universal Account not initialized");
      }

      if (!client) {
        throw new Error("Provider not available");
      }

      const transaction = await universalAccount.createTransferTransaction({
        token: {
          chainId: CHAIN_ID.ARBITRUM_MAINNET_ONE,
          address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", // USDT on Arbitrum
        },
        amount: "0.3", // Amount to send (human-readable string)
        receiver: "0x5C1885c0C6A738bAdAfE4dD811A26B546431aD89", // Target address
      });

      const signature = await signMessageAsync({
        message: transaction.rootHash,
      });

      const sendResult = await universalAccount.sendTransaction(
        transaction,
        signature
      );

      console.log("Send result:", sendResult);
      const explorerUrl = `https://universalx.app/activity/details?id=${sendResult.transactionId}`;
      console.log("Explorer URL:", explorerUrl);

      setTransactionSuccess(true);
      setTransactionId(sendResult.transactionId);

      // Refresh assets after transaction
      if (universalAccount) {
        const updatedAssets = await universalAccount.getPrimaryAssets();
        setPrimaryAssets(updatedAssets);
      }
    } catch (error: unknown) {
      console.error("Error in transaction:", error);
      setTransactionError(
        typeof error === "object" && error !== null && "message" in error
          ? (error as Error).message
          : "Unknown error occurred"
      );
    } finally {
      setIsTransacting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Profile</CardTitle>
        <CardDescription>
          Your users are always in control of their non-custodial smart wallet.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* User Email */}
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">
            Email
          </p>
          <p className="font-medium">{userEmail}</p>
        </div>

        {/* Smart Wallet Address */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-medium text-muted-foreground">
              Smart wallet address
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

        {/* Universal Account Addresses */}
        {accountInfo && (
          <div className="border-t pt-4">
            <h3 className="text-sm font-medium mb-3">
              Universal Account Addresses
            </h3>

            <div className="space-y-3">
              {/* EVM Smart Account */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  EVM Smart Account
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
                  Solana Smart Account
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

        {/* Primary Assets */}
        {primaryAssets && (
          <div className="border-t pt-4">
            <h3 className="text-sm font-medium mb-3">Unified Balance</h3>
            <div className="space-y-2">
              <span className="text-lg font-semibold">
                ${formatBalance(primaryAssets.totalAmountInUSD)}
              </span>
            </div>
          </div>
        )}

        {/* Transaction Button */}
        <div className="border-t pt-4">
          <h3 className="text-sm font-medium mb-3">Universal Transactions</h3>
          <div className="space-y-4">
            <div className="flex flex-col">
              <p className="text-sm text-muted-foreground mb-2">
                Execute a cross-chain transaction using your Universal Account
              </p>
              <Button
                onClick={handleSwapToUsdt}
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
                    Send USDT on Arbitrum
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
