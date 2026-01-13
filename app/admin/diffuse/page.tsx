"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { createDiffuseClient, type DiffuseOutput, type DiffuseProject } from "@/lib/diffuse/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Connection {
  id: string;
  diffuse_user_id: string;
  diffuse_email: string | null;
  connected_at: string;
  is_active: boolean;
}

interface OutputWithProject extends DiffuseOutput {
  project?: DiffuseProject;
}

interface Workspace {
  id: string;
  name: string;
  description: string | null;
  plan: string | null;
  owner_id: string;
  created_at: string;
}

interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: string;
}

interface ProjectWithWorkspace extends DiffuseProject {
  workspace?: Workspace;
  latest_output?: DiffuseOutput;
  creator_name?: string;
}

export default function DiffuseIntegrationPage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [connection, setConnection] = useState<Connection | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [projectsByWorkspace, setProjectsByWorkspace] = useState<Record<string, ProjectWithWorkspace[]>>({});
  const [loading, setLoading] = useState(true);
  const [connectLoading, setConnectLoading] = useState(false);
  const [importingProjectId, setImportingProjectId] = useState<string | null>(null);
  const [diffuseEmail, setDiffuseEmail] = useState("");
  const [diffusePassword, setDiffusePassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmModalData, setConfirmModalData] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);
  const [collapsedWorkspaces, setCollapsedWorkspaces] = useState<Set<string>>(new Set());
  const [loadingProjects, setLoadingProjects] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (connection) {
      fetchWorkspacesAndProjects();
    }
  }, [connection]);

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      router.push("/login");
      return;
    }

    const { data: profileData } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (!profileData?.is_admin && !profileData?.is_super_admin) {
      alert("You don't have admin access!");
      router.push("/");
      return;
    }

    setUser(user);
    setProfile(profileData);
    
    // Check if already connected
    await checkConnection(user.id);
    setLoading(false);
  }

  async function checkConnection(userId: string) {
    const { data, error } = await supabase
      .from("diffuse_connections")
      .select("*")
      .eq("springford_user_id", userId)
      .eq("is_active", true)
      .maybeSingle();

    if (data) {
      setConnection(data);
    }
  }

  async function handleConnect() {
    if (!diffuseEmail || !diffusePassword) {
      setError("Please enter your DiffuseAI email and password");
      return;
    }

    setConnectLoading(true);
    setError("");

    try {
      // Sign in to DiffuseAI
      const diffuseClient = createDiffuseClient();
      const { data: authData, error: authError } = await diffuseClient.auth.signInWithPassword({
        email: diffuseEmail,
        password: diffusePassword,
      });

      if (authError || !authData.user) {
        throw new Error(authError?.message || "Failed to authenticate with DiffuseAI");
      }

      // Delete any existing connections for this Spring-Ford user first
      // This allows users to disconnect and reconnect to different DiffuseAI accounts
      await supabase
        .from("diffuse_connections")
        .delete()
        .eq("springford_user_id", user.id);

      // Create new connection in Spring-Ford database
      const { data: connectionData, error: connError } = await supabase
        .from("diffuse_connections")
        .insert({
          springford_user_id: user.id,
          diffuse_user_id: authData.user.id,
          diffuse_email: diffuseEmail,
          springford_email: user.email,
          connected_at: new Date().toISOString(),
          is_active: true,
        })
        .select()
        .single();

      if (connError) {
        throw new Error(connError.message);
      }

      // Delete any existing connections in DiffuseAI database for this user
      await diffuseClient
        .from("springford_connections")
        .delete()
        .eq("diffuse_user_id", authData.user.id);

      // Create new connection in DiffuseAI database
      const { error: diffuseConnError } = await diffuseClient
        .from("springford_connections")
        .insert({
          diffuse_user_id: authData.user.id,
          springford_user_id: user.id,
          diffuse_email: diffuseEmail,
          springford_email: user.email,
          connected_at: new Date().toISOString(),
          is_active: true,
        });

      if (diffuseConnError) {
        console.warn("Warning: Could not create connection in DiffuseAI database:", diffuseConnError);
      }

      setConnection(connectionData);
      setDiffuseEmail("");
      setDiffusePassword("");
      
      // Sign out from DiffuseAI (we don't need to stay logged in)
      await diffuseClient.auth.signOut();
      
      setConfirmModalData({
        title: "Connection Successful!",
        message: "Successfully connected to DiffuseAI! Your organizations and projects will now load.",
        onConfirm: () => setShowConfirmModal(false)
      });
      setShowConfirmModal(true);
    } catch (err: any) {
      setError(err.message || "Failed to connect to DiffuseAI");
      console.error("Connection error:", err);
    } finally {
      setConnectLoading(false);
    }
  }

  function handleDisconnect() {
    setConfirmModalData({
      title: "Disconnect Account",
      message: "Are you sure you want to disconnect your DiffuseAI account?",
      onConfirm: () => {
        setShowConfirmModal(false);
        performDisconnect();
      }
    });
    setShowConfirmModal(true);
  }

  async function performDisconnect() {
    try {
      // Delete connection in Spring-Ford
      const { error } = await supabase
        .from("diffuse_connections")
        .delete()
        .eq("id", connection!.id);

      if (error) throw error;

      // Delete connection in DiffuseAI
      const diffuseClient = createDiffuseClient();
      await diffuseClient
        .from("springford_connections")
        .delete()
        .eq("diffuse_user_id", connection!.diffuse_user_id)
        .eq("springford_user_id", user.id);

      setConnection(null);
      setWorkspaces([]);
      setProjectsByWorkspace({});
      setLoadingProjects(true);
      
      setConfirmModalData({
        title: "Disconnected",
        message: "Successfully disconnected from DiffuseAI.",
        onConfirm: () => setShowConfirmModal(false)
      });
      setShowConfirmModal(true);
    } catch (err: any) {
      setConfirmModalData({
        title: "Disconnect Error",
        message: `Error disconnecting: ${err.message}`,
        onConfirm: () => setShowConfirmModal(false)
      });
      setShowConfirmModal(true);
    }
  }

  async function fetchWorkspacesAndProjects() {
    if (!connection) {
      console.log("No connection found");
      return;
    }

    setLoadingProjects(true);
    console.log("🔍 Starting to fetch workspaces and projects...");
    console.log("Connected user ID:", connection.diffuse_user_id);

    try {
      const diffuseClient = createDiffuseClient();
      
      // First, let's check what tables exist by trying different possible names
      console.log("📊 Attempting to fetch workspace memberships...");
      
      // Try the original table name
      let { data: memberships, error: membershipsError } = await diffuseClient
        .from("diffuse_workspace_members")
        .select("*")
        .eq("user_id", connection.diffuse_user_id);

      // If that fails, try without the diffuse_ prefix
      if (membershipsError) {
        console.warn("⚠️ Error with 'diffuse_workspace_members':", membershipsError);
        console.log("Trying 'workspace_members' instead...");
        
        const result = await diffuseClient
          .from("workspace_members")
          .select("*")
          .eq("user_id", connection.diffuse_user_id);
        
        memberships = result.data;
        membershipsError = result.error;
      }

      if (membershipsError) {
        console.error("❌ Error fetching workspace memberships:", membershipsError);
        setConfirmModalData({
          title: "Fetch Error",
          message: `Error fetching organizations: ${membershipsError.message}\n\nPlease check browser console for details.`,
          onConfirm: () => setShowConfirmModal(false)
        });
        setShowConfirmModal(true);
        setLoadingProjects(false);
        return;
      }

      console.log("✅ Memberships found:", memberships);

      if (!memberships || memberships.length === 0) {
        console.warn("⚠️ No workspace memberships found for this user");
        setConfirmModalData({
          title: "No Organizations",
          message: "No organizations found. Make sure you're a member of at least one organization in DiffuseAI.",
          onConfirm: () => setShowConfirmModal(false)
        });
        setShowConfirmModal(true);
        setWorkspaces([]);
        setProjectsByWorkspace({});
        setLoadingProjects(false);
        return;
      }

      const workspaceIds = memberships.map(m => m.workspace_id);
      console.log("📋 Workspace IDs:", workspaceIds);

      // Fetch workspace details
      console.log("📊 Fetching workspace details...");
      let { data: workspacesData, error: workspacesError } = await diffuseClient
        .from("diffuse_workspaces")
        .select("*")
        .in("id", workspaceIds)
        .order("created_at", { ascending: false });

      // Try without prefix if failed
      if (workspacesError) {
        console.warn("⚠️ Error with 'diffuse_workspaces':", workspacesError);
        console.log("Trying 'workspaces' instead...");
        
        const result = await diffuseClient
          .from("workspaces")
          .select("*")
          .in("id", workspaceIds)
          .order("created_at", { ascending: false });
        
        workspacesData = result.data;
        workspacesError = result.error;
      }

      if (workspacesError) {
        console.error("❌ Error fetching workspaces:", workspacesError);
        setConfirmModalData({
          title: "Fetch Error",
          message: `Error fetching workspace details: ${workspacesError.message}`,
          onConfirm: () => setShowConfirmModal(false)
        });
        setShowConfirmModal(true);
        setLoadingProjects(false);
        return;
      }

      console.log("✅ Workspaces found:", workspacesData);
      setWorkspaces(workspacesData || []);

      // Get all workspace IDs the user is a member of
      const userWorkspaceIds = workspacesData?.map(w => w.id) || [];
      console.log("\n📊 User's workspace IDs:", userWorkspaceIds);

      // Fetch ALL projects visible to the user's workspaces OR created by the user
      console.log("\n📊 Fetching ALL projects for user's workspaces...");
      let { data: allProjects, error: allProjectsError } = await diffuseClient
        .from("diffuse_projects")
        .select("*")
        .order("created_at", { ascending: false });

      // Try without prefix if failed
      if (allProjectsError) {
        console.warn(`⚠️ Error with 'diffuse_projects':`, allProjectsError);
        const result = await diffuseClient
          .from("projects")
          .select("*")
          .order("created_at", { ascending: false });
        
        allProjects = result.data;
        allProjectsError = result.error;
      }

      // Filter projects to only those relevant to the user
      // Include projects where:
      // 1. workspace_id matches one of user's workspaces
      // 2. visible_to_orgs includes one of user's workspaces
      // 3. created_by matches the user (for private projects)
      allProjects = allProjects?.filter(project => {
        const isInHomeWorkspace = project.workspace_id && userWorkspaceIds.includes(project.workspace_id);
        const isVisibleToUserWorkspace = project.visible_to_orgs && 
                                         Array.isArray(project.visible_to_orgs) && 
                                         project.visible_to_orgs.some((id: string) => userWorkspaceIds.includes(id));
        const isCreatedByUser = project.created_by === connection.diffuse_user_id;
        
        return isInHomeWorkspace || isVisibleToUserWorkspace || isCreatedByUser;
      }) || [];

      console.log(`   Found ${allProjects?.length || 0} total relevant projects`);
      
      // Fetch creator information for all projects
      console.log("\n👤 Fetching creator information...");
      const creatorIds = [...new Set(allProjects?.map(p => p.created_by).filter(Boolean))];
      console.log(`   Found ${creatorIds.length} unique creators:`, creatorIds);
      
      let creators: any[] = [];
      
      // Strategy 1: Try public.user_profiles
      console.log("   Trying public.user_profiles...");
      const { data: profiles, error: profilesError } = await diffuseClient
        .from("user_profiles")
        .select("*")
        .in("id", creatorIds);
      
      console.log("   public.user_profiles result:", { data: profiles, error: profilesError, count: profiles?.length });
      
      if (profiles && profiles.length > 0) {
        creators = profiles;
      }
      
      // Strategy 2: Try to get user info from workspace_members (which might have user details)
      if (creators.length === 0) {
        console.log("   Trying to get user info from workspace_members...");
        let { data: members } = await diffuseClient
          .from("diffuse_workspace_members")
          .select("user_id, user:user_profiles(*)")
          .in("user_id", creatorIds);
        
        if (!members) {
          const result = await diffuseClient
            .from("workspace_members")
            .select("user_id, user:user_profiles(*)")
            .in("user_id", creatorIds);
          members = result.data;
        }
        
        console.log("   workspace_members with user join result:", { data: members, count: members?.length });
        
        if (members && members.length > 0) {
          creators = members.map((m: any) => m.user || { id: m.user_id }).filter(Boolean);
        }
      }
      
      // Create a map of creator ID to creator name
      const creatorMap: Record<string, string> = {};
      if (creators && creators.length > 0) {
        console.log("   Raw creator data:", creators);
        creators.forEach((creator: any) => {
          // Try multiple possible field names
          const name = creator.full_name || 
                      creator.user_metadata?.full_name ||
                      creator.user_metadata?.name ||
                      creator.name || 
                      creator.display_name || 
                      creator.username || 
                      creator.email ||
                      "Unknown";
          creatorMap[creator.id] = name;
          console.log(`   ✅ Mapping creator ${creator.id} to "${name}"`);
        });
        console.log("   ✅ Final creator map:", creatorMap);
      } else {
        console.warn("   ⚠️ Could not fetch any creator information");
        console.warn("   ⚠️ All creators will show as 'Unknown'");
        // Fill map with "Unknown" for all creator IDs
        creatorIds.forEach(id => {
          creatorMap[id] = "Unknown";
        });
      }
      
      if (allProjects) {
        console.log("   Projects breakdown:");
        allProjects.forEach(p => {
          console.log(`      - ${p.name}:`, {
            workspace_id: p.workspace_id,
            visible_to_orgs: p.visible_to_orgs,
            created_by: p.created_by,
            creator_name: creatorMap[p.created_by] || "Unknown"
          });
        });
      }

      // Organize projects by workspace based on BOTH workspace_id (home) and visible_to_orgs
      const projectsByWs: Record<string, ProjectWithWorkspace[]> = {};

      for (const workspace of workspacesData || []) {
        console.log(`\n📊 Organizing projects for workspace: ${workspace.name} (${workspace.id})`);
        
        // Find projects that belong to this workspace
        // Either: workspace_id matches (home organization)
        // Or: visible_to_orgs includes this workspace (visibility setting)
        const workspaceProjects = allProjects?.filter(project => {
          const isHomeOrg = project.workspace_id === workspace.id;
          const isVisibleTo = project.visible_to_orgs && Array.isArray(project.visible_to_orgs) && project.visible_to_orgs.includes(workspace.id);
          
          console.log(`   Project "${project.name}": home=${isHomeOrg}, visible=${isVisibleTo}`);
          
          return isHomeOrg || isVisibleTo;
        }) || [];

        console.log(`   → ${workspaceProjects.length} projects for this workspace`);

        // Fetch outputs for each project
        if (workspaceProjects && workspaceProjects.length > 0) {
          const projectsWithOutputs: ProjectWithWorkspace[] = [];
          
          for (const project of workspaceProjects) {
            console.log(`  📝 Checking outputs for project: ${project.name}`);
            
            const { data: outputs } = await diffuseClient
              .from("diffuse_project_outputs")
              .select("*")
              .eq("project_id", project.id)
              .order("created_at", { ascending: false })
              .limit(1);

            if (!outputs) {
              const fallbackResult = await diffuseClient
                .from("project_outputs")
                .select("*")
                .eq("project_id", project.id)
                .order("created_at", { ascending: false })
                .limit(1);
              
              if (fallbackResult.data && fallbackResult.data.length > 0) {
                projectsWithOutputs.push({
                  ...project,
                  workspace: workspace,
                  latest_output: fallbackResult.data[0],
                  creator_name: creatorMap[project.created_by] || "Unknown",
                });
                console.log(`  ✅ Project "${project.name}" has output (fallback)`);
              } else {
                projectsWithOutputs.push({
                  ...project,
                  workspace: workspace,
                  creator_name: creatorMap[project.created_by] || "Unknown",
                });
                console.log(`  ⚠️ Project "${project.name}" has no outputs yet`);
              }
            } else if (outputs && outputs.length > 0) {
              projectsWithOutputs.push({
                ...project,
                workspace: workspace,
                latest_output: outputs[0],
                creator_name: creatorMap[project.created_by] || "Unknown",
              });
              console.log(`  ✅ Project "${project.name}" has output`);
            } else {
              projectsWithOutputs.push({
                ...project,
                workspace: workspace,
                creator_name: creatorMap[project.created_by] || "Unknown",
              });
              console.log(`  ⚠️ Project "${project.name}" has no outputs yet`);
            }
          }

          projectsByWs[workspace.id] = projectsWithOutputs;
        }
      }

      // Find private projects (no home organization AND no visibility settings)
      console.log("\n🔒 ====== FINDING PRIVATE PROJECTS ======");
      const privateProjects = allProjects?.filter(project => {
        const hasNoHome = !project.workspace_id || project.workspace_id === null;
        const hasNoVisibility = !project.visible_to_orgs || 
                               project.visible_to_orgs === null || 
                               (Array.isArray(project.visible_to_orgs) && project.visible_to_orgs.length === 0);
        
        console.log(`   Project "${project.name}": noHome=${hasNoHome}, noVisibility=${hasNoVisibility}`);
        
        return hasNoHome && hasNoVisibility;
      }) || [];

      console.log(`   → Found ${privateProjects.length} truly private projects`);

      if (privateProjects && privateProjects.length > 0) {
        const privateProjectsWithOutputs: ProjectWithWorkspace[] = [];
        
        for (const project of privateProjects) {
          console.log(`  📝 Checking private project: ${project.name}`);
          
          const { data: outputs } = await diffuseClient
            .from("diffuse_project_outputs")
            .select("*")
            .eq("project_id", project.id)
            .order("created_at", { ascending: false })
            .limit(1);

          if (!outputs) {
            const fallbackResult = await diffuseClient
              .from("project_outputs")
              .select("*")
              .eq("project_id", project.id)
              .order("created_at", { ascending: false })
              .limit(1);
            
            if (fallbackResult.data && fallbackResult.data.length > 0) {
              privateProjectsWithOutputs.push({
                ...project,
                latest_output: fallbackResult.data[0],
                creator_name: creatorMap[project.created_by] || "Unknown",
              });
              console.log(`  ✅ Private project "${project.name}" has output`);
            } else {
              privateProjectsWithOutputs.push({
                ...project,
                creator_name: creatorMap[project.created_by] || "Unknown",
              });
              console.log(`  ⚠️ Private project "${project.name}" has no outputs yet`);
            }
          } else if (outputs && outputs.length > 0) {
            privateProjectsWithOutputs.push({
              ...project,
              latest_output: outputs[0],
              creator_name: creatorMap[project.created_by] || "Unknown",
            });
            console.log(`  ✅ Private project "${project.name}" has output`);
          } else {
            privateProjectsWithOutputs.push({
              ...project,
              creator_name: creatorMap[project.created_by] || "Unknown",
            });
            console.log(`  ⚠️ Private project "${project.name}" has no outputs yet`);
          }
        }

        projectsByWs["private"] = privateProjectsWithOutputs;
      }

      console.log("🎉 Final projects by workspace:", projectsByWs);
      setProjectsByWorkspace(projectsByWs);
      setLoadingProjects(false);
    } catch (err) {
      console.error("❌ Unexpected error fetching workspaces and projects:", err);
      setConfirmModalData({
        title: "Unexpected Error",
        message: `Unexpected error: ${err instanceof Error ? err.message : String(err)}`,
        onConfirm: () => setShowConfirmModal(false)
      });
      setShowConfirmModal(true);
      setLoadingProjects(false);
    }
  }

  function toggleWorkspaceCollapse(workspaceId: string) {
    setCollapsedWorkspaces(prev => {
      const newSet = new Set(prev);
      if (newSet.has(workspaceId)) {
        newSet.delete(workspaceId);
      } else {
        newSet.add(workspaceId);
      }
      return newSet;
    });
  }

  function handleViewOnDiffuse(project: ProjectWithWorkspace) {
    // Open DiffuseAI project in new tab
    const diffuseProjectUrl = `https://ddwcafuxatmejxcfkwhu.supabase.co/project/ddwcafuxatmejxcfkwhu/editor/${project.id}`;
    window.open(diffuseProjectUrl, '_blank', 'noopener,noreferrer');
  }

  function handleImport(project: ProjectWithWorkspace) {
    if (!project.latest_output) {
      setConfirmModalData({
        title: "No Output Available",
        message: "This project doesn't have any outputs yet.",
        onConfirm: () => setShowConfirmModal(false)
      });
      setShowConfirmModal(true);
      return;
    }

    setConfirmModalData({
      title: "Import Article",
      message: `Import "${project.name}" as a draft article?`,
      onConfirm: () => {
        setShowConfirmModal(false);
        performImport(project);
      }
    });
    setShowConfirmModal(true);
  }

  async function performImport(project: ProjectWithWorkspace) {
    setImportingProjectId(project.id);

    try {
      const output = project.latest_output;

      // Check if output exists
      if (!output) {
        setImportingProjectId(null);
        setConfirmModalData({
          title: "No Output Available",
          message: "This project doesn't have any outputs yet. Please create an output in DiffuseAI first.",
          onConfirm: () => setShowConfirmModal(false)
        });
        setShowConfirmModal(true);
        return;
      }

      // Check if already imported
      const { data: existing } = await supabase
        .from("diffuse_imported_articles")
        .select("article_id")
        .eq("diffuse_output_id", output.id)
        .maybeSingle();

      if (existing) {
        setImportingProjectId(null);
        setConfirmModalData({
          title: "Already Imported",
          message: "This output has already been imported! Redirecting to edit page...",
          onConfirm: () => {
            setShowConfirmModal(false);
            router.push(`/admin/articles/edit/${existing.article_id}?fromDiffuse=true`);
          }
        });
        setShowConfirmModal(true);
        return;
      }

      // Parse structured data from DiffuseAI output
      console.log("📊 Parsing DiffuseAI output:", output);
      console.log("📊 Raw content:", output.content);
      console.log("📊 Raw structured_data:", output.structured_data);
      
      let title = project.name || "Imported from DiffuseAI";
      let subtitle = null;
      let author = "Powered by diffuse.ai"; // Default author for DiffuseAI imports
      let excerpt = "";
      let content = "";
      let category = null;
      let tags: string[] = [];
      let sections: string[] = [];
      let metaTitle = null;
      let metaDescription = null;

      // First, try to parse structured_data if it exists
      let parsedData = output.structured_data;
      
      // If structured_data is a string, try to parse it as JSON
      if (typeof output.structured_data === 'string') {
        try {
          parsedData = JSON.parse(output.structured_data);
          console.log("📋 Parsed structured_data from JSON string:", parsedData);
        } catch (e) {
          console.warn("⚠️ Could not parse structured_data as JSON:", e);
        }
      }
      
      // If output.content is a string that looks like JSON, try to parse it
      if (output.content && typeof output.content === 'string' && output.content.trim().startsWith('{')) {
        try {
          const contentJson = JSON.parse(output.content);
          console.log("📋 Parsed content as JSON:", contentJson);
          // Use the parsed JSON as our data source
          parsedData = contentJson;
        } catch (e) {
          console.log("Content is not JSON, using as-is");
          content = output.content;
        }
      } else {
        content = output.content || "";
      }

      // Extract ALL fields from parsed data
      if (parsedData && typeof parsedData === 'object') {
        console.log("📋 Extracting fields from:", parsedData);
        
        // Title
        if (parsedData.title) {
          title = parsedData.title;
          console.log("✅ Found title:", title);
        }
        
        // Subtitle
        if (parsedData.subtitle) {
          subtitle = parsedData.subtitle;
          console.log("✅ Found subtitle:", subtitle);
        }
        
        // Author (should always be Diffuse.AI for DiffuseAI imports)
        if (parsedData.author) {
          author = parsedData.author;
          console.log("✅ Found author:", author);
        }
        
        // Excerpt
        if (parsedData.excerpt) {
          excerpt = parsedData.excerpt;
          console.log("✅ Found excerpt:", excerpt.substring(0, 50) + "...");
        }
        
        // Article Content (use parsedData.content if available and content is still empty)
        if (parsedData.content && !content) {
          content = parsedData.content;
          console.log("✅ Found content:", content.substring(0, 100) + "...");
        }
        
        // Category (convert to lowercase slug format)
        if (parsedData.category) {
          // Convert "Sports" → "sports", "Community Events" → "community-events"
          category = parsedData.category.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
          console.log("✅ Found category:", parsedData.category, "→ converted to slug:", category);
        }
        
        // Tags (split by comma if string, or use array directly)
        if (parsedData.tags) {
          if (typeof parsedData.tags === 'string') {
            tags = parsedData.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
          } else if (Array.isArray(parsedData.tags)) {
            tags = parsedData.tags;
          }
          console.log("✅ Found tags:", tags);
        }
        
        // Sections (convert to lowercase slug format)
        if (parsedData.suggested_sections) {
          let rawSections: string[] = [];
          if (typeof parsedData.suggested_sections === 'string') {
            rawSections = parsedData.suggested_sections.split(',').map((s: string) => s.trim()).filter(Boolean);
          } else if (Array.isArray(parsedData.suggested_sections)) {
            rawSections = parsedData.suggested_sections;
          }
          // Convert "Spring City" → "spring-city", "School District" → "school-district"
          sections = rawSections.map(s => s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''));
          console.log("✅ Found sections:", rawSections, "→ converted to slugs:", sections);
        }
        
        // Meta Title
        if (parsedData.meta_title) {
          metaTitle = parsedData.meta_title;
          console.log("✅ Found meta_title:", metaTitle);
        }
        
        // Meta Description
        if (parsedData.meta_description) {
          metaDescription = parsedData.meta_description;
          console.log("✅ Found meta_description:", metaDescription);
        }
      } else {
        console.warn("⚠️ No parsed data available, using defaults");
      }

      // Generate excerpt from content if not available
      if (!excerpt && content) {
        // Extract first 200 characters, avoiding JSON syntax
        const cleanContent = content.replace(/\*\*/g, '').replace(/\n\n/g, ' ');
        excerpt = cleanContent.substring(0, 200).trim() + "...";
      }
      
      // Ensure sections has at least one value
      if (!sections || sections.length === 0) {
        sections = ["general"];
        console.log("⚠️ No sections found, defaulting to 'general'");
      }

      console.log("\n✅ ====== FINAL PARSED ARTICLE DATA ======");
      console.log("Title:", title);
      console.log("Subtitle:", subtitle);
      console.log("Author:", author);
      console.log("Excerpt:", excerpt ? excerpt.substring(0, 80) + "..." : "NONE");
      console.log("Content length:", content.length, "chars");
      console.log("Content preview:", content.substring(0, 100) + "...");
      console.log("Category:", category);
      console.log("Tags:", tags);
      console.log("Sections:", sections);
      console.log("Meta Title:", metaTitle);
      console.log("Meta Description:", metaDescription);
      console.log("========================================\n");

      // Create draft article
      const { data: article, error: articleError } = await supabase
        .from("articles")
        .insert({
          title: title,
          subtitle: subtitle,
          slug: title.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Date.now(),
          excerpt: excerpt,
          content: content,
          content_blocks: [
            {
              id: crypto.randomUUID(),
              type: "text",
              content: content,
              order: 0,
            },
          ],
          status: "draft",
          author_name: author, // Use Diffuse.AI as author
          section: sections[0] || "general",
          sections: sections,
          category: category,
          tags: tags.length > 0 ? tags : null,
          meta_title: metaTitle,
          meta_description: metaDescription,
          is_featured: false,
          is_breaking: false,
          allow_comments: true,
          view_count: 0,
          share_count: 0,
        })
        .select()
        .single();

      if (articleError) {
        throw articleError;
      }

      // Track the import
      await supabase
        .from("diffuse_imported_articles")
        .insert({
          article_id: article.id,
          diffuse_output_id: output.id,
          diffuse_project_id: project.id,
          imported_by: user.id,
        });

      setConfirmModalData({
        title: "Import Successful!",
        message: "Successfully imported as draft! Redirecting to editor...",
        onConfirm: () => {
          setShowConfirmModal(false);
          router.push(`/admin/articles/edit/${article.id}?fromDiffuse=true`);
        }
      });
      setShowConfirmModal(true);
    } catch (err: any) {
      setConfirmModalData({
        title: "Import Error",
        message: `Error importing: ${err.message}`,
        onConfirm: () => setShowConfirmModal(false)
      });
      setShowConfirmModal(true);
      console.error("Import error:", err);
    } finally {
      setImportingProjectId(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center" style={{ fontFamily: 'var(--font-space-grotesk)' }}>
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-[#ff9628] border-r-transparent"></div>
          <p className="mt-4 text-[#dbdbdb] text-lg">Loading DiffuseAI...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#000000]" style={{ fontFamily: 'var(--font-space-grotesk)' }}>
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div>
              {/* DiffuseAI Logo */}
              <div className="flex items-center gap-4 mb-4">
                <h1 className="text-5xl font-bold text-white" style={{ letterSpacing: '-0.01em', lineHeight: '1.2' }}>
                  diffuse<span className="text-[#ff9628]">.ai</span>
                </h1>
                <a
                  href="https://diffuse-ai-blush.vercel.app/dashboard"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 text-xs font-bold text-white bg-[#545454] hover:bg-[#141414] border border-white/40 rounded-lg transition-all duration-300 flex items-center gap-2 shadow-lg"
                  style={{ color: '#FFFFFF' }}
                >
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  <span style={{ color: '#FFFFFF' }}>Visit diffuse<span className="text-[#ff9628]">.ai</span></span>
                </a>
              </div>
              <p className="text-[#dbdbdb] text-lg" style={{ lineHeight: '1.6' }}>
                Connect your DiffuseAI account to import generated articles
              </p>
            </div>
            <Link
              href="/admin"
              className="px-6 py-3 text-sm font-bold text-white bg-[#545454] hover:bg-[#141414] rounded-xl transition border border-white/40 shadow-lg"
              style={{ color: '#FFFFFF' }}
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>

        {/* Connection Status */}
        {!connection ? (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-8 shadow-[0_10px_15px_-3px_rgba(255,150,40,0.3)] max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-r from-[#ff9628] to-[#ff7300] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h2 className="text-4xl font-bold text-white mb-3" style={{ letterSpacing: '-0.01em', lineHeight: '1.2' }}>
                Connect Your DiffuseAI Account
              </h2>
              <p className="text-[#dbdbdb] text-lg" style={{ lineHeight: '1.6' }}>
                Sign in with your DiffuseAI credentials to import your generated articles
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl backdrop-blur-xl">
                <p className="text-sm text-red-300 font-medium">{error}</p>
              </div>
            )}

            <div className="space-y-5">
              <div>
                <label className="block text-base font-semibold text-white mb-3" style={{ lineHeight: '1.4' }}>
                  DiffuseAI Email
                </label>
                <input
                  type="email"
                  value={diffuseEmail}
                  onChange={(e) => setDiffuseEmail(e.target.value)}
                  className="w-full border border-white/10 bg-white/5 backdrop-blur-xl rounded-xl px-5 py-4 text-white placeholder-[#545454] focus:border-[#ff9628] focus:outline-none focus:ring-2 focus:ring-[#ff9628]/30 transition"
                  placeholder="your@email.com"
                  disabled={connectLoading}
                  style={{ fontSize: '16px', lineHeight: '1.6' }}
                />
              </div>

              <div>
                <label className="block text-base font-semibold text-white mb-3" style={{ lineHeight: '1.4' }}>
                  DiffuseAI Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={diffusePassword}
                    onChange={(e) => setDiffusePassword(e.target.value)}
                    className="w-full border border-white/10 bg-white/5 backdrop-blur-xl rounded-xl px-5 py-4 pr-12 text-white placeholder-[#545454] focus:border-[#ff9628] focus:outline-none focus:ring-2 focus:ring-[#ff9628]/30 transition"
                    placeholder="••••••••"
                    disabled={connectLoading}
                    onKeyDown={(e) => e.key === "Enter" && handleConnect()}
                    style={{ fontSize: '16px', lineHeight: '1.6' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#545454] hover:text-[#ff9628] transition-colors"
                    disabled={connectLoading}
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button
                onClick={handleConnect}
                disabled={connectLoading || !diffuseEmail || !diffusePassword}
                className="w-full bg-gradient-to-r from-[#ff9628] to-[#ff7300] text-white px-8 py-4 rounded-xl font-bold text-lg hover:shadow-[0_10px_15px_-3px_rgba(255,150,40,0.4)] hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {connectLoading ? "Connecting..." : "Connect Account"}
              </button>
            </div>
          </div>
        ) : (
          <div>
            {/* Connected Status */}
            <div className="bg-gradient-to-br from-[#c086fa]/10 via-white/5 to-[#ff9628]/10 backdrop-blur-xl rounded-xl p-6 shadow-[0_10px_15px_-3px_rgba(255,150,40,0.2)] mb-8 border border-[#ff9628]/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-5">
                  {/* User Profile Picture */}
                  <div className="relative w-14 h-14 rounded-2xl overflow-hidden shadow-lg ring-2 ring-[#ff9628]/50">
                    {profile?.avatar_url ? (
                      <img 
                        src={profile.avatar_url} 
                        alt="Profile" 
                        className="w-full h-full object-cover scale-125"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[#ff9628] to-[#c086fa] flex items-center justify-center">
                        <span className="text-white font-bold text-xl">
                          {profile?.full_name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || "?"}
                        </span>
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1" style={{ letterSpacing: '-0.01em' }}>
                      Connected to <span className="text-white">diffuse<span className="text-[#ff9628]">.ai</span></span>
                    </h3>
                    <p className="text-base text-[#dbdbdb]" style={{ lineHeight: '1.6' }}>
                      {connection.diffuse_email || "Account connected"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleDisconnect}
                  className="px-6 py-3 text-sm font-semibold text-red-300 hover:text-white bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-xl transition-all duration-300"
                >
                  Disconnect
                </button>
              </div>
            </div>

            {/* Organizations & Projects */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl shadow-[0_10px_15px_-3px_rgba(255,150,40,0.2)]">
              <div className="p-8 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-3xl font-bold text-white mb-2" style={{ letterSpacing: '-0.01em', lineHeight: '1.3' }}>
                      Your DiffuseAI Organizations ({workspaces.length})
                    </h2>
                    <p className="text-base text-[#dbdbdb]" style={{ lineHeight: '1.6' }}>
                      View projects and import their outputs as drafts
                    </p>
                  </div>
                  <button
                    onClick={fetchWorkspacesAndProjects}
                    className="px-5 py-3 text-sm font-semibold text-[#ff9628] hover:text-white bg-[#ff9628]/10 hover:bg-[#ff9628]/20 border border-[#ff9628]/30 rounded-xl transition-all duration-300 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                  </button>
                </div>
              </div>

              {workspaces.length === 0 ? (
                <div className="p-16 text-center">
                  <div className="text-7xl mb-6 opacity-50">🏢</div>
                  <h3 className="text-2xl font-bold text-white mb-3" style={{ letterSpacing: '-0.01em' }}>
                    No Organizations Yet
                  </h3>
                  <p className="text-lg text-[#dbdbdb]" style={{ lineHeight: '1.6' }}>
                    Create an organization in DiffuseAI and it will appear here
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-white/10">
                  {workspaces.map((workspace) => {
                    const projects = projectsByWorkspace[workspace.id] || [];
                    return (
                      <div key={workspace.id} className="p-8">
                        {/* Workspace Header */}
                        <div className="mb-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="w-14 h-14 bg-white/10 border border-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center shadow-lg">
                                <svg className="w-8 h-8 text-[#dbdbdb]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                              </div>
                              <div>
                                <h3 className="text-2xl font-bold text-white mb-1" style={{ letterSpacing: '-0.01em' }}>
                                  {workspace.name}
                                </h3>
                                {workspace.description && (
                                  <p className="text-base text-[#dbdbdb]" style={{ lineHeight: '1.6' }}>
                                    {workspace.description}
                                  </p>
                                )}
                              </div>
                            </div>
                            {/* Collapse Toggle Button */}
                            <button
                              onClick={() => toggleWorkspaceCollapse(workspace.id)}
                              className="px-4 py-2 text-sm font-bold text-[#dbdbdb] bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all duration-300 flex items-center gap-2"
                            >
                              <svg 
                                className={`w-4 h-4 transition-transform duration-300 ${collapsedWorkspaces.has(workspace.id) ? 'rotate-180' : ''}`}
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                              {collapsedWorkspaces.has(workspace.id) ? 'Show' : 'Hide'}
                            </button>
                          </div>
                        </div>

                        {/* Projects Grid */}
                        {!collapsedWorkspaces.has(workspace.id) && (
                          loadingProjects ? (
                            <div className="ml-16 p-8 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl flex items-center justify-center">
                              <div className="flex flex-col items-center gap-3">
                                <div className="w-8 h-8 border-4 border-[#ff9628] border-t-transparent rounded-full animate-spin"></div>
                                <p className="text-sm text-[#dbdbdb]">Loading projects...</p>
                              </div>
                            </div>
                          ) : projects.length === 0 ? (
                            <div className="ml-16 p-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl text-center">
                              <p className="text-base text-[#dbdbdb]" style={{ lineHeight: '1.6' }}>
                                No projects in this organization yet
                              </p>
                            </div>
                          ) : (
                            <div className="ml-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                              {projects.map((project) => (
                                <div
                                  key={project.id}
                                  className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-5 flex flex-col h-full"
                                >
                                  {/* Project Info - Grows to fill space */}
                                  <div className="flex-1 mb-4">
                                    <h4 className="font-bold text-white text-lg mb-2" style={{ letterSpacing: '-0.01em', lineHeight: '1.4' }}>
                                      {project.name}
                                    </h4>
                                    {project.description && (
                                      <p className="text-sm text-[#dbdbdb] line-clamp-2 mb-3" style={{ lineHeight: '1.6' }}>
                                        {project.description}
                                      </p>
                                    )}
                                  </div>

                                  {/* Metadata - Fixed position above button */}
                                  <div className="space-y-2 mb-4">
                                    <div className="flex items-center gap-3">
                                      <span className="text-xs text-[#545454] font-medium">
                                        {new Date(project.created_at).toLocaleDateString("en-US", {
                                          month: "short",
                                          day: "numeric",
                                          year: "numeric",
                                        })}
                                      </span>
                                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#c086fa]/20 border border-[#c086fa]/30 text-[#c086fa] px-3 py-1 text-xs font-semibold">
                                        {project.status}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <svg className="w-3.5 h-3.5 text-[#ff9628]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                      </svg>
                                      <span className="text-xs text-[#dbdbdb] font-medium">
                                        {project.creator_name || "Unknown"}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Turn into Article Button */}
                                  <button
                                    onClick={() => handleImport(project)}
                                    disabled={!project.latest_output || importingProjectId === project.id}
                                    className="w-full px-5 py-3 text-sm font-bold bg-gradient-to-r from-[#ff9628] to-[#ff7300] text-white hover:shadow-[0_10px_15px_-3px_rgba(255,150,40,0.5)] hover:scale-[1.03] rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                  >
                                    {importingProjectId === project.id ? (
                                      <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        Importing...
                                      </>
                                    ) : !project.latest_output ? (
                                      <>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                        No Output
                                      </>
                                    ) : (
                                      <>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                        </svg>
                                        Turn into Article
                                      </>
                                    )}
                                  </button>
                                </div>
                              ))}
                            </div>
                          )
                        )}
                      </div>
                    );
                  })}
                  
                  {/* Private Projects Section */}
                  {projectsByWorkspace["private"] && projectsByWorkspace["private"].length > 0 && (
                    <div className="p-8 border-t border-[#ff9628]/30">
                      {/* Private Section Header */}
                      <div className="mb-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-gradient-to-br from-[#ff9628]/20 to-[#c086fa]/20 border border-[#ff9628]/40 backdrop-blur-xl rounded-2xl flex items-center justify-center shadow-lg">
                              <svg className="w-8 h-8 text-[#ff9628]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                              </svg>
                            </div>
                            <div>
                              <h3 className="text-2xl font-bold text-white mb-1" style={{ letterSpacing: '-0.01em' }}>
                                Private Projects
                              </h3>
                              <p className="text-base text-[#dbdbdb]" style={{ lineHeight: '1.6' }}>
                                Only visible to you
                              </p>
                            </div>
                          </div>
                          {/* Collapse Toggle Button */}
                          <button
                            onClick={() => toggleWorkspaceCollapse("private")}
                            className="px-4 py-2 text-sm font-bold text-[#dbdbdb] bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all duration-300 flex items-center gap-2"
                          >
                            <svg 
                              className={`w-4 h-4 transition-transform duration-300 ${collapsedWorkspaces.has("private") ? 'rotate-180' : ''}`}
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                            {collapsedWorkspaces.has("private") ? 'Show' : 'Hide'}
                          </button>
                        </div>
                      </div>

                      {/* Private Projects Grid */}
                      {!collapsedWorkspaces.has("private") && (
                        <div className="ml-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                          {projectsByWorkspace["private"].map((project) => (
                            <div
                              key={project.id}
                              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-5 flex flex-col h-full"
                            >
                              {/* Project Info - Grows to fill space */}
                              <div className="flex-1 mb-4">
                                <h4 className="font-bold text-white text-lg mb-2" style={{ letterSpacing: '-0.01em', lineHeight: '1.4' }}>
                                  {project.name}
                                </h4>
                                {project.description && (
                                  <p className="text-sm text-[#dbdbdb] line-clamp-2 mb-3" style={{ lineHeight: '1.6' }}>
                                    {project.description}
                                  </p>
                                )}
                              </div>

                              {/* Metadata - Fixed position above button */}
                              <div className="space-y-2 mb-4">
                                <div className="flex items-center gap-3">
                                  <span className="text-xs text-[#545454] font-medium">
                                    {new Date(project.created_at).toLocaleDateString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                    })}
                                  </span>
                                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#c086fa]/20 border border-[#c086fa]/30 text-[#c086fa] px-3 py-1 text-xs font-semibold">
                                    {project.status}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <svg className="w-3.5 h-3.5 text-[#ff9628]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                  </svg>
                                  <span className="text-xs text-[#dbdbdb] font-medium">
                                    {project.creator_name || "Unknown"}
                                  </span>
                                </div>
                              </div>

                              {/* Turn into Article Button */}
                              <button
                                onClick={() => handleImport(project)}
                                disabled={!project.latest_output || importingProjectId === project.id}
                                className="w-full px-5 py-3 text-sm font-bold bg-gradient-to-r from-[#ff9628] to-[#ff7300] text-white hover:shadow-[0_10px_15px_-3px_rgba(255,150,40,0.5)] hover:scale-[1.03] rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                              >
                                {importingProjectId === project.id ? (
                                  <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Importing...
                                  </>
                                ) : !project.latest_output ? (
                                  <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                    No Output
                                  </>
                                ) : (
                                  <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                    Turn into Article
                                  </>
                                )}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Custom Confirmation Modal */}
        {showConfirmModal && confirmModalData && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowConfirmModal(false)}>
            <div 
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 max-w-md w-full shadow-[0_20px_25px_-5px_rgba(255,150,40,0.4)]"
              onClick={(e) => e.stopPropagation()}
              style={{ fontFamily: 'var(--font-space-grotesk)' }}
            >
              {/* Modal Header */}
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-[#ff9628] to-[#ff7300] rounded-xl flex items-center justify-center shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-white" style={{ letterSpacing: '-0.01em', lineHeight: '1.3' }}>
                    {confirmModalData.title}
                  </h2>
                </div>
                <p className="text-lg text-[#dbdbdb]" style={{ lineHeight: '1.6' }}>
                  {confirmModalData.message}
                </p>
              </div>

              {/* Modal Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 px-6 py-3 text-sm font-bold text-[#dbdbdb] bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all duration-300"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmModalData.onConfirm}
                  className="flex-1 px-6 py-3 text-sm font-bold bg-gradient-to-r from-[#ff9628] to-[#ff7300] text-white hover:shadow-[0_10px_15px_-3px_rgba(255,150,40,0.4)] rounded-xl transition-all duration-300"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
