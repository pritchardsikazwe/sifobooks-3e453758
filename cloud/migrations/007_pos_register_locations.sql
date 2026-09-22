-- Cloud PostgreSQL: link POS tills to their inventory selling location.
ALTER TABLE pos_registers ADD COLUMN IF NOT EXISTS location_id UUID;
CREATE INDEX IF NOT EXISTS idx_pos_registers_location ON pos_registers(location_id);
