-- ============================================
-- ThinkDoc Complete Database Schema for Supabase
-- Supabase Project Reference: poicimlmzscbhrreycce
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ORGANIZATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS organizations_domain_idx ON organizations(domain);

COMMENT ON TABLE organizations IS 'Organization/company accounts';

-- ============================================
-- USERS
-- ============================================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  password_hash TEXT,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);
CREATE INDEX IF NOT EXISTS users_organization_id_idx ON users(organization_id);

COMMENT ON TABLE users IS 'User accounts';

-- ============================================
-- SESSIONS
-- ============================================

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_token_idx ON sessions(token);

COMMENT ON TABLE sessions IS 'User authentication sessions';

-- ============================================
-- PASSWORD RESET TOKENS
-- ============================================

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS password_reset_tokens_user_id_idx ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS password_reset_tokens_token_idx ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS password_reset_tokens_expires_at_idx ON password_reset_tokens(expires_at);

COMMENT ON TABLE password_reset_tokens IS 'Stores password reset tokens for users';

-- ============================================
-- ROLES & RBAC
-- ============================================

CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  permissions JSONB NOT NULL DEFAULT '[]',
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS roles_name_idx ON roles(name);

COMMENT ON TABLE roles IS 'System and custom roles with associated permissions';

CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Option B: Functional unique index to prevent duplicate role assignments
-- NULL in organization_id means "global role" (not scoped to any organization)
CREATE UNIQUE INDEX IF NOT EXISTS user_roles_unique_idx ON user_roles (
  user_id, 
  role_id, 
  COALESCE(organization_id, '00000000-0000-0000-0000-000000000000'::uuid)
);

CREATE INDEX IF NOT EXISTS user_roles_user_id_idx ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS user_roles_role_id_idx ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS user_roles_organization_id_idx ON user_roles(organization_id);

COMMENT ON TABLE user_roles IS 'Many-to-many relationship between users and roles, scoped to organizations';
COMMENT ON COLUMN user_roles.organization_id IS 'NULL means global role assignment, not scoped to any organization';

-- ============================================
-- TEAMS
-- ============================================

CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS teams_organization_id_idx ON teams(organization_id);
CREATE INDEX IF NOT EXISTS teams_owner_id_idx ON teams(owner_id);

COMMENT ON TABLE teams IS 'Teams within organizations';

CREATE TABLE IF NOT EXISTS team_members (
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  invited_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (team_id, user_id)
);

CREATE INDEX IF NOT EXISTS team_members_team_id_idx ON team_members(team_id);
CREATE INDEX IF NOT EXISTS team_members_user_id_idx ON team_members(user_id);

COMMENT ON TABLE team_members IS 'Team membership';
COMMENT ON COLUMN team_members.role IS 'admin or member';

CREATE TABLE IF NOT EXISTS team_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL,
  resource_id UUID NOT NULL,
  permission TEXT NOT NULL DEFAULT 'view',
  shared_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS team_shares_team_id_idx ON team_shares(team_id);
CREATE INDEX IF NOT EXISTS team_shares_resource_idx ON team_shares(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS team_shares_shared_by_idx ON team_shares(shared_by_user_id);

COMMENT ON TABLE team_shares IS 'Team resource sharing';
COMMENT ON COLUMN team_shares.resource_type IS 'clause, project, playbook, chat_session, document';
COMMENT ON COLUMN team_shares.permission IS 'view, use, edit, remix, admin';

-- ============================================
-- ORGANIZATION INTEGRATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS organization_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  integration_type TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT organization_integrations_unique UNIQUE(organization_id, integration_type)
);

CREATE INDEX IF NOT EXISTS organization_integrations_org_id_idx ON organization_integrations(organization_id);
CREATE INDEX IF NOT EXISTS organization_integrations_type_idx ON organization_integrations(integration_type);

COMMENT ON TABLE organization_integrations IS 'Stores organization-level integration settings (iManage, SharePoint, Google Drive)';
COMMENT ON COLUMN organization_integrations.integration_type IS 'imanage, imanage-onprem, sharepoint, googledrive';

-- ============================================
-- PLAYBOOKS (Original)
-- ============================================

CREATE TABLE IF NOT EXISTS playbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  playbook_name TEXT NOT NULL,
  description TEXT,
  playbook_type TEXT,
  user_position TEXT,
  jurisdiction TEXT,
  tags TEXT,
  rules JSONB NOT NULL,
  metadata JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS playbooks_user_id_idx ON playbooks(user_id);
CREATE INDEX IF NOT EXISTS playbooks_playbook_name_idx ON playbooks(playbook_name);
CREATE INDEX IF NOT EXISTS playbooks_playbook_type_idx ON playbooks(playbook_type);
CREATE INDEX IF NOT EXISTS playbooks_created_at_idx ON playbooks(created_at);

COMMENT ON TABLE playbooks IS 'Review playbooks with rules for contract analysis';

CREATE TABLE IF NOT EXISTS playbook_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playbook_id UUID NOT NULL REFERENCES playbooks(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shared_with_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  share_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS playbook_shares_playbook_id_idx ON playbook_shares(playbook_id);
CREATE INDEX IF NOT EXISTS playbook_shares_owner_id_idx ON playbook_shares(owner_id);
CREATE INDEX IF NOT EXISTS playbook_shares_shared_with_user_id_idx ON playbook_shares(shared_with_user_id);
CREATE UNIQUE INDEX IF NOT EXISTS playbook_shares_unique_idx ON playbook_shares(playbook_id, shared_with_user_id);

COMMENT ON TABLE playbook_shares IS 'Playbook sharing between users';
COMMENT ON COLUMN playbook_shares.share_type IS 'view or remix';

CREATE TABLE IF NOT EXISTS organization_playbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  playbook_id UUID NOT NULL REFERENCES playbooks(id) ON DELETE CASCADE,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS organization_playbooks_org_id_idx ON organization_playbooks(organization_id);
CREATE INDEX IF NOT EXISTS organization_playbooks_playbook_id_idx ON organization_playbooks(playbook_id);

COMMENT ON TABLE organization_playbooks IS 'Organization default playbooks';

-- ============================================
-- DOCUMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  metadata JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS documents_user_id_idx ON documents(user_id);
CREATE INDEX IF NOT EXISTS documents_title_idx ON documents(title);

COMMENT ON TABLE documents IS 'Document records';

CREATE TABLE IF NOT EXISTS paragraphs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  paragraph_index INTEGER NOT NULL,
  style_id TEXT,
  style_name TEXT,
  alignment TEXT,
  indent_left INTEGER,
  indent_right INTEGER,
  indent_first_line INTEGER,
  space_before INTEGER,
  space_after INTEGER,
  line_spacing TEXT,
  line_spacing_rule TEXT,
  word_paragraph_id TEXT,
  range JSONB,
  metadata JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS paragraphs_document_id_idx ON paragraphs(document_id);
CREATE INDEX IF NOT EXISTS paragraphs_paragraph_index_idx ON paragraphs(paragraph_index);
CREATE INDEX IF NOT EXISTS paragraphs_word_paragraph_id_idx ON paragraphs(word_paragraph_id);
CREATE UNIQUE INDEX IF NOT EXISTS paragraphs_unique_document_index ON paragraphs(document_id, paragraph_index);

COMMENT ON TABLE paragraphs IS 'Document paragraphs with Word formatting';

CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  paragraph_id UUID REFERENCES paragraphs(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  position JSONB,
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS comments_document_id_idx ON comments(document_id);
CREATE INDEX IF NOT EXISTS comments_paragraph_id_idx ON comments(paragraph_id);

COMMENT ON TABLE comments IS 'Document comments';

CREATE TABLE IF NOT EXISTS highlights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  paragraph_id UUID REFERENCES paragraphs(id) ON DELETE SET NULL,
  text TEXT NOT NULL,
  position JSONB,
  color TEXT NOT NULL DEFAULT '#FFFF00',
  note TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS highlights_document_id_idx ON highlights(document_id);
CREATE INDEX IF NOT EXISTS highlights_paragraph_id_idx ON highlights(paragraph_id);

COMMENT ON TABLE highlights IS 'Document highlights';

CREATE TABLE IF NOT EXISTS tracked_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  paragraph_id UUID REFERENCES paragraphs(id) ON DELETE SET NULL,
  change_type TEXT NOT NULL,
  text TEXT,
  position JSONB,
  author TEXT,
  timestamp TIMESTAMPTZ,
  is_accepted BOOLEAN NOT NULL DEFAULT false,
  is_rejected BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS tracked_changes_document_id_idx ON tracked_changes(document_id);
CREATE INDEX IF NOT EXISTS tracked_changes_paragraph_id_idx ON tracked_changes(paragraph_id);
CREATE INDEX IF NOT EXISTS tracked_changes_change_type_idx ON tracked_changes(change_type);

COMMENT ON TABLE tracked_changes IS 'Tracked changes in documents';
COMMENT ON COLUMN tracked_changes.change_type IS 'insert, delete, format';

-- ============================================
-- VAULT MODULE
-- ============================================

CREATE TABLE IF NOT EXISTS vault_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  file_count INTEGER NOT NULL DEFAULT 0,
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'shared')),
  client_matter TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS vault_projects_user_id_idx ON vault_projects(user_id);
CREATE INDEX IF NOT EXISTS vault_projects_visibility_idx ON vault_projects(visibility);

COMMENT ON TABLE vault_projects IS 'Vault projects - containers for document collections';

CREATE TABLE IF NOT EXISTS vault_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES vault_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  storage_path TEXT,
  category TEXT,
  document_type TEXT,
  size_bytes INTEGER,
  mime_type TEXT,
  extracted_text TEXT,
  parsed_structure JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS vault_files_project_id_idx ON vault_files(project_id);
CREATE INDEX IF NOT EXISTS vault_files_document_type_idx ON vault_files(document_type);

COMMENT ON TABLE vault_files IS 'Files uploaded to Vault projects';

CREATE TABLE IF NOT EXISTS vault_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES vault_projects(id) ON DELETE CASCADE,
  query_type TEXT NOT NULL CHECK (query_type IN ('review', 'ask')),
  query_text TEXT,
  columns JSONB,
  file_ids JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  results JSONB,
  error TEXT,
  processing_time_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS vault_queries_project_id_idx ON vault_queries(project_id);
CREATE INDEX IF NOT EXISTS vault_queries_status_idx ON vault_queries(status);

COMMENT ON TABLE vault_queries IS 'Extraction queries and their results';

CREATE TABLE IF NOT EXISTS vault_clauses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  text TEXT NOT NULL,
  category TEXT,
  tags JSONB,
  description TEXT,
  source_document TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS vault_clauses_user_id_idx ON vault_clauses(user_id);
CREATE INDEX IF NOT EXISTS vault_clauses_category_idx ON vault_clauses(category);

COMMENT ON TABLE vault_clauses IS 'User-saved clauses for the Clause Library feature';

-- ============================================
-- LIBRARY MODULE - Tags & Labels
-- ============================================

CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6B7280',
  icon TEXT,
  parent_id UUID REFERENCES tags(id) ON DELETE SET NULL,
  path TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 0,
  scope TEXT NOT NULL DEFAULT 'all',
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS tags_user_id_idx ON tags(user_id);
CREATE INDEX IF NOT EXISTS tags_parent_id_idx ON tags(parent_id);
CREATE INDEX IF NOT EXISTS tags_slug_idx ON tags(user_id, slug);
CREATE INDEX IF NOT EXISTS tags_scope_idx ON tags(scope);

COMMENT ON TABLE tags IS 'Hierarchical tags for organizing library items';
COMMENT ON COLUMN tags.scope IS 'all, clauses, projects, playbooks';

CREATE TABLE IF NOT EXISTS labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6B7280',
  category TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS labels_user_id_idx ON labels(user_id);
CREATE INDEX IF NOT EXISTS labels_category_idx ON labels(category);
CREATE UNIQUE INDEX IF NOT EXISTS labels_unique_idx ON labels(user_id, category, name);

COMMENT ON TABLE labels IS 'Labels for simple classification';
COMMENT ON COLUMN labels.category IS 'risk_level, status, priority, jurisdiction, position';

-- ============================================
-- LIBRARY MODULE - Clauses
-- ============================================

CREATE TABLE IF NOT EXISTS clauses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  current_version_id UUID,
  clause_type TEXT,
  jurisdiction TEXT,
  language TEXT DEFAULT 'en',
  source_type TEXT,
  source_document_name TEXT,
  source_playbook_id UUID,
  source_rule_id TEXT,
  visibility TEXT DEFAULT 'private',
  use_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  search_vector TEXT,
  metadata JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS clauses_user_id_idx ON clauses(user_id);
CREATE INDEX IF NOT EXISTS clauses_visibility_idx ON clauses(visibility);
CREATE INDEX IF NOT EXISTS clauses_clause_type_idx ON clauses(clause_type);
CREATE INDEX IF NOT EXISTS clauses_jurisdiction_idx ON clauses(jurisdiction);
CREATE INDEX IF NOT EXISTS clauses_source_playbook_idx ON clauses(source_playbook_id);

COMMENT ON TABLE clauses IS 'Clause library entries';
COMMENT ON COLUMN clauses.clause_type IS 'standard, fallback, aggressive, neutral, alternative';
COMMENT ON COLUMN clauses.source_type IS 'manual, extracted, generated, imported';

CREATE TABLE IF NOT EXISTS clause_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clause_id UUID NOT NULL REFERENCES clauses(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  previous_version_id UUID REFERENCES clause_versions(id),
  text TEXT NOT NULL,
  summary TEXT,
  change_type TEXT,
  change_description TEXT,
  changed_by UUID REFERENCES users(id),
  diff_from_previous JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS clause_versions_clause_id_idx ON clause_versions(clause_id);
CREATE UNIQUE INDEX IF NOT EXISTS clause_versions_version_number_idx ON clause_versions(clause_id, version_number);

COMMENT ON TABLE clause_versions IS 'Clause version history';
COMMENT ON COLUMN clause_versions.change_type IS 'created, edited, restored, merged';

-- Add foreign key for current_version_id after clause_versions exists
ALTER TABLE clauses DROP CONSTRAINT IF EXISTS clauses_current_version_fk;
ALTER TABLE clauses ADD CONSTRAINT clauses_current_version_fk 
  FOREIGN KEY (current_version_id) REFERENCES clause_versions(id) ON DELETE SET NULL;

-- ============================================
-- LIBRARY MODULE - Enhanced Playbooks
-- ============================================

CREATE TABLE IF NOT EXISTS playbooks_new (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  playbook_type TEXT,
  user_position TEXT,
  jurisdiction TEXT,
  document_types JSONB,
  current_version_id UUID,
  visibility TEXT DEFAULT 'private',
  use_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  rule_count INTEGER DEFAULT 0,
  search_vector TEXT,
  metadata JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS playbooks_new_user_id_idx ON playbooks_new(user_id);
CREATE INDEX IF NOT EXISTS playbooks_new_type_idx ON playbooks_new(playbook_type);
CREATE INDEX IF NOT EXISTS playbooks_new_jurisdiction_idx ON playbooks_new(jurisdiction);
CREATE INDEX IF NOT EXISTS playbooks_new_visibility_idx ON playbooks_new(visibility);

COMMENT ON TABLE playbooks_new IS 'Enhanced playbooks with versioning';
COMMENT ON COLUMN playbooks_new.playbook_type IS 'review, draft, negotiate, compliance';
COMMENT ON COLUMN playbooks_new.user_position IS 'neutral, buyer, seller, landlord, tenant';

CREATE TABLE IF NOT EXISTS playbook_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playbook_id UUID NOT NULL REFERENCES playbooks_new(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  previous_version_id UUID REFERENCES playbook_versions(id),
  rules_snapshot JSONB NOT NULL,
  change_type TEXT,
  change_description TEXT,
  changed_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS playbook_versions_playbook_id_idx ON playbook_versions(playbook_id);
CREATE UNIQUE INDEX IF NOT EXISTS playbook_versions_version_number_idx ON playbook_versions(playbook_id, version_number);

COMMENT ON TABLE playbook_versions IS 'Playbook version history';

-- Add foreign key for current_version_id
ALTER TABLE playbooks_new DROP CONSTRAINT IF EXISTS playbooks_new_current_version_fk;
ALTER TABLE playbooks_new ADD CONSTRAINT playbooks_new_current_version_fk 
  FOREIGN KEY (current_version_id) REFERENCES playbook_versions(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS playbook_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playbook_id UUID NOT NULL REFERENCES playbooks_new(id) ON DELETE CASCADE,
  rule_number TEXT NOT NULL,
  rule_type TEXT NOT NULL,
  brief_name TEXT NOT NULL,
  instruction TEXT NOT NULL,
  example_language TEXT,
  linked_clause_id UUID REFERENCES clauses(id) ON DELETE SET NULL,
  conditions JSONB,
  source_annotation_type TEXT,
  source_annotation_key TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  search_vector TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS playbook_rules_playbook_id_idx ON playbook_rules(playbook_id);
CREATE INDEX IF NOT EXISTS playbook_rules_type_idx ON playbook_rules(rule_type);
CREATE INDEX IF NOT EXISTS playbook_rules_clause_idx ON playbook_rules(linked_clause_id);

COMMENT ON TABLE playbook_rules IS 'Individual rules within playbooks';
COMMENT ON COLUMN playbook_rules.rule_type IS 'instruction_request, amendment_always, amendment_conditional';

-- ============================================
-- LIBRARY MODULE - Projects
-- ============================================

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  project_type TEXT,
  status TEXT DEFAULT 'active',
  visibility TEXT DEFAULT 'private',
  current_version_id UUID,
  item_count INTEGER DEFAULT 0,
  search_vector TEXT,
  metadata JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS projects_user_id_idx ON projects(user_id);
CREATE INDEX IF NOT EXISTS projects_status_idx ON projects(status);
CREATE INDEX IF NOT EXISTS projects_visibility_idx ON projects(visibility);

COMMENT ON TABLE projects IS 'Project library for organizing work';
COMMENT ON COLUMN projects.project_type IS 'matter, template_set, precedent_bank, workspace';
COMMENT ON COLUMN projects.status IS 'active, archived, completed';

CREATE TABLE IF NOT EXISTS project_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  storage_path TEXT,
  mime_type TEXT,
  size_bytes INTEGER,
  extracted_text TEXT,
  parsed_structure JSONB,
  search_vector TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS project_files_project_id_idx ON project_files(project_id);

COMMENT ON TABLE project_files IS 'Files within projects';

CREATE TABLE IF NOT EXISTS project_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL,
  file_id UUID REFERENCES project_files(id) ON DELETE CASCADE,
  clause_id UUID REFERENCES clauses(id) ON DELETE SET NULL,
  playbook_id UUID REFERENCES playbooks_new(id) ON DELETE SET NULL,
  parent_item_id UUID REFERENCES project_items(id) ON DELETE CASCADE,
  name TEXT,
  sort_order INTEGER DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS project_items_project_id_idx ON project_items(project_id);
CREATE INDEX IF NOT EXISTS project_items_type_idx ON project_items(item_type);
CREATE INDEX IF NOT EXISTS project_items_parent_idx ON project_items(parent_item_id);

COMMENT ON TABLE project_items IS 'Items within projects (files, clauses, playbooks, folders)';
COMMENT ON COLUMN project_items.item_type IS 'file, clause, playbook, folder';

-- ============================================
-- LIBRARY MODULE - Junction Tables
-- ============================================

CREATE TABLE IF NOT EXISTS clause_tags (
  clause_id UUID NOT NULL REFERENCES clauses(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (clause_id, tag_id)
);

CREATE INDEX IF NOT EXISTS clause_tags_clause_id_idx ON clause_tags(clause_id);
CREATE INDEX IF NOT EXISTS clause_tags_tag_id_idx ON clause_tags(tag_id);

CREATE TABLE IF NOT EXISTS clause_labels (
  clause_id UUID NOT NULL REFERENCES clauses(id) ON DELETE CASCADE,
  label_id UUID NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
  PRIMARY KEY (clause_id, label_id)
);

CREATE INDEX IF NOT EXISTS clause_labels_clause_id_idx ON clause_labels(clause_id);
CREATE INDEX IF NOT EXISTS clause_labels_label_id_idx ON clause_labels(label_id);

CREATE TABLE IF NOT EXISTS project_tags (
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, tag_id)
);

CREATE INDEX IF NOT EXISTS project_tags_project_id_idx ON project_tags(project_id);
CREATE INDEX IF NOT EXISTS project_tags_tag_id_idx ON project_tags(tag_id);

CREATE TABLE IF NOT EXISTS project_labels (
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  label_id UUID NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, label_id)
);

CREATE INDEX IF NOT EXISTS project_labels_project_id_idx ON project_labels(project_id);
CREATE INDEX IF NOT EXISTS project_labels_label_id_idx ON project_labels(label_id);

CREATE TABLE IF NOT EXISTS playbook_tags (
  playbook_id UUID NOT NULL REFERENCES playbooks_new(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (playbook_id, tag_id)
);

CREATE INDEX IF NOT EXISTS playbook_tags_playbook_id_idx ON playbook_tags(playbook_id);
CREATE INDEX IF NOT EXISTS playbook_tags_tag_id_idx ON playbook_tags(tag_id);

CREATE TABLE IF NOT EXISTS playbook_labels (
  playbook_id UUID NOT NULL REFERENCES playbooks_new(id) ON DELETE CASCADE,
  label_id UUID NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
  PRIMARY KEY (playbook_id, label_id)
);

CREATE INDEX IF NOT EXISTS playbook_labels_playbook_id_idx ON playbook_labels(playbook_id);
CREATE INDEX IF NOT EXISTS playbook_labels_label_id_idx ON playbook_labels(label_id);

-- ============================================
-- LIBRARY MODULE - Unified Sharing
-- ============================================

CREATE TABLE IF NOT EXISTS library_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_type TEXT NOT NULL,
  resource_id UUID NOT NULL,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shared_with_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  shared_with_email TEXT,
  permission TEXT NOT NULL DEFAULT 'view',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS library_shares_resource_idx ON library_shares(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS library_shares_owner_idx ON library_shares(owner_id);
CREATE INDEX IF NOT EXISTS library_shares_shared_with_idx ON library_shares(shared_with_user_id);

COMMENT ON TABLE library_shares IS 'Unified sharing for library resources';
COMMENT ON COLUMN library_shares.resource_type IS 'clause, project, playbook';
COMMENT ON COLUMN library_shares.permission IS 'view, use, edit, remix, admin';

-- ============================================
-- CHAT MODULE
-- ============================================

CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT,
  share_token TEXT UNIQUE,
  is_public BOOLEAN DEFAULT false,
  source_config JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS chat_sessions_user_id_idx ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS chat_sessions_share_token_idx ON chat_sessions(share_token);

COMMENT ON TABLE chat_sessions IS 'Chat sessions for document Q&A';

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  citations JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS chat_messages_session_id_idx ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS chat_messages_created_at_idx ON chat_messages(created_at);

COMMENT ON TABLE chat_messages IS 'Messages within chat sessions';
COMMENT ON COLUMN chat_messages.role IS 'user or assistant';

-- ============================================
-- BATCH ANALYSIS MODULE
-- ============================================

CREATE TABLE IF NOT EXISTS batch_analysis_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES vault_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  analysis_type TEXT NOT NULL,
  file_ids JSONB NOT NULL,
  options JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  progress INTEGER DEFAULT 0,
  total_files INTEGER NOT NULL,
  results JSONB,
  error TEXT,
  job_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS batch_analysis_jobs_project_id_idx ON batch_analysis_jobs(project_id);
CREATE INDEX IF NOT EXISTS batch_analysis_jobs_user_id_idx ON batch_analysis_jobs(user_id);
CREATE INDEX IF NOT EXISTS batch_analysis_jobs_status_idx ON batch_analysis_jobs(status);
CREATE INDEX IF NOT EXISTS batch_analysis_jobs_created_at_idx ON batch_analysis_jobs(created_at);

COMMENT ON TABLE batch_analysis_jobs IS 'Batch analysis jobs for multiple documents';
COMMENT ON COLUMN batch_analysis_jobs.analysis_type IS 'contract-review, definition-check, risk-analysis, cross-document';
COMMENT ON COLUMN batch_analysis_jobs.status IS 'pending, processing, completed, failed';

CREATE TABLE IF NOT EXISTS batch_analysis_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES batch_analysis_jobs(id) ON DELETE CASCADE,
  file_id UUID NOT NULL,
  analysis_type TEXT NOT NULL,
  results JSONB NOT NULL,
  issues JSONB,
  risk_score INTEGER,
  status TEXT NOT NULL DEFAULT 'pending',
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS batch_analysis_results_job_id_idx ON batch_analysis_results(job_id);
CREATE INDEX IF NOT EXISTS batch_analysis_results_file_id_idx ON batch_analysis_results(file_id);
CREATE INDEX IF NOT EXISTS batch_analysis_results_status_idx ON batch_analysis_results(status);

COMMENT ON TABLE batch_analysis_results IS 'Per-document results from batch analysis';

-- ============================================
-- DOCUMENT VERSIONING MODULE
-- ============================================

CREATE TABLE IF NOT EXISTS versioned_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  current_main_version INTEGER DEFAULT 1,
  current_sub_version TEXT,
  latest_version_id UUID,
  latest_sub_version_id UUID,
  document_type TEXT,
  matter_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS versioned_documents_user_id_idx ON versioned_documents(user_id);
CREATE INDEX IF NOT EXISTS versioned_documents_organization_id_idx ON versioned_documents(organization_id);

COMMENT ON TABLE versioned_documents IS 'Versioned document management';

CREATE TABLE IF NOT EXISTS document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES versioned_documents(id) ON DELETE CASCADE,
  main_version INTEGER NOT NULL,
  description TEXT NOT NULL,
  editor_name TEXT NOT NULL,
  editor_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  content TEXT,
  file_blob BYTEA,
  file_size_bytes INTEGER,
  is_milestone BOOLEAN DEFAULT true,
  status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS document_versions_document_id_idx ON document_versions(document_id);
CREATE UNIQUE INDEX IF NOT EXISTS document_versions_main_version_idx ON document_versions(document_id, main_version);
CREATE INDEX IF NOT EXISTS document_versions_editor_user_id_idx ON document_versions(editor_user_id);

COMMENT ON TABLE document_versions IS 'Main document versions (v1, v2, v3...)';
COMMENT ON COLUMN document_versions.status IS 'draft, circulated, executed, archived';

CREATE TABLE IF NOT EXISTS document_sub_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_version_id UUID NOT NULL REFERENCES document_versions(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES versioned_documents(id) ON DELETE CASCADE,
  sub_version_letter TEXT NOT NULL,
  description TEXT NOT NULL,
  editor_name TEXT NOT NULL,
  editor_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  content TEXT,
  file_blob BYTEA,
  file_size_bytes INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS document_sub_versions_parent_version_id_idx ON document_sub_versions(parent_version_id);
CREATE INDEX IF NOT EXISTS document_sub_versions_document_id_idx ON document_sub_versions(document_id);
CREATE UNIQUE INDEX IF NOT EXISTS document_sub_versions_sub_version_idx ON document_sub_versions(parent_version_id, sub_version_letter);
CREATE INDEX IF NOT EXISTS document_sub_versions_editor_user_id_idx ON document_sub_versions(editor_user_id);

COMMENT ON TABLE document_sub_versions IS 'Sub-versions (v1.A, v1.B, v1.C...)';

-- Add foreign keys for version references
ALTER TABLE versioned_documents DROP CONSTRAINT IF EXISTS versioned_documents_latest_version_fk;
ALTER TABLE versioned_documents ADD CONSTRAINT versioned_documents_latest_version_fk 
  FOREIGN KEY (latest_version_id) REFERENCES document_versions(id) ON DELETE SET NULL;
ALTER TABLE versioned_documents DROP CONSTRAINT IF EXISTS versioned_documents_latest_sub_version_fk;
ALTER TABLE versioned_documents ADD CONSTRAINT versioned_documents_latest_sub_version_fk 
  FOREIGN KEY (latest_sub_version_id) REFERENCES document_sub_versions(id) ON DELETE SET NULL;

-- ============================================
-- API KEYS & LLM REQUESTS
-- ============================================

CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key TEXT NOT NULL UNIQUE,
  permissions JSONB NOT NULL DEFAULT '[]',
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS api_keys_user_id_idx ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS api_keys_key_idx ON api_keys(key);

COMMENT ON TABLE api_keys IS 'User API keys for programmatic access';

CREATE TABLE IF NOT EXISTS llm_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  request_type TEXT NOT NULL DEFAULT 'generate',
  status TEXT NOT NULL,
  messages JSONB NOT NULL,
  temperature TEXT,
  max_tokens TEXT,
  response_content TEXT,
  prompt_tokens TEXT,
  completion_tokens TEXT,
  total_tokens TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration_ms TEXT,
  attempt_number TEXT NOT NULL DEFAULT '1',
  total_attempts TEXT NOT NULL DEFAULT '1',
  fallback_used BOOLEAN NOT NULL DEFAULT false,
  fallback_provider TEXT,
  fallback_model TEXT,
  circuit_breaker_state TEXT,
  error_message TEXT,
  error_code TEXT,
  status_code TEXT,
  is_retryable BOOLEAN,
  estimated_cost TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS llm_requests_user_id_idx ON llm_requests(user_id);
CREATE INDEX IF NOT EXISTS llm_requests_provider_idx ON llm_requests(provider);
CREATE INDEX IF NOT EXISTS llm_requests_status_idx ON llm_requests(status);
CREATE INDEX IF NOT EXISTS llm_requests_start_time_idx ON llm_requests(start_time);
CREATE INDEX IF NOT EXISTS llm_requests_created_at_idx ON llm_requests(created_at);

COMMENT ON TABLE llm_requests IS 'LLM request logging for analytics and debugging';

-- ============================================
-- SUBSCRIPTIONS
-- ============================================

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_type TEXT NOT NULL,
  status TEXT NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  trial_end_date TIMESTAMPTZ,
  auto_renew BOOLEAN NOT NULL DEFAULT true,
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT,
  payment_provider TEXT,
  payment_id TEXT,
  payment_status TEXT,
  amount TEXT,
  currency TEXT NOT NULL DEFAULT 'USD',
  billing_period TEXT NOT NULL DEFAULT 'monthly',
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS subscriptions_user_id_idx ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS subscriptions_status_idx ON subscriptions(status);
CREATE INDEX IF NOT EXISTS subscriptions_subscription_type_idx ON subscriptions(subscription_type);
CREATE INDEX IF NOT EXISTS subscriptions_end_date_idx ON subscriptions(end_date);
CREATE INDEX IF NOT EXISTS subscriptions_payment_id_idx ON subscriptions(payment_id);

COMMENT ON TABLE subscriptions IS 'User subscription management';
COMMENT ON COLUMN subscriptions.subscription_type IS 'free, basic, professional, enterprise';
COMMENT ON COLUMN subscriptions.status IS 'active, cancelled, expired, pending, trialing';
COMMENT ON COLUMN subscriptions.billing_period IS 'monthly, yearly, quarterly';

-- ============================================
-- REVIEW SESSIONS
-- ============================================

CREATE TABLE IF NOT EXISTS review_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_name TEXT NOT NULL,
  playbook_id UUID REFERENCES playbooks(id) ON DELETE SET NULL,
  playbook_name TEXT,
  status TEXT NOT NULL DEFAULT 'completed',
  results_count INTEGER NOT NULL DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS review_sessions_user_id_idx ON review_sessions(user_id);
CREATE INDEX IF NOT EXISTS review_sessions_created_at_idx ON review_sessions(created_at);
CREATE INDEX IF NOT EXISTS review_sessions_playbook_id_idx ON review_sessions(playbook_id);

COMMENT ON TABLE review_sessions IS 'Document review session history';
COMMENT ON COLUMN review_sessions.status IS 'completed, in_progress, failed';

-- ============================================
-- NOTIFICATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_is_read_idx ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON notifications(created_at);

COMMENT ON TABLE notifications IS 'User notifications';
COMMENT ON COLUMN notifications.type IS 'welcome, subscription, team_invite, share, job_complete, job_failed';

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables with updated_at column
-- Drop existing triggers first to make migration idempotent
DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_teams_updated_at ON teams;
DROP TRIGGER IF EXISTS update_organization_integrations_updated_at ON organization_integrations;
DROP TRIGGER IF EXISTS update_playbooks_updated_at ON playbooks;
DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
DROP TRIGGER IF EXISTS update_paragraphs_updated_at ON paragraphs;
DROP TRIGGER IF EXISTS update_comments_updated_at ON comments;
DROP TRIGGER IF EXISTS update_highlights_updated_at ON highlights;
DROP TRIGGER IF EXISTS update_tracked_changes_updated_at ON tracked_changes;
DROP TRIGGER IF EXISTS update_vault_projects_updated_at ON vault_projects;
DROP TRIGGER IF EXISTS update_vault_clauses_updated_at ON vault_clauses;
DROP TRIGGER IF EXISTS update_tags_updated_at ON tags;
DROP TRIGGER IF EXISTS update_clauses_updated_at ON clauses;
DROP TRIGGER IF EXISTS update_playbooks_new_updated_at ON playbooks_new;
DROP TRIGGER IF EXISTS update_playbook_rules_updated_at ON playbook_rules;
DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
DROP TRIGGER IF EXISTS update_chat_sessions_updated_at ON chat_sessions;
DROP TRIGGER IF EXISTS update_versioned_documents_updated_at ON versioned_documents;
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_organization_integrations_updated_at BEFORE UPDATE ON organization_integrations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_playbooks_updated_at BEFORE UPDATE ON playbooks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_paragraphs_updated_at BEFORE UPDATE ON paragraphs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_highlights_updated_at BEFORE UPDATE ON highlights FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tracked_changes_updated_at BEFORE UPDATE ON tracked_changes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vault_projects_updated_at BEFORE UPDATE ON vault_projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vault_clauses_updated_at BEFORE UPDATE ON vault_clauses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tags_updated_at BEFORE UPDATE ON tags FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clauses_updated_at BEFORE UPDATE ON clauses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_playbooks_new_updated_at BEFORE UPDATE ON playbooks_new FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_playbook_rules_updated_at BEFORE UPDATE ON playbook_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_chat_sessions_updated_at BEFORE UPDATE ON chat_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_versioned_documents_updated_at BEFORE UPDATE ON versioned_documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SEED DATA: Default Roles
-- ============================================

INSERT INTO roles (name, description, permissions, is_system) VALUES
(
    'admin',
    'Administrator with full access to manage users, roles, subscriptions, and all features',
    '[
        "users:read",
        "users:write",
        "users:delete",
        "roles:read",
        "roles:write",
        "subscriptions:read",
        "subscriptions:write",
        "subscriptions:delete",
        "vault:read",
        "vault:write",
        "vault:delete",
        "library:read",
        "library:write",
        "library:delete",
        "workflows:read",
        "workflows:write",
        "workflows:delete",
        "teams:read",
        "teams:write",
        "teams:delete"
    ]'::jsonb,
    true
)
ON CONFLICT (name) DO NOTHING;

INSERT INTO roles (name, description, permissions, is_system) VALUES
(
    'user',
    'Standard user with access to all product features and ability to share resources',
    '[
        "vault:read",
        "vault:write",
        "library:read",
        "library:write",
        "workflows:read",
        "workflows:write",
        "teams:read"
    ]'::jsonb,
    true
)
ON CONFLICT (name) DO NOTHING;

INSERT INTO roles (name, description, permissions, is_system) VALUES
(
    'viewer',
    'Viewer with read-only access to shared resources',
    '[
        "vault:read",
        "library:read",
        "workflows:read",
        "teams:read"
    ]'::jsonb,
    true
)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE playbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE playbook_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_clauses ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE clauses ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Note: RLS policies should be customized based on your authentication setup
-- Below are example policies that can be adjusted for Supabase Auth integration
-- Drop existing policies first to make migration idempotent

-- Users policies
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
CREATE POLICY "Users can view own data" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (id = auth.uid());

-- Playbooks policies
DROP POLICY IF EXISTS "Users can view own playbooks" ON playbooks;
DROP POLICY IF EXISTS "Users can insert own playbooks" ON playbooks;
DROP POLICY IF EXISTS "Users can update own playbooks" ON playbooks;
DROP POLICY IF EXISTS "Users can delete own playbooks" ON playbooks;
CREATE POLICY "Users can view own playbooks" ON playbooks FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own playbooks" ON playbooks FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own playbooks" ON playbooks FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own playbooks" ON playbooks FOR DELETE USING (user_id = auth.uid());

-- Documents policies
DROP POLICY IF EXISTS "Users can view own documents" ON documents;
DROP POLICY IF EXISTS "Users can insert own documents" ON documents;
DROP POLICY IF EXISTS "Users can update own documents" ON documents;
DROP POLICY IF EXISTS "Users can delete own documents" ON documents;
CREATE POLICY "Users can view own documents" ON documents FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own documents" ON documents FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own documents" ON documents FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own documents" ON documents FOR DELETE USING (user_id = auth.uid());

-- Chat sessions policies
DROP POLICY IF EXISTS "Users can view own chat sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Users can insert own chat sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Users can update own chat sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Users can delete own chat sessions" ON chat_sessions;
CREATE POLICY "Users can view own chat sessions" ON chat_sessions FOR SELECT USING (user_id = auth.uid() OR is_public = true);
CREATE POLICY "Users can insert own chat sessions" ON chat_sessions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own chat sessions" ON chat_sessions FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own chat sessions" ON chat_sessions FOR DELETE USING (user_id = auth.uid());

-- Clauses policies
DROP POLICY IF EXISTS "Users can view own clauses" ON clauses;
DROP POLICY IF EXISTS "Users can insert own clauses" ON clauses;
DROP POLICY IF EXISTS "Users can update own clauses" ON clauses;
DROP POLICY IF EXISTS "Users can delete own clauses" ON clauses;
CREATE POLICY "Users can view own clauses" ON clauses FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own clauses" ON clauses FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own clauses" ON clauses FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own clauses" ON clauses FOR DELETE USING (user_id = auth.uid());

-- Projects policies
DROP POLICY IF EXISTS "Users can view own projects" ON projects;
DROP POLICY IF EXISTS "Users can insert own projects" ON projects;
DROP POLICY IF EXISTS "Users can update own projects" ON projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON projects;
CREATE POLICY "Users can view own projects" ON projects FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own projects" ON projects FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own projects" ON projects FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own projects" ON projects FOR DELETE USING (user_id = auth.uid());

-- Tags policies
DROP POLICY IF EXISTS "Users can view own tags" ON tags;
DROP POLICY IF EXISTS "Users can insert own tags" ON tags;
DROP POLICY IF EXISTS "Users can update own tags" ON tags;
DROP POLICY IF EXISTS "Users can delete own tags" ON tags;
CREATE POLICY "Users can view own tags" ON tags FOR SELECT USING (user_id = auth.uid() OR is_system = true);
CREATE POLICY "Users can insert own tags" ON tags FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own tags" ON tags FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own tags" ON tags FOR DELETE USING (user_id = auth.uid());

-- Labels policies
DROP POLICY IF EXISTS "Users can view own labels" ON labels;
DROP POLICY IF EXISTS "Users can insert own labels" ON labels;
DROP POLICY IF EXISTS "Users can update own labels" ON labels;
DROP POLICY IF EXISTS "Users can delete own labels" ON labels;
CREATE POLICY "Users can view own labels" ON labels FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own labels" ON labels FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own labels" ON labels FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own labels" ON labels FOR DELETE USING (user_id = auth.uid());

-- Subscriptions policies
DROP POLICY IF EXISTS "Users can view own subscriptions" ON subscriptions;
CREATE POLICY "Users can view own subscriptions" ON subscriptions FOR SELECT USING (user_id = auth.uid());

-- Notifications policies
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (user_id = auth.uid());

-- API Keys policies
DROP POLICY IF EXISTS "Users can view own API keys" ON api_keys;
DROP POLICY IF EXISTS "Users can insert own API keys" ON api_keys;
DROP POLICY IF EXISTS "Users can update own API keys" ON api_keys;
DROP POLICY IF EXISTS "Users can delete own API keys" ON api_keys;
CREATE POLICY "Users can view own API keys" ON api_keys FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own API keys" ON api_keys FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own API keys" ON api_keys FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own API keys" ON api_keys FOR DELETE USING (user_id = auth.uid());

-- ============================================
-- STORAGE BUCKETS (for Supabase Storage)
-- ============================================

-- These should be created via Supabase Dashboard or API
-- INSERT INTO storage.buckets (id, name, public) VALUES ('vault-files', 'vault-files', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('project-files', 'project-files', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('document-versions', 'document-versions', false);

-- ============================================
-- COMPLETION
-- ============================================

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'ThinkDoc schema migration completed successfully!';
  RAISE NOTICE 'Tables created: 45+';
  RAISE NOTICE 'Indexes created: 100+';
  RAISE NOTICE 'Triggers created: 20+';
  RAISE NOTICE 'RLS policies created: 30+';
  RAISE NOTICE 'Seed data: 3 default roles (admin, user, viewer)';
END $$;
