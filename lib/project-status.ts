export const PROJECT_STATUS_OPTIONS = ["activo", "pausado", "inactivo"] as const;

export type ProjectStatus = (typeof PROJECT_STATUS_OPTIONS)[number];

export function normalizeProjectStatus(value: unknown): ProjectStatus {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (PROJECT_STATUS_OPTIONS.includes(normalized as ProjectStatus)) {
    return normalized as ProjectStatus;
  }
  return "activo";
}
