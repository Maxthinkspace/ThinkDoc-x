-- ============================================
-- ORGANIZATION INTEGRATIONS MIGRATION
-- Adds table for managing organization-level integrations (iManage, SharePoint, Google Drive)
-- ============================================

CREATE TABLE IF NOT EXISTS organization_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  integration_type TEXT NOT NULL,
  enabled BOOLEAN DEFAULT false NOT NULL,
  config JSONB DEFAULT '{}' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  CONSTRAINT organization_integrations_unique UNIQUE(organization_id, integration_type)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS organization_integrations_org_id_idx ON organization_integrations(organization_id);
CREATE INDEX IF NOT EXISTS organization_integrations_type_idx ON organization_integrations(integration_type);

-- Add comments
COMMENT ON TABLE organization_integrations IS 'Stores organization-level integration settings (iManage, SharePoint, Google Drive)';
COMMENT ON COLUMN organization_integrations.integration_type IS 'Type of integration: imanage, imanage-onprem, sharepoint, googledrive';
COMMENT ON COLUMN organization_integrations.enabled IS 'Whether the integration is enabled for the organization';
COMMENT ON COLUMN organization_integrations.config IS 'JSONB configuration (subdomain, customerId, resourceUrl, etc.)';

