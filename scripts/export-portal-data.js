const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const PORTAL_SOURCE_APP = "portal-design";
const PORTAL_DEMO_DOMAIN = "@portal.app";

function loadEnv(file) {
  const raw = fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    env[trimmed.slice(0, idx)] = trimmed.slice(idx + 1).trim();
  }
  return env;
}

function isPortalManagedClient(profile, projectClientIds, authUsersById) {
  if (projectClientIds.has(profile.id)) return true;

  const email = profile.email && profile.email.toLowerCase();
  if (email && email.endsWith(PORTAL_DEMO_DOMAIN)) return true;

  const authUser = authUsersById.get(profile.id);
  const sourceApp =
    getString(authUser && authUser.user_metadata && authUser.user_metadata.source_app) ||
    getString(authUser && authUser.app_metadata && authUser.app_metadata.source_app);

  return sourceApp === PORTAL_SOURCE_APP;
}

function getString(value) {
  return typeof value === "string" ? value : undefined;
}

async function main() {
  const env = loadEnv(path.join(process.cwd(), ".env.local"));
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const [profilesRes, projectsRes, usersRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id,email,full_name,role,created_at")
      .eq("role", "cliente")
      .order("created_at", { ascending: false }),
    supabase.from("projects").select("*").order("created_at", { ascending: false }),
    supabase.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);

  if (profilesRes.error) throw new Error(profilesRes.error.message);
  if (projectsRes.error) throw new Error(projectsRes.error.message);
  if (usersRes.error) throw new Error(usersRes.error.message);

  const projectClientIds = new Set((projectsRes.data || []).map((row) => row.client_id).filter(Boolean));
  const authUsersById = new Map((usersRes.data.users || []).map((user) => [user.id, user]));
  const clients = (profilesRes.data || []).filter((profile) =>
    isPortalManagedClient(profile, projectClientIds, authUsersById)
  );

  const clientIds = new Set(clients.map((client) => client.id));
  const projects = (projectsRes.data || []).filter((project) => clientIds.has(project.client_id));
  const projectIds = projects.map((project) => project.id);

  const [galleryRes, decisionsRes, documentsRes, updatesRes, commentsRes, phasesRes] =
    await Promise.all([
      supabase.from("gallery_items").select("*").in("project_id", projectIds),
      supabase.from("decisions").select("*").in("project_id", projectIds),
      supabase.from("documents").select("*").in("project_id", projectIds),
      supabase.from("construction_updates").select("*").in("project_id", projectIds),
      supabase.from("comments").select("*").in("project_id", projectIds),
      supabase.from("project_phases").select("*").order("sort_order", { ascending: true }),
    ]);

  for (const res of [galleryRes, decisionsRes, documentsRes, updatesRes, commentsRes, phasesRes]) {
    if (res.error) throw new Error(res.error.message);
  }

  const exportPayload = {
    exported_at: new Date().toISOString(),
    source_project_url: env.NEXT_PUBLIC_SUPABASE_URL,
    scope_rule: "portal-design",
    data: {
      profiles: clients,
      project_phases: phasesRes.data || [],
      projects,
      gallery_items: galleryRes.data || [],
      decisions: decisionsRes.data || [],
      documents: documentsRes.data || [],
      construction_updates: updatesRes.data || [],
      comments: commentsRes.data || [],
      storage_manifest: {
        project_gallery_paths: (galleryRes.data || []).map((row) => row.image_path).filter(Boolean),
        project_document_paths: (documentsRes.data || []).map((row) => row.file_path).filter(Boolean),
        project_update_paths: (updatesRes.data || []).map((row) => row.image_path).filter(Boolean),
      },
    },
  };

  const outputPath = path.join(process.cwd(), "supabase", "portal-export.json");
  fs.writeFileSync(outputPath, JSON.stringify(exportPayload, null, 2));

  console.log(
    JSON.stringify(
      {
        output: outputPath,
        clients: clients.length,
        projects: projects.length,
        gallery_items: (galleryRes.data || []).length,
        decisions: (decisionsRes.data || []).length,
        documents: (documentsRes.data || []).length,
        construction_updates: (updatesRes.data || []).length,
        comments: (commentsRes.data || []).length,
        gallery_paths: (galleryRes.data || []).map((row) => row.image_path).filter(Boolean).length,
        document_paths: (documentsRes.data || []).map((row) => row.file_path).filter(Boolean).length,
        update_paths: (updatesRes.data || []).map((row) => row.image_path).filter(Boolean).length,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
