export type Role = "admin" | "cliente";
export type ProjectStatus = "activo" | "pausado" | "terminado";
export type PhaseStatus = "pendiente" | "activa" | "completada";
export type DeliverableType = "plano" | "render" | "documento" | "otro";
export type DeliverableStatus = "pendiente" | "aprobado" | "con_observaciones";

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: Role;
  created_at?: string;
};

export type Project = {
  id: string;
  client_id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  current_phase_id: string | null;
  created_at: string;
  updated_at: string;
  client?: Pick<Profile, "id" | "email" | "full_name" | "role"> | null;
  current_phase?: Phase | null;
};

export type Phase = {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  order_index: number;
  status: PhaseStatus;
  progress: number;
  created_at: string;
};

export type Deliverable = {
  id: string;
  project_id: string;
  phase_id: string;
  title: string;
  description: string | null;
  file_url: string | null;
  file_name: string | null;
  file_type: DeliverableType;
  status: DeliverableStatus;
  uploaded_at: string;
  approved_at: string | null;
  approved_by: string | null;
  phase?: Pick<Phase, "id" | "name" | "order_index" | "status" | "progress"> | null;
  approver?: Pick<Profile, "id" | "email" | "full_name" | "role"> | null;
};

export type Comment = {
  id: string;
  deliverable_id: string;
  project_id: string;
  author_id: string;
  body: string;
  created_at: string;
  author?: Pick<Profile, "id" | "email" | "full_name" | "role"> | null;
};

export type PhaseTemplate = {
  id: string;
  name: string;
  description: string | null;
  order_index: number;
  is_default: boolean;
};
