import type { ExtractedRow } from "@/lib/ingestion/types";
import type { Database } from "@/types/database";

export type AutomationRule = Database["public"]["Tables"]["automation_rules"]["Row"];

export type RuleContext = {
  accountName?: string | null;
  creditCardName?: string | null;
};

function fieldValue(row: ExtractedRow, field: AutomationRule["field"], ctx: RuleContext): string | number | null {
  switch (field) {
    case "descricao":
    case "estabelecimento":
      return row.description;
    case "valor":
      return row.amount;
    case "conta":
      return ctx.accountName ?? null;
    case "cartao":
      return ctx.creditCardName ?? null;
    default:
      return null;
  }
}

function ruleMatches(rule: AutomationRule, row: ExtractedRow, ctx: RuleContext): boolean {
  const value = fieldValue(row, rule.field, ctx);
  if (value == null) return false;

  if (rule.field === "valor") {
    const numValue = typeof value === "number" ? value : Number(value);
    const target = Number(rule.search_value);
    if (Number.isNaN(numValue) || Number.isNaN(target)) return false;
    switch (rule.operator) {
      case "maior_que":
        return numValue > target;
      case "menor_que":
        return numValue < target;
      case "igual":
        return numValue === target;
      default:
        return false;
    }
  }

  const text = String(value).toLowerCase();
  const search = rule.search_value.toLowerCase();
  switch (rule.operator) {
    case "contem":
      return text.includes(search);
    case "igual":
      return text === search;
    case "comeca_com":
      return text.startsWith(search);
    case "termina_com":
      return text.endsWith(search);
    case "regex":
      try {
        return new RegExp(rule.search_value, "i").test(String(value));
      } catch {
        return false;
      }
    default:
      return false;
  }
}

export function applyRules(rows: ExtractedRow[], rules: AutomationRule[], ctx: RuleContext): ExtractedRow[] {
  const active = rules.filter((rule) => rule.status === "ativa").sort((a, b) => a.priority - b.priority);
  const result: ExtractedRow[] = [];

  for (const original of rows) {
    let row = { ...original };
    let ignored = false;

    for (const rule of active) {
      if (!ruleMatches(rule, row, ctx)) continue;

      switch (rule.action_type) {
        case "categorizar":
          if (rule.action_value) row = { ...row, category_id: rule.action_value };
          break;
        case "definir_empresa":
          if (rule.action_value) row = { ...row, merchant_id: rule.action_value };
          break;
        case "definir_centro_custo":
          if (rule.action_value) row = { ...row, cost_center_id: rule.action_value };
          break;
        case "marcar_transferencia":
          row = { ...row, type: "transferencia" };
          break;
        case "ignorar":
          ignored = true;
          break;
      }
    }

    if (!ignored) result.push(row);
  }

  return result;
}
