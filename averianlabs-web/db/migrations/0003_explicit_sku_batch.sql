ALTER TABLE "vials" ADD COLUMN "active_batch_id" text;
--> statement-breakpoint
ALTER TABLE "vials" ADD CONSTRAINT "vials_active_batch_fk" FOREIGN KEY ("active_batch_id") REFERENCES "batches"("id") ON DELETE SET NULL;
--> statement-breakpoint
UPDATE "vials" SET "active_batch_id" = "products"."active_batch_id" FROM "products", "batches" WHERE "vials"."product_id" = "products"."id" AND "products"."active_batch_id" = "batches"."id" AND "batches"."vial_id" = "vials"."id";
