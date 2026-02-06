-- ============================================
-- VAULT UI ENHANCEMENTS MIGRATION
-- Adds visibility, documentType, clientMatter, and verification/assignment fields
-- ============================================

-- Add visibility and clientMatter to vault_projects
ALTER TABLE vault_projects 
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'shared')),
  ADD COLUMN IF NOT EXISTS client_matter TEXT;

-- Create index on visibility for filtering
CREATE INDEX IF NOT EXISTS vault_projects_visibility_idx ON vault_projects(visibility);

-- Add documentType to vault_files
ALTER TABLE vault_files 
  ADD COLUMN IF NOT EXISTS document_type TEXT;

-- Create index on document_type for filtering
CREATE INDEX IF NOT EXISTS vault_files_document_type_idx ON vault_files(document_type);

-- Note: Verification and assignment fields are stored in the JSONB results column
-- No schema changes needed as they're part of the ExtractionResultDB interface
-- The application layer will handle reading/writing these fields

COMMENT ON COLUMN vault_projects.visibility IS 'Project visibility: private (owner only) or shared (organization)';
COMMENT ON COLUMN vault_projects.client_matter IS 'Optional client matter identifier (e.g., CM#12345)';
COMMENT ON COLUMN vault_files.document_type IS 'Type of document (e.g., Commercial Contract, License Agreement, Supply Agreement)';


