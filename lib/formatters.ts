/**
 * Presentation-only financial formatters.
 *
 * Backend values are intentionally left untouched so settlement and audit
 * calculations retain their original precision. The admin console displays a
 * consistent maximum of two decimals.
 */
const amountFormatter = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const compactFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 2,
});

export function formatAmount(value: unknown, fallback = "—") {
  const amount = Number(value);
  return Number.isFinite(amount) ? amountFormatter.format(amount) : fallback;
}

export function formatDemoUsdt(value: unknown, fallback = "0.00") {
  return `${formatAmount(value, fallback)} Demo USDT`;
}

export function formatMarketValue(value: unknown, fallback = "Waiting for snapshot") {
  return formatAmount(value, fallback);
}

export function formatNumber(value: unknown, fallback = "0") {
  const amount = Number(value);
  return Number.isFinite(amount) ? compactFormatter.format(amount) : fallback;
}
