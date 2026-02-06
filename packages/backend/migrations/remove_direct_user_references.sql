-- Migration: Remove direct user_id references from child tables
-- This migration removes the user_id columns from paragraphs, comments, highlights, and tracked_changes tables
-- These tables will now only be related to users through their parent documents

-- Note: In a production environment, this would be handled by a proper migration tool like Drizzle Kit

-- Remove user_id column from paragraphs table
ALTER TABLE paragraphs DROP COLUMN IF EXISTS user_id;
DROP INDEX IF EXISTS paragraphs_user_id_idx;

-- Remove user_id column from comments table
ALTER TABLE comments DROP COLUMN IF EXISTS user_id;
DROP INDEX IF EXISTS comments_user_id_idx;

-- Remove user_id column from highlights table
ALTER TABLE highlights DROP COLUMN IF EXISTS user_id;
DROP INDEX IF EXISTS highlights_user_id_idx;

-- Remove user_id column from tracked_changes table
ALTER TABLE tracked_changes DROP COLUMN IF EXISTS user_id;
DROP INDEX IF EXISTS tracked_changes_user_id_idx;

-- The foreign key relationships to documents remain intact
-- Users are now related to these tables through: user -> document -> child_table