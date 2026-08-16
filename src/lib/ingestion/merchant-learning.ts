import type { createClient } from "@/lib/supabase/server";

/**
 * Grava a categoria escolhida como padrão da empresa, para que futuras
 * transações com a mesma empresa (via merchant_aliases) já venham categorizadas.
 */
export async function learnMerchantCategory(
  supabase: Awaited<ReturnType<typeof createClient>>,
  merchantId: string,
  categoryId: string,
  subcategoryId: string | null,
) {
  await supabase
    .from("merchants")
    .update({ category_id: categoryId, subcategory_id: subcategoryId })
    .eq("id", merchantId);
}
