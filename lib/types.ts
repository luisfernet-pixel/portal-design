import type { ProjectStatus } from "@/lib/project-status";

export type Role = "admin" | "cliente";

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
};

export type Project = {
  id: string;
  name: string;
  client_id: string;
  status: ProjectStatus;
  phase: string;
  progress: number;
  next_step: string | null;
  summary: string | null;
  start_date: string | null;
  estimated_delivery: string | null;
  created_at: string;
  updated_at: string;
  profiles?: { full_name: string | null; email: string | null } | null;
};
