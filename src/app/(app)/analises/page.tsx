import { createClient } from "@/lib/supabase/server";
import { GenerateInsightsButton } from "@/components/insights/generate-insights-button";
import { AssistantChat } from "@/components/insights/assistant-chat";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AnalisesPage() {
  const supabase = await createClient();
  const { data: insights } = await supabase
    .from("ai_insights")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5);

  const configured = Boolean(process.env.ANTHROPIC_API_KEY);

  const formatDate = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Análises</h1>
          <p className="text-sm text-muted-foreground">
            Insights automáticos e assistente para consultar seus dados em linguagem natural.
          </p>
        </div>
        <GenerateInsightsButton disabled={!configured} />
      </div>

      {!configured && (
        <Card className="border-dashed">
          <CardContent className="p-4 text-sm text-muted-foreground">
            Defina a variável <code>ANTHROPIC_API_KEY</code> no servidor para habilitar as análises e o assistente.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Insights recentes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!insights?.length ? (
            <p className="text-sm text-muted-foreground">Nenhuma análise gerada ainda.</p>
          ) : (
            insights.map((insight) => (
              <div key={insight.id} className="space-y-1 rounded-md border p-3">
                {insight.period_start && insight.period_end && (
                  <div className="text-xs text-muted-foreground">
                    {formatDate(insight.period_start)} – {formatDate(insight.period_end)}
                  </div>
                )}
                <ul className="list-disc space-y-1 pl-5 text-sm">
                  {insight.content
                    .split("\n")
                    .filter(Boolean)
                    .map((line, index) => (
                      <li key={index}>{line.replace(/^[-•]\s*/, "")}</li>
                    ))}
                </ul>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Assistente</CardTitle>
        </CardHeader>
        <CardContent>
          <AssistantChat disabled={!configured} />
        </CardContent>
      </Card>
    </div>
  );
}
