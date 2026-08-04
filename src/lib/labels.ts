export const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  conta_corrente: "Conta corrente",
  conta_digital: "Conta digital",
  poupanca: "Poupança",
  dinheiro: "Dinheiro",
  carteira: "Carteira",
  investimento: "Investimento",
};

export const CARD_BRAND_LABELS: Record<string, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  elo: "Elo",
  amex: "American Express",
  hipercard: "Hipercard",
  outra: "Outra",
};

export const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  receita: "Receita",
  despesa: "Despesa",
  transferencia: "Transferência",
  pagamento_fatura: "Pagamento de fatura",
  estorno: "Estorno",
  reembolso: "Reembolso",
  cashback: "Cashback",
  tarifa: "Tarifa",
  juros: "Juros",
  iof: "IOF",
  imposto: "Imposto",
  saque: "Saque",
  deposito: "Depósito",
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  pix: "Pix",
  debito: "Débito",
  credito: "Crédito",
  dinheiro: "Dinheiro",
  boleto: "Boleto",
  transferencia_bancaria: "Transferência bancária",
  outro: "Outro",
};

export function toSelectItems(labels: Record<string, string>) {
  return Object.entries(labels).map(([value, label]) => ({ value, label }));
}

export const IMPORT_ORIGIN_LABELS: Record<string, string> = {
  extrato: "Extrato bancário",
  fatura: "Fatura de cartão",
  nota_fiscal: "Nota fiscal",
  comprovante: "Comprovante",
  print: "Print de movimentação",
  outro: "Outro",
};

export const IMPORT_STATUS_LABELS: Record<string, string> = {
  aguardando: "Aguardando",
  processando: "Processando",
  revisao_necessaria: "Revisão necessária",
  concluido: "Concluído",
  falhou: "Falhou",
};

export const RULE_FIELD_LABELS: Record<string, string> = {
  descricao: "Descrição",
  estabelecimento: "Estabelecimento",
  valor: "Valor",
  conta: "Conta",
  cartao: "Cartão",
};

export const RULE_OPERATOR_LABELS: Record<string, string> = {
  contem: "Contém",
  igual: "Igual a",
  comeca_com: "Começa com",
  termina_com: "Termina com",
  regex: "Expressão regular",
  maior_que: "Maior que",
  menor_que: "Menor que",
};

export const RULE_TEXT_OPERATORS = ["contem", "igual", "comeca_com", "termina_com", "regex"];
export const RULE_NUMBER_OPERATORS = ["maior_que", "menor_que", "igual"];

export const RECONCILIATION_TYPE_LABELS: Record<string, string> = {
  pagamento_fatura: "Pagamento de fatura",
  transferencia_interna: "Transferência interna",
  estorno: "Estorno",
  reembolso: "Reembolso",
  duplicidade: "Duplicidade",
  tarifa: "Tarifa",
  saque: "Saque",
  deposito: "Depósito",
};

export const RECONCILIATION_STATUS_LABELS: Record<string, string> = {
  pendente: "Pendente",
  confirmado: "Confirmado",
  rejeitado: "Rejeitado",
};

export const RULE_ACTION_TYPE_LABELS: Record<string, string> = {
  categorizar: "Definir categoria",
  definir_empresa: "Definir empresa",
  definir_centro_custo: "Definir centro de custo",
  marcar_transferencia: "Marcar como transferência",
  ignorar: "Ignorar (não importar)",
};
