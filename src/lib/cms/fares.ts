export const FARE_TYPE_OPTIONS = [
  { value: "airport_transfer", label: "Airport transfer" },
  { value: "package_8h_80km", label: "8 Hrs / 80 Km package" },
  { value: "extra_hour", label: "Per hour" },
  { value: "extra_km", label: "Per km" },
  { value: "outstation", label: "Outstation" },
  { value: "other", label: "Other" },
] as const;

const inr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });

/** "₹1,250" — matches the live site's formatting. */
export function formatInr(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "";
  return `₹${inr.format(amount)}`;
}

export function formatPrice(prefix: string, amount: number | null | undefined, fallbackText: string): string {
  if (amount === null || amount === undefined) return fallbackText;
  return [prefix, formatInr(amount)].filter(Boolean).join(" ");
}
