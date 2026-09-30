-- Unit duplication hardening for portable SQLite databases.
-- Canonicalize conversion names and remove only exact semantic duplicates.
-- Historical sale quantities are stored on POS lines and are not rewritten.

BEGIN TRANSACTION;

-- Older protected Windows schema bundles may have the conversion table without
-- one or both timestamp columns. Add them compatibly before using them for
-- deterministic newest-row selection. The migration runner tolerates an
-- already-existing column.
ALTER TABLE item_unit_conversions ADD COLUMN created_at TEXT;
ALTER TABLE item_unit_conversions ADD COLUMN updated_at TEXT;

UPDATE item_unit_conversions
SET from_unit=lower(trim(from_unit)),
    to_unit=lower(trim(to_unit))
WHERE from_unit IS NOT NULL OR to_unit IS NOT NULL;

UPDATE item_unit_conversions
SET created_at=COALESCE(created_at,updated_at,datetime('now')),
    updated_at=COALESCE(updated_at,created_at,datetime('now'));

-- Preserve the newest active conversion for each normalized pair and remove
-- older duplicates. The audit table is updated first so its references remain
-- meaningful.
UPDATE item_unit_conversion_audit
SET conversion_id = (
  SELECT keep.id
  FROM item_unit_conversions keep
  WHERE keep.user_id = item_unit_conversion_audit.user_id
    AND keep.item_id = item_unit_conversion_audit.item_id
    AND keep.is_active = 1
    AND lower(trim(keep.from_unit)) = lower(trim(item_unit_conversion_audit.from_unit))
    AND lower(trim(keep.to_unit)) = lower(trim(item_unit_conversion_audit.to_unit))
  ORDER BY keep.updated_at DESC, keep.created_at DESC, keep.id DESC
  LIMIT 1
)
WHERE conversion_id IS NOT NULL;

DELETE FROM item_unit_conversions
WHERE is_active = 1
  AND id NOT IN (
    SELECT id
    FROM (
      SELECT id,
             ROW_NUMBER() OVER (
               PARTITION BY user_id,item_id,lower(trim(from_unit)),lower(trim(to_unit))
               ORDER BY updated_at DESC,created_at DESC,id DESC
             ) AS rn
      FROM item_unit_conversions
      WHERE is_active = 1
    ) ranked
    WHERE rn = 1
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_item_unit_conversions_canonical
  ON item_unit_conversions(user_id,item_id,lower(trim(from_unit)),lower(trim(to_unit)));

COMMIT;
