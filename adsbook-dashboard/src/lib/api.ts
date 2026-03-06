/**
 * Ads Book Dashboard - API Layer
 * Base fetch wrapper for backend communication
 */

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// Startup verification — logs in both server and client consoles
console.log("🔗 API Base URL:", API_URL);

/**
 * Types for API responses
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface Account {
  id: string;
  account_name: string;
  account_id: string;
  agency_id: string;
  cpl_threshold: number;
  auto_pause_enabled: boolean;
  is_active: boolean;
  include_in_weekly_report: boolean;
  drive_link?: string;
  sheet_link?: string;
  created_at?: string;
}

export interface CplLog {
  id: string;
  ad_account_id: string;
  campaign_name: string;
  adset_name: string;
  ad_name: string;
  ad_meta_id: string;
  spend: number;
  leads: number;
  calculated_cpl: number;
  checked_at: string;
}

export interface AlertLog {
  id: string;
  ad_account_id: string;
  agency_id: string;
  alert_type: string;
  campaign_name: string;
  campaign_meta_id: string | null;
  adset_name: string;
  adset_meta_id: string | null;
  ad_name: string;
  ad_meta_id: string;
  spend: number;
  leads: number;
  calculated_cpl: number;
  cpl_threshold: number;
  message?: string;
  created_at: string;
  ad_accounts?: { account_id: string | null };
}

export interface DashboardSummary {
  total_accounts: number;
  high_cpl_alerts: number;
  zero_lead_alerts: number;
  ads_paused: number;
  ads_at_risk: number;
}

export interface AccountHealth {
  id: string;
  account_name: string;
  health_score: number;
  active_alerts: number;
  spend_today: number;
  leads_today: number;
  avg_cpl_today: number;
  avg_cpl_7d: number;
  spend_this_month: number;
  status: "HEALTHY" | "WATCH" | "CRITICAL" | "UNKNOWN";
}

export interface UrgentAlert {
  id: string;
  severity: "CRITICAL" | "WARNING";
  account_name: string;
  account_meta_id: string | null;
  campaign_name: string;
  campaign_meta_id: string | null;
  adset_name: string | null;
  adset_meta_id: string | null;
  ad_name: string | null;
  ad_meta_id: string | null;
  issue_type: string;
  created_at: string;
}

export interface SystemStatus {
  last_sync: string;
  meta_status: string;
  telegram_status: string;
  frequency: string;
}

export interface AgencyProfile {
  name: string;
  id: string;
}

export interface ActivityLog {
  id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

export interface Settings {
  id: string;
  name: string;
  telegram_chat_id: string;
  default_cpl_threshold: number;
  weekly_report_enabled: boolean;
}

export interface TrendPoint {
  date: string;
  total_spend: number;
  total_leads: number;
  avg_cpl: number;
}

export interface AdSeriesPoint {
  date: string;
  spend: number;
  leads: number;
  cpl: number;
}

export interface AdSeries {
  id: string;
  name: string;
  points: AdSeriesPoint[];
}

export interface TrendResponse {
  aggregate: TrendPoint[];
  series: AdSeries[];
}

export interface CampaignThreshold {
  id: string;
  ad_account_id: string;
  campaign_name: string;
  cpl_threshold: number;
}

export interface BudgetInfo {
  spend_cap: number;
  amount_spent: number;
  spend_today: number;
}

export interface CompareAccount {
  account_id: string;
  account_name: string;
  cpl_threshold: number;
  total_spend: number;
  total_leads: number;
  avg_cpl: number;
  alert_count: number;
  daily: { date: string; spend: number; leads: number; cpl: number }[];
}

/**
 * Get the current Supabase access token.
 * Client-side: uses browser Supabase client.
 * Server-side: reads session from cookies via dynamic imports.
 */
async function getAccessToken(): Promise<string | null> {
  try {
    if (typeof window !== "undefined") {
      // Client-side: use the browser client
      const { createClient } = await import("@/lib/supabase-browser");
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      return session?.access_token || null;
    }

    // Server-side: dynamic imports to avoid bundler errors in client components
    const { createServerClient } = await import("@supabase/ssr");
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll() { /* read-only context */ },
        },
      }
    );

    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  } catch {
    return null;
  }
}

/**
 * Base fetch helper with error handling and auth.
 * Pass `next: { revalidate: N }` for read-only endpoints to enable
 * Next.js server-side Data Cache. Mutations (POST/PATCH/DELETE) are
 * never cached — Next.js auto-applies no-store for non-GET requests.
 */
async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit & { next?: NextFetchRequestConfig }
): Promise<ApiResponse<T>> {
  try {
    const url = `${API_URL}${endpoint}`;
    const token = await getAccessToken();

    const { next, ...restOptions } = options || {};

    const response = await fetch(url, {
      ...restOptions,
      ...(next ? { next } : { cache: "no-store" }),
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...restOptions?.headers,
      },
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(`API Error [${response.status}]:`, body);
      // Try to extract a human-readable message from JSON body, fall back to raw text or status code
      let errorMessage = `Error ${response.status}`;
      try {
        const json = JSON.parse(body);
        errorMessage = json.error || json.message || json.detail || body || errorMessage;
      } catch {
        errorMessage = body || errorMessage;
      }
      return { success: false, error: errorMessage };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Fetch Error:", errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * API Methods
 */
export async function getAccounts(): Promise<ApiResponse<Account[]>> {
  return fetchApi<Account[]>("/api/accounts", { next: { revalidate: 300 } });
}

export async function getLatestCplLogs(limit: number = 50): Promise<ApiResponse<CplLog[]>> {
  return fetchApi<CplLog[]>(`/api/cpl-logs?limit=${limit}`, { next: { revalidate: 300 } });
}

export async function getAlertLogs(limit: number = 50, offset: number = 0): Promise<ApiResponse<AlertLog[]>> {
  return fetchApi<AlertLog[]>(`/api/alerts?limit=${limit}&offset=${offset}`, { next: { revalidate: 300 } });
}

export async function getAccountCplLogs(accountId: string, limit: number = 30): Promise<ApiResponse<CplLog[]>> {
  return fetchApi<CplLog[]>(`/api/cpl-logs?account_id=${accountId}&limit=${limit}`, { next: { revalidate: 300 } });
}

export async function getAccountAlerts(accountId: string, limit: number = 30): Promise<ApiResponse<AlertLog[]>> {
  return fetchApi<AlertLog[]>(`/api/alerts?account_id=${accountId}&limit=${limit}`, { next: { revalidate: 300 } });
}

export async function checkApiHealth(): Promise<ApiResponse<{ status: string }>> {
  return fetchApi<{ status: string }>("/health");
}

export async function updateAccountThreshold(accountId: string, newThreshold: number): Promise<ApiResponse<{ newThreshold: number }>> {
  return fetchApi<{ newThreshold: number }>(`/api/accounts/${accountId}/threshold`, {
    method: "PATCH",
    body: JSON.stringify({ newThreshold }),
  });
}

export async function toggleAutoPause(accountId: string, enabled: boolean): Promise<ApiResponse<{ auto_pause_enabled: boolean }>> {
  return fetchApi<{ auto_pause_enabled: boolean }>(`/api/accounts/${accountId}/auto-pause`, {
    method: "PATCH",
    body: JSON.stringify({ enabled }),
  });
}

export async function toggleWeeklyReport(accountId: string, enabled: boolean): Promise<ApiResponse<{ include_in_weekly_report: boolean }>> {
  return fetchApi<{ include_in_weekly_report: boolean }>(`/api/accounts/${accountId}/weekly-report`, {
    method: "PATCH",
    body: JSON.stringify({ include_in_weekly_report: enabled }),
  });
}

export async function getAccountHealth(range: string = "today"): Promise<ApiResponse<AccountHealth[]>> {
  return fetchApi<AccountHealth[]>(`/api/dashboard/account-health?range=${range}`, { next: { revalidate: 900 } });
}

export async function getUrgentAlerts(): Promise<ApiResponse<UrgentAlert[]>> {
  return fetchApi<UrgentAlert[]>("/api/dashboard/urgent-alerts", { next: { revalidate: 300 } });
}

export async function getDashboardSummary(range?: string): Promise<ApiResponse<DashboardSummary>> {
  const endpoint = `/api/dashboard/summary${range ? `?range=${range}` : ''}`;
  return fetchApi<DashboardSummary>(endpoint, { next: { revalidate: 900 } });
}

export async function getSystemStatus(): Promise<ApiResponse<SystemStatus>> {
  return fetchApi<SystemStatus>("/api/system/status", { next: { revalidate: 60 } });
}

export async function getAgencyProfile(): Promise<ApiResponse<AgencyProfile>> {
  return fetchApi<AgencyProfile>("/api/me", { next: { revalidate: 300 } });
}

export async function createAccount(payload: { name: string; ad_account_id: string; cpl_threshold: number; }): Promise<ApiResponse<{ account: Account }>> {
  return fetchApi<{ account: Account }>("/api/accounts", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateAccount(accountId: string, payload: { name: string; cpl_threshold: number; drive_link?: string; sheet_link?: string }): Promise<ApiResponse<{ updatedAccount: Account }>> {
  return fetchApi<{ updatedAccount: Account }>(`/api/accounts/${accountId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteAccount(accountId: string): Promise<ApiResponse<{ success: boolean }>> {
  return fetchApi<{ success: boolean }>(`/api/accounts/${accountId}`, { method: "DELETE" });
}

export async function getActivityLogs(limit: number = 50, offset: number = 0): Promise<ApiResponse<ActivityLog[]>> {
  return fetchApi<ActivityLog[]>(`/api/activity-logs?limit=${limit}&offset=${offset}`, { next: { revalidate: 300 } });
}

export async function getSettings(): Promise<ApiResponse<Settings>> {
  return fetchApi<Settings>("/api/settings", { next: { revalidate: 300 } });
}

export async function updateSettings(payload: Partial<Settings>): Promise<ApiResponse<{ settings: Settings }>> {
  return fetchApi<{ settings: Settings }>("/api/settings", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function getAccountTrends(accountId: string, days: number = 7): Promise<ApiResponse<TrendResponse>> {
  return fetchApi<TrendResponse>(`/api/accounts/${accountId}/trends?days=${days}`, { next: { revalidate: 300 } });
}

export async function getCampaignThresholds(accountId: string): Promise<ApiResponse<CampaignThreshold[]>> {
  return fetchApi<CampaignThreshold[]>(`/api/accounts/${accountId}/campaign-thresholds`, { next: { revalidate: 300 } });
}

export async function setCampaignThreshold(accountId: string, campaignName: string, threshold: number): Promise<ApiResponse<{ data: CampaignThreshold }>> {
  return fetchApi<{ data: CampaignThreshold }>(`/api/accounts/${accountId}/campaign-thresholds`, {
    method: "PUT",
    body: JSON.stringify({ campaign_name: campaignName, cpl_threshold: threshold }),
  });
}

export async function getAccountBudget(accountId: string): Promise<ApiResponse<BudgetInfo>> {
  return fetchApi<BudgetInfo>(`/api/accounts/${accountId}/budget`);
}

export async function getActiveAdIds(accountId: string): Promise<ApiResponse<string[]>> {
  return fetchApi<string[]>(`/api/accounts/${accountId}/active-ads`);
}

export async function getComparison(accountIds: string[], days: number = 7): Promise<ApiResponse<CompareAccount[]>> {
  return fetchApi<CompareAccount[]>(`/api/compare?accounts=${accountIds.join(",")}&days=${days}`);
}

export async function enhanceText(text: string, mode: "full" | "basic" = "full"): Promise<ApiResponse<{ enhancedText: string }>> {
  return fetchApi<{ enhancedText: string }>("/api/tools/enhance-text", {
    method: "POST",
    body: JSON.stringify({ text, mode }),
  });
}

export async function triggerAlertEngine(): Promise<ApiResponse<{ message: string }>> {
  const res = await fetch("/api/actions/run-alert-engine", { method: "POST" });
  const data = await res.json();
  if (!res.ok) return { success: false, error: data.error || `Error ${res.status}` };
  return { success: true, data };
}

export async function triggerWeeklyReport(): Promise<ApiResponse<{ message: string }>> {
  const res = await fetch("/api/actions/run-weekly-report", { method: "POST" });
  const data = await res.json();
  if (!res.ok) return { success: false, error: data.error || `Error ${res.status}` };
  return { success: true, data };
}
