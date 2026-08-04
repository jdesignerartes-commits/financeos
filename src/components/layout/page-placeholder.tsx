import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function PagePlaceholder({
  title,
  module,
  description,
}: {
  title: string;
  module: string;
  description: string;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base text-muted-foreground">
            Em construção — {module}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            A estrutura, autenticação e navegação já estão prontas. Esta tela será implementada
            quando chegarmos a este módulo do plano.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
