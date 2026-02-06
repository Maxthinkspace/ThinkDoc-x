-- ============================================
-- VAULT MODULE DATABASE MIGRATION
-- Run this migration to create the Vault tables
-- ============================================

-- Create vault_projects table
CREATE TABLE IF NOT EXISTS vault_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    file_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS vault_projects_user_id_idx ON vault_projects(user_id);

-- Create vault_files table
CREATE TABLE IF NOT EXISTS vault_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES vault_projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    storage_path TEXT,
    category TEXT,
    size_bytes INTEGER,
    mime_type TEXT,
    extracted_text TEXT,
    parsed_structure JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on project_id for faster lookups
CREATE INDEX IF NOT EXISTS vault_files_project_id_idx ON vault_files(project_id);

-- Create vault_queries table
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

-- Create indexes for vault_queries
CREATE INDEX IF NOT EXISTS vault_queries_project_id_idx ON vault_queries(project_id);
CREATE INDEX IF NOT EXISTS vault_queries_status_idx ON vault_queries(status);

-- ============================================
-- TRIGGER: Auto-update updated_at on projects
-- ============================================

CREATE OR REPLACE FUNCTION update_vault_projects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS vault_projects_updated_at_trigger ON vault_projects;
CREATE TRIGGER vault_projects_updated_at_trigger
    BEFORE UPDATE ON vault_projects
    FOR EACH ROW
    EXECUTE FUNCTION update_vault_projects_updated_at();

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE vault_projects IS 'Vault projects - containers for document collections';
COMMENT ON TABLE vault_files IS 'Files uploaded to Vault projects';
COMMENT ON TABLE vault_queries IS 'Extraction queries and their results';

COMMENT ON COLUMN vault_files.extracted_text IS 'Full text extracted from the document for analysis';
COMMENT ON COLUMN vault_files.parsed_structure IS 'Structured representation of document (sections, headings, etc.)';
COMMENT ON COLUMN vault_queries.columns IS 'Column configuration for extraction (ColumnConfig[])';
COMMENT ON COLUMN vault_queries.file_ids IS 'Array of file IDs included in this query';
COMMENT ON COLUMN vault_queries.results IS 'Extraction results (ExtractionResult[] or ask query response)';

-- ============================================
-- VAULT CLAUSES (Clause Library)
-- ============================================

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
