import type { BreakdownEntry } from "@/lib/dashboard/compute";

/** Paleta do tema minimalista. Fonte única de verdade das cores locais. */
export const MINIMAL = {
  bg: "#f6f6f2",
  surface: "#eeefe9",
  ink: "#1d201c",
  body: "#6b706a",
  muted: "#8d918a",
  line: "#e5e5dd",
  green: "#2c4b38",
  negative: "#9b6a52",
} as const;

export function formatBRL(value: number, full = false) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: full ? 2 : 0,
  });
}

export function percentDelta(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: MINIMAL.muted }}>
      {children}
    </span>
  );
}

/** Título grande em serifada — usado no número principal de cada página. */
export function BigNumber({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[64px] leading-[0.95] tabular-nums md:text-[76px]"
      style={{ fontFamily: "var(--font-serif, Georgia, serif)", fontWeight: 300, letterSpacing: "-0.02em" }}
    >
      {children}
    </p>
  );
}

export function Section({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-6 border-t pt-6" style={{ borderColor: MINIMAL.line }}>
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h2 className="text-[15px] font-medium tracking-[-0.01em]" style={{ color: MINIMAL.ink }}>
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

/** Faixa de métricas: divisórias de 1px em vez de cards soltos. */
export function MetricRow({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="grid grid-cols-1 gap-px overflow-hidden rounded border sm:grid-cols-3"
      style={{ background: MINIMAL.line, borderColor: MINIMAL.line }}
    >
      {children}
    </div>
  );
}

export function Metric({
  label,
  value,
  delta,
  goodDirection = "up",
  highlight = false,
}: {
  label: string;
  value: string;
  delta?: number | null;
  goodDirection?: "up" | "down";
  highlight?: boolean;
}) {
  const hasDelta = delta != null && Number.isFinite(delta) && delta !== 0;
  const isUp = hasDelta && (delta as number) > 0;
  const isGood = hasDelta && (goodDirection === "up" ? isUp : !isUp);

  return (
    <div
      className="flex flex-col gap-2 px-6 py-5"
      style={{ background: highlight ? MINIMAL.surface : MINIMAL.bg }}
    >
      <span className="text-xs" style={{ color: MINIMAL.muted }}>
        {label}
      </span>
      <span className="text-[22px] tabular-nums" style={{ color: highlight ? MINIMAL.green : MINIMAL.ink }}>
        {value}
      </span>
      <span
        className="font-mono text-[11px]"
        style={{ color: hasDelta ? (isGood ? MINIMAL.green : MINIMAL.negative) : MINIMAL.muted }}
      >
        {hasDelta ? `${isUp ? "+" : ""}${(delta as number).toFixed(1)}% vs mês anterior` : "\u00a0"}
      </span>
    </div>
  );
}

/** Barras de 3px, renderizadas no servidor — substitui o gráfico de barras nas listas. */
export function BreakdownList({ data, empty }: { data: BreakdownEntry[]; empty: string }) {
  if (data.length === 0) {
    return (
      <p className="text-sm" style={{ color: MINIMAL.muted }}>
        {empty}
      </p>
    );
  }
  const max = Math.max(...data.map((d) => d.total));

  return (
    <div className="flex flex-col gap-[18px]">
      {data.map((entry) => (
        <div key={entry.id} className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-4 text-[13px]">
            <span className="truncate" style={{ color: MINIMAL.ink }}>
              {entry.name}
            </span>
            <span className="tabular-nums" style={{ color: MINIMAL.body }}>
              {formatBRL(entry.total)}
            </span>
          </div>
          <div className="h-[3px]" style={{ background: MINIMAL.line }}>
            <div
              className="h-[3px]"
              style={{ background: MINIMAL.green, width: `${max > 0 ? (entry.total / max) * 100 : 0}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Lista de destaques em <dl>, uma linha fina por item. */
export function HighlightGrid({ items }: { items: { label: string; value: string }[] }) {
  return (
    <dl className="grid grid-cols-2 gap-x-8 gap-y-6 md:grid-cols-5">
      {items.map((item) => (
        <div key={item.label} className="flex flex-col gap-2 border-t pt-4" style={{ borderColor: MINIMAL.line }}>
          <dt className="text-xs" style={{ color: MINIMAL.muted }}>
            {item.label}
          </dt>
          <dd className="truncate text-sm" style={{ color: MINIMAL.ink }}>
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Envelope da página: sangra o fundo off-white sobre o padding do layout do app. */
export function MinimalPage({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="-mx-4 -my-4 min-h-full px-6 py-10 md:-mx-6 md:-my-6 md:px-10 md:py-12"
      style={{ background: MINIMAL.bg, color: MINIMAL.ink }}
    >
      <div className="mx-auto flex max-w-[1180px] flex-col gap-14">{children}</div>
    </div>
  );
}
