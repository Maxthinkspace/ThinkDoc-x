# Vault Module Implementation

This directory contains the production-ready implementation for the Vault feature - a contract database with AI-powered extraction.

## Architecture Overview

```
vault-implementation/
├── packages/
│   ├── shared/                    # Shared types (frontend + backend)
│   │   └── src/
│   │       ├── types/vault.ts     # Type definitions
│   │       └── index.ts           # Package exports
│   │
│   ├── backend/
│   │   ├── migrations/
│   │   │   └── 001_create_vault_tables.sql
│   │   └── src/
│   │       ├── db/schema/vault.ts      # Drizzle schema
│   │       ├── schemas/vault.ts        # Zod validation
│   │       ├── routes/vault.ts         # API routes
│   │       ├── controllers/vault.ts    # Request handlers
│   │       └── services/vault/
│   │           ├── index.ts            # LLM services
│   │           └── documentParser.ts   # Document parsing
│   │
│   └── web-app/
│       └── src/
│           ├── services/vaultApi.ts           # API client
│           ├── hooks/useVault.ts              # React Query hooks
│           └── components/vault/
│               └── ColumnBuilderDialog.tsx    # Refactored component
```

## Integration Steps

### 1. Install Dependencies

**Backend:**
```bash
cd packages/backend
pnpm add pdf-parse mammoth word-extractor
pnpm add -D @types/pdf-parse
```

**Web App:**
```bash
cd packages/web-app
pnpm add @tanstack/react-query
```

### 2. Run Database Migration

```bash
# Using psql
psql -d your_database -f packages/backend/migrations/001_create_vault_tables.sql

# Or using Drizzle
pnpm drizzle-kit push
```

### 3. Register Routes

In your main backend app file (e.g., `src/index.ts`):

```typescript
import { vaultRoutes } from '@/routes/vault';

// Add to your Hono app
app.route('/vault', vaultRoutes);
```

### 4. Update Schema Index

In `packages/backend/src/db/schema/index.ts`:

```typescript
export * from './vault';
```

### 5. Copy Shared Types

Copy the `packages/shared` folder to your monorepo, or configure your workspace to use it:

```json
// Root package.json
{
  "workspaces": [
    "packages/*"
  ]
}
```

### 6. Setup React Query Provider

In your web app's root:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* Your app */}
    </QueryClientProvider>
  );
}
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/vault/projects` | List user's projects |
| POST | `/vault/projects` | Create a project |
| GET | `/vault/projects/:id` | Get project details |
| PATCH | `/vault/projects/:id` | Update project |
| DELETE | `/vault/projects/:id` | Delete project |
| GET | `/vault/projects/:id/files` | List project files |
| POST | `/vault/projects/:id/files` | Upload files |
| DELETE | `/vault/files/:id` | Delete file |
| GET | `/vault/files/:id/download` | Download file |
| POST | `/vault/columns/generate` | AI: Generate columns |
| POST | `/vault/extract` | AI: Run extraction |
| POST | `/vault/ask` | AI: Ask query |
| GET | `/vault/projects/:id/queries` | List queries |
| GET | `/vault/queries/:id` | Get query results |
| GET | `/vault/jobs/:id` | Get job status |

## Key Differences from Lovable Code

| Aspect | Lovable | Production |
|--------|---------|------------|
| Database | Supabase direct | Drizzle + Hono API |
| Auth | Supabase Auth | Your existing auth |
| File Storage | Supabase Storage | Your storage service |
| LLM Calls | Mock setTimeout | AI SDK (Anthropic) |
| State | useState | React Query |
| Types | Inline | Shared package |

## Usage Example

```tsx
import { useProjects, useFiles, useRunExtraction, useJobPolling } from '@/hooks/useVault';

function VaultDashboard() {
  const { data: projects, isLoading } = useProjects();
  const runExtraction = useRunExtraction();
  const { pollJob, isPolling, currentJob } = useJobPolling();

  const handleExtract = async (projectId: string, fileIds: string[], columns: ColumnConfig[]) => {
    const { jobId } = await runExtraction.mutateAsync({
      projectId,
      fileIds,
      columns,
    });

    // Poll for completion
    const result = await pollJob(jobId, projectId, (status) => {
      console.log('Progress:', status.progress);
    });

    console.log('Results:', result);
  };

  // ... render
}
```

## Environment Variables

Ensure these are set:

```env
# Backend
DATABASE_URL=postgresql://...
ANTHROPIC_API_KEY=sk-ant-...

# Frontend
VITE_API_URL=http://localhost:3000/api
```

## Next Steps

1. Copy these files to your monorepo
2. Adjust import paths to match your structure
3. Implement storage service (`uploadFileToStorage`, etc.)
4. Test with sample documents
5. Migrate remaining Lovable components (FileSourceDialog, QueryTypeDialog)
