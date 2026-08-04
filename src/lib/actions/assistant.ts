"use server";

import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { ASSISTANT_TOOLS, runAssistantTool } from "@/lib/ai/assistant-tools";

export type ChatMessage = { role: "user" | "assistant"; content: string };
export type AssistantResult = { answer: string } | { error: string };

const MAX_ROUNDS = 5;

export async function askAssistant(question: string, history: ChatMessage[]): Promise<AssistantResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { error: "Assistente não configurado: falta ANTHROPIC_API_KEY no servidor." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };

  const trimmed = question.trim();
  if (!trimmed) return { error: "Digite uma pergunta." };

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const today = new Date().toISOString().slice(0, 10);
  const system = `Você é um assistente financeiro dentro do FinanceOS, respondendo em português sobre os dados financeiros REAIS do usuário logado. Hoje é ${today}. Use as ferramentas disponíveis para consultar os dados antes de responder — nunca invente números ou transações. Se os dados não forem suficientes para responder, diga isso claramente. Seja conciso e cite os valores encontrados.`;

  const messages: Anthropic.Messages.MessageParam[] = [
    ...history.map((m) => ({ role: m.role, content: m.content }) as Anthropic.Messages.MessageParam),
    { role: "user", content: trimmed },
  ];

  for (let round = 0; round < MAX_ROUNDS; round++) {
    let response;
    try {
      response = await client.messages.create({
        model: "claude-sonnet-5",
        max_tokens: 1024,
        system,
        tools: ASSISTANT_TOOLS,
        messages,
      });
    } catch (error) {
      return {
        error: error instanceof Error ? `Falha ao consultar o assistente: ${error.message}` : "Falha ao consultar o assistente.",
      };
    }

    const toolUses = response.content.filter((block) => block.type === "tool_use");
    if (toolUses.length === 0) {
      const textBlock = response.content.find((block) => block.type === "text");
      return { answer: textBlock && textBlock.type === "text" ? textBlock.text : "Não consegui gerar uma resposta." };
    }

    messages.push({ role: "assistant", content: response.content });

    const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];
    for (const toolUse of toolUses) {
      if (toolUse.type !== "tool_use") continue;
      const result = await runAssistantTool(supabase, toolUse.name, toolUse.input as Record<string, unknown>);
      toolResults.push({
        type: "tool_result",
        tool_use_id: toolUse.id,
        content: JSON.stringify(result),
      });
    }

    messages.push({ role: "user", content: toolResults });
  }

  return { error: "O assistente não conseguiu concluir a resposta." };
}
