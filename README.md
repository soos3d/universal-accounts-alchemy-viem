# Universal Accounts with Alchemy

This is a sample Next.js application demonstrating how to integrate and use Particle Network's Universal Accounts with Alchemy's Account Kit.

The Universal Accounts SDK allows you to integrate Universal Accounts into your dApp. This enables you to onboard users from any ecosystem without requiring them to bridge, regardless of where your dApp is deployed.

## What This App Does

This demo combines two powerful technologies to create a better Web3 user experience:

- **Alchemy Account Kit** - Provides user authentication (social login, email, passkeys) and creates an EOA (Externally Owned Account)
- **Particle Network's Universal Accounts** - Enables cross-chain transactions and unified balance tracking across multiple blockchains

### Key Features

 - **Social Authentication** - Users log in with email, Google, Facebook, or passkeys (no private key management)  
 - **Unified Balance** - View aggregated balance across all chains in a single USD value  
 - **Cross-Chain Execution** - Execute transactions on any supported chain (e.g., mint NFT on Polygon)  
 - **Multi-Chain Accounts** - Automatically creates smart accounts on EVM chains and Solana

### The Architecture

The app uses a clever pattern:
1. **Alchemy** handles authentication and provides the EOA signer
2. **Universal Accounts** uses that EOA to create multi-chain smart accounts
3. Transactions are signed with the Alchemy EOA and executed via Universal Accounts infrastructure

This creates two types of accounts:
- **EOA** - The underlying wallet (from Alchemy)
- **Universal Smart Accounts** - For cross-chain operations (EVM + Solana)

> Note that the user does not need to interact with the EOA at all.

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

- Node.js (v18 or later)
- yarn or npm

### Installation

1. Navigate to the application directory:
   ```sh
   cd my-smart-wallets-app
   ```

2. Install the dependencies:
   ```sh
   npm install
   ```
   or
   ```sh
   yarn install
   ```

3. Set up environment variables:
   ```sh
   cp .env.example .env
   ```
   and fill in the values for:

  Find the values on Alchemy and Particle Network:

  - https://dashboard.particle.network/
  - https://dashboard.alchemy.com/

   ```  
  NEXT_PUBLIC_ALCHEMY_API_KEY=YOUR_ALCHEMY_API_KEY
  NEXT_PUBLIC_PROJECT_ID=YOUR_PROJECT_ID
  NEXT_PUBLIC_PROJECT_CLIENT_KEY=YOUR_PROJECT_CLIENT_KEY
  NEXT_PUBLIC_PROJECT_APP_ID=YOUR_PROJECT_APP_ID
  ```

### Running the Application

To run the application in development mode, execute the following command:

```sh
npm run dev
```
or
```sh
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## How It Works: Combining Account Kit and Universal Accounts

This demo showcases a powerful pattern: using **Alchemy's Account Kit** for user authentication and EOA management, while leveraging **Particle Network's Universal Accounts** for chain abstraction and cross-chain transactions.

The core architectural flow is as follows:

1.  **Authentication with Alchemy Account Kit**: The user logs in via the UI provided by Account Kit (e.g., social login, email, passkey).

2.  **Accessing the EOA Signer**: Although Account Kit creates a smart account for the user, it also provides access to the underlying EOA (Externally Owned Account) that acts as the signer. We need to use the EOA directly to control the Universal Account, so we use the `useUser` hook to get the EOA's address.

    ```typescript
    import { useUser } from "@account-kit/react";

    const user = useUser();
    const eoaAddress = user?.address; // This is the EOA signer address
    ```

3.  **Initializing the Universal Account**: Particle Network's `UniversalAccount` is then initialized using the EOA address from Account Kit as its `ownerAddress`. This correctly establishes the ownership and signing relationship.

    ```typescript
    import { UniversalAccount } from "@particle-network/universal-account-sdk";

    const universalAccount = new UniversalAccount({
      // ...project config
      ownerAddress: eoaAddress,
    });
    ```

4.  **Creating and Signing a Transaction**:
    *   The demo transaction is built using `universalAccount.createUniversalTransaction()`. This returns a transaction object containing a `rootHash`.
    *   This `rootHash` must be signed by the EOA that owns the Universal Account. We get this signer from Account Kit's `useSigner` hook.
    *   **Crucially**, when signing the hash, it must be passed as raw bytes to the `signer.signMessage` method.

    ```typescript
    import { useSigner } from "@account-kit/react";
    import { getBytes } from "ethers";

    const { signer } = useSigner();

    // ... create `transaction` with universalAccount

    const signature = await signer.signMessage({
      raw: getBytes(transaction.rootHash),
    });
    ```

5.  **Sending the Transaction**: Finally, the original transaction object and the signature from the EOA are sent using `universalAccount.sendTransaction()`.

This flow successfully combines the authentication of Alchemy's Account Kit with the powerful chain abstraction capabilities of Particle Network's Universal Accounts.

