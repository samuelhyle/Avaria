-- A referral attribution must not block the deletion of the order it points
-- at. The credit is settled and recorded separately, so losing the link is
-- harmless; refusing to delete an order is not.
ALTER TABLE "referral_redemptions" DROP CONSTRAINT IF EXISTS "referral_redemptions_order_id_orders_id_fk";
--> statement-breakpoint
ALTER TABLE "referral_redemptions" ADD CONSTRAINT "referral_redemptions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL;
