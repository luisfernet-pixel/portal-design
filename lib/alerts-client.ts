import type { DeliverableStatus, Role } from "@/lib/types";

function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function keySeenDeliverables(userId: string, projectId: string) {
  return `pd_seen_deliverables:${userId}:${projectId}`;
}

function keySeenDeliverablesInitialized(userId: string, projectId: string) {
  return `pd_seen_deliverables_init:${userId}:${projectId}`;
}

function keySeenStatus(userId: string, deliverableId: string) {
  return `pd_seen_status:${userId}:${deliverableId}`;
}

function keySeenCommentAt(userId: string, deliverableId: string) {
  return `pd_seen_comment_at:${userId}:${deliverableId}`;
}

export function getSeenDeliverableIds(userId: string, projectId: string) {
  if (typeof window === "undefined") return [] as string[];
  const parsed = safeJsonParse<string[]>(window.localStorage.getItem(keySeenDeliverables(userId, projectId)));
  return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
}

export function isSeenDeliverablesInitialized(userId: string, projectId: string) {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(keySeenDeliverablesInitialized(userId, projectId)) === "1";
}

export function setSeenDeliverablesInitialized(userId: string, projectId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(keySeenDeliverablesInitialized(userId, projectId), "1");
}

export function markDeliverableSeen(userId: string, projectId: string, deliverableId: string) {
  if (typeof window === "undefined") return;
  const current = new Set(getSeenDeliverableIds(userId, projectId));
  current.add(deliverableId);
  window.localStorage.setItem(keySeenDeliverables(userId, projectId), JSON.stringify(Array.from(current)));
}

export function getSeenStatus(userId: string, deliverableId: string) {
  if (typeof window === "undefined") return null as DeliverableStatus | null;
  const value = window.localStorage.getItem(keySeenStatus(userId, deliverableId));
  if (value === "pendiente" || value === "aprobado" || value === "con_observaciones") return value;
  return null;
}

export function setSeenStatus(userId: string, deliverableId: string, status: DeliverableStatus) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(keySeenStatus(userId, deliverableId), status);
}

export function getSeenCommentAt(userId: string, deliverableId: string) {
  if (typeof window === "undefined") return null as string | null;
  const value = window.localStorage.getItem(keySeenCommentAt(userId, deliverableId));
  return value && value.trim() ? value : null;
}

export function setSeenCommentAt(userId: string, deliverableId: string, iso: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(keySeenCommentAt(userId, deliverableId), iso);
}

export function isOppositeRole(authorRole: unknown, viewerRole: Role) {
  if (authorRole !== "admin" && authorRole !== "cliente") return false;
  return authorRole !== viewerRole;
}
