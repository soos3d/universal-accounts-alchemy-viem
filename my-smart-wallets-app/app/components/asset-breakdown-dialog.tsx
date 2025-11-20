"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { IAsset } from "@particle-network/universal-account-sdk";

// Helper function to format balance values
const formatBalance = (value: any, decimals: number = 2): string => {
  try {
    if (typeof value === "string") {
      return parseFloat(value).toFixed(decimals);
    } else if (typeof value === "number") {
      return value.toFixed(decimals);
    }
    return "0.00";
  } catch (e) {
    return "0.00";
  }
};

interface AssetBreakdownDialogProps {
  assets: IAsset[];
  trigger: React.ReactNode;
}

export const AssetBreakdownDialog = ({
  assets,
  trigger,
}: AssetBreakdownDialogProps) => {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Unified Balance Breakdown</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Asset</th>
                  <th className="px-4 py-2 text-right font-medium">Amount</th>
                  <th className="px-4 py-2 text-right font-medium">
                    Value (USD)
                  </th>
                </tr>
              </thead>
              <tbody>
                {assets.length > 0 ? (
                  assets.map((asset) => (
                    <tr
                      key={asset.tokenType}
                      className="border-b last:border-none"
                    >
                      <td className="px-4 py-2 font-medium">
                        {asset.tokenType}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {formatBalance(asset.amount, 4)}
                      </td>
                      <td className="px-4 py-2 text-right">
                        ${formatBalance(asset.amountInUSD)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      No assets found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
