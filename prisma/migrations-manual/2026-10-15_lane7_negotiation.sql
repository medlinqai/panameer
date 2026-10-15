-- Lane 7 (Scott 10-15): one negotiation pattern. Additive columns + two NOT NULL relaxations (no data removed).
BEGIN;
ALTER TABLE "cart_lines" ADD COLUMN "delivery_date" TIMESTAMP(3), ADD COLUMN "provider_service_id" UUID, ALTER COLUMN "service_product_id" DROP NOT NULL;
ALTER TABLE "provider_profiles" ADD COLUMN "open_to_offers" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "provider_services" ADD COLUMN "offers_override" BOOLEAN;
ALTER TABLE "service_product_offers" ADD COLUMN "counter_delivery_date" TIMESTAMP(3), ADD COLUMN "delivery_date" TIMESTAMP(3), ADD COLUMN "provider_service_id" UUID, ALTER COLUMN "service_product_id" DROP NOT NULL;
ALTER TABLE "service_products" ADD COLUMN "offers_override" BOOLEAN;
-- "I accept orders manually" is replaced by "Open to offers on price and delivery": existing manual sellers → switch on.
UPDATE "provider_profiles" SET "open_to_offers" = true WHERE "accepts_orders_manually" = true;
-- Products already open to offers keep it as their own override.
UPDATE "service_products" SET "offers_override" = true WHERE "open_to_offers" = true;
COMMIT;
