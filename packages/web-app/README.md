# Web App Integration Guide

This guide explains how to integrate the Lovable web app with your existing backend.

## Overview

The Lovable project (`thinkspace-legalfy-main`) becomes `packages/web-app` in your monorepo. We replace Supabase direct calls with your Hono backend API.

## Step-by-Step Integration

### Step 1: Copy Lovable Project to Monorepo

```cmd
:: Copy the entire Lovable project
xcopy /E /I C:\Projects\thinkspace-legalfy-main C:\Projects\monorepo-main\packages\web-app

:: Remove Supabase integration folder (no longer needed)
rmdir /S /Q C:\Projects\monorepo-main\packages\web-app\src\integrations
```

### Step 2: Replace These Files

Copy these files from this integration package to your web-app:

| Source | Destination | Purpose |
|--------|-------------|---------|
| `src/services/vaultApi.ts` | `packages/web-app/src/services/vaultApi.ts` | API client (replaces Supabase) |
| `src/pages/dashboard/VaultApp.tsx` | `packages/web-app/src/pages/dashboard/VaultApp.tsx` | Updated Vault page |
| `src/components/vault/ColumnBuilderDialog.tsx` | `packages/web-app/src/components/vault/ColumnBuilderDialog.tsx` | Updated dialog |
| `src/contexts/AuthContext.tsx` | `packages/web-app/src/contexts/AuthContext.tsx` | Auth context (replaces Supabase auth) |
| `.env.example` | `packages/web-app/.env.example` | Environment template |

### Step 3: Update package.json

In `packages/web-app/package.json`:

```json
{
  "name": "@monorepo/web-app",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

Remove Supabase dependency:
```bash
cd packages/web-app
pnpm remove @supabase/supabase-js
```

### Step 4: Create Environment File

```bash
cd packages/web-app
copy .env.example .env
```

Edit `.env`:
```
VITE_API_URL=http://localhost:3000/api
```

### Step 5: Register Backend Routes

In your backend's main file (e.g., `packages/backend/src/index.ts`):

```typescript
import { vaultRoutes } from './routes/vault';

// Add vault routes
app.route('/vault', vaultRoutes);
```

### Step 6: Run Database Migration

```bash
cd packages/backend
psql -d your_database -f migrations/001_create_vault_tables.sql
```

Or if using Drizzle:
```bash
pnpm drizzle-kit push
```

### Step 7: Test the Integration

1. Start backend:
```bash
cd packages/backend
pnpm dev
```

2. Start web app:
```bash
cd packages/web-app
pnpm dev
```

3. Navigate to `http://localhost:5173/dashboard/vault`

---

## Files Changed Summary

### Removed (Supabase-specific)
- `src/integrations/supabase/` - entire folder

### Replaced
- `src/contexts/AuthContext.tsx` - now uses your backend auth
- `src/pages/dashboard/VaultApp.tsx` - now uses API client
- `src/components/vault/ColumnBuilderDialog.tsx` - now uses API for column generation

### Added
- `src/services/vaultApi.ts` - new API client

---

## API Endpoints Used

The web app expects these endpoints from your backend:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/vault/projects` | List projects |
| POST | `/api/vault/projects` | Create project |
| GET | `/api/vault/projects/:id` | Get project |
| PATCH | `/api/vault/projects/:id` | Update project |
| DELETE | `/api/vault/projects/:id` | Delete project |
| GET | `/api/vault/projects/:id/files` | List files |
| POST | `/api/vault/projects/:id/files` | Upload files (multipart) |
| DELETE | `/api/vault/files/:id` | Delete file |
| GET | `/api/vault/files/:id/download` | Download file |
| POST | `/api/vault/columns/generate` | Generate columns (AI) |
| POST | `/api/vault/extract` | Run extraction (AI) |
| POST | `/api/vault/ask` | Ask query (AI) |
| GET | `/api/vault/jobs/:id` | Get job status |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout |

---

## Troubleshooting

### CORS Errors
Add CORS middleware to your backend:
```typescript
import { cors } from 'hono/cors';

app.use(cors({
  origin: ['http://localhost:5173'],
  credentials: true,
}));
```

### Auth Not Working
Ensure cookies are being sent:
- Backend must set `credentials: true` in CORS
- Frontend fetches must include `credentials: 'include'`

### File Upload Fails
Ensure your backend handles multipart form data:
```typescript
const formData = await c.req.formData();
```

---

## Next Steps

1. ✅ Copy files as described above
2. ✅ Run backend migration
3. ✅ Test locally
4. 🔲 Add remaining Lovable pages (if needed)
5. 🔲 Deploy to production
