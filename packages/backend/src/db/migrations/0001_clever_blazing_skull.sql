CREATE TABLE "playbook_shares" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"playbook_id" uuid NOT NULL,
	"owner_id" uuid NOT NULL,
	"shared_with_user_id" uuid NOT NULL,
	"share_type" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "playbooks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"playbook_name" text NOT NULL,
	"description" text,
	"playbook_type" text,
	"user_position" text,
	"jurisdiction" text,
	"tags" text,
	"rules" jsonb NOT NULL,
	"metadata" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "playbook_shares" ADD CONSTRAINT "playbook_shares_playbook_id_playbooks_id_fk" FOREIGN KEY ("playbook_id") REFERENCES "public"."playbooks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playbook_shares" ADD CONSTRAINT "playbook_shares_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playbook_shares" ADD CONSTRAINT "playbook_shares_shared_with_user_id_users_id_fk" FOREIGN KEY ("shared_with_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playbooks" ADD CONSTRAINT "playbooks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "playbook_shares_playbook_id_idx" ON "playbook_shares" USING btree ("playbook_id");--> statement-breakpoint
CREATE INDEX "playbook_shares_owner_id_idx" ON "playbook_shares" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "playbook_shares_shared_with_user_id_idx" ON "playbook_shares" USING btree ("shared_with_user_id");--> statement-breakpoint
CREATE INDEX "playbook_shares_unique_idx" ON "playbook_shares" USING btree ("playbook_id","shared_with_user_id");--> statement-breakpoint
CREATE INDEX "playbooks_user_id_idx" ON "playbooks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "playbooks_playbook_name_idx" ON "playbooks" USING btree ("playbook_name");--> statement-breakpoint
CREATE INDEX "playbooks_playbook_type_idx" ON "playbooks" USING btree ("playbook_type");--> statement-breakpoint
CREATE INDEX "playbooks_created_at_idx" ON "playbooks" USING btree ("created_at");