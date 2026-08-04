"use client";

import { useTransition } from "react";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { markNotificationRead, markAllNotificationsRead, deleteNotification } from "@/lib/actions/notifications";
import type { Database } from "@/types/database";

type Notification = Database["public"]["Tables"]["notifications"]["Row"];

function formatRelative(dateStr: string) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `${diffMin} min atrás`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} h atrás`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} d atrás`;
}

export function NotificationBell({ notifications }: { notifications: Notification[] }) {
  const [isPending, startTransition] = useTransition();
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label="Notificações" className="relative" />}>
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-1.5 py-1">
          <span className="text-sm font-medium">Notificações</span>
          {unreadCount > 0 && (
            <button
              type="button"
              className="text-xs text-muted-foreground hover:underline"
              disabled={isPending}
              onClick={() => startTransition(() => markAllNotificationsRead())}
            >
              Marcar todas como lidas
            </button>
          )}
        </div>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <div className="px-1.5 py-6 text-center text-sm text-muted-foreground">Nenhuma notificação.</div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`flex items-start gap-2 rounded-md px-1.5 py-2 text-sm ${!notification.read ? "bg-accent/50" : ""}`}
                onClick={() => !notification.read && startTransition(() => markNotificationRead(notification.id))}
              >
                <div className="flex-1 cursor-default">
                  <div className="font-medium">{notification.title}</div>
                  {notification.message && (
                    <div className="text-xs text-muted-foreground">{notification.message}</div>
                  )}
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    {formatRelative(notification.created_at)}
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Excluir notificação"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={(event) => {
                    event.stopPropagation();
                    startTransition(() => deleteNotification(notification.id));
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
