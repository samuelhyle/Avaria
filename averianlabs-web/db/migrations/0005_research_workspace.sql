CREATE TABLE "saved_calculations" (
 "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
 "owner_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
 "inputs" jsonb NOT NULL,
 "formula_version" text NOT NULL,
 "source_sku" text,
 "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "saved_calculations_owner_idx" ON "saved_calculations" ("owner_id","created_at");
--> statement-breakpoint
ALTER TABLE "forum_threads" ADD COLUMN "locale" text NOT NULL DEFAULT 'en';
--> statement-breakpoint
ALTER TABLE "forum_threads" ADD COLUMN "original_post_id" text;
--> statement-breakpoint
UPDATE "forum_threads" t SET "original_post_id" = (SELECT p.id FROM "forum_posts" p WHERE p.thread_id=t.id ORDER BY p.created_at,p.id LIMIT 1);
--> statement-breakpoint
CREATE TABLE "forum_moderation_jobs" (
 "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
 "post_id" text NOT NULL UNIQUE REFERENCES "forum_posts"("id") ON DELETE CASCADE,
 "status" text NOT NULL DEFAULT 'pending',
 "attempts" integer NOT NULL DEFAULT 0,
 "available_at" timestamp with time zone NOT NULL DEFAULT now(),
 "locked_at" timestamp with time zone,
 "created_at" timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "forum_moderation_jobs_due_idx" ON "forum_moderation_jobs" ("status","available_at");
--> statement-breakpoint
-- Counts exclude the original post and hidden content. Do not fabricate engagement.
UPDATE "forum_threads" t SET "reply_count" = GREATEST(0, (
 SELECT count(*)::integer FROM "forum_posts" p WHERE p.thread_id=t.id AND p.id<>t.original_post_id AND p.status IN ('active','edited')
));
--> statement-breakpoint
CREATE TABLE "forum_drafts" (
 "owner_id" text PRIMARY KEY REFERENCES "users"("id") ON DELETE CASCADE,
 "title" text NOT NULL DEFAULT '',
 "body" text NOT NULL DEFAULT '',
 "category_slug" text NOT NULL DEFAULT 'research-discussion',
 "locale" text NOT NULL DEFAULT 'en',
 "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
