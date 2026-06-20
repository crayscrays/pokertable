import {
  createPublicClient,
  createWalletClient,
  http,
  parseUnits,
  formatUnits,
  encodeFunctionData,
  type Address,
} from "viem";
import { base } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { env } from "../env.js";

const USDC_ADDRESS = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913" as Address;
const USDC_DECIMALS = 6;

const ERC20_ABI = [
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

const publicClient = createPublicClient({
  chain: base,
  transport: http(),
});

function getWalletClient() {
  if (!env.POT_PRIVATE_KEY) return null;
  const account = privateKeyToAccount(env.POT_PRIVATE_KEY as `0x${string}`);
  return { client: createWalletClient({ account, chain: base, transport: http() }), account };
}

export function getPotWalletAddress(): string {
  if (!env.POT_PRIVATE_KEY) return "0x0000000000000000000000000000000000000000";
  const wallet = getWalletClient();
  return wallet?.account.address ?? "0x0000000000000000000000000000000000000000";
}

// cents → USDC base units (6 decimals)
function centsToUsdc(cents: number): bigint {
  // cents is in USDC cents (100 = $1), USDC has 6 decimals
  // $1 = 1_000_000 base units; 1 cent = 10_000 base units
  return BigInt(Math.floor(cents)) * 10000n;
}

export async function sendUSDC(toAddress: string, amountCents: number): Promise<string> {
  const wallet = getWalletClient();
  if (!wallet) throw new Error("No pot wallet configured");

  const amount = centsToUsdc(amountCents);
  const data = encodeFunctionData({
    abi: ERC20_ABI,
    functionName: "transfer",
    args: [toAddress as Address, amount],
  });

  const hash = await wallet.client.sendTransaction({
    account: wallet.account,
    to: USDC_ADDRESS,
    data,
  });

  return hash;
}

export async function getPotBalance(): Promise<number> {
  const address = getPotWalletAddress() as Address;
  try {
    const balance = await publicClient.readContract({
      address: USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [address],
    });
    // Convert base units to cents
    return Number(balance) / 10000;
  } catch {
    return 0;
  }
}

export async function verifyDeposit(
  txHash: string,
  fromAddress: string,
  expectedCents: number
): Promise<boolean> {
  try {
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash as `0x${string}`,
      timeout: 30_000,
    });
    if (receipt.status !== "success") return false;

    // Verify USDC Transfer log: Transfer(from, to, amount)
    const potAddress = getPotWalletAddress().toLowerCase();
    const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== USDC_ADDRESS.toLowerCase()) continue;
      if (log.topics[0]?.toLowerCase() !== TRANSFER_TOPIC) continue;
      const to = "0x" + (log.topics[2] ?? "").slice(26).toLowerCase();
      if (to !== potAddress) continue;

      const amount = BigInt(log.data);
      const cents = Number(amount) / 10000;
      if (Math.abs(cents - expectedCents) < 1) return true;
    }
    return false;
  } catch (err) {
    console.error("verifyDeposit error:", err);
    return false;
  }
}
