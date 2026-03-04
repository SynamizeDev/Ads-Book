-- Migration 006: Add Drive and Sheet links to ad_accounts
ALTER TABLE ad_accounts 
ADD COLUMN IF NOT EXISTS drive_link TEXT,
ADD COLUMN IF NOT EXISTS sheet_link TEXT;
