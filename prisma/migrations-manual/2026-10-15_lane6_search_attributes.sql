-- Lane 6 (10-15): additive — search attributes per Business Type, sellers' answers, capability → product.
BEGIN;
ALTER TABLE "provider_capabilities" ADD COLUMN     "system_product_id" UUID;
CREATE TABLE "business_type_attributes" (
    "id" UUID NOT NULL,
    "business_type_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "choices" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "list" TEXT,
    "multi" BOOLEAN NOT NULL DEFAULT true,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 100,
    "origin" TEXT NOT NULL DEFAULT 'GT_2026_10_14',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_type_attributes_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "provider_attribute_values" (
    "id" UUID NOT NULL,
    "provider_profile_id" UUID NOT NULL,
    "attribute_id" UUID NOT NULL,
    "values" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "origin" TEXT NOT NULL DEFAULT 'GT_2026_10_14',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provider_attribute_values_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "business_type_attributes_business_type_id_name_key" ON "business_type_attributes"("business_type_id", "name");
CREATE INDEX "provider_attribute_values_attribute_id_idx" ON "provider_attribute_values"("attribute_id");
CREATE UNIQUE INDEX "provider_attribute_values_provider_profile_id_attribute_id_key" ON "provider_attribute_values"("provider_profile_id", "attribute_id");
ALTER TABLE "provider_capabilities" ADD CONSTRAINT "provider_capabilities_system_product_id_fkey" FOREIGN KEY ("system_product_id") REFERENCES "system_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "business_type_attributes" ADD CONSTRAINT "business_type_attributes_business_type_id_fkey" FOREIGN KEY ("business_type_id") REFERENCES "business_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "provider_attribute_values" ADD CONSTRAINT "provider_attribute_values_provider_profile_id_fkey" FOREIGN KEY ("provider_profile_id") REFERENCES "provider_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "provider_attribute_values" ADD CONSTRAINT "provider_attribute_values_attribute_id_fkey" FOREIGN KEY ("attribute_id") REFERENCES "business_type_attributes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;
