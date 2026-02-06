CREATE TABLE "review_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"document_name" text NOT NULL,
	"playbook_id" uuid,
	"playbook_name" text,
	"status" text DEFAULT 'completed' NOT NULL,
	"results_count" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vault_clauses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"text" text NOT NULL,
	"category" text,
	"tags" jsonb,
	"description" text,
	"source_document" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vault_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"storage_path" text,
	"category" text,
	"size_bytes" integer,
	"mime_type" text,
	"extracted_text" text,
	"parsed_structure" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vault_projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"file_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vault_queries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"query_type" text NOT NULL,
	"query_text" text,
	"columns" jsonb,
	"file_ids" jsonb,
	"status" text DEFAULT 'pending' NOT NULL,
	"results" jsonb,
	"error" text,
	"processing_time_ms" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "clause_labels" (
	"clause_id" uuid NOT NULL,
	"label_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clause_tags" (
	"clause_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clause_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clause_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"previous_version_id" uuid,
	"text" text NOT NULL,
	"summary" text,
	"change_type" text,
	"change_description" text,
	"changed_by" uuid,
	"diff_from_previous" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clauses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"current_version_id" uuid,
	"clause_type" text,
	"jurisdiction" text,
	"language" text DEFAULT 'en',
	"source_type" text,
	"source_document_name" text,
	"source_playbook_id" uuid,
	"source_rule_id" text,
	"visibility" text DEFAULT 'private',
	"use_count" integer DEFAULT 0,
	"last_used_at" timestamp with time zone,
	"search_vector" text,
	"metadata" jsonb,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "labels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT '#6B7280' NOT NULL,
	"category" text NOT NULL,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "library_shares" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" uuid NOT NULL,
	"owner_id" uuid NOT NULL,
	"shared_with_user_id" uuid,
	"shared_with_email" text,
	"permission" text DEFAULT 'view' NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "playbook_labels" (
	"playbook_id" uuid NOT NULL,
	"label_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "playbook_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"playbook_id" uuid NOT NULL,
	"rule_number" text NOT NULL,
	"rule_type" text NOT NULL,
	"brief_name" text NOT NULL,
	"instruction" text NOT NULL,
	"example_language" text,
	"linked_clause_id" uuid,
	"conditions" jsonb,
	"source_annotation_type" text,
	"source_annotation_key" text,
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"search_vector" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "playbook_tags" (
	"playbook_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "playbook_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"playbook_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"previous_version_id" uuid,
	"rules_snapshot" jsonb NOT NULL,
	"change_type" text,
	"change_description" text,
	"changed_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "playbooks_new" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"playbook_type" text,
	"user_position" text,
	"jurisdiction" text,
	"document_types" jsonb,
	"current_version_id" uuid,
	"visibility" text DEFAULT 'private',
	"use_count" integer DEFAULT 0,
	"last_used_at" timestamp with time zone,
	"rule_count" integer DEFAULT 0,
	"search_vector" text,
	"metadata" jsonb,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"storage_path" text,
	"mime_type" text,
	"size_bytes" integer,
	"extracted_text" text,
	"parsed_structure" jsonb,
	"search_vector" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"item_type" text NOT NULL,
	"file_id" uuid,
	"clause_id" uuid,
	"playbook_id" uuid,
	"parent_item_id" uuid,
	"name" text,
	"sort_order" integer DEFAULT 0,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_labels" (
	"project_id" uuid NOT NULL,
	"label_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_tags" (
	"project_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"project_type" text,
	"status" text DEFAULT 'active',
	"visibility" text DEFAULT 'private',
	"current_version_id" uuid,
	"item_count" integer DEFAULT 0,
	"search_vector" text,
	"metadata" jsonb,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"color" text DEFAULT '#6B7280',
	"icon" text,
	"parent_id" uuid,
	"path" text NOT NULL,
	"level" integer DEFAULT 0 NOT NULL,
	"scope" text DEFAULT 'all' NOT NULL,
	"is_system" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "review_sessions" ADD CONSTRAINT "review_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_sessions" ADD CONSTRAINT "review_sessions_playbook_id_playbooks_id_fk" FOREIGN KEY ("playbook_id") REFERENCES "public"."playbooks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vault_files" ADD CONSTRAINT "vault_files_project_id_vault_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."vault_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vault_queries" ADD CONSTRAINT "vault_queries_project_id_vault_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."vault_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clause_labels" ADD CONSTRAINT "clause_labels_clause_id_clauses_id_fk" FOREIGN KEY ("clause_id") REFERENCES "public"."clauses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clause_labels" ADD CONSTRAINT "clause_labels_label_id_labels_id_fk" FOREIGN KEY ("label_id") REFERENCES "public"."labels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clause_tags" ADD CONSTRAINT "clause_tags_clause_id_clauses_id_fk" FOREIGN KEY ("clause_id") REFERENCES "public"."clauses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clause_tags" ADD CONSTRAINT "clause_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clause_versions" ADD CONSTRAINT "clause_versions_clause_id_clauses_id_fk" FOREIGN KEY ("clause_id") REFERENCES "public"."clauses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clause_versions" ADD CONSTRAINT "clause_versions_previous_version_id_clause_versions_id_fk" FOREIGN KEY ("previous_version_id") REFERENCES "public"."clause_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clause_versions" ADD CONSTRAINT "clause_versions_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clauses" ADD CONSTRAINT "clauses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "labels" ADD CONSTRAINT "labels_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "library_shares" ADD CONSTRAINT "library_shares_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "library_shares" ADD CONSTRAINT "library_shares_shared_with_user_id_users_id_fk" FOREIGN KEY ("shared_with_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playbook_labels" ADD CONSTRAINT "playbook_labels_playbook_id_playbooks_new_id_fk" FOREIGN KEY ("playbook_id") REFERENCES "public"."playbooks_new"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playbook_labels" ADD CONSTRAINT "playbook_labels_label_id_labels_id_fk" FOREIGN KEY ("label_id") REFERENCES "public"."labels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playbook_rules" ADD CONSTRAINT "playbook_rules_playbook_id_playbooks_new_id_fk" FOREIGN KEY ("playbook_id") REFERENCES "public"."playbooks_new"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playbook_rules" ADD CONSTRAINT "playbook_rules_linked_clause_id_clauses_id_fk" FOREIGN KEY ("linked_clause_id") REFERENCES "public"."clauses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playbook_tags" ADD CONSTRAINT "playbook_tags_playbook_id_playbooks_new_id_fk" FOREIGN KEY ("playbook_id") REFERENCES "public"."playbooks_new"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playbook_tags" ADD CONSTRAINT "playbook_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playbook_versions" ADD CONSTRAINT "playbook_versions_playbook_id_playbooks_new_id_fk" FOREIGN KEY ("playbook_id") REFERENCES "public"."playbooks_new"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playbook_versions" ADD CONSTRAINT "playbook_versions_previous_version_id_playbook_versions_id_fk" FOREIGN KEY ("previous_version_id") REFERENCES "public"."playbook_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playbook_versions" ADD CONSTRAINT "playbook_versions_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playbooks_new" ADD CONSTRAINT "playbooks_new_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_files" ADD CONSTRAINT "project_files_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_items" ADD CONSTRAINT "project_items_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_items" ADD CONSTRAINT "project_items_file_id_project_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."project_files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_items" ADD CONSTRAINT "project_items_clause_id_clauses_id_fk" FOREIGN KEY ("clause_id") REFERENCES "public"."clauses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_items" ADD CONSTRAINT "project_items_playbook_id_playbooks_new_id_fk" FOREIGN KEY ("playbook_id") REFERENCES "public"."playbooks_new"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_items" ADD CONSTRAINT "project_items_parent_item_id_project_items_id_fk" FOREIGN KEY ("parent_item_id") REFERENCES "public"."project_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_labels" ADD CONSTRAINT "project_labels_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_labels" ADD CONSTRAINT "project_labels_label_id_labels_id_fk" FOREIGN KEY ("label_id") REFERENCES "public"."labels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_tags" ADD CONSTRAINT "project_tags_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_tags" ADD CONSTRAINT "project_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_parent_id_tags_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."tags"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "review_sessions_user_id_idx" ON "review_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "review_sessions_created_at_idx" ON "review_sessions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "review_sessions_playbook_id_idx" ON "review_sessions" USING btree ("playbook_id");--> statement-breakpoint
CREATE INDEX "vault_clauses_user_id_idx" ON "vault_clauses" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "vault_clauses_category_idx" ON "vault_clauses" USING btree ("category");--> statement-breakpoint
CREATE INDEX "vault_files_project_id_idx" ON "vault_files" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "vault_projects_user_id_idx" ON "vault_projects" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "vault_queries_project_id_idx" ON "vault_queries" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "vault_queries_status_idx" ON "vault_queries" USING btree ("status");--> statement-breakpoint
CREATE INDEX "clause_labels_pk" ON "clause_labels" USING btree ("clause_id","label_id");--> statement-breakpoint
CREATE INDEX "clause_labels_clause_id_idx" ON "clause_labels" USING btree ("clause_id");--> statement-breakpoint
CREATE INDEX "clause_labels_label_id_idx" ON "clause_labels" USING btree ("label_id");--> statement-breakpoint
CREATE INDEX "clause_tags_pk" ON "clause_tags" USING btree ("clause_id","tag_id");--> statement-breakpoint
CREATE INDEX "clause_tags_clause_id_idx" ON "clause_tags" USING btree ("clause_id");--> statement-breakpoint
CREATE INDEX "clause_tags_tag_id_idx" ON "clause_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "clause_versions_clause_id_idx" ON "clause_versions" USING btree ("clause_id");--> statement-breakpoint
CREATE INDEX "clause_versions_version_number_idx" ON "clause_versions" USING btree ("clause_id","version_number");--> statement-breakpoint
CREATE INDEX "clauses_user_id_idx" ON "clauses" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "clauses_visibility_idx" ON "clauses" USING btree ("visibility");--> statement-breakpoint
CREATE INDEX "clauses_clause_type_idx" ON "clauses" USING btree ("clause_type");--> statement-breakpoint
CREATE INDEX "clauses_jurisdiction_idx" ON "clauses" USING btree ("jurisdiction");--> statement-breakpoint
CREATE INDEX "clauses_source_playbook_idx" ON "clauses" USING btree ("source_playbook_id");--> statement-breakpoint
CREATE INDEX "labels_user_id_idx" ON "labels" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "labels_category_idx" ON "labels" USING btree ("category");--> statement-breakpoint
CREATE INDEX "labels_unique_idx" ON "labels" USING btree ("user_id","category","name");--> statement-breakpoint
CREATE INDEX "library_shares_resource_idx" ON "library_shares" USING btree ("resource_type","resource_id");--> statement-breakpoint
CREATE INDEX "library_shares_owner_idx" ON "library_shares" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "library_shares_shared_with_idx" ON "library_shares" USING btree ("shared_with_user_id");--> statement-breakpoint
CREATE INDEX "playbook_labels_pk" ON "playbook_labels" USING btree ("playbook_id","label_id");--> statement-breakpoint
CREATE INDEX "playbook_labels_playbook_id_idx" ON "playbook_labels" USING btree ("playbook_id");--> statement-breakpoint
CREATE INDEX "playbook_labels_label_id_idx" ON "playbook_labels" USING btree ("label_id");--> statement-breakpoint
CREATE INDEX "playbook_rules_playbook_id_idx" ON "playbook_rules" USING btree ("playbook_id");--> statement-breakpoint
CREATE INDEX "playbook_rules_type_idx" ON "playbook_rules" USING btree ("rule_type");--> statement-breakpoint
CREATE INDEX "playbook_rules_clause_idx" ON "playbook_rules" USING btree ("linked_clause_id");--> statement-breakpoint
CREATE INDEX "playbook_tags_pk" ON "playbook_tags" USING btree ("playbook_id","tag_id");--> statement-breakpoint
CREATE INDEX "playbook_tags_playbook_id_idx" ON "playbook_tags" USING btree ("playbook_id");--> statement-breakpoint
CREATE INDEX "playbook_tags_tag_id_idx" ON "playbook_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "playbook_versions_playbook_id_idx" ON "playbook_versions" USING btree ("playbook_id");--> statement-breakpoint
CREATE INDEX "playbook_versions_version_number_idx" ON "playbook_versions" USING btree ("playbook_id","version_number");--> statement-breakpoint
CREATE INDEX "playbooks_new_user_id_idx" ON "playbooks_new" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "playbooks_new_type_idx" ON "playbooks_new" USING btree ("playbook_type");--> statement-breakpoint
CREATE INDEX "playbooks_new_jurisdiction_idx" ON "playbooks_new" USING btree ("jurisdiction");--> statement-breakpoint
CREATE INDEX "playbooks_new_visibility_idx" ON "playbooks_new" USING btree ("visibility");--> statement-breakpoint
CREATE INDEX "project_files_project_id_idx" ON "project_files" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_items_project_id_idx" ON "project_items" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_items_type_idx" ON "project_items" USING btree ("item_type");--> statement-breakpoint
CREATE INDEX "project_items_parent_idx" ON "project_items" USING btree ("parent_item_id");--> statement-breakpoint
CREATE INDEX "project_labels_pk" ON "project_labels" USING btree ("project_id","label_id");--> statement-breakpoint
CREATE INDEX "project_labels_project_id_idx" ON "project_labels" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_labels_label_id_idx" ON "project_labels" USING btree ("label_id");--> statement-breakpoint
CREATE INDEX "project_tags_pk" ON "project_tags" USING btree ("project_id","tag_id");--> statement-breakpoint
CREATE INDEX "project_tags_project_id_idx" ON "project_tags" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_tags_tag_id_idx" ON "project_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "projects_user_id_idx" ON "projects" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "projects_status_idx" ON "projects" USING btree ("status");--> statement-breakpoint
CREATE INDEX "projects_visibility_idx" ON "projects" USING btree ("visibility");--> statement-breakpoint
CREATE INDEX "tags_user_id_idx" ON "tags" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "tags_parent_id_idx" ON "tags" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "tags_slug_idx" ON "tags" USING btree ("user_id","slug");--> statement-breakpoint
CREATE INDEX "tags_scope_idx" ON "tags" USING btree ("scope");