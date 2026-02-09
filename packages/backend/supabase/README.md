# ThinkDoc Supabase Database Setup

This directory contains the database schema and migrations for ThinkDoc using Supabase.

## Supabase Project

- **Project Reference:** `poicimlmzscbhrreycce`
- **Dashboard URL:** https://supabase.com/dashboard/project/poicimlmzscbhrreycce

## Quick Setup

### Option 1: Using Supabase Dashboard SQL Editor

1. Go to your Supabase Dashboard → SQL Editor
2. Click "New query"
3. Copy and paste the contents of `migrations/001_thinkdoc_complete_schema.sql`
4. Click "Run" to execute the migration

### Option 2: Using Supabase CLI

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Link to your project
supabase link --project-ref poicimlmzscbhrreycce

# Run the migration
supabase db push
```

## Database Schema Overview

### Core Tables

| Table | Description |
|-------|-------------|
| `users` | User accounts |
| `sessions` | Authentication sessions |
| `organizations` | Company/organization accounts |
| `teams` | Teams within organizations |
| `team_members` | Team membership |
| `team_shares` | Resource sharing within teams |
| `roles` | System and custom roles |
| `user_roles` | User-role assignments |

### Document Management

| Table | Description |
|-------|-------------|
| `documents` | Document records |
| `paragraphs` | Document paragraphs with Word formatting |
| `comments` | Document comments |
| `highlights` | Document highlights |
| `tracked_changes` | Track changes history |
| `versioned_documents` | Document versioning (v1, v2...) |
| `document_versions` | Main version snapshots |
| `document_sub_versions` | Sub-versions (v1.A, v1.B...) |

### Vault Module

| Table | Description |
|-------|-------------|
| `vault_projects` | Vault project containers |
| `vault_files` | Files in vault projects |
| `vault_queries` | Extraction queries and results |
| `vault_clauses` | Saved clauses from vault |

### Library Module

| Table | Description |
|-------|-------------|
| `clauses` | Clause library entries |
| `clause_versions` | Clause version history |
| `tags` | Hierarchical tags |
| `labels` | Simple classification labels |
| `projects` | Project containers |
| `project_files` | Files within projects |
| `project_items` | Items in projects |

### Playbooks

| Table | Description |
|-------|-------------|
| `playbooks` | Original playbooks (current) |
| `playbook_shares` | Playbook sharing |
| `playbooks_new` | Enhanced playbooks with versioning |
| `playbook_versions` | Playbook version history |
| `playbook_rules` | Individual rules in playbooks |

### Chat & Analysis

| Table | Description |
|-------|-------------|
| `chat_sessions` | Chat sessions for Q&A |
| `chat_messages` | Messages in chat sessions |
| `batch_analysis_jobs` | Batch analysis jobs |
| `batch_analysis_results` | Per-document analysis results |

### Other

| Table | Description |
|-------|-------------|
| `subscriptions` | User subscriptions |
| `notifications` | User notifications |
| `api_keys` | API keys for programmatic access |
| `llm_requests` | LLM request logging |
| `review_sessions` | Review session history |
| `password_reset_tokens` | Password reset tokens |

## Row Level Security (RLS)

RLS is enabled on all user-facing tables. The default policies use `auth.uid()` for Supabase Auth integration.

### Customizing RLS

If you're using a custom authentication system instead of Supabase Auth, you'll need to modify the RLS policies. The policies are at the end of the migration file.

Example custom policy:
```sql
-- Drop existing policy
DROP POLICY IF EXISTS "Users can view own playbooks" ON playbooks;

-- Create custom policy
CREATE POLICY "Users can view own playbooks" ON playbooks 
  FOR SELECT 
  USING (user_id = current_setting('app.current_user_id')::uuid);
```

## Storage Buckets

Create these storage buckets in Supabase Dashboard → Storage:

1. **vault-files** - For vault uploaded files
2. **project-files** - For project files
3. **document-versions** - For versioned document snapshots

## Environment Variables

Add these to your `.env` file:

```env
SUPABASE_URL=https://poicimlmzscbhrreycce.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
DATABASE_URL=postgresql://postgres:[password]@db.poicimlmzscbhrreycce.supabase.co:5432/postgres
```

## Default Roles

The migration creates three default system roles:

| Role | Description |
|------|-------------|
| `admin` | Full access to all features |
| `user` | Standard access to product features |
| `viewer` | Read-only access to shared resources |

## Maintenance

### Adding New Migrations

Create new migration files with incremental numbering:
- `002_add_feature_x.sql`
- `003_add_feature_y.sql`

### Backup

Use Supabase Dashboard → Settings → Database → Backups for regular backups.

## Troubleshooting

### Migration Errors

If you encounter errors during migration:

1. Check for existing tables: Some tables may already exist
2. Run individual CREATE statements to identify the issue
3. Use `CREATE TABLE IF NOT EXISTS` to skip existing tables

### RLS Issues

If you can't access data:

1. Verify the user is authenticated
2. Check RLS policies match your auth setup
3. Use `service_role` key for admin operations (bypasses RLS)

### Performance

For large datasets:

1. Ensure proper indexes are in place
2. Use connection pooling (Supabase provides this)
3. Consider partitioning for very large tables
