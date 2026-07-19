const txTimestamps: Record<string, number> = {};

export function checkRateLimit(action: string, minIntervalMs = 3000): boolean {
  const now = Date.now();
  const key = `${action}`;
  if (txTimestamps[key] && now - txTimestamps[key] < minIntervalMs) {
    return false;
  }
  txTimestamps[key] = now;
  return true;
}

export function canExecute(action: string): boolean {
  return checkRateLimit(action, 3000);
}
