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
ALTER TABLE "review_sessions" ADD CONSTRAINT "review_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "review_sessions" ADD CONSTRAINT "review_sessions_playbook_id_playbooks_id_fk" FOREIGN KEY ("playbook_id") REFERENCES "public"."playbooks"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "review_sessions_user_id_idx" ON "review_sessions" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "review_sessions_created_at_idx" ON "review_sessions" USING btree ("created_at");
--> statement-breakpoint
CREATE INDEX "review_sessions_playbook_id_idx" ON "review_sessions" USING btree ("playbook_id");

