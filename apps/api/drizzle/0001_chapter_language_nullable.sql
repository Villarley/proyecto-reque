ALTER TABLE "chapters" ADD COLUMN IF NOT EXISTS "primary_language" text DEFAULT 'en' NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "chapter_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'account_verified';
