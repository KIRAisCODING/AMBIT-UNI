-- Migration: 2_correct_notetags_foreign_keys
-- Aligns _NoteTags implicit relation foreign keys to Prisma's canonical alphabetical model order (Note -> A, Tag -> B)

BEGIN;

-- 1. Drop existing inverted foreign key constraints
ALTER TABLE "_NoteTags" DROP CONSTRAINT IF EXISTS "_NoteTags_A_fkey";
ALTER TABLE "_NoteTags" DROP CONSTRAINT IF EXISTS "_NoteTags_B_fkey";

-- 2. If legacy records exist where A references tags and B references notes, swap columns so A references notes and B references tags
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "_NoteTags" nt
    JOIN "tags" t ON nt."A" = t."id"
    JOIN "notes" n ON nt."B" = n."id"
  ) THEN
    UPDATE "_NoteTags"
    SET "A" = "B", "B" = "A"
    WHERE "A" IN (SELECT "id" FROM "tags") AND "B" IN (SELECT "id" FROM "notes");
  END IF;
END $$;

-- 3. Add canonical foreign key constraints
ALTER TABLE "_NoteTags" ADD CONSTRAINT "_NoteTags_A_fkey" FOREIGN KEY ("A") REFERENCES "notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_NoteTags" ADD CONSTRAINT "_NoteTags_B_fkey" FOREIGN KEY ("B") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;

