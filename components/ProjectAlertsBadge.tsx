"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Deliverable, DeliverableStatus, Role } from "@/lib/types";
import { getSeenCommentAt, getSeenDeliverableIds, getSeenStatus, isOppositeRole, isSeenDeliverablesInitialized, setSeenDeliverablesInitialized } from "@/lib/alerts-client";
import { UnreadBadge } from "@/components/UnreadBadge";

type DeliverableComment = {
  id: string;
  created_at: string;
  author?: { role?: "admin" | "cliente" | null } | null;
};

async function fetchJson<T>(url: string, signal?: AbortSignal) {
  try {
    const res = await fetch(url, { cache: "no-store", signal });
    const json = (await res.json()) as T;
    return { ok: res.ok, json };
  } catch (err: unknown) {
    const e = err as { name?: string };
    if (e?.name === "AbortError") return { ok: false, json: {} as T };
    return { ok: false, json: {} as T };
  }
}

function toTime(value: string | null | undefined) {
  if (!value) return null;
  const t = Date.parse(value);
  return Number.isFinite(t) ? t : null;
}

export function ProjectAlertsBadge({ projectId, role }: { projectId: string; role: Role }) {
  const [count, setCount] = useState(0);
  const [newDeliverablesCount, setNewDeliverablesCount] = useState(0);
  const [approvedCount, setApprovedCount] = useState(0);
  const [observedCount, setObservedCount] = useState(0);
  const [ready, setReady] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const controller = new AbortController();

    async function run() {
      setReady(false);
      setCount(0);

      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id;
      if (!userId || !projectId) {
        setReady(true);
        return;
      }

      const deliverablesRes =
        role === "admin"
          ? await fetchJson<{ deliverables?: Deliverable[]; error?: string }>(`/api/admin/projects/${projectId}/deliverables`, controller.signal)
          : await fetchJson<{ deliverables?: Deliverable[]; error?: string }>(`/api/cliente/projects/${projectId}`, controller.signal);

      if (!deliverablesRes.ok) {
        setReady(true);
        return;
      }

      const deliverables =
        role === "admin"
          ? ((deliverablesRes.json as { deliverables?: Deliverable[] }).deliverables ?? [])
          : ((deliverablesRes.json as { deliverables?: Deliverable[] }).deliverables ?? []);

      const seenIds = new Set(getSeenDeliverableIds(userId, projectId));
      const initialized = isSeenDeliverablesInitialized(userId, projectId);

      if (!initialized) {
        const nowIso = new Date().toISOString();
        for (const item of deliverables) {
          seenIds.add(item.id);
          window.localStorage.setItem(`pd_seen_status:${userId}:${item.id}`, item.status as DeliverableStatus);
          window.localStorage.setItem(`pd_seen_comment_at:${userId}:${item.id}`, nowIso);
        }
        window.localStorage.setItem(`pd_seen_deliverables:${userId}:${projectId}`, JSON.stringify(Array.from(seenIds)));
        setSeenDeliverablesInitialized(userId, projectId);
        setCount(0);
        setReady(true);
        return;
      }

      let newDeliverables = 0;
      let statusChanges = 0;
      let approved = 0;
      let observed = 0;

      for (const item of deliverables) {
        const isNew = !seenIds.has(item.id);
        if (isNew) {
          newDeliverables += 1;
          continue;
        }

        const seenStatus = getSeenStatus(userId, item.id);
        if (seenStatus && seenStatus !== item.status) {
          if (role === "admin" && item.status === "aprobado") approved += 1;
          else if (role === "admin" && item.status === "con_observaciones") observed += 1;
          else statusChanges += 1;
        }
        if (!seenStatus) {
          if (role === "admin" && item.status === "aprobado") approved += 1;
          else if (role === "admin" && item.status === "con_observaciones") observed += 1;
          else statusChanges += 1;
        }
      }

      const commentsCounts = await Promise.all(
        deliverables.map(async (item) => {
          const seenAt = getSeenCommentAt(userId, item.id);
          const seenTime = toTime(seenAt) ?? 0;

          const commentsRes =
            role === "admin"
              ? await fetchJson<{ comments?: DeliverableComment[] }>(`/api/admin/deliverables/${item.id}/comments`, controller.signal)
              : await fetchJson<{ comments?: DeliverableComment[] }>(`/api/cliente/deliverables/${item.id}/comments`, controller.signal);

          if (!commentsRes.ok) return 0;
          const list = (commentsRes.json.comments ?? []) as DeliverableComment[];

          let unread = 0;
          for (const c of list) {
            const t = toTime(c.created_at) ?? 0;
            if (t <= seenTime) continue;
            if (isOppositeRole(c.author?.role, role)) unread += 1;
          }
          return unread;
        })
      );

      const messages = commentsCounts.reduce((acc, n) => acc + n, 0);

      const orange = statusChanges + messages;
      const total = newDeliverables + orange;

      setNewDeliverablesCount(newDeliverables);
      setApprovedCount(approved);
      setObservedCount(observed);
      setCount(role === "cliente" ? orange : total);
      setReady(true);
    }

    void run();
    const id = window.setInterval(() => void run(), 20000);

    return () => {
      window.clearInterval(id);
      controller.abort();
    };
  }, [projectId, role, supabase]);

  if (!ready) return null;

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      {role === "admin" ? <UnreadBadge count={observedCount} variant="danger" title="Entregables con observaciones" /> : null}
      {role === "admin" ? <UnreadBadge count={approvedCount} variant="approved" title="Entregables aprobados" /> : null}
      {role === "cliente" ? <UnreadBadge count={newDeliverablesCount} variant="success" title="Nuevo entregable" /> : null}
      <UnreadBadge count={count} title="Alertas nuevas" />
    </span>
  );
}
