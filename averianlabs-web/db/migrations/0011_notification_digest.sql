-- The email digest.
--
-- The account settings offered an "email digest" switch that nothing acted on:
-- no code ever read the preference, so the switch was decoration. Turning the
-- digest on now sends the notifications a customer missed.
ALTER TABLE "notifications" ADD COLUMN "digested_at" timestamp with time zone;
--> statement-breakpoint
CREATE INDEX "notifications_digest_idx" ON "notifications" ("digested_at","created_at");
