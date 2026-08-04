import ExcelJS from "exceljs";
import Papa from "papaparse";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { createClient } from "@/lib/supabase/server";
import { TRANSACTION_TYPE_LABELS } from "@/lib/labels";
import type { Database } from "@/types/database";

type TransactionType = Database["public"]["Tables"]["transactions"]["Row"]["type"];

function isTransactionType(value: string): value is TransactionType {
  return value in TRANSACTION_TYPE_LABELS;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") ?? "csv";
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  const accountId = searchParams.get("account_id");
  const creditCardId = searchParams.get("credit_card_id");
  const categoryId = searchParams.get("category_id");
  const costCenterId = searchParams.get("cost_center_id");
  const merchantId = searchParams.get("merchant_id");
  const type = searchParams.get("type");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Não autorizado", { status: 401 });

  let query = supabase
    .from("transactions")
    .select(
      "date, amount, type, friendly_description, category_id, account_id, credit_card_id, merchant_id, cost_center_id",
    )
    .order("date", { ascending: true });

  if (start) query = query.gte("date", start);
  if (end) query = query.lte("date", end);
  if (accountId) query = query.eq("account_id", accountId);
  if (creditCardId) query = query.eq("credit_card_id", creditCardId);
  if (categoryId) query = query.eq("category_id", categoryId);
  if (costCenterId) query = query.eq("cost_center_id", costCenterId);
  if (merchantId) query = query.eq("merchant_id", merchantId);
  if (type && isTransactionType(type)) query = query.eq("type", type);

  const [
    { data: transactions },
    { data: categories },
    { data: accounts },
    { data: creditCards },
    { data: merchants },
    { data: costCenters },
  ] = await Promise.all([
    query,
    supabase.from("categories").select("id, name"),
    supabase.from("accounts").select("id, name"),
    supabase.from("credit_cards").select("id, name"),
    supabase.from("merchants").select("id, display_name"),
    supabase.from("cost_centers").select("id, name"),
  ]);

  const categoryNameById = new Map((categories ?? []).map((c) => [c.id, c.name]));
  const accountNameById = new Map((accounts ?? []).map((a) => [a.id, a.name]));
  const cardNameById = new Map((creditCards ?? []).map((c) => [c.id, c.name]));
  const merchantNameById = new Map((merchants ?? []).map((m) => [m.id, m.display_name]));
  const costCenterNameById = new Map((costCenters ?? []).map((c) => [c.id, c.name]));

  const rows = (transactions ?? []).map((t) => ({
    Data: new Date(`${t.date}T00:00:00`).toLocaleDateString("pt-BR"),
    Descricao: t.friendly_description ?? "",
    Tipo: TRANSACTION_TYPE_LABELS[t.type] ?? t.type,
    Categoria: t.category_id ? (categoryNameById.get(t.category_id) ?? "") : "",
    Empresa: t.merchant_id ? (merchantNameById.get(t.merchant_id) ?? "") : "",
    CentroDeCusto: t.cost_center_id ? (costCenterNameById.get(t.cost_center_id) ?? "") : "",
    ContaOuCartao: t.credit_card_id
      ? (cardNameById.get(t.credit_card_id) ?? "")
      : t.account_id
        ? (accountNameById.get(t.account_id) ?? "")
        : "",
    Valor: t.amount,
  }));

  const filename = `relatorio-financeos-${new Date().toISOString().slice(0, 10)}`;

  if (format === "csv") {
    const csv = Papa.unparse(rows);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}.csv"`,
      },
    });
  }

  if (format === "xlsx") {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Relatório");
    sheet.columns = [
      { header: "Data", key: "Data" },
      { header: "Descrição", key: "Descricao" },
      { header: "Tipo", key: "Tipo" },
      { header: "Categoria", key: "Categoria" },
      { header: "Empresa", key: "Empresa" },
      { header: "Centro de custo", key: "CentroDeCusto" },
      { header: "Conta/Cartão", key: "ContaOuCartao" },
      { header: "Valor", key: "Valor" },
    ];
    sheet.addRows(rows);
    const buffer = await workbook.xlsx.writeBuffer();
    return new Response(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}.xlsx"`,
      },
    });
  }

  if (format === "pdf") {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text("Relatório financeiro — FinanceOS", 14, 16);
    autoTable(doc, {
      startY: 22,
      head: [["Data", "Descrição", "Tipo", "Categoria", "Empresa", "Conta/Cartão", "Valor"]],
      body: rows.map((r) => [
        r.Data,
        r.Descricao,
        r.Tipo,
        r.Categoria,
        r.Empresa,
        r.ContaOuCartao,
        r.Valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
      ]),
      styles: { fontSize: 8 },
    });
    const buffer = doc.output("arraybuffer");
    return new Response(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}.pdf"`,
      },
    });
  }

  return new Response("Formato inválido", { status: 400 });
}
