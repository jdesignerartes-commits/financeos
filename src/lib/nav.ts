import {
  LayoutDashboard,
  Upload,
  ListChecks,
  ArrowLeftRight,
  Landmark,
  CreditCard,
  Building2,
  Tags,
  PiggyBank,
  Target,
  CalendarClock,
  Repeat,
  Calendar,
  Scale,
  FileBarChart,
  Sparkles,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

// Menu principal enxuto (pedido da Joyce): só o fluxo do dia a dia.
// O resto (contas, cartões, orçamentos, relatórios etc.) continua funcionando
// normalmente, só não fica na barra lateral — acessível a partir de Configurações.
export const NAV_ITEMS: NavItem[] = [
  { label: "Visão geral", href: "/overview", icon: LayoutDashboard },
  { label: "Importações", href: "/importacoes", icon: Upload },
  { label: "Revisão", href: "/revisao", icon: ListChecks },
  { label: "Transações", href: "/transacoes", icon: ArrowLeftRight },
  { label: "Configurações", href: "/configuracoes", icon: Settings },
];

export const MORE_PAGES: NavItem[] = [
  { label: "Contas", href: "/contas", icon: Landmark },
  { label: "Cartões", href: "/cartoes", icon: CreditCard },
  { label: "Empresas", href: "/empresas", icon: Building2 },
  { label: "Categorias", href: "/categorias", icon: Tags },
  { label: "Orçamentos", href: "/orcamentos", icon: PiggyBank },
  { label: "Metas", href: "/metas", icon: Target },
  { label: "Parcelamentos", href: "/parcelamentos", icon: CalendarClock },
  { label: "Assinaturas", href: "/assinaturas", icon: Repeat },
  { label: "Calendário", href: "/calendario", icon: Calendar },
  { label: "Conciliação", href: "/conciliacao", icon: Scale },
  { label: "Relatórios", href: "/relatorios", icon: FileBarChart },
  { label: "Análises", href: "/analises", icon: Sparkles },
];
