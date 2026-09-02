export function formatBDT(amount: number): string {
  return `BDT ${amount.toLocaleString('en-IN')}`;
}

export function formatTruncatedHash(hash: string, length = 6): string {
  if (!hash) return '';
  if (hash.length <= length * 2 + 2) return hash;
  return `${hash.slice(0, length + 2)}...${hash.slice(-length)}`;
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}
