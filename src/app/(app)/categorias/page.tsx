import { createClient } from "@/lib/supabase/server";
import { setCategoryStatus, deleteCategory, deleteSubcategory } from "@/lib/actions/categories";
import { CategoryDialog } from "@/components/categories/category-dialog";
import { SubcategoryDialog } from "@/components/categories/subcategory-dialog";
import { StatusToggleButton } from "@/components/shared/status-toggle-button";
import { DeleteButton } from "@/components/shared/delete-button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getIcon } from "@/lib/icon-options";
import type { Database } from "@/types/database";

type Category = Database["public"]["Tables"]["categories"]["Row"];
type Subcategory = Database["public"]["Tables"]["subcategories"]["Row"];

function CategoryList({
  categories,
  subcategoriesByCategory,
  type,
}: {
  categories: Category[];
  subcategoriesByCategory: Map<string, Subcategory[]>;
  type: "receita" | "despesa";
}) {
  if (!categories.length) {
    return (
      <p className="p-6 text-sm text-muted-foreground">
        Nenhuma categoria de {type === "despesa" ? "despesa" : "receita"} ainda.
      </p>
    );
  }

  const formatCurrency = (value: number | null) =>
    value == null ? null : value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="divide-y">
      {categories.map((category) => {
        const Icon = getIcon(category.icon);
        const subcategories = subcategoriesByCategory.get(category.id) ?? [];
        const goalOrLimit =
          type === "despesa" ? formatCurrency(category.monthly_limit) : formatCurrency(category.monthly_goal);

        return (
          <div key={category.id} className="flex flex-col gap-3 p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 font-medium">
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
                  style={{ backgroundColor: `${category.color ?? "#3b82f6"}20`, color: category.color ?? "#3b82f6" }}
                >
                  <Icon className="h-4 w-4" />
                </span>
                {category.name}
                {goalOrLimit && (
                  <span className="text-xs font-normal text-muted-foreground">
                    ({type === "despesa" ? "limite" : "meta"} {goalOrLimit}/mês)
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Badge variant={category.status === "ativa" ? "default" : "secondary"}>
                  {category.status === "ativa" ? "Ativa" : "Arquivada"}
                </Badge>
                <CategoryDialog category={category} type={type} />
                <StatusToggleButton
                  isActive={category.status === "ativa"}
                  action={setCategoryStatus.bind(
                    null,
                    category.id,
                    category.status === "ativa" ? "arquivada" : "ativa",
                  )}
                />
                <DeleteButton
                  action={deleteCategory.bind(null, category.id)}
                  confirmMessage={`Excluir a categoria "${category.name}"? As subcategorias também serão excluídas.`}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 pl-9">
              {subcategories.map((sub) => (
                <span
                  key={sub.id}
                  className="flex items-center gap-1 rounded-full border bg-muted/50 py-0.5 pr-1 pl-2 text-xs"
                >
                  {sub.name}
                  <SubcategoryDialog categoryId={category.id} subcategory={sub} />
                  <DeleteButton
                    action={deleteSubcategory.bind(null, sub.id)}
                    confirmMessage={`Excluir a subcategoria "${sub.name}"?`}
                  />
                </span>
              ))}
              <SubcategoryDialog categoryId={category.id} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default async function CategoriasPage() {
  const supabase = await createClient();
  const [{ data: categories }, { data: subcategories }] = await Promise.all([
    supabase
      .from("categories")
      .select("*")
      .order("status", { ascending: true })
      .order("sort_order", { ascending: true }),
    supabase.from("subcategories").select("*").order("name"),
  ]);

  const subcategoriesByCategory = new Map<string, Subcategory[]>();
  for (const sub of subcategories ?? []) {
    const list = subcategoriesByCategory.get(sub.category_id) ?? [];
    list.push(sub);
    subcategoriesByCategory.set(sub.category_id, list);
  }

  const despesas = (categories ?? []).filter((category) => category.type === "despesa");
  const receitas = (categories ?? []).filter((category) => category.type === "receita");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Categorias</h1>
        <p className="text-sm text-muted-foreground">
          Categorias e subcategorias, com metas e limites mensais.
        </p>
      </div>

      <Tabs defaultValue="despesa">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="despesa">Despesas</TabsTrigger>
            <TabsTrigger value="receita">Receitas</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="despesa" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <CategoryDialog type="despesa" />
          </div>
          <Card>
            <CardContent className="p-0">
              <CategoryList categories={despesas} subcategoriesByCategory={subcategoriesByCategory} type="despesa" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="receita" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <CategoryDialog type="receita" />
          </div>
          <Card>
            <CardContent className="p-0">
              <CategoryList categories={receitas} subcategoriesByCategory={subcategoriesByCategory} type="receita" />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
