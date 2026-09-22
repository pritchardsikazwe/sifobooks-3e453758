-- POS tills must be linked to an inventory selling location.
ALTER TABLE pos_registers ADD COLUMN location_id TEXT;
CREATE INDEX IF NOT EXISTS idx_pos_registers_location ON pos_registers(location_id);
