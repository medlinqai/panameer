-- OF-E002 (Scott 2026-10-12): "Offsite", not "Remote". Enum value renames only — no data is rewritten.
BEGIN;
ALTER TYPE "WorksiteType" RENAME VALUE 'REMOTE' TO 'OFFSITE';
ALTER TYPE "ServiceDelivery" RENAME VALUE 'REMOTE' TO 'OFFSITE';
COMMIT;
