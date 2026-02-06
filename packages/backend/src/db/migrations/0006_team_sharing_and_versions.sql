-- Migration: Team Sharing, Organizations, Chat Sessions, and Document Version Control
-- Created: 2025-01-XX

--> statement-breakpoint
-- Add organization_id to users table
ALTER TABLE "users" ADD COLUMN "organization_id" uuid;
CREATE INDEX "users_organization_id_idx" ON "users"("organization_id");

--> statement-breakpoint
-- Organizations table
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"domain" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_domain_unique" UNIQUE("domain")
);
CREATE INDEX "organizations_domain_idx" ON "organizations"("domain");

--> statement-breakpoint
-- Add foreign key for users.organization_id
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;

--> statement-breakpoint
-- Teams table
CREATE TABLE "teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"owner_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX "teams_organization_id_idx" ON "teams"("organization_id");
CREATE INDEX "teams_owner_id_idx" ON "teams"("owner_id");
ALTER TABLE "teams" ADD CONSTRAINT "teams_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "teams" ADD CONSTRAINT "teams_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;

--> statement-breakpoint
-- Team members table
CREATE TABLE "team_members" (
	"team_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"invited_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX "team_members_team_id_idx" ON "team_members"("team_id");
CREATE INDEX "team_members_user_id_idx" ON "team_members"("user_id");
CREATE UNIQUE INDEX "team_members_unique_idx" ON "team_members"("team_id","user_id");
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;

--> statement-breakpoint
-- Team shares table
CREATE TABLE "team_shares" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" uuid NOT NULL,
	"permission" text DEFAULT 'view' NOT NULL,
	"shared_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX "team_shares_team_id_idx" ON "team_shares"("team_id");
CREATE INDEX "team_shares_resource_idx" ON "team_shares"("resource_type","resource_id");
CREATE INDEX "team_shares_shared_by_idx" ON "team_shares"("shared_by_user_id");
ALTER TABLE "team_shares" ADD CONSTRAINT "team_shares_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "team_shares" ADD CONSTRAINT "team_shares_shared_by_user_id_users_id_fk" FOREIGN KEY ("shared_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;

--> statement-breakpoint
-- Organization playbooks table
CREATE TABLE "organization_playbooks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"playbook_id" uuid NOT NULL,
	"is_default" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX "organization_playbooks_org_id_idx" ON "organization_playbooks"("organization_id");
CREATE INDEX "organization_playbooks_playbook_id_idx" ON "organization_playbooks"("playbook_id");
ALTER TABLE "organization_playbooks" ADD CONSTRAINT "organization_playbooks_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "organization_playbooks" ADD CONSTRAINT "organization_playbooks_playbook_id_playbooks_id_fk" FOREIGN KEY ("playbook_id") REFERENCES "public"."playbooks"("id") ON DELETE cascade ON UPDATE no action;

--> statement-breakpoint
-- Chat sessions table
CREATE TABLE "chat_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text,
	"share_token" text,
	"is_public" boolean DEFAULT false,
	"source_config" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chat_sessions_share_token_unique" UNIQUE("share_token")
);
CREATE INDEX "chat_sessions_user_id_idx" ON "chat_sessions"("user_id");
CREATE INDEX "chat_sessions_share_token_idx" ON "chat_sessions"("share_token");
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;

--> statement-breakpoint
-- Chat messages table
CREATE TABLE "chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"citations" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX "chat_messages_session_id_idx" ON "chat_messages"("session_id");
CREATE INDEX "chat_messages_created_at_idx" ON "chat_messages"("created_at");
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_session_id_chat_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."chat_sessions"("id") ON DELETE cascade ON UPDATE no action;

--> statement-breakpoint
-- Versioned documents table
CREATE TABLE "versioned_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"organization_id" uuid,
	"name" text NOT NULL,
	"current_main_version" integer DEFAULT 1,
	"current_sub_version" text,
	"latest_version_id" uuid,
	"latest_sub_version_id" uuid,
	"document_type" text,
	"matter_reference" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX "versioned_documents_user_id_idx" ON "versioned_documents"("user_id");
CREATE INDEX "versioned_documents_organization_id_idx" ON "versioned_documents"("organization_id");
ALTER TABLE "versioned_documents" ADD CONSTRAINT "versioned_documents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "versioned_documents" ADD CONSTRAINT "versioned_documents_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;

--> statement-breakpoint
-- Document versions table (main versions: v1, v2, v3...)
CREATE TABLE "document_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"main_version" integer NOT NULL,
	"description" text NOT NULL,
	"editor_name" text NOT NULL,
	"editor_user_id" uuid NOT NULL,
	"content" text,
	"file_blob" bytea,
	"file_size_bytes" integer,
	"is_milestone" boolean DEFAULT true,
	"status" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX "document_versions_document_id_idx" ON "document_versions"("document_id");
CREATE INDEX "document_versions_main_version_idx" ON "document_versions"("document_id","main_version");
CREATE INDEX "document_versions_editor_user_id_idx" ON "document_versions"("editor_user_id");
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_document_id_versioned_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."versioned_documents"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_editor_user_id_users_id_fk" FOREIGN KEY ("editor_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;

--> statement-breakpoint
-- Document sub-versions table (sub-versions: v1.A, v1.B, v1.C...)
CREATE TABLE "document_sub_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_version_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"sub_version_letter" text NOT NULL,
	"description" text NOT NULL,
	"editor_name" text NOT NULL,
	"editor_user_id" uuid NOT NULL,
	"content" text,
	"file_blob" bytea,
	"file_size_bytes" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX "document_sub_versions_parent_version_id_idx" ON "document_sub_versions"("parent_version_id");
CREATE INDEX "document_sub_versions_document_id_idx" ON "document_sub_versions"("document_id");
CREATE INDEX "document_sub_versions_sub_version_idx" ON "document_sub_versions"("parent_version_id","sub_version_letter");
CREATE INDEX "document_sub_versions_editor_user_id_idx" ON "document_sub_versions"("editor_user_id");
ALTER TABLE "document_sub_versions" ADD CONSTRAINT "document_sub_versions_parent_version_id_document_versions_id_fk" FOREIGN KEY ("parent_version_id") REFERENCES "public"."document_versions"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "document_sub_versions" ADD CONSTRAINT "document_sub_versions_document_id_versioned_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."versioned_documents"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "document_sub_versions" ADD CONSTRAINT "document_sub_versions_editor_user_id_users_id_fk" FOREIGN KEY ("editor_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;

