-- ============================================
-- RBAC MODULE DATABASE MIGRATION
-- Run this migration to create the Roles and User Roles tables
-- ============================================

-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    permissions JSONB NOT NULL DEFAULT '[]',
    is_system BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on role name for faster lookups
CREATE INDEX IF NOT EXISTS roles_name_idx ON roles(name);

-- Create user_roles table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS user_roles (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, role_id, organization_id)
);

-- Create indexes for user_roles
CREATE INDEX IF NOT EXISTS user_roles_user_id_idx ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS user_roles_role_id_idx ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS user_roles_organization_id_idx ON user_roles(organization_id);
CREATE UNIQUE INDEX IF NOT EXISTS user_roles_unique_idx ON user_roles(user_id, role_id, organization_id);

-- ============================================
-- SEED DATA: Predefined Roles
-- ============================================

-- Admin role: Full access to all features
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

-- User role: Standard access to use all product features
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

-- Viewer role: Read-only access to shared resources
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
-- COMMENTS
-- ============================================

COMMENT ON TABLE roles IS 'System and custom roles with associated permissions';
COMMENT ON TABLE user_roles IS 'Many-to-many relationship between users and roles, scoped to organizations';
COMMENT ON COLUMN roles.permissions IS 'JSON array of permission strings (e.g., ["vault:read", "users:write"])';
COMMENT ON COLUMN roles.is_system IS 'True for predefined system roles that cannot be deleted';
COMMENT ON COLUMN user_roles.organization_id IS 'Optional organization scope - NULL means global role assignment';
COMMENT ON COLUMN user_roles.assigned_by IS 'User who assigned this role (for audit trail)';


