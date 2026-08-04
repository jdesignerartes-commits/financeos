"use client";

import { useState, useTransition } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { askAssistant, type ChatMessage } from "@/lib/actions/assistant";

export function AssistantChat({ disabled }: { disabled?: boolean }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [isPending, startTransition] = useTransition();

  function send() {
    const trimmed = question.trim();
    if (!trimmed || isPending) return;
    const history = messages;
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setQuestion("");
    startTransition(async () => {
      const result = await askAssistant(trimmed, history);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "error" in result ? result.error : result.answer },
      ]);
    });
  }

  return (
    <div className="space-y-3">
      <div className="max-h-80 space-y-3 overflow-y-auto rounded-md border p-3">
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Pergunte algo como &quot;quanto gastei com mercado em agosto?&quot; ou &quot;qual meu saldo na conta
            corrente?&quot;
          </p>
        ) : (
          messages.map((message, index) => (
            <div key={index} className={message.role === "user" ? "text-right" : "text-left"}>
              <span
                className={`inline-block max-w-[85%] rounded-lg px-3 py-1.5 text-left text-sm whitespace-pre-wrap ${
                  message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                }`}
              >
                {message.content}
              </span>
            </div>
          ))
        )}
        {isPending && <p className="text-sm text-muted-foreground">Consultando...</p>}
      </div>
      <div className="flex gap-2">
        <Input
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              send();
            }
          }}
          placeholder="Faça uma pergunta sobre suas finanças..."
          disabled={disabled || isPending}
        />
        <Button type="button" size="icon" disabled={disabled || isPending || !question.trim()} onClick={send}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
