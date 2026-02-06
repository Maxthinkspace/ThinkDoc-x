CREATE TABLE "paragraphs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"text" text NOT NULL,
	"paragraph_index" integer NOT NULL,
	"style_id" text,
	"style_name" text,
	"alignment" text,
	"indent_left" integer,
	"indent_right" integer,
	"indent_first_line" integer,
	"space_before" integer,
	"space_after" integer,
	"line_spacing" text,
	"line_spacing_rule" text,
	"word_paragraph_id" text,
	"range" jsonb,
	"metadata" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "paragraph_id" uuid;--> statement-breakpoint
ALTER TABLE "highlights" ADD COLUMN "paragraph_id" uuid;--> statement-breakpoint
ALTER TABLE "tracked_changes" ADD COLUMN "paragraph_id" uuid;--> statement-breakpoint
ALTER TABLE "paragraphs" ADD CONSTRAINT "paragraphs_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paragraphs" ADD CONSTRAINT "paragraphs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "paragraphs_document_id_idx" ON "paragraphs" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "paragraphs_user_id_idx" ON "paragraphs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "paragraphs_paragraph_index_idx" ON "paragraphs" USING btree ("paragraph_index");--> statement-breakpoint
CREATE INDEX "paragraphs_word_paragraph_id_idx" ON "paragraphs" USING btree ("word_paragraph_id");--> statement-breakpoint
CREATE INDEX "paragraphs_unique_document_index" ON "paragraphs" USING btree ("document_id","paragraph_index");--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_paragraph_id_paragraphs_id_fk" FOREIGN KEY ("paragraph_id") REFERENCES "public"."paragraphs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "highlights" ADD CONSTRAINT "highlights_paragraph_id_paragraphs_id_fk" FOREIGN KEY ("paragraph_id") REFERENCES "public"."paragraphs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracked_changes" ADD CONSTRAINT "tracked_changes_paragraph_id_paragraphs_id_fk" FOREIGN KEY ("paragraph_id") REFERENCES "public"."paragraphs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "comments_paragraph_id_idx" ON "comments" USING btree ("paragraph_id");--> statement-breakpoint
CREATE INDEX "highlights_paragraph_id_idx" ON "highlights" USING btree ("paragraph_id");--> statement-breakpoint
CREATE INDEX "tracked_changes_paragraph_id_idx" ON "tracked_changes" USING btree ("paragraph_id");