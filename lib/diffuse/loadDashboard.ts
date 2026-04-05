import type { SupabaseClient } from "@supabase/supabase-js";
import type { DiffuseOutput, DiffuseProject } from "./client";

export interface Workspace {
  id: string;
  name: string;
  description: string | null;
  plan: string | null;
  owner_id: string;
  created_at: string;
}

export interface ProjectWithWorkspace extends DiffuseProject {
  workspace?: Workspace;
  latest_output?: DiffuseOutput;
  all_outputs?: DiffuseOutput[];
  creator_name?: string;
  cover_image_path?: string | null;
  cover_image_file_name?: string | null;
  visible_to_orgs?: string[] | null;
}

type ProjectRow = DiffuseProject & { visible_to_orgs?: string[] | null };

export type LoadDiffuseDashboardResult =
  | { ok: true; workspaces: Workspace[]; projectsByWorkspace: Record<string, ProjectWithWorkspace[]> }
  | { ok: false; kind: "memberships" | "workspaces" | "fetch"; message: string };

const IN_CHUNK = 120;

function chunkIds(ids: string[], size: number): string[][] {
  if (ids.length === 0) return [];
  const out: string[][] = [];
  for (let i = 0; i < ids.length; i += size) out.push(ids.slice(i, i + size));
  return out;
}

function mergeProjectsById(rows: ProjectRow[][]): ProjectRow[] {
  const map = new Map<string, ProjectRow>();
  for (const batch of rows) {
    for (const p of batch) {
      if (p?.id) map.set(p.id, p);
    }
  }
  return [...map.values()];
}

type DiffuseTables = {
  members: string;
  workspaces: string;
  projects: string;
  outputs: string;
  inputs: string;
};

async function resolveDiffuseTables(client: SupabaseClient): Promise<DiffuseTables> {
  const { error } = await client.from("diffuse_workspace_members").select("id").limit(1);
  if (!error) {
    return {
      members: "diffuse_workspace_members",
      workspaces: "diffuse_workspaces",
      projects: "diffuse_projects",
      outputs: "diffuse_project_outputs",
      inputs: "diffuse_project_inputs",
    };
  }
  return {
    members: "workspace_members",
    workspaces: "workspaces",
    projects: "projects",
    outputs: "project_outputs",
    inputs: "project_inputs",
  };
}

function groupOutputsByProjectId(rows: DiffuseOutput[]): Map<string, DiffuseOutput[]> {
  const map = new Map<string, DiffuseOutput[]>();
  for (const o of rows) {
    const pid = o.project_id;
    const list = map.get(pid) ?? [];
    list.push(o);
    map.set(pid, list);
  }
  for (const list of map.values()) {
    list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }
  return map;
}

async function fetchAllOutputsForProjects(
  client: SupabaseClient,
  outputsTable: string,
  projectIds: string[],
): Promise<DiffuseOutput[]> {
  if (projectIds.length === 0) return [];
  const all: DiffuseOutput[] = [];
  for (const ids of chunkIds(projectIds, IN_CHUNK)) {
    const { data, error } = await client
      .from(outputsTable)
      .select("*")
      .in("project_id", ids)
      .is("deleted_at", null);
    if (error) {
      const alt = outputsTable.includes("diffuse") ? "project_outputs" : "diffuse_project_outputs";
      const r2 = await client.from(alt).select("*").in("project_id", ids).is("deleted_at", null);
      if (r2.error) throw r2.error;
      all.push(...(r2.data ?? []));
    } else {
      all.push(...(data ?? []));
    }
  }
  return all;
}

async function fetchCoverInputsForProjects(
  client: SupabaseClient,
  inputsTable: string,
  projectIds: string[],
): Promise<Map<string, { file_path: string | null; file_name: string | null }>> {
  const map = new Map<string, { file_path: string | null; file_name: string | null }>();
  if (projectIds.length === 0) return map;

  for (const ids of chunkIds(projectIds, IN_CHUNK)) {
    let { data, error } = await client
      .from(inputsTable)
      .select("project_id, file_path, file_name")
      .in("project_id", ids)
      .eq("type", "cover_photo")
      .is("deleted_at", null);

    if (error) {
      const alt = inputsTable.includes("diffuse") ? "project_inputs" : "diffuse_project_inputs";
      const r2 = await client
        .from(alt)
        .select("project_id, file_path, file_name")
        .in("project_id", ids)
        .eq("type", "cover_photo")
        .is("deleted_at", null);
      data = r2.data;
      error = r2.error;
    }
    if (error) continue;
    for (const row of data ?? []) {
      const pid = (row as { project_id: string }).project_id;
      if (!map.has(pid)) {
        map.set(pid, {
          file_path: (row as { file_path: string | null }).file_path ?? null,
          file_name: (row as { file_name: string | null }).file_name ?? null,
        });
      }
    }
  }
  return map;
}

/**
 * Loads Diffuse orgs and projects using DB-side filters and batched related queries
 * (same idea as analytics: avoid full-table scans and N+1 round trips).
 */
export async function loadDiffuseDashboardData(
  client: SupabaseClient,
  diffuseUserId: string,
): Promise<LoadDiffuseDashboardResult> {
  const tables = await resolveDiffuseTables(client);

  const { data: memberships, error: membershipsError } = await client
    .from(tables.members)
    .select("*")
    .eq("user_id", diffuseUserId);

  if (membershipsError) {
    return { ok: false, kind: "memberships", message: membershipsError.message };
  }
  if (!memberships?.length) {
    return { ok: true, workspaces: [], projectsByWorkspace: {} };
  }

  const workspaceIds = memberships.map((m: { workspace_id: string }) => m.workspace_id);

  const { data: workspacesData, error: workspacesError } = await client
    .from(tables.workspaces)
    .select("*")
    .in("id", workspaceIds)
    .order("created_at", { ascending: false });

  if (workspacesError) {
    return { ok: false, kind: "workspaces", message: workspacesError.message };
  }

  const workspaces = (workspacesData ?? []) as Workspace[];
  const userWorkspaceIds = workspaces.map((w) => w.id);

  const homePromise =
    userWorkspaceIds.length > 0
      ? client
          .from(tables.projects)
          .select("*")
          .in("workspace_id", userWorkspaceIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as ProjectRow[], error: null });

  const ownerPromise = client
    .from(tables.projects)
    .select("*")
    .eq("created_by", diffuseUserId)
    .order("created_at", { ascending: false });

  const visiblePromise =
    userWorkspaceIds.length > 0
      ? client
          .from(tables.projects)
          .select("*")
          .overlaps("visible_to_orgs", userWorkspaceIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as ProjectRow[], error: null });

  const [homeRes, ownerRes, visibleRes] = await Promise.all([homePromise, ownerPromise, visiblePromise]);

  if (homeRes.error || ownerRes.error) {
    const err = homeRes.error || ownerRes.error;
    return { ok: false, kind: "fetch", message: err?.message ?? "Failed to load projects" };
  }

  let visibleRows: ProjectRow[] = [];
  if (!visibleRes.error) {
    visibleRows = (visibleRes.data ?? []) as ProjectRow[];
  } else if (userWorkspaceIds.length > 0) {
    console.warn(
      "[diffuse] visible_to_orgs overlap query failed; using home + created projects only:",
      visibleRes.error,
    );
  }

  const merged = mergeProjectsById([
    (homeRes.data ?? []) as ProjectRow[],
    (ownerRes.data ?? []) as ProjectRow[],
    visibleRows,
  ]);

  const allProjects = merged;

  const creatorIds = [...new Set(allProjects.map((p) => p.created_by).filter(Boolean))] as string[];

  let creators: { id: string; full_name?: string; user_metadata?: { full_name?: string; name?: string }; name?: string; display_name?: string; username?: string; email?: string }[] =
    [];

  if (creatorIds.length > 0) {
    const { data: profiles } = await client.from("user_profiles").select("*").in("id", creatorIds);
    if (profiles?.length) {
      creators = profiles as typeof creators;
    } else {
      let { data: members } = await client
        .from(tables.members)
        .select("user_id, user:user_profiles(*)")
        .in("user_id", creatorIds);
      if (!members?.length) {
        const altMembers = tables.members.includes("diffuse") ? "workspace_members" : "diffuse_workspace_members";
        const r2 = await client.from(altMembers).select("user_id, user:user_profiles(*)").in("user_id", creatorIds);
        members = r2.data;
      }
      if (members?.length) {
        creators = (members as { user?: unknown; user_id: string }[])
          .map((m) => {
            const u = m.user;
            if (u && typeof u === "object" && !Array.isArray(u) && "id" in u) {
              return u as (typeof creators)[number];
            }
            return { id: m.user_id } as (typeof creators)[number];
          })
          .filter(Boolean);
      }
    }
  }

  const creatorMap: Record<string, string> = {};
  for (const c of creators) {
    const name =
      c.full_name ||
      c.user_metadata?.full_name ||
      c.user_metadata?.name ||
      c.name ||
      c.display_name ||
      c.username ||
      c.email ||
      "Unknown";
    creatorMap[c.id] = name;
  }
  for (const id of creatorIds) {
    if (!creatorMap[id]) creatorMap[id] = "Unknown";
  }

  const projectIds = allProjects.map((p) => p.id);
  const [outputsList, coverByProject] = await Promise.all([
    fetchAllOutputsForProjects(client, tables.outputs, projectIds),
    fetchCoverInputsForProjects(client, tables.inputs, projectIds),
  ]);

  const outputsByProject = groupOutputsByProjectId(outputsList);

  function enrichProject(project: ProjectRow, workspace?: Workspace): ProjectWithWorkspace {
    const outputs = outputsByProject.get(project.id) ?? [];
    const latest = outputs[0];
    let coverImagePath: string | null = null;
    let coverImageFileName: string | null = null;
    const cover = coverByProject.get(project.id);
    if (cover) {
      coverImagePath = cover.file_path;
      coverImageFileName = cover.file_name;
    }
    if (!coverImagePath && latest?.cover_photo_path) {
      coverImagePath = latest.cover_photo_path;
    }
    return {
      ...project,
      workspace,
      latest_output: latest,
      all_outputs: outputs,
      creator_name: creatorMap[project.created_by] || "Unknown",
      cover_image_path: coverImagePath,
      cover_image_file_name: coverImageFileName,
    };
  }

  const projectsByWs: Record<string, ProjectWithWorkspace[]> = {};

  for (const workspace of workspaces) {
    const workspaceProjects = allProjects.filter((project) => {
      const isHomeOrg = project.workspace_id === workspace.id;
      const isVisibleTo =
        project.visible_to_orgs &&
        Array.isArray(project.visible_to_orgs) &&
        project.visible_to_orgs.includes(workspace.id);
      return isHomeOrg || isVisibleTo;
    });

    if (workspaceProjects.length === 0) {
      projectsByWs[workspace.id] = [];
      continue;
    }

    projectsByWs[workspace.id] = workspaceProjects.map((p) => enrichProject(p, workspace));
  }

  const privateProjects = allProjects.filter((project) => {
    const hasNoHome = !project.workspace_id || project.workspace_id === null;
    const hasNoVisibility =
      !project.visible_to_orgs ||
      project.visible_to_orgs === null ||
      (Array.isArray(project.visible_to_orgs) && project.visible_to_orgs.length === 0);
    return hasNoHome && hasNoVisibility;
  });

  if (privateProjects.length > 0) {
    projectsByWs["private"] = privateProjects.map((p) => enrichProject(p));
  }

  return { ok: true, workspaces, projectsByWorkspace: projectsByWs };
}
