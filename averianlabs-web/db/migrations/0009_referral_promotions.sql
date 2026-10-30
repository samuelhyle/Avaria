-- Referrals.
--
-- The referral programme promised a discount and a credit that nothing
-- delivered. The discount is now a real promotion, issued to the referred
-- customer as a personal code, so it is priced by the ordinary promotion
-- engine and reaches the checkout. This column links the redemption to that
-- code, which is how the referrer's credit is found when the order is paid.
ALTER TABLE "referral_redemptions" ADD COLUMN "promotion_code" text;
--> statement-breakpoint
CREATE UNIQUE INDEX "referral_redemptions_promotion_code_idx" ON "referral_redemptions" ("promotion_code");
