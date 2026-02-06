ALTER TABLE "comments" DROP CONSTRAINT "comments_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "highlights" DROP CONSTRAINT "highlights_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "paragraphs" DROP CONSTRAINT "paragraphs_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "tracked_changes" DROP CONSTRAINT "tracked_changes_user_id_users_id_fk";
--> statement-breakpoint
DROP INDEX "comments_user_id_idx";--> statement-breakpoint
DROP INDEX "highlights_user_id_idx";--> statement-breakpoint
DROP INDEX "paragraphs_user_id_idx";--> statement-breakpoint
DROP INDEX "tracked_changes_user_id_idx";--> statement-breakpoint
ALTER TABLE "comments" DROP COLUMN "user_id";--> statement-breakpoint
ALTER TABLE "highlights" DROP COLUMN "user_id";--> statement-breakpoint
ALTER TABLE "paragraphs" DROP COLUMN "user_id";--> statement-breakpoint
ALTER TABLE "tracked_changes" DROP COLUMN "user_id";