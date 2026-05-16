const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const PORTAL_SOURCE_APP = "portal-design";

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

async function main() {
  const env = loadEnv(path.join(process.cwd(), ".env.local"));
  const exportData = JSON.parse(fs.readFileSync(path.join(process.cwd(), "supabase", "portal-export.json"), "utf8"));
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const demoAdminEmail = (env.NEXT_PUBLIC_DEMO_ADMIN_EMAIL || "admin@portal.app").toLowerCase();
  const demoAdminPassword = env.NEXT_PUBLIC_DEMO_ADMIN_PASSWORD || "123456";
  const demoClientPassword = env.NEXT_PUBLIC_DEMO_CLIENT_PASSWORD || "123456";

  const adminUser = await findOrCreateUser(supabase, {
    email: demoAdminEmail,
    password: demoAdminPassword,
    fullName: "Admin Portal Design",
    role: "admin",
  });

  await upsertProfile(supabase, {
    id: adminUser.id,
    email: demoAdminEmail,
    full_name: "Admin Portal Design",
    role: "admin",
  });

  const clientIdMap = new Map();

  for (const profile of exportData.data.profiles) {
    const email = String(profile.email || "").toLowerCase();
    if (!email) continue;

    const user = await findOrCreateUser(supabase, {
      email,
      password: demoClientPassword,
      fullName: profile.full_name || email,
      role: "cliente",
    });

    await upsertProfile(supabase, {
      id: user.id,
      email,
      full_name: profile.full_name || email,
      role: "cliente",
    });

    clientIdMap.set(profile.id, user.id);
  }

  await upsertRows(supabase.from("project_phases"), exportData.data.project_phases, "project_phases", "name");

  const projects = exportData.data.projects.map((project) => ({
    ...project,
    client_id: clientIdMap.get(project.client_id) || project.client_id,
  }));
  await upsertRows(supabase.from("projects"), projects, "projects");

  await upsertRows(supabase.from("gallery_items"), exportData.data.gallery_items, "gallery_items");
  await upsertRows(supabase.from("decisions"), exportData.data.decisions, "decisions");
  await upsertRows(supabase.from("documents"), exportData.data.documents, "documents");
  await upsertRows(supabase.from("construction_updates"), exportData.data.construction_updates, "construction_updates");

  const comments = exportData.data.comments
    .map((comment) => ({
      ...comment,
      user_id: clientIdMap.get(comment.user_id) || comment.user_id,
    }))
    .filter((comment) => clientIdMap.has(comment.user_id) || Array.from(clientIdMap.values()).includes(comment.user_id));
  await upsertRows(supabase.from("comments"), comments, "comments");

  const report = {
    projectUrl: env.NEXT_PUBLIC_SUPABASE_URL,
    adminEmail: demoAdminEmail,
    importedClients: clientIdMap.size,
    importedProjects: projects.length,
    importedGallery: exportData.data.gallery_items.length,
    importedDecisions: exportData.data.decisions.length,
    importedDocuments: exportData.data.documents.length,
    importedUpdates: exportData.data.construction_updates.length,
    importedComments: comments.length,
  };

  console.log(JSON.stringify(report, null, 2));
}

async function findOrCreateUser(supabase, { email, password, fullName, role }) {
  const usersResult = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (usersResult.error) throw new Error(usersResult.error.message);

  const existing = (usersResult.data.users || []).find((user) => String(user.email || "").toLowerCase() === email);
  if (existing) {
    return existing;
  }

  const created = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, source_app: PORTAL_SOURCE_APP, role },
    app_metadata: { source_app: PORTAL_SOURCE_APP },
  });

  if (created.error || !created.data.user) {
    throw new Error(created.error ? created.error.message : `No se pudo crear usuario ${email}`);
  }

  return created.data.user;
}

async function upsertProfile(supabase, row) {
  const result = await supabase.from("profiles").upsert(row, { onConflict: "id" });
  if (result.error) throw new Error(result.error.message);
}

async function upsertRows(builder, rows, label, onConflict = "id") {
  if (!rows || rows.length === 0) return;
  const result = await builder.upsert(rows, { onConflict });
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
