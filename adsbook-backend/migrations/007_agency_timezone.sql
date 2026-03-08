-- Migration: Add timezone preference to agencies
-- Enables "9 AM in your timezone" for weekly report and display labels

ALTER TABLE agencies ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';

COMMENT ON COLUMN agencies.timezone IS 'IANA timezone (e.g. America/New_York, Asia/Kolkata). Used for weekly report schedule and display.';
