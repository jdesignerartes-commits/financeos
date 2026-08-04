import { createClient } from "@/lib/supabase/server";
import { deleteMerchant, deleteAlias } from "@/lib/actions/merchants";
import { MerchantDialog } from "@/components/merchants/merchant-dialog";
import { AliasDialog } from "@/components/merchants/alias-dialog";
import { DeleteButton } from "@/components/shared/delete-button";
import { Card, CardContent } from "@/components/ui/card";
import { getIcon } from "@/lib/icon-options";
import type { Database } from "@/types/database";

type Alias = Database["public"]["Tables"]["merchant_aliases"]["Row"];

export default async function EmpresasPage() {
  const supabase = await createClient();
  const [{ data: merchants }, { data: categories }, { data: subcategories }, { data: aliases }] =
    await Promise.all([
      supabase.from("merchants").select("*").order("display_name"),
      supabase.from("categories").select("*").eq("status", "ativa").order("sort_order"),
      supabase.from("subcategories").select("*").eq("status", "ativa").order("name"),
      supabase.from("merchant_aliases").select("*").order("raw_text"),
    ]);

  const categoryById = new Map((categories ?? []).map((category) => [category.id, category]));
  const subcategoryById = new Map((subcategories ?? []).map((sub) => [sub.id, sub]));

  const aliasesByMerchant = new Map<string, Alias[]>();
  for (const alias of aliases ?? []) {
    const list = aliasesByMerchant.get(alias.merchant_id) ?? [];
    list.push(alias);
    aliasesByMerchant.set(alias.merchant_id, list);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Empresas</h1>
          <p className="text-sm text-muted-foreground">
            Base de estabelecimentos e apelidos (aliases) para reconhecimento automático.
          </p>
        </div>
        <MerchantDialog categories={categories ?? []} subcategories={subcategories ?? []} />
      </div>

      <Card>
        <CardContent className="p-0">
          {!merchants?.length ? (
            <p className="p-6 text-sm text-muted-foreground">
              Nenhuma empresa cadastrada ainda. Clique em &quot;Nova empresa&quot; para começar.
            </p>
          ) : (
            <div className="divide-y">
              {merchants.map((merchant) => {
                const Icon = getIcon(merchant.icon);
                const category = merchant.category_id ? categoryById.get(merchant.category_id) : undefined;
                const subcategory = merchant.subcategory_id
                  ? subcategoryById.get(merchant.subcategory_id)
                  : undefined;
                const merchantAliases = aliasesByMerchant.get(merchant.id) ?? [];

                return (
                  <div key={merchant.id} className="flex flex-col gap-3 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2 font-medium">
                        <span
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
                          style={{
                            backgroundColor: `${merchant.color ?? "#3b82f6"}20`,
                            color: merchant.color ?? "#3b82f6",
                          }}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <div>
                          <div>{merchant.display_name}</div>
                          {(category || subcategory) && (
                            <div className="text-xs font-normal text-muted-foreground">
                              {category?.name}
                              {subcategory ? ` › ${subcategory.name}` : ""}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <MerchantDialog
                          merchant={merchant}
                          categories={categories ?? []}
                          subcategories={subcategories ?? []}
                        />
                        <DeleteButton
                          action={deleteMerchant.bind(null, merchant.id)}
                          confirmMessage={`Excluir a empresa "${merchant.display_name}"? Os aliases também serão excluídos.`}
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 pl-9">
                      {merchantAliases.map((alias) => (
                        <span
                          key={alias.id}
                          className="flex items-center gap-1 rounded-full border bg-muted/50 py-0.5 pr-1 pl-2 text-xs"
                        >
                          {alias.raw_text}
                          <DeleteButton
                            action={deleteAlias.bind(null, alias.id)}
                            confirmMessage={`Remover o alias "${alias.raw_text}"?`}
                          />
                        </span>
                      ))}
                      <AliasDialog merchantId={merchant.id} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
