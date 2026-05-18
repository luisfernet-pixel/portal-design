"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Role } from "@/lib/types";
import { getSeenCommentAt, isOppositeRole } from "@/lib/alerts-client";
import { UnreadBadge } from "@/components/UnreadBadge";

type DeliverableComment = {
  id: string;
  created_at: string;
  author?: { role?: "admin" | "cliente" | null } | null;
};

function toTime(value: string | null | undefined) {
  if (!value) return 0;
  const t = Date.parse(value);
  return Number.isFinite(t) ? t : 0;
}

export function DeliverableUnreadBadge({ deliverableId, role }: { deliverableId: string; role: Role }) {
  const [count, setCount] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, [supabase]);

  useEffect(() => {
    const controller = new AbortController();

    async function run() {
      if (!userId || !deliverableId) {
        setCount(0);
        return;
      }

      const seenAt = getSeenCommentAt(userId, deliverableId);
      const seenTime = toTime(seenAt);

      const basePath =
        role === "admin"
          ? `/api/admin/deliverables/${deliverableId}/comments`
          : `/api/cliente/deliverables/${deliverableId}/comments`;

      let json: { comments?: DeliverableComment[] } | null = null;
      try {
        const res = await fetch(basePath, { cache: "no-store", signal: controller.signal });
        json = (await res.json()) as { comments?: DeliverableComment[] };
        if (!res.ok) {
          setCount(0);
          return;
        }
      } catch (err: unknown) {
        const e = err as { name?: string };
        if (e?.name === "AbortError") return;
        setCount(0);
        return;
      }

      const list = ((json?.comments ?? []) as DeliverableComment[]) ?? [];
      let unread = 0;
      for (const c of list) {
        const t = toTime(c.created_at);
        if (t <= seenTime) continue;
        if (isOppositeRole(c.author?.role, role)) unread += 1;
      }
      setCount(unread);
    }

    void run();
    const id = window.setInterval(() => void run(), 15000);

    return () => {
      window.clearInterval(id);
      controller.abort();
    };
  }, [deliverableId, role, userId]);

  return <UnreadBadge count={count} title="Mensajes nuevos" />;
}
