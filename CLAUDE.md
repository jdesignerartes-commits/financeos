# FinanceOS — handoff para continuidade

Sistema de gestão financeira pessoal/empresarial construído a partir de uma especificação em 39 seções que a Joyce trouxe pronta. Os 12 módulos do escopo original estão completos e em produção. Este arquivo existe para uma sessão nova do Claude Code (sem memória desta conversa) retomar o trabalho sem precisar redescobrir tudo.

## Onde as coisas estão

- **Local**: `C:\Users\joyli\Documents\02 - JDESIGNER\financeos`
- **Produção**: https://financeos-cyan.vercel.app (conta Vercel `jdesignerartes-7829`)
- **GitHub**: https://github.com/jdesignerartes-commits/financeos (**público** — precisa ficar assim, ver gotcha abaixo)
- **Supabase**: projeto `hfltxzhjymtovykflwzu`

## Como publicar mudanças

Desde que o GitHub foi conectado à Vercel, **`git push origin master` publica sozinho** (auto-deploy). Não usar mais `vercel --prod` manualmente a não ser que o auto-deploy esteja falhando.

**Gotcha real, já aconteceu**: a Vercel bloqueia deploys (`"Deployment was blocked"` / `"fetch failed"`) se o e-mail do autor do commit git não for reconhecido como membro do time Vercel. A correção que funcionou foi deixar o repositório **público** (`gh repo edit jdesignerartes-commits/financeos --visibility public --accept-visibility-change-consequences`). Se voltar a acontecer, checar `gh api repos/jdesignerartes-commits/financeos/commits/<sha>/status` — o campo `description` explica o motivo exato, e `target_url` leva pra página de aprovação manual na Vercel (a Joyce precisa aprovar logada, é ação de conta dela).

Depois de um push, para confirmar que o deploy realmente terminou (não só disparou):
```bash
gh api repos/jdesignerartes-commits/financeos/commits/<sha>/status --jq '.state'
```
`pending` → ainda buildando, `success`/`failure` → terminou.

## Stack e convenções que já causaram bugs reais

- Next.js 16 (App Router, Turbopack) + React 19 + TypeScript + Tailwind v4 + shadcn/ui sobre **Base UI** (não Radix) + Supabase (Postgres/Auth/Storage) + Anthropic SDK (`claude-sonnet-5`, usado no OCR de comprovantes e nas Análises/Assistente do Módulo 12).
- **Base UI, não Radix**: composição usa `render={<Elemento/>}`, não `asChild`. `Button` que renderiza como `Link` precisa de `nativeButton={false}` também.
- **Select do Base UI** exige prop `items` (array `{value,label}`) — sem isso mostra o valor bruto em vez do label antes do primeiro clique.
- Sentinel `"none"` em Selects nunca pode virar string literal no banco — precisa virar `null` antes do insert/update (padrão `orNull()` usado em todas as actions).
- Server Component não pode passar referência de função/componente como prop pra Client Component — passar como `children` já renderizado.
- `NODE_OPTIONS=--use-system-ca` (via `cross-env`, já nos scripts do `package.json`) é necessário **só em dev/build local** — sem isso, fetch do servidor falha com erro de TLS nesse ambiente Windows específico. Não afeta produção na Vercel (Linux, sem esse problema).
- `"use server"` files só podem exportar funções async — constantes/tipos ficam em arquivo separado (mas `export type` é permitido, é apagado em build time).

## O que tem em cada módulo (1–12, todos completos)

Contas, cartões, categorias, empresas, centros de custo → Importação (CSV/OFX/XLSX/PDF nativo/PDF-IA/imagem, com fallback: texto tabular primeiro, IA se não achar transação nenhuma) → Revisão (nada vira transação sem passar aqui) → Transações (formulário simplificado: só Data/Tipo/Descrição/Valor aparecem por padrão, resto atrás de "Mais detalhes") → Dashboard (Visão geral) → Orçamentos, Metas, Parcelamentos, Assinaturas (detecção automática) → Calendário → Conciliação bancária (detecção automática de duplicidade/transferência) → Relatórios (com exportação CSV/Excel/PDF) → Notificações automáticas (sino no topo) → Análises com IA + assistente de consulta em linguagem natural.

**Menu principal foi simplificado a pedido da Joyce** (`src/lib/nav.ts`): só aparecem Visão geral, Importações, Revisão, Transações, Configurações. O resto (Contas, Cartões, Categorias, Orçamentos, Metas, Parcelamentos, Assinaturas, Calendário, Conciliação, Relatórios, Análises) continua funcionando 100%, só não fica na barra lateral — está listado em `MORE_PAGES` no mesmo arquivo e aparece como atalhos dentro de **Configurações**.

**Empresa aprende a categoria sozinha** (`src/lib/ingestion/merchant-learning.ts`): a primeira vez que uma transação com Empresa definida recebe uma Categoria — em Revisão (individual ou em lote), ou editando direto em Transações — essa categoria é gravada como padrão da Empresa (`merchants.category_id`/`subcategory_id`). Da próxima vez que o nome bater com essa Empresa via `merchant_aliases` (reconhecimento automático já existente do Módulo 8), a transação já entra categorizada sozinha, sem precisar de Regra automática manual. Isso é independente e roda **antes** das Regras automáticas em `applyRules` (`src/lib/actions/imports.ts`), que continuam podendo sobrescrever quando fizer sentido (ex.: regra explícita por valor). Testado manualmente: categorizar uma transação com Empresa "Mercado Teste" grava a categoria na Empresa, visível em Configurações → Empresas.

## Redesign minimalista (em andamento, só a Visão geral por enquanto)

A Joyce trouxe um pacote de handoff de design (pasta `design_handoff_overview_minimalista` que ela mesma preparou) pedindo uma Visão geral mais minimalista: número grande, faixa de métricas com divisórias finas em vez de cards soltos, listas de barra fina em vez de gráfico de barra do Recharts, cor primária verde global, fundo off-white. Foi aplicado em `src/components/minimal/primitives.tsx` (`Section`, `MetricRow`, `Metric`, `BreakdownList`, `HighlightGrid`, `MinimalPage`, `BigNumber` — tokens de cor em `MINIMAL` dentro desse arquivo) e em `src/app/(app)/overview/page.tsx`.

**Só a Visão geral foi migrada.** As outras páginas ainda usam os componentes antigos (`Card`, `StatCard`, `CategoryBarChart` de `src/components/dashboard/`) — que continuam existindo de propósito, não foram apagados. Se a Joyce pedir pra estender o visual minimalista pra outra rota, o próprio README do pacote de handoff dizia como: `<Card>` → `<Section>`, grid de `<StatCard>` → `<MetricRow>` com `<Metric>`, `<CategoryBarChart>` → `<BreakdownList>`, wrapper externo → `<MinimalPage>`.

A fonte serifada (Instrument Serif) que veio nesse pacote **foi removida depois** — a Joyce pediu fonte sem serifa, trocamos tudo (`layout.tsx` inteiro, não só a Visão geral) por **Poppins**. Isso de quebra corrigiu um bug pré-existente em `globals.css`: `--font-sans` estava com referência circular (`var(--font-sans): var(--font-sans)`) e nunca resolvia de verdade — agora aponta pra `var(--font-poppins)`.

Cor primária global também virou verde (`--primary` em `globals.css`, mais `src/lib/dashboard/colors.ts` pros gráficos: receita verde, despesa terracota) — afeta botões e menu em **todas** as rotas, não só a Visão geral.

## Credenciais de teste

Supabase project `hfltxzhjymtovykflwzu`, conta `jvicente.cbmerj+financeos-test2@gmail.com` / `TesteFinanceOS123`. Tem entidades de teste ("Conta Teste" arquivada de propósito, "Cartão Teste", "Mercado Teste"). A conta real da Joyce em produção é outra ("joyce sevilha").

## Pendências / coisas pra checar antes de assumir que estão certas

- **Verificar se o Supabase Auth já tem `https://financeos-cyan.vercel.app` na lista de Redirect URLs** (Authentication → URL Configuration, painel do Supabase). Sem isso, e-mail de confirmação de cadastro e "esqueci a senha" não funcionam em produção. Foi pedido pra Joyce fazer, não confirmado se ela fez.
- `ANTHROPIC_API_KEY` está configurada tanto local (`.env.local`) quanto na Vercel (env var de produção) — já testada e funcionando (OCR, Análises, Assistente).
- Sem repositório de testes automatizados (Jest/Playwright) — toda verificação até aqui foi manual, no navegador, com dados reais criados via API REST do Supabase quando precisava simular upload de arquivo (`DataTransfer`/`File` sintéticos via `javascript_tool`, já que não há acesso a seletor de arquivo nativo do SO no ambiente de teste).
