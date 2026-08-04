import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function StatCard({
  label,
  value,
  delta,
  deltaGoodDirection = "up",
}: {
  label: string;
  value: string;
  delta?: { percent: number; label: string } | null;
  deltaGoodDirection?: "up" | "down";
}) {
  const hasDelta = delta != null && Number.isFinite(delta.percent);
  const isUp = hasDelta && delta.percent > 0;
  const isGood = hasDelta && (deltaGoodDirection === "up" ? isUp : !isUp);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xl font-semibold">{value}</p>
        {hasDelta && delta.percent !== 0 && (
          <p
            className={`mt-1 text-xs ${isGood ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}
          >
            {isUp ? "+" : ""}
            {delta.percent.toFixed(1)}% {delta.label}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
