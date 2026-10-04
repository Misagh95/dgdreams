/**
 * Centralized API validation utilities for DGDreams.
 */

const ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;
const TX_HASH_REGEX = /^0x[a-fA-F0-9]{64}$/;

/**
 * Validates whether a value is a valid 40-hex-character Ethereum-style address.
 */
export function isValidAddress(address: unknown): address is string {
  if (typeof address !== "string") return false;
  return ETH_ADDRESS_REGEX.test(address.trim());
}

/**
 * Validates whether a value is a valid transaction hash (0x + 64 hex chars).
 */
export function isValidTxHash(hash: unknown): hash is string {
  if (typeof hash !== "string") return false;
  return TX_HASH_REGEX.test(hash.trim());
}

/**
 * Validates and sanitizes a string input with a maximum length cap.
 */
export function sanitizeString(
  value: unknown,
  maxLength = 256
): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > maxLength) return null;
  return trimmed;
}

/**
 * Validates whether a value is a positive integer (e.g. chainId, score).
 */
export function isPositiveInteger(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value > 0
  );
}
