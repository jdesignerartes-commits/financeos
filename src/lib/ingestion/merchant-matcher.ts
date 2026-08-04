export type MerchantAliasLookup = { raw_text: string; merchant_id: string };
export type MerchantInfo = { id: string; category_id: string | null; subcategory_id: string | null };

export function matchMerchantId(description: string, aliases: MerchantAliasLookup[]): string | null {
  const normalized = description.trim().toLowerCase();
  if (!normalized) return null;

  const match = aliases.find((alias) => {
    const aliasText = alias.raw_text.trim().toLowerCase();
    return aliasText.length > 0 && normalized.includes(aliasText);
  });

  return match?.merchant_id ?? null;
}
