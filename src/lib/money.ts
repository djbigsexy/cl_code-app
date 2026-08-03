export const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'];

export function formatMoney(amount: number, currency = 'USD'): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

/**
 * Totals are only meaningful within a single currency. Rather than invent an
 * exchange rate, the UI reports the dominant currency and flags the rest.
 */
export function dominantCurrency(currencies: string[]): string {
  const counts = new Map<string, number>();
  for (const c of currencies) counts.set(c, (counts.get(c) ?? 0) + 1);
  let best = 'USD';
  let bestCount = -1;
  for (const [c, n] of counts) {
    if (n > bestCount) {
      best = c;
      bestCount = n;
    }
  }
  return best;
}
