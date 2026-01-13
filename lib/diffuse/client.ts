import { createClient } from '@supabase/supabase-js';

// DiffuseAI Supabase client
const DIFFUSE_URL = 'https://ddwcafuxatmejxcfkwhu.supabase.co';
const DIFFUSE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkd2NhZnV4YXRtZWp4Y2Zrd2h1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1NDYwNDUsImV4cCI6MjA4MzEyMjA0NX0.BTXM1tSom_KlJJFHzSflUbkr3Y2nraWYN59im8P0WcY';

export function createDiffuseClient() {
  return createClient(DIFFUSE_URL, DIFFUSE_ANON_KEY, {
    auth: {
      persistSession: false, // Don't interfere with Spring-Ford auth
    },
  });
}

export interface DiffuseOutput {
  id: string;
  project_id: string;
  input_id: string | null;
  content: string;
  structured_data: any;
  workflow_status: string;
  workflow_metadata: any;
  created_at: string;
  updated_at: string;
}

export interface DiffuseProject {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  visibility: string;
  status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface DiffuseConnection {
  id: string;
  springford_user_id: string;
  diffuse_user_id: string;
  diffuse_email: string | null;
  springford_email: string | null;
  connected_at: string;
  last_sync_at: string | null;
  is_active: boolean;
}

export interface DiffuseWorkspace {
  id: string;
  name: string;
  description: string | null;
  plan: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface DiffuseWorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: string;
  invited_by: string | null;
  joined_at: string | null;
}
