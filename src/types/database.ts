// Tipos manuais espelhando supabase/migrations/0001_init.sql.
// Assim que o projeto Supabase existir, substitua por:
//   npx supabase gen types typescript --linked > src/types/database.ts

type Table<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      profiles: Table<{
        id: string;
        full_name: string | null;
        avatar_url: string | null;
        locale: string;
        currency: string;
        created_at: string;
        updated_at: string;
      }>;
      accounts: Table<{
        id: string;
        user_id: string;
        name: string;
        institution: string | null;
        type: "conta_corrente" | "conta_digital" | "poupanca" | "dinheiro" | "carteira" | "investimento";
        color: string | null;
        icon: string | null;
        initial_balance: number;
        status: "ativa" | "arquivada";
        created_at: string;
        updated_at: string;
      }>;
      credit_cards: Table<{
        id: string;
        user_id: string;
        account_id: string | null;
        name: string;
        bank: string | null;
        brand: string | null;
        last_digits: string | null;
        credit_limit: number | null;
        closing_day: number | null;
        due_day: number | null;
        color: string | null;
        status: "ativo" | "arquivado";
        created_at: string;
        updated_at: string;
      }>;
      categories: Table<{
        id: string;
        user_id: string;
        name: string;
        type: "receita" | "despesa";
        color: string | null;
        icon: string | null;
        monthly_goal: number | null;
        monthly_limit: number | null;
        status: "ativa" | "arquivada";
        sort_order: number;
        is_default: boolean;
        created_at: string;
        updated_at: string;
      }>;
      subcategories: Table<{
        id: string;
        user_id: string;
        category_id: string;
        name: string;
        status: "ativa" | "arquivada";
        created_at: string;
        updated_at: string;
      }>;
      tags: Table<{
        id: string;
        user_id: string;
        name: string;
        color: string | null;
        created_at: string;
      }>;
      merchants: Table<{
        id: string;
        user_id: string;
        display_name: string;
        document: string | null;
        category_id: string | null;
        subcategory_id: string | null;
        color: string | null;
        icon: string | null;
        notes: string | null;
        created_at: string;
        updated_at: string;
      }>;
      merchant_aliases: Table<{
        id: string;
        user_id: string;
        merchant_id: string;
        raw_text: string;
        created_at: string;
      }>;
      imported_files: Table<{
        id: string;
        user_id: string;
        account_id: string | null;
        credit_card_id: string | null;
        file_name: string;
        file_type: string;
        file_size: number;
        storage_path: string;
        origin: string | null;
        status: "aguardando" | "processando" | "revisao_necessaria" | "concluido" | "falhou";
        error_message: string | null;
        transactions_found: number;
        errors_found: number;
        processed_at: string | null;
        created_at: string;
        updated_at: string;
      }>;
      import_jobs: Table<{
        id: string;
        user_id: string;
        imported_file_id: string;
        status: "aguardando" | "processando" | "concluido" | "falhou";
        attempts: number;
        log: string | null;
        started_at: string | null;
        finished_at: string | null;
        created_at: string;
      }>;
      raw_extractions: Table<{
        id: string;
        user_id: string;
        imported_file_id: string;
        raw_text: string | null;
        raw_data: Record<string, unknown> | unknown[] | null;
        extraction_method: string | null;
        confidence: number | null;
        created_at: string;
      }>;
      transactions: Table<{
        id: string;
        user_id: string;
        account_id: string | null;
        credit_card_id: string | null;
        date: string;
        original_description: string | null;
        friendly_description: string | null;
        amount: number;
        type:
          | "receita"
          | "despesa"
          | "transferencia"
          | "pagamento_fatura"
          | "estorno"
          | "reembolso"
          | "cashback"
          | "tarifa"
          | "juros"
          | "iof"
          | "imposto"
          | "saque"
          | "deposito";
        category_id: string | null;
        subcategory_id: string | null;
        merchant_id: string | null;
        cost_center_id: string | null;
        payment_method: string | null;
        notes: string | null;
        imported_file_id: string | null;
        import_batch_id: string | null;
        status: "revisao_pendente" | "confirmada" | "ignorada";
        confidence: number | null;
        installment_number: number | null;
        installment_total: number | null;
        fingerprint: string | null;
        is_possible_duplicate: boolean;
        duplicate_of_id: string | null;
        created_at: string;
        updated_at: string;
      }>;
      transaction_splits: Table<{
        id: string;
        user_id: string;
        transaction_id: string;
        category_id: string | null;
        subcategory_id: string | null;
        amount: number;
        notes: string | null;
        created_at: string;
      }>;
      transaction_tags: Table<{
        user_id: string;
        transaction_id: string;
        tag_id: string;
      }>;
      cost_centers: Table<{
        id: string;
        user_id: string;
        name: string;
        color: string | null;
        icon: string | null;
        status: "ativo" | "arquivado";
        created_at: string;
        updated_at: string;
      }>;
      budgets: Table<{
        id: string;
        user_id: string;
        category_id: string | null;
        account_id: string | null;
        credit_card_id: string | null;
        cost_center_id: string | null;
        period_month: number;
        period_year: number;
        limit_amount: number;
        created_at: string;
        updated_at: string;
      }>;
      financial_goals: Table<{
        id: string;
        user_id: string;
        account_id: string | null;
        name: string;
        target_amount: number;
        current_amount: number;
        start_date: string;
        target_date: string | null;
        status: "em_andamento" | "concluida" | "cancelada";
        created_at: string;
        updated_at: string;
      }>;
      installments: Table<{
        id: string;
        user_id: string;
        credit_card_id: string | null;
        merchant_id: string | null;
        category_id: string | null;
        description: string;
        installment_amount: number;
        total_amount: number;
        total_installments: number;
        start_date: string;
        created_at: string;
        updated_at: string;
      }>;
      subscriptions: Table<{
        id: string;
        user_id: string;
        merchant_id: string | null;
        credit_card_id: string | null;
        account_id: string | null;
        name: string;
        current_amount: number | null;
        frequency: "mensal" | "anual" | "semanal" | "outro";
        last_charge_date: string | null;
        next_expected_date: string | null;
        status: "sugerida" | "ativa" | "rejeitada" | "cancelada";
        created_at: string;
        updated_at: string;
      }>;
      attachments: Table<{
        id: string;
        user_id: string;
        transaction_id: string | null;
        storage_path: string;
        file_name: string;
        file_type: string | null;
        created_at: string;
      }>;
      reconciliation_items: Table<{
        id: string;
        user_id: string;
        transaction_id: string | null;
        related_transaction_id: string | null;
        type:
          | "pagamento_fatura"
          | "transferencia_interna"
          | "estorno"
          | "reembolso"
          | "duplicidade"
          | "tarifa"
          | "saque"
          | "deposito";
        status: "pendente" | "confirmado" | "rejeitado";
        notes: string | null;
        created_at: string;
        updated_at: string;
      }>;
      automation_rules: Table<{
        id: string;
        user_id: string;
        name: string;
        field: "descricao" | "estabelecimento" | "valor" | "conta" | "cartao";
        operator: "contem" | "igual" | "comeca_com" | "termina_com" | "regex" | "maior_que" | "menor_que";
        search_value: string;
        action_type: "categorizar" | "definir_empresa" | "definir_centro_custo" | "marcar_transferencia" | "ignorar";
        action_value: string | null;
        priority: number;
        status: "ativa" | "inativa";
        created_at: string;
        updated_at: string;
      }>;
      notifications: Table<{
        id: string;
        user_id: string;
        type: string;
        title: string;
        message: string | null;
        read: boolean;
        metadata: Record<string, unknown> | null;
        created_at: string;
      }>;
      ai_insights: Table<{
        id: string;
        user_id: string;
        period_start: string | null;
        period_end: string | null;
        insight_type: string | null;
        content: string;
        data: Record<string, unknown> | null;
        created_at: string;
      }>;
      statement_balances: Table<{
        id: string;
        user_id: string;
        account_id: string | null;
        credit_card_id: string | null;
        period_month: number;
        period_year: number;
        informed_balance: number;
        created_at: string;
        updated_at: string;
      }>;
      audit_logs: Table<{
        id: string;
        user_id: string;
        entity_type: string;
        entity_id: string | null;
        action: string;
        previous_value: Record<string, unknown> | null;
        new_value: Record<string, unknown> | null;
        source: string | null;
        created_at: string;
      }>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
