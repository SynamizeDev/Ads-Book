import { getAccounts, getLatestCplLogs, getDashboardSummary, getUrgentAlerts, getAccountHealth, getSystemStatus, Account, CplLog, DashboardSummary, UrgentAlert, AccountHealth, SystemStatus } from "@/lib/api";
import Link from "next/link";
import SystemStatusWidget from "./components/SystemStatusWidget";
import RefreshTrigger from "./components/RefreshTrigger";
import QuickActionsPanel from "./components/QuickActionsPanel";
import { getCachedUser } from "@/lib/supabase-server";

function WelcomeBanner({ displayName }: { displayName: string }) {
  const now = new Date();
  const dateString = now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/30 rounded-[28px] p-10 border border-white/5 mb-10 shadow-2xl group">
      {/* Dynamic Animated Glows */}
      <div className="absolute -right-20 -top-20 w-80 h-80 bg-accent/20 rounded-full blur-[100px] group-hover:bg-accent/30 transition-all duration-1000 animate-pulse" />
      <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-blue-500/10 rounded-full blur-[100px] group-hover:bg-blue-500/20 transition-all duration-1000" />

      <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div className="space-y-2">
          <h2 className="text-[32px] font-bold text-white tracking-tight leading-tight">
            Welcome, <span className="bg-gradient-to-r from-accent to-blue-400 bg-clip-text text-transparent font-black">{displayName}</span>
          </h2>
          <div className="text-slate-400 text-[16px] font-medium flex items-center gap-2.5">
            <div className="p-1.5 bg-white/5 rounded-lg border border-white/10">
              <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <span suppressHydrationWarning>{dateString}</span>
          </div>
        </div>

        <div className="flex items-center gap-5 bg-white/5 backdrop-blur-xl border border-white/10 p-5 pr-8 rounded-[24px] shadow-2xl transform hover:scale-[1.03] transition-all duration-500 hover:border-white/20">
          <div className="w-12 h-12 bg-accent/20 rounded-2xl flex items-center justify-center relative overflow-hidden">
            <div className="w-3 h-3 bg-accent rounded-full shadow-[0_0_15px_rgba(var(--accent-rgb),0.8)] animate-pulse z-10" />
            <div className="absolute inset-0 bg-accent/30 rounded-full animate-ping opacity-20" />
          </div>
          <div>
            <span className="text-[10px] text-accent font-black uppercase tracking-[0.2em] mb-1 block">System Status</span>
            <span className="text-[16px] font-bold text-white flex items-center gap-2">
              Alert Engine Live
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function AccountHealthSection({ healthData }: { healthData: AccountHealth[] }) {
  if (healthData.length === 0) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-[17px] font-semibold text-foreground">Account Overview</h2>
        <span className="text-xs text-muted font-medium">{healthData.length} account{healthData.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {healthData.map((acc) => (
          <Link key={acc.id} href={`/accounts/${acc.id}`} className="block group h-full">
            <div className="bg-card rounded-[20px] p-6 hover:shadow-lg shadow-sm transition-all h-full flex flex-col border border-border">
              <div className="flex justify-between items-start mb-5">
                <h3 className="font-semibold text-foreground text-[14px] leading-tight pr-3 group-hover:text-accent transition-colors">
                  {acc.account_name}
                </h3>
                <span className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium ${acc.status === 'CRITICAL' ? 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400' :
                  acc.status === 'WATCH' ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' :
                    'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                  }`}>
                  {acc.status === 'CRITICAL' ? 'Critical' : acc.status === 'WATCH' ? 'Watch' : 'Healthy'}
                </span>
              </div>

              <div className="flex items-center gap-5 mb-5">
                <div className="relative w-14 h-14 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="28" cy="28" r="24" className="stroke-border" strokeWidth="3" fill="transparent" />
                    <circle cx="28" cy="28" r="24" strokeWidth="3" fill="transparent"
                      strokeDasharray={150.8}
                      strokeDashoffset={150.8 - (150.8 * acc.health_score) / 100}
                      strokeLinecap="round"
                      className={`transition-all duration-700 ${acc.health_score < 60 ? 'stroke-red-500' :
                        acc.health_score < 85 ? 'stroke-amber-500' : 'stroke-green-500'
                        }`}
                    />
                  </svg>
                  <span className="absolute text-[15px] font-bold text-foreground">{acc.health_score}</span>
                </div>
                <div>
                  <span className="text-xs text-muted block mb-0.5">Active Alerts</span>
                  <span className={`text-2xl font-bold tabular-nums ${acc.active_alerts > 0 ? 'text-red-600 dark:text-red-400' : 'text-foreground'}`}>
                    {acc.active_alerts}
                  </span>
                </div>
              </div>

              <div className="space-y-3 border-t border-border pt-4 mt-auto text-[13px]">
                <div className="flex justify-between items-center">
                  <span className="text-muted">Spend</span>
                  <span className="font-semibold text-foreground tabular-nums">${(acc.spend_this_month ?? acc.spend_today).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted">Leads</span>
                  <span className="font-semibold text-foreground tabular-nums">{acc.leads_today}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted">Avg CPL</span>
                  <span className={`font-semibold tabular-nums ${acc.avg_cpl_today > acc.avg_cpl_7d * 1.2 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                    ${acc.avg_cpl_today.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function UrgentAlertsSection({ alerts }: { alerts: UrgentAlert[] }) {
  if (alerts.length === 0) {
    return (
      <div className="bg-green-50 dark:bg-green-900/20 rounded-[20px] p-12 text-center mb-8 border border-green-100 dark:border-green-800">
        <div className="flex flex-col items-center">
          <div className="w-14 h-14 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-green-800 dark:text-green-300 mb-1">All Clear</h3>
          <p className="text-sm text-green-600 dark:text-green-400">No critical alerts in the last 6 hours</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 mb-8">
      <div className="flex items-center justify-between">
        <h2 className="text-[17px] font-semibold text-foreground">Recent Alerts</h2>
        <Link href="/alerts" className="text-[13px] text-accent hover:opacity-80 font-medium transition-colors flex items-center gap-1">
          View all →
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {alerts.slice(0, 6).map((alert) => (
          <div
            key={alert.id}
            className={`bg-card rounded-[20px] p-5 shadow-sm hover:shadow-md transition-all border ${alert.severity === 'CRITICAL' ? 'border-l-4 border-l-red-500 border-red-100 dark:border-red-800' : 'border-l-4 border-l-amber-400 border-amber-100 dark:border-amber-800'
              }`}
          >
            <div className="flex justify-between items-center mb-3">
              <span className={`px-2.5 py-1 rounded-full text-[11px] font-medium ${alert.severity === 'CRITICAL' ? 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                {alert.severity === 'CRITICAL' ? 'Critical' : 'Warning'}
              </span>
              <span className="text-xs text-muted tabular-nums" suppressHydrationWarning>
                {new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            <h3 className="font-semibold text-foreground text-[14px] mb-2">{alert.account_name}</h3>
            <div className="space-y-1 mb-4">
              <p className="text-xs text-muted line-clamp-1" title={alert.campaign_name}>
                <span className="text-muted/60 mr-1">Campaign</span>{alert.campaign_name}
              </p>
              {alert.adset_name && (
                <p className="text-xs text-muted line-clamp-1" title={alert.adset_name}>
                  <span className="text-muted/60 mr-1">Ad Set</span>{alert.adset_name}
                </p>
              )}
              {alert.ad_name && (
                <p className="text-xs text-muted line-clamp-1" title={alert.ad_name}>
                  <span className="text-muted/60 mr-1">Ad</span>{alert.ad_name}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-border">
              <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${alert.issue_type.includes('Zero') ? 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                {alert.issue_type}
              </span>
              <a
                href={(() => {
                  const base = "https://adsmanager.facebook.com/adsmanager/manage/ads";
                  const params = new URLSearchParams();
                  if (alert.account_meta_id) params.set("act", alert.account_meta_id);
                  if (alert.campaign_meta_id) params.set("selected_campaign_ids", alert.campaign_meta_id);
                  if (alert.adset_meta_id) params.set("selected_adset_ids", alert.adset_meta_id);
                  const qs = params.toString();
                  return qs ? `${base}?${qs}` : base;
                })()}
                target="_blank" rel="noopener noreferrer"
                className="text-[13px] text-accent hover:opacity-80 font-medium transition-colors">
                Resolve ↗
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ExecutiveSummary({ summary }: { summary: DashboardSummary }) {
  const cards = [
    {
      label: "High CPL Alerts",
      value: summary.high_cpl_alerts,
      iconBg: "bg-red-50 dark:bg-red-900/30",
      icon: (
        <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      ),
    },
    {
      label: "Zero Lead Alerts",
      value: summary.zero_lead_alerts,
      iconBg: "bg-orange-50 dark:bg-orange-900/30",
      icon: (
        <svg className="w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      ),
    },
    {
      label: "Ad(s) at Risk",
      value: summary.ads_at_risk,
      iconBg: "bg-amber-50 dark:bg-amber-900/30",
      icon: (
        <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: "Ad(s) Paused",
      value: summary.ads_paused,
      iconBg: "bg-purple-50 dark:bg-purple-900/30",
      icon: (
        <svg className="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: "Active Accounts",
      value: summary.total_accounts,
      iconBg: "bg-blue-50 dark:bg-blue-900/30",
      icon: (
        <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-5 mb-10">
      {cards.map((card) => (
        <div key={card.label} className="bg-card rounded-[20px] p-6 shadow-sm hover:shadow-md transition-all border border-border">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 ${card.iconBg} rounded-[14px] flex items-center justify-center`}>
              {card.icon}
            </div>
            <div>
              <h3 className="text-3xl font-bold text-foreground tabular-nums leading-none mb-1.5">
                {card.value}
              </h3>
              <p className="text-[13px] text-muted font-medium">{card.label}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function Home() {
  const range = "last_30d";

  // getCachedUser() reuses the same Auth result already fetched by layout.tsx
  // in the same request — zero extra network round-trip
  let displayName = "User";
  try {
    const user = await getCachedUser();
    if (user?.email) {
      const namePart = user.email.split("@")[0];
      displayName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
    }
    if (user?.user_metadata?.full_name) {
      displayName = user.user_metadata.full_name;
    }
  } catch {
    // fallback to "User"
  }

  const [summaryRes, urgentRes, healthRes, statusRes] = await Promise.all([
    getDashboardSummary(range),
    getUrgentAlerts(),
    getAccountHealth(range),
    getSystemStatus()
  ]);

  const summary = summaryRes.data || { total_accounts: 0, high_cpl_alerts: 0, zero_lead_alerts: 0, ads_paused: 0, ads_at_risk: 0 };
  const urgentAlerts = urgentRes.data || [];
  const healthData = healthRes.data || [];
  const systemStatus = statusRes.data || {
    last_sync: "Unknown",
    meta_status: "Unknown",
    telegram_status: "Unknown",
    frequency: "Unknown"
  };

  return (
    <div className="flex flex-col min-h-screen pb-20">
      <RefreshTrigger intervalMs={900000} />
      <div className="px-10 py-10 max-w-[1400px] mx-auto space-y-10 w-full">

        {/* Header */}
        <div className="flex justify-between items-center pb-2">
          <div>
            <h1 className="text-[26px] font-bold text-foreground mb-1 tracking-tight">Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            <QuickActionsPanel />
            <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-4 py-2 rounded-full text-[13px] font-medium border border-green-100 dark:border-green-800">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              Live
            </div>
          </div>
        </div>

        <WelcomeBanner displayName={displayName} />
        <ExecutiveSummary summary={summary} />
        <UrgentAlertsSection alerts={urgentAlerts} />
        <AccountHealthSection healthData={healthData} />
      </div>

      <SystemStatusWidget status={systemStatus} />
    </div>
  );
}
