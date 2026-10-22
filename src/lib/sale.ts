export const SALE_DISCOUNT_PERCENT = 75;
export const SALE_MULTIPLIER = (100 - SALE_DISCOUNT_PERCENT) / 100;

type SalePrice = {
  original: string;
  sale: string;
};

function formatMoney(prefix: string, value: number, suffix: string) {
  const hasCents = Math.abs(value % 1) > 0.001;
  const formatted = value.toLocaleString("en-US", {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: hasCents ? 2 : 0,
  });
  return `${prefix}${formatted}${suffix}`;
}

export function salePriceFor(price: string): SalePrice | null {
  const match = price.match(/^(.*?)(\d[\d,]*(?:\.\d+)?)(.*)$/);
  if (!match) return null;

  const [, prefix, rawAmount, suffix] = match;
  const amount = Number(rawAmount.replace(/,/g, ""));
  if (!Number.isFinite(amount)) return null;

  return {
    original: price,
    sale: formatMoney(prefix, amount * SALE_MULTIPLIER, suffix),
  };
}
