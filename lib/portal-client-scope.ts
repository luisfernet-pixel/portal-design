const PORTAL_SOURCE_APP = "portal-design";
const PORTAL_DEMO_DOMAIN = "@portal.app";

type ProfileRow = {
  id: string;
  email?: string | null;
  full_name?: string | null;
  role?: string | null;
  created_at?: string | null;
};

type AuthUserRow = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
  app_metadata?: Record<string, unknown> | null;
};

export async function listPortalManagedClients(admin: any) {
  const [{ data: profiles, error: profilesError }, { data: projects, error: projectsError }, usersResult] =
    await Promise.all([
      admin
        .from("profiles")
        .select("id,email,full_name,role,created_at")
        .eq("role", "cliente")
        .order("created_at", { ascending: false }),
      admin.from("projects").select("client_id"),
      admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ]);

  if (profilesError) throw new Error(profilesError.message);
  if (projectsError) throw new Error(projectsError.message);
  if (usersResult.error) throw new Error(usersResult.error.message);

  const projectClientIds = new Set<string>(
    (projects ?? [])
      .map((row: { client_id: string | null }) => row.client_id)
      .filter((value: string | null): value is string => Boolean(value))
  );
  const authUsersById = new Map<string, AuthUserRow>(
    (usersResult.data?.users ?? []).map((user: AuthUserRow) => [user.id, user])
  );

  return (profiles ?? []).filter((profile: ProfileRow) => isPortalManagedClient(profile, projectClientIds, authUsersById));
}

export async function assertPortalManagedClient(admin: any, profileId: string) {
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id,email,full_name,role,created_at")
    .eq("id", profileId)
    .single();

  if (profileError || !profile) {
    return { ok: false as const, error: "Cliente no encontrado", status: 404 };
  }

  if (profile.role !== "cliente") {
    return { ok: false as const, error: "Este perfil no pertenece al portal de clientes", status: 400 };
  }

  const [{ count, error: projectError }, userResult] = await Promise.all([
    admin.from("projects").select("id", { head: true, count: "exact" }).eq("client_id", profileId),
    admin.auth.admin.getUserById(profile.id),
  ]);

  if (projectError) {
    return { ok: false as const, error: projectError.message, status: 400 };
  }

  const hasProjects = (count ?? 0) > 0;
  const authUser = userResult.data?.user
    ? ({
        id: userResult.data.user.id,
        email: userResult.data.user.email,
        user_metadata: userResult.data.user.user_metadata,
        app_metadata: userResult.data.user.app_metadata,
      } as AuthUserRow)
    : undefined;

  const isManaged = isPortalManagedClient(profile as ProfileRow, new Set(hasProjects ? [profileId] : []), new Map(authUser ? [[authUser.id, authUser]] : []));

  if (!isManaged) {
    return { ok: false as const, error: "Este perfil no pertenece al portal de clientes", status: 400 };
  }

  return { ok: true as const, profile };
}

function isPortalManagedClient(
  profile: ProfileRow,
  projectClientIds: Set<string>,
  authUsersById: Map<string, AuthUserRow>
) {
  if (projectClientIds.has(profile.id)) return true;

  const email = profile.email?.toLowerCase();
  if (email && email.endsWith(PORTAL_DEMO_DOMAIN)) return true;

  const authUser = authUsersById.get(profile.id);
  const sourceApp =
    getString(authUser?.user_metadata?.source_app) ??
    getString(authUser?.app_metadata?.source_app);

  return sourceApp === PORTAL_SOURCE_APP;
}

function getString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

export { PORTAL_SOURCE_APP };
