-- Migration: Add activity_logs table + campaign_thresholds table
-- Date: 2026-02-28

-- Activity Log for tracking all user actions
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);

-- Per-campaign CPL thresholds (overrides account-level threshold)
CREATE TABLE IF NOT EXISTS campaign_thresholds (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ad_account_id UUID REFERENCES ad_accounts(id),
  campaign_name TEXT NOT NULL,
  cpl_threshold NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(ad_account_id, campaign_name)
);

CREATE INDEX IF NOT EXISTS idx_campaign_thresholds_account ON campaign_thresholds(ad_account_id);
