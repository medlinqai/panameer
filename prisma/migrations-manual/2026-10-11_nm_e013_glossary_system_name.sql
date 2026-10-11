-- NM-E013: Glossary › System Name (additive).
ALTER TABLE "glossary_terms" ADD COLUMN IF NOT EXISTS "system_name" TEXT;
