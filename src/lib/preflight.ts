import { keccak256, toBytes } from "viem";

/**
 * Preflight helpers for the NikBase daily missions (check-in / GM / GN).
 *
 * Kept in a plain `.ts` module (no JSX) so the logic is unit-testable from
 * Node scripts without a browser/Next runtime. UI components import and
 * re-export from here.
 */

export const PREFLIGHT_TIMEOUT_MS = 800;

export const NIKBASE_TASKS_ABI = [
  { inputs: [], name: "dailyCheckIn", outputs: [{ name: "newStreak", type: "uint256" }], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "gm", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "gn", outputs: [], stateMutability: "nonpayable", type: "function" },
] as const;

const GET_FLAGS_ABI = [
  {
    inputs: [{ name: "user", type: "address" }],
    name: "getFlags",
    outputs: [
      { name: "cIn", type: "bool" },
      { name: "rec", type: "bool" },
      { name: "gmDone_", type: "bool" },
      { name: "gnDone_", type: "bool" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

export type TaskMethod = "dailyCheckIn" | "gm" | "gn";

/** getFlags() index for each mission: (checkedIn, reception, gm, gn). */
const FLAG_INDEX: Record<TaskMethod, number> = {
  dailyCheckIn: 0,
  gm: 2,
  gn: 3,
};

export interface PreflightCallArgs {
  account?: `0x${string}`;
  to: `0x${string}`;
  data: `0x${string}`;
}

export interface PreflightClient {
  call: (args: PreflightCallArgs) => Promise<{ data?: `0x${string}` } | undefined>;
}

export interface PreflightOpts {
  account: `0x${string}`;
  contract: `0x${string}`;
  method: TaskMethod;
}

function errorSelector(signature: string): string {
  return keccak256(toBytes(signature)).slice(0, 10);
}

/**
 * Custom-error selectors that genuinely mean "you already did it today"
 * (per-day limits on NikBase). Computed at runtime so a typo'd hash can
 * never silently desync from the Solidity error names.
 */
const ALREADY_DONE_SELECTORS = new Set([
  errorSelector("AlreadyDone()"),
  errorSelector("AlreadyExecutedToday()"),
  errorSelector("LimitReached()"),
]);

export function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
    promise.finally(() => {
      if (timer) clearTimeout(timer);
    }),
    new Promise<T>((_, reject) => {
      timer = setTimeout(() => reject(new Error(label)), ms);
    }),
  ]);
}

/**
 * Extract revert data (if any) by walking the `cause` chain of a viem error.
 * Returns:
 *  - undefined: no revert payload found → most likely an RPC/transport error
 *  - "0x": an execution revert with no reason data (e.g. a fallback-less
 *    contract hit with an unknown selector, or an OOG-style error)
 *  - "0x…" (selector or longer): the raw revert payload
 */
export function extractRevertData(err: unknown): string | undefined {
  let cur: any = err;
  for (let i = 0; cur && i < 10; i++) {
    const raw = cur?.data;
    const d: unknown =
      raw && typeof raw === "object" && "data" in (raw as Record<string, unknown>)
        ? (raw as { data?: unknown }).data ?? raw
        : raw;
    if (typeof d === "string" && d.startsWith("0x")) return d;
    cur = cur?.cause;
  }
  return undefined;
}

/**
 * Did this eth_call failure come from the EVM executing a revert?
 *
 * viem wraps EVERYTHING from `client.call` (HTTP 429s, DNS failures,
 * timeouts, …) in an outer `CallExecutionError`, so the top-level error
 * name alone can never distinguish "the contract reverted" from "the RPC
 * hiccuped". Only an execution-revert node inside the cause chain — or
 * revert data itself — proves the contract said no.
 */
export function isExecutionRevert(err: unknown): boolean {
  let cur: any = err;
  for (let i = 0; cur && i < 10; i++) {
    const name: string = cur?.name ?? "";
    // viem v1 node error / getRevertErrorData-style classification
    if (name === "ExecutionRevertedError" || name === "ContractFunctionRevertedError") return true;
    if (cur?.code === 3) return true; // JSON-RPC "execution reverted"
    if (extractRevertData(cur) !== undefined) return true;
    const details: string = `${cur?.details ?? ""}`.toLowerCase();
    const message: string = `${cur?.shortMessage ?? ""} ${cur?.message ?? ""}`.toLowerCase();
    if (
      details.includes("execution reverted") ||
      details.includes("reverted without a reason") ||
      message.startsWith("execution reverted") ||
      message.includes("execution reverted:") ||
      message.includes("execution reverted.")
    ) {
      return true;
    }
    cur = cur?.cause;
  }
  return false;
}

import { decodeFunctionResult, encodeFunctionData } from "viem";

/**
 * Read today's done-flags for `account` with the view function
 * `getFlags(address) → (checkedIn, reception, gm, gn)`.
 * Returns true when the task is still runnable, false when already done.
 * Throws on RPC errors / missing contract so the caller can fail open.
 */
async function checkViaGetFlags(
  pubClient: PreflightClient,
  opts: PreflightOpts
): Promise<boolean> {
  const data = encodeFunctionData({
    abi: GET_FLAGS_ABI,
    functionName: "getFlags",
    args: [opts.account],
  });
  const res = await withTimeout(
    pubClient.call({ to: opts.contract, data }),
    PREFLIGHT_TIMEOUT_MS,
    "preflight timeout"
  );
  if (!res?.data || res.data === "0x") {
    throw new Error("getFlags returned no data (not a NikBase contract?)");
  }
  const flags = decodeFunctionResult({
    abi: GET_FLAGS_ABI,
    functionName: "getFlags",
    data: res.data,
  }) as readonly [boolean, boolean, boolean, boolean];
  return !flags[FLAG_INDEX[opts.method]];
}

/**
 * Fallback for contracts that predate `getFlags`: simulate the state-changing
 * call the wallet would send and interpret the outcome.
 */
async function checkViaSimulation(
  pubClient: PreflightClient,
  opts: PreflightOpts
): Promise<boolean> {
  const data = encodeFunctionData({
    abi: NIKBASE_TASKS_ABI,
    functionName: opts.method,
    args: [],
  });
  try {
    await withTimeout(
      pubClient.call({ account: opts.account, to: opts.contract, data }),
      PREFLIGHT_TIMEOUT_MS,
      "preflight timeout"
    );
    return true;
  } catch (e: unknown) {
    if (!isExecutionRevert(e)) {
      // RPC hiccup (HTTP/timeout/rate-limit/unknown): fail OPEN and let the
      // wallet's own simulation decide.
      return true;
    }
    const revertData = extractRevertData(e);
    if (revertData && revertData !== "0x") {
      const selector = revertData.slice(0, 10).toLowerCase();
      if (ALREADY_DONE_SELECTORS.has(selector)) return false;
      // A real revert, but NOT one that means "you did it today" (paused
      // contract, wrong function, …). Fail open so the user sees the genuine
      // error instead of a false "already done today".
      return true;
    }
    // Empty revert (0x): ambiguous — could be an unknown selector on a
    // fallback-less contract or an OOG-style error. Do NOT lock the user out.
    return true;
  }
}

/**
 * The NikBase contract accepts each action only once per UTC day. Calling an
 * action twice makes the call revert, and wallets simulate before signing —
 * which surfaces as "Simulation Failed (execution revert)" and the tx never
 * reaches the chain.
 *
 * This preflight answers "did I already do it today?" up front, primarily
 * with the day-aware view `getFlags(address)` (no revert possible) and —
 * only where that view is unavailable — with the same `eth_call` the wallet
 * would run.
 *
 * Failure policy: fail OPEN (runnable). A slow RPC, an HTTP error, a
 * rate-limit, or an ambiguous revert must never lock the user out with a
 * false "already done today" — the wallet's own simulation is the final
 * guard. Only the contract's day-limit errors count as "already done".
 */
export async function canStillRunTask(
  pubClient: PreflightClient,
  opts: PreflightOpts
): Promise<boolean> {
  try {
    return await checkViaGetFlags(pubClient, opts);
  } catch {
    return checkViaSimulation(pubClient, opts);
  }
}
