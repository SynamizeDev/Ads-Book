require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cron = require("node-cron");
const supabase = require("./config/supabaseClient");
const { sendTelegramMessage } = require("./utils/telegram");
const { fetchAdInsights, fetchAccountName, getActiveCampaignIds } = require("./services/metaService");
const { evaluateAndPauseAd } = require("./services/autoPauseService");
const { requireAuth } = require("./middleware/auth");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initial SDK setup - we only need the key here
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const app = express();
const PORT = 5001; // Force 5001 to avoid collisions

// DIAGNOSTIC startup: List available models to console
async function diagnosticListModels() {
  const key = (process.env.GEMINI_API_KEY || "").trim();
  if (!key) return;

  try {
    const tempGenAI = new GoogleGenerativeAI(key);
    // There is no easy 'listModels' in this SDK usually, 
    // but the error message said "Call ListModels to see...".
    // Usually that requires the Google Cloud SDK or raw REST.
    // We will stick to the strategy but add more "flash" variants.
    console.log("🚀 Backend active. AI Key ends with:", key.substring(key.length - 4));
  } catch (e) {
    console.error("DIAGNOSTIC FAILED:", e);
  }
}
diagnosticListModels();

app.use(cors());
app.use(express.json());

// Apply auth middleware to all /api/ routes
app.use("/api", requireAuth);

app.get("/", (req, res) => {
  res.json({ message: "AdPulse Backend Running 🚀" });
});

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

// Track last sync time
let lastSyncTime = new Date();

// Simple in-memory cache for expensive dashboard data
const dashboardCache = {
  health: { data: null, timestamp: 0, ttl: 5 * 60 * 1000 }, // 5 min
  summary: { data: null, timestamp: 0, ttl: 5 * 60 * 1000 }
};

app.get("/api/system/ai-check", (req, res) => {
  res.json({
    configured: !!process.env.GEMINI_API_KEY,
    key_suffix: process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.slice(-4) : "None",
    pid: process.pid,
    env_keys: Object.keys(process.env).filter(k => k.includes("GEMINI"))
  });
});

app.get("/api/system/status", (req, res) => {
  const timeAgo = lastSyncTime ? Math.floor((new Date() - lastSyncTime) / 60000) : 0;
  const timeUnit = timeAgo === 1 ? "min" : "mins";

  res.json({
    last_sync: `${timeAgo} ${timeUnit} ago`,
    meta_status: process.env.META_ACCESS_TOKEN ? "Connected" : "Disconnected",
    telegram_status: process.env.TELEGRAM_BOT_TOKEN ? "Active" : "Inactive",
    frequency: "Every 15 mins" // Verify this matches cron
  });
});

// Helper to convert markdown bold **text** to Unicode Bold
function convertToUnicodeBold(text) {
  if (!text) return "";
  // Handle both ** and __ markdown styles
  return text.replace(/(\*\*|__)(.*?)\1/g, (match, marker, content) => {
    return Array.from(content).map(char => {
      const code = char.charCodeAt(0);
      // Uppercase A-Z -> Bold Serif 𝐁
      if (code >= 65 && code <= 90) return String.fromCodePoint(0x1D400 + (code - 65));
      // Lowercase a-z -> Bold Serif 𝐛
      if (code >= 97 && code <= 122) return String.fromCodePoint(0x1D41A + (code - 97));
      // Numbers 0-9 -> Bold Serif 𝟎
      if (code >= 48 && code <= 57) return String.fromCodePoint(0x1D7CE + (code - 48));
      return char;
    }).join("");
  });
}

// AI Text Enhancement Tool
app.post("/api/tools/enhance-text", async (req, res) => {
  const { text, mode = "full" } = req.body;

  if (!text) {
    return res.status(400).json({ error: "Text is required for enhancement" });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({
      error: "AI feature not configured. Please add GEMINI_API_KEY to your backend environment."
    });
  }

  try {
    console.log("🤖 AI Enhancement Request for text length:", text.length);

    // 1. Trim and Clean the API Key (Sometimes Render env vars have hidden spaces/newlines)
    const rawApiKey = (process.env.GEMINI_API_KEY || "").trim();
    if (!rawApiKey) {
      console.error("❌ GEMINI_API_KEY is missing from environment variables!");
      return res.status(500).json({
        error: "Critical Config Missing: GEMINI_API_KEY is not set in Render environment variables."
      });
    }

    // 2. DIAGNOSTIC: Verify key format (Gemini keys MUST start with AIza)
    const isFormatOk = rawApiKey.startsWith("AIza");
    console.log("🔍 KEY DIAGNOSTIC:", {
      startsWithAIza: isFormatOk,
      length: rawApiKey.length,
      prefix: rawApiKey.substring(0, 4) + "..."
    });

    if (!isFormatOk) {
      console.error("❌ INVALID API KEY FORMAT: The key does NOT start with 'AIza'. It is likely a Client ID or Project ID, not a Gemini Key.");
      return res.status(500).json({
        error: "Invalid API Key Format: Please ensure you are using a Gemini API Key from AI Studio (should start with 'AIza')."
      });
    }

    // 3. REST API Approach (More robust for 404 debugging)
    const axios = require("axios");

    const restStrategies = [
      { url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${rawApiKey}`, name: 'Gemini 2.0 Flash (v1beta)' },
      { url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${rawApiKey}`, name: 'Flash Latest (v1beta)' },
      { url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-latest:generateContent?key=${rawApiKey}`, name: 'Pro Latest (v1beta)' },
      { url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${rawApiKey}`, name: 'Gemini 2.5 Flash (v1beta)' }
    ];

    // Unified Prompt Strategy
    let promptText = "";
    if (mode === "basic") {
      promptText = `You are an expert Meta Ads copywriter. 
      Your task is to take the following ad copy and BOLD the most essential keywords, prices, calls to action, or benefits.
      
      CRITICAL RULES:
      - Do NOT change any words. Keep the text 100% identical to the original.
      - Use markdown bold tags like **text** for parts you want bolded.
      - Do NOT use any other markdown (no headers, no lists, no italics).
      - Output ONLY the modified text.
      
      Original Text:
      "${text}"`;
    } else {
      promptText = `You are a world-class ad copywriter specializing in Meta (Facebook/Instagram) ads. 
      Your goal is to enhance the following ad copy to be more engaging, persuasive, and conversion-oriented.
      
      - Keep the core message intact.
      - Use active voice and strong calls to action.
      - Add relevant emojis if appropriate.
      - Use markdown bold tags like **text** for keys, benefits, or headlines you want to stand out.
      - Do NOT use headers (#), lists (- or 1.), or any other markdown.
      - Output ONLY the enhanced text. No explanations.
      
      Raw Copy:
      "${text}"`;
    }

    const requestBody = {
      contents: [{
        parts: [{ text: promptText }]
      }]
    };

    let lastError = null;
    let successfulResponse = null;

    for (const strategy of restStrategies) {
      try {
        console.log(`📡 Trying REST AI strategy: ${strategy.name}...`);
        const response = await axios.post(strategy.url, requestBody, {
          headers: { 'Content-Type': 'application/json' }
        });

        if (response.data && response.data.candidates && response.data.candidates[0].content && response.data.candidates[0].content.parts[0].text) {
          successfulResponse = response.data.candidates[0].content.parts[0].text;
          console.log(`✨ AI Enhancement SUCCESS via ${strategy.name}!`);
          break;
        }
      } catch (err) {
        const errData = err.response ? err.response.data : err.message;
        console.warn(`⚠️ REST Strategy ${strategy.name} failed:`, typeof errData === 'object' ? JSON.stringify(errData) : errData);
        lastError = err;
      }
    }

    if (!successfulResponse) {
      console.warn("🔎 DIAGNOSTIC: All models 404ed. Attempting to list available models for this key...");
      try {
        const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${rawApiKey}`;
        const listRes = await axios.get(listUrl);
        console.log("📄 AVAILABLE MODELS LIST:", JSON.stringify(listRes.data.models.map(m => m.name)));
      } catch (listErr) {
        console.error("❌ Model listing also failed:", listErr.message);
      }
      throw lastError || new Error("All AI strategies failed.");
    }

    // POST-PROCESS: Convert markdown bold to Unicode Bold
    const processedText = convertToUnicodeBold(successfulResponse.trim());

    res.json({ enhancedText: processedText });
  } catch (error) {
    const errorDetail = error.response ? JSON.stringify(error.response.data) : error.message;
    console.error("❌ THE ULTIMATE AI ERROR:", errorDetail);
    res.status(500).json({
      error: "AI Enhancement failed. The server said: " + (error.response?.data?.error?.message || error.message),
      details: error.response?.data || error.message
    });
  }
});

// Get current user/agency profile (simulated auth)
app.get("/api/me", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("agencies")
      .select("name, id")
      .limit(1)
      .single();

    if (error) throw error;

    res.json(data || { name: "Guest Agency" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/test-telegram", async (req, res) => {
  try {
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!chatId || chatId === "your_chat_id") {
      return res
        .status(400)
        .json({ error: "TELEGRAM_CHAT_ID is missing in .env" });
    }

    await sendTelegramMessage(chatId, "Ads Book test alert 🚨");
    res.json({ message: "Telegram alert sent successfully!" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper to resolve generic ID (Meta ID) to UUID
async function resolveAccountUuid(idInput) {
  // If valid UUID (approximate check), return as is
  if (idInput.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
    return idInput;
  }

  // Otherwise, assume it's a Meta Account ID and lookup UUID
  const { data } = await supabase
    .from("ad_accounts")
    .select("id")
    .eq("account_id", idInput)
    .single();

  return data ? data.id : null;
}

// API Routes for Dashboard

// Get dashboard summary metrics
app.get("/api/dashboard/summary", async (req, res) => {
  try {
    const range = req.query.range || "today";

    // Check Cache
    if (dashboardCache.summary.data &&
      dashboardCache.summary.timestamp > (Date.now() - dashboardCache.summary.ttl) &&
      dashboardCache.summary.range === range) {
      console.log("🚀 Serving dashboard summary from cache");
      return res.json(dashboardCache.summary.data);
    }

    // Map range to alert cutoff (consistent with account-health)
    const rangeToMs = {
      today: 24 * 60 * 60 * 1000,
      yesterday: 48 * 60 * 60 * 1000,
      last_7d: 7 * 24 * 60 * 60 * 1000,
      last_14d: 14 * 24 * 60 * 60 * 1000,
      last_30d: 30 * 24 * 60 * 60 * 1000,
      maximum: 365 * 24 * 60 * 60 * 1000,
    };

    const cutoffMs = rangeToMs[range] || rangeToMs.today;
    const alertCutoff = new Date(Date.now() - cutoffMs).toISOString();

    const { data: accounts, count: totalAccounts, error: accountsError } = await supabase
      .from("ad_accounts")
      .select("*", { count: "exact" })
      .eq("is_active", true);

    if (accountsError) throw accountsError;

    const { data: alertsLogs, error: alertsError } = await supabase
      .from("alert_logs")
      .select("alert_type, ad_accounts!inner(is_active)")
      .eq("ad_accounts.is_active", true)
      .gte("created_at", alertCutoff);

    if (alertsError) throw alertsError;

    const highCplCount = alertsLogs.filter(a => a.alert_type === "HIGH_CPL").length;
    const zeroLeadCount = alertsLogs.filter(a => a.alert_type === "ZERO_LEADS").length;

    const { count: adsPausedCount, error: pauseError } = await supabase
      .from("auto_pause_logs")
      .select("id", { count: "exact", head: true })
      .gte("paused_at", alertCutoff);

    if (pauseError) throw pauseError;

    const { fetchAdInsights } = require("./services/metaService");

    const { data: campaignThresholds, error: thresholdsError } = await supabase
      .from("campaign_thresholds")
      .select("*");

    if (thresholdsError) throw thresholdsError;

    let adsAtRiskCount = 0;

    // Parallel fetching for risk calculation
    const insightsResults = await Promise.all(
      accounts.map(acc => fetchAdInsights(acc.account_id, range).catch(() => []))
    );

    insightsResults.forEach((ads, index) => {
      const account = accounts[index];
      if (!ads || !Array.isArray(ads)) return;

      ads.forEach(ad => {
        if (ad.leads === 0) return;
        const campaignT = campaignThresholds.find(
          t => t.ad_account_id === account.id && t.campaign_name === ad.campaign_name
        );
        const threshold = campaignT ? campaignT.cpl_threshold : account.cpl_threshold;
        if (!threshold) return;
        const cpl = ad.spend / ad.leads;
        if (cpl > (threshold * 0.8) && cpl <= threshold) {
          adsAtRiskCount++;
        }
      });
    });

    const summaryData = {
      total_accounts: totalAccounts || 0,
      high_cpl_alerts: highCplCount || 0,
      zero_lead_alerts: zeroLeadCount || 0,
      ads_paused: adsPausedCount || 0,
      ads_at_risk: adsAtRiskCount || 0
    };

    // Update Cache
    dashboardCache.summary.data = summaryData;
    dashboardCache.summary.timestamp = Date.now();
    dashboardCache.summary.range = range;

    res.json(summaryData);

  } catch (error) {
    console.error("❌ Error fetching summary:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get urgent alerts (Critical/Warning in last 6h)
app.get("/api/dashboard/urgent-alerts", async (req, res) => {
  try {
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();

    const { data: alerts, error } = await supabase
      .from("alert_logs")
      .select(`
        id,
        alert_type,
        campaign_name,
        adset_name,
        ad_name,
        created_at,
        ad_accounts!inner(account_name, is_active)
      `)
      .eq("ad_accounts.is_active", true)
      .gte("created_at", sixHoursAgo)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Filter duplicates: Keep only the latest alert per ad + alert_type
    const uniqueAlertsMap = new Map();

    alerts.forEach(alert => {
      // Create a unique key for the "issue"
      // Use ad_name or campaign_name depending on granularity. 
      // Using ad_name + alert_type ensures we see distinct issues but not repeated logs of the same one.
      const key = `${alert.ad_name}-${alert.alert_type}`;

      if (!uniqueAlertsMap.has(key)) {
        uniqueAlertsMap.set(key, alert);
      }
    });

    const uniqueAlerts = Array.from(uniqueAlertsMap.values());

    const formattedAlerts = uniqueAlerts.map(alert => {
      let severity = "WARNING";
      let issueType = "High CPL";

      if (alert.alert_type === "ZERO_LEADS") {
        severity = "CRITICAL";
        issueType = "Zero Leads (High Spend)";
      } else if (alert.alert_type === "HIGH_CPL") {
        severity = "WARNING";
        issueType = "CPL Spike";
      }

      return {
        id: alert.id,
        severity,
        account_name: alert.ad_accounts.account_name,
        campaign_name: alert.campaign_name,
        issue_type: issueType,
        created_at: alert.created_at
      };
    });

    res.json(formattedAlerts);

  } catch (error) {
    console.error("❌ Error fetching urgent alerts:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get account health overview
app.get("/api/dashboard/account-health", async (req, res) => {
  try {
    const range = req.query.range || "today";
    const cacheKey = `health_${range}`;

    // Check cache
    if (dashboardCache.health.data &&
      dashboardCache.health.timestamp > (Date.now() - dashboardCache.health.ttl) &&
      dashboardCache.health.range === range) {
      console.log("🚀 Serving account health from cache");
      return res.json(dashboardCache.health.data);
    }

    // Map range to alert cutoff (milliseconds)
    const rangeToMs = {
      today: 24 * 60 * 60 * 1000,
      yesterday: 48 * 60 * 60 * 1000,
      last_7d: 7 * 24 * 60 * 60 * 1000,
      last_14d: 14 * 24 * 60 * 60 * 1000,
      last_30d: 30 * 24 * 60 * 60 * 1000,
      maximum: 365 * 24 * 60 * 60 * 1000,
    };

    const cutoffMs = rangeToMs[range] || rangeToMs.today;
    const alertCutoff = new Date(Date.now() - cutoffMs).toISOString();

    const { data: accounts, error: accError } = await supabase
      .from("ad_accounts")
      .select("*")
      .eq("is_active", true);

    if (accError) throw accError;

    const { data: alerts, error: alertError } = await supabase
      .from("alert_logs")
      .select("ad_account_id, alert_type")
      .gte("created_at", alertCutoff);

    if (alertError) throw alertError;

    const alertCounts = {};
    alerts.forEach(a => {
      if (!alertCounts[a.ad_account_id]) alertCounts[a.ad_account_id] = 0;
      alertCounts[a.ad_account_id]++;
    });

    const { fetchAdInsights } = require("./services/metaService");

    // PARALLEL FETCHING: Process all accounts simultaneously
    const healthData = await Promise.all(accounts.map(async (acc) => {
      try {
        const campaignIds = await getActiveCampaignIds(acc.account_id);

        const [rangeInsights, sevenDayInsights, monthInsights] = await Promise.all([
          fetchAdInsights(acc.account_id, range, campaignIds),
          fetchAdInsights(acc.account_id, "last_7d", campaignIds),
          fetchAdInsights(acc.account_id, "this_month", campaignIds)
        ]);

        const aggregate = (insights) => {
          if (!insights) return { spend: 0, leads: 0, cpl: 0 };
          const spend = insights.reduce((sum, item) => sum + item.spend, 0);
          const leads = insights.reduce((sum, item) => sum + item.leads, 0);
          const cpl = leads > 0 ? spend / leads : 0;
          return { spend, leads, cpl };
        };

        const currentRangeData = aggregate(rangeInsights);
        const sevenDayData = aggregate(sevenDayInsights);
        const monthData = aggregate(monthInsights);
        const activeAlerts = alertCounts[acc.id] || 0;

        let healthScore = 100;
        healthScore -= (activeAlerts * 10);
        let status = "HEALTHY";

        if (acc.cpl_threshold && currentRangeData.leads > 0 && currentRangeData.cpl > acc.cpl_threshold) {
          healthScore -= 20;
          if (currentRangeData.cpl > acc.cpl_threshold * 1.5) status = "CRITICAL";
          else status = "WATCH";
        }

        if (activeAlerts > 0) status = status === "CRITICAL" ? "CRITICAL" : "WATCH";
        if (activeAlerts >= 3) status = "CRITICAL";

        healthScore = Math.max(0, Math.min(100, healthScore));
        if (status === "CRITICAL") healthScore = Math.min(healthScore, 60);

        return {
          id: acc.id,
          account_id: acc.account_id,
          account_name: acc.account_name,
          health_score: healthScore,
          active_alerts: activeAlerts,
          spend_today: parseFloat(currentRangeData.spend.toFixed(2)),
          leads_today: currentRangeData.leads,
          avg_cpl_today: parseFloat(currentRangeData.cpl.toFixed(2)),
          avg_cpl_7d: parseFloat(sevenDayData.cpl.toFixed(2)),
          spend_this_month: parseFloat(monthData.spend.toFixed(2)),
          status
        };
      } catch (err) {
        console.error(`Error processing health for account ${acc.account_name}:`, err.message);
        return {
          id: acc.id,
          account_name: acc.account_name,
          health_score: 0,
          active_alerts: 0,
          spend_today: 0,
          leads_today: 0,
          avg_cpl_today: 0,
          avg_cpl_7d: 0,
          status: "UNKNOWN"
        };
      }
    }));

    healthData.sort((a, b) => {
      const statusOrder = { "CRITICAL": 0, "WATCH": 1, "HEALTHY": 2, "UNKNOWN": 3 };
      if (statusOrder[a.status] !== statusOrder[b.status]) {
        return statusOrder[a.status] - statusOrder[b.status];
      }
      return b.health_score - a.health_score;
    });

    // Update Cache
    dashboardCache.health.data = healthData;
    dashboardCache.health.timestamp = Date.now();
    dashboardCache.health.range = range;

    res.json(healthData);

  } catch (error) {
    console.error("❌ Error fetching account health:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get all ad accounts
app.get("/api/accounts", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("ad_accounts")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json(data || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new ad account
app.post("/api/accounts", async (req, res) => {
  try {
    const { name, ad_account_id, cpl_threshold, drive_link, sheet_link } = req.body;
    const platform = "meta";

    // Validation
    if (!name || typeof name !== "string") {
      return res.status(400).json({ error: "Invalid or missing 'name'" });
    }
    if (!ad_account_id || typeof ad_account_id !== "string") {
      return res.status(400).json({ error: "Invalid or missing 'ad_account_id'" });
    }
    if (!cpl_threshold || typeof cpl_threshold !== "number" || cpl_threshold <= 0) {
      return res.status(400).json({ error: "Invalid 'cpl_threshold'. Must be > 0." });
    }

    // 🔹 Validate with Meta Graph API (soft check — if token lacks permission, proceed with a warning)
    console.log(`🔍 Validating access for account: ${ad_account_id}...`);
    const { name: metaAccountName, error: metaValidationError } = await fetchAccountName(ad_account_id);

    let metaWarning = null;
    if (metaValidationError) {
      console.warn(`⚠️ Meta validation failed for ${ad_account_id}: ${metaValidationError}`);
      metaWarning = `Meta validation skipped: ${metaValidationError}`;
    } else {
      console.log(`✅ Meta validation successful. Account Name: ${metaAccountName}`);
    }

    // 🔹 Fetch first agency
    const { data: agency, error: agencyError } = await supabase
      .from("agencies")
      .select("id")
      .limit(1)
      .single();

    if (agencyError || !agency) {
      console.warn("⚠️ No agency found when creating account.");
      return res.status(400).json({
        error: "No agency found. Please create an agency first."
      });
    }

    // Insert into DB
    const { data, error } = await supabase
      .from("ad_accounts")
      .insert([
        {
          account_name: name,
          account_id: ad_account_id,
          cpl_threshold: cpl_threshold,
          is_active: true,
          platform,
          agency_id: agency.id,
          drive_link: drive_link || null,
          sheet_link: sheet_link || null
        }
      ])
      .select()
      .single();

    if (error) throw error;

    console.log(`✅ Created new account: ${name} (${ad_account_id}) linked to Agency ${agency.id}`);

    res.status(201).json({
      success: true,
      account: data,
      message: "Ad account created successfully",
      ...(metaWarning && { warning: metaWarning })
    });

  } catch (error) {
    // Unique constraint violation (e.g. account_id already exists)
    if (error.code === '23505') {
      return res.status(409).json({ error: "Account ID already exists." });
    }
    console.error("❌ Error creating account:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get latest CPL logs
app.get("/api/cpl-logs", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 500);
    let accountId = req.query.account_id || req.query.accountId; // Support both

    let finalUuid = null;
    if (accountId) {
      finalUuid = await resolveAccountUuid(accountId);
      if (!finalUuid) {
        return res.json([]);
      }
    }

    let query = supabase
      .from("cpl_logs")
      .select("*, ad_accounts!inner(is_active)")
      .eq("ad_accounts.is_active", true)
      .order("checked_at", { ascending: false })
      .limit(limit);

    if (finalUuid) {
      query = query.eq("ad_account_id", finalUuid);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json(data || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get alert logs
app.get("/api/alerts", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 500);
    const offset = parseInt(req.query.offset) || 0;
    let accountId = req.query.account_id || req.query.accountId;

    let finalUuid = null;
    if (accountId) {
      finalUuid = await resolveAccountUuid(accountId);
      if (!finalUuid) return res.json([]);
    }

    const rangeStart = offset;
    const rangeEnd = offset + limit - 1;

    let query = supabase
      .from("alert_logs")
      .select("*, ad_accounts!inner(is_active)")
      .eq("ad_accounts.is_active", true);

    if (finalUuid) {
      query = query.eq("ad_account_id", finalUuid);
    }

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(rangeStart, rangeEnd);

    if (error) throw error;

    res.json(data || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update CPL Threshold for an account
app.patch("/api/accounts/:id/threshold", async (req, res) => {
  try {
    const accountId = req.params.id;
    const { newThreshold } = req.body;

    if (!newThreshold || typeof newThreshold !== "number" || newThreshold <= 0) {
      return res.status(400).json({
        error: "Invalid threshold. Must be a positive number."
      });
    }

    // Resolve to UUID first
    const uuid = await resolveAccountUuid(accountId);
    if (!uuid) {
      return res.status(404).json({ error: "Account not found" });
    }

    // Update in Supabase
    const { data, error } = await supabase
      .from("ad_accounts")
      .update({ cpl_threshold: newThreshold })
      .eq("id", uuid)
      .select();

    if (error) throw error;

    if (!data || data.length === 0) {
      return res.status(404).json({ error: "Account not found" });
    }

    console.log(`✅ Threshold updated for account ${accountId} (UUID: ${uuid}) → ${newThreshold}`);

    res.json({
      success: true,
      newThreshold,
      message: "Threshold updated successfully"
    });

  } catch (error) {
    console.error("❌ Error updating threshold:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// Update Account Name and Threshold
app.patch("/api/accounts/:id", async (req, res) => {
  try {
    const accountId = req.params.id;
    const { name, cpl_threshold, drive_link, sheet_link } = req.body;

    if (!name || typeof name !== "string" || name.trim() === "") {
      return res.status(400).json({ error: "Invalid name." });
    }

    if (!cpl_threshold || typeof cpl_threshold !== "number" || cpl_threshold <= 0) {
      return res.status(400).json({
        error: "Invalid threshold. Must be a positive number."
      });
    }

    // Resolve to UUID first
    const uuid = await resolveAccountUuid(accountId);
    if (!uuid) {
      return res.status(404).json({ error: "Account not found" });
    }

    // Update in Supabase
    const { data, error } = await supabase
      .from("ad_accounts")
      .update({
        account_name: name,
        cpl_threshold: cpl_threshold,
        drive_link: drive_link || null,
        sheet_link: sheet_link || null
      })
      .eq("id" === "id" ? "id" : "id", uuid) // Should be "id"
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ error: "Account not found" });
    }

    console.log(`✅ Account updated: ${name} (Threshold: ${cpl_threshold}) (UUID: ${uuid})`);

    res.json({
      success: true,
      updatedAccount: data,
      message: "Account updated successfully"
    });

  } catch (error) {
    console.error("❌ Error updating account:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// Toggle Auto-Pause for an account
app.patch("/api/accounts/:id/auto-pause", async (req, res) => {
  try {
    const accountId = req.params.id;
    const { enabled } = req.body;

    if (typeof enabled !== "boolean") {
      return res.status(400).json({
        error: "Invalid value. 'enabled' must be a boolean."
      });
    }

    // Resolve to UUID first
    const uuid = await resolveAccountUuid(accountId);
    if (!uuid) {
      return res.status(404).json({ error: "Account not found" });
    }

    const { data, error } = await supabase
      .from("ad_accounts")
      .update({ auto_pause_enabled: enabled })
      .eq("id", uuid)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ error: "Account not found" });
    }

    console.log(`✅ Auto-pause ${enabled ? "ENABLED" : "DISABLED"} for account ${accountId} (UUID: ${uuid})`);

    res.json({
      success: true,
      auto_pause_enabled: data.auto_pause_enabled,
      message: `Auto-pause ${enabled ? "enabled" : "disabled"} successfully`
    });

  } catch (error) {
    console.error("❌ Error toggling auto-pause:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// Soft Delete Account
app.delete("/api/accounts/:id", async (req, res) => {
  try {
    const accountId = req.params.id;

    // Resolve to UUID first (handles both Meta ID and UUID)
    const uuid = await resolveAccountUuid(accountId);

    if (!uuid) {
      return res.status(404).json({ error: "Account not found" });
    }

    // Soft delete: is_active = false
    const { error } = await supabase
      .from("ad_accounts")
      .update({ is_active: false })
      .eq("id", uuid);

    if (error) throw error;

    console.log(`🗑️ Account soft deleted: ${accountId} (UUID: ${uuid})`);

    res.json({
      success: true,
      message: "Account deleted successfully"
    });

  } catch (error) {
    console.error("❌ Error deleting account:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// ACTIVITY LOG
// ============================================================

async function logActivity(action, entityType, entityId, details = {}) {
  try {
    await supabase.from("activity_logs").insert([{
      action,
      entity_type: entityType,
      entity_id: entityId,
      details
    }]);
  } catch (err) {
    console.error("⚠️ Failed to log activity:", err.message);
  }
}

app.get("/api/activity-logs", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = parseInt(req.query.offset) || 0;
    const { data, error } = await supabase
      .from("activity_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// SETTINGS (Agency Config)
// ============================================================

app.get("/api/settings", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("agencies")
      .select("*")
      .limit(1)
      .single();

    if (error) throw error;

    res.json({
      name: data.name || "",
      telegram_chat_id: data.telegram_chat_id || "",
      default_cpl_threshold: data.default_cpl_threshold || 40,
      weekly_report_enabled: data.weekly_report_enabled || false,
      id: data.id
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch("/api/settings", async (req, res) => {
  try {
    const { name, telegram_chat_id, default_cpl_threshold, weekly_report_enabled } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (telegram_chat_id !== undefined) updateData.telegram_chat_id = telegram_chat_id;
    if (default_cpl_threshold !== undefined) updateData.default_cpl_threshold = default_cpl_threshold;
    if (weekly_report_enabled !== undefined) updateData.weekly_report_enabled = weekly_report_enabled;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    // Since there's only one agency record, fetch its ID first
    const { data: currentAgency, error: getError } = await supabase
      .from("agencies")
      .select("id")
      .limit(1)
      .single();

    if (getError) throw getError;

    const { data, error } = await supabase
      .from("agencies")
      .update(updateData)
      .eq("id", currentAgency.id)
      .select()
      .single();

    if (error) throw error;

    await logActivity("SETTINGS_UPDATE", "agency", data.id, updateData);

    res.json({ success: true, settings: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// ACTIVE ADS (Currently active ad IDs from Meta)
// ============================================================

app.get("/api/accounts/:id/active-ads", async (req, res) => {
  try {
    const accountId = req.params.id; // Could be Meta ID or UUID

    // If it looks like a UUID, resolve to Meta account ID
    let metaAccountId = accountId;
    if (accountId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      const { data: accData } = await supabase
        .from("ad_accounts")
        .select("account_id")
        .eq("id", accountId)
        .single();
      if (!accData) return res.json([]);
      metaAccountId = accData.account_id;
    }

    const activeAds = await fetchAdInsights(metaAccountId, "this_month");
    const adIds = (activeAds || []).map(ad => ad.ad_id).filter(Boolean);

    console.log(`📊 Active ads for ${metaAccountId}: ${adIds.length} found`);
    res.json(adIds);

  } catch (error) {
    console.error("❌ Error fetching active ads:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// TRENDS (Spend & CPL over time for charts)
// ============================================================

app.get("/api/accounts/:id/trends", async (req, res) => {
  try {
    const accountId = req.params.id;
    // Allow up to 365 days for "All Time" view
    const days = Math.min(parseInt(req.query.days) || 7, 365);

    // Resolve to UUID
    const uuid = await resolveAccountUuid(accountId);
    if (!uuid) return res.json({ aggregate: [], series: {} });

    // Get the Meta account ID for fetching active ads
    const { data: accData } = await supabase
      .from("ad_accounts")
      .select("account_id")
      .eq("id", uuid)
      .single();

    if (!accData) return res.json({ aggregate: [], series: [] });

    // Fetch currently active ad IDs from Meta (use this_month for reliable coverage)
    const activeAds = await fetchAdInsights(accData.account_id, "this_month");
    const activeAdIds = new Set((activeAds || []).map(ad => ad.ad_id).filter(Boolean));

    console.log(`📊 Trends for ${accData.account_id}: ${activeAdIds.size} active ads found`);

    const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from("cpl_logs")
      .select("spend, leads, calculated_cpl, checked_at, ad_name, ad_meta_id")
      .eq("ad_account_id", uuid)
      .gte("checked_at", sinceDate)
      .order("checked_at", { ascending: true });

    if (error) throw error;

    // Always filter to only include currently active ads (no fallback to all data)
    const filteredData = (data || []).filter(log => activeAdIds.has(log.ad_meta_id));

    // Transformation: Deduplicate hourly snapshots (take latest per ad per day)
    const processedData = {};
    filteredData.forEach(log => {
      const date = new Date(log.checked_at).toISOString().split("T")[0];
      const adId = log.ad_meta_id;
      const key = `${date}_${adId}`;

      // Always store the latest entry for this ad on this day
      processedData[key] = log;
    });

    const dedupedLogs = Object.values(processedData);

    // 1. Group by Date for Aggregate
    const byDate = {};
    // 2. Group by Ad for Series
    const byAd = {};

    dedupedLogs.forEach(log => {
      const date = new Date(log.checked_at).toISOString().split("T")[0];
      const adId = log.ad_meta_id;
      const adName = log.ad_name;

      // Aggregate
      if (!byDate[date]) byDate[date] = { date, total_spend: 0, total_leads: 0 };
      byDate[date].total_spend += log.spend;
      byDate[date].total_leads += log.leads;

      // Per Ad Series
      if (!byAd[adId]) byAd[adId] = { id: adId, name: adName, data: {} };
      if (!byAd[adId].data[date]) byAd[adId].data[date] = { spend: 0, leads: 0 };
      byAd[adId].data[date].spend += log.spend;
      byAd[adId].data[date].leads += log.leads;
    });

    const aggregate = Object.values(byDate).map(d => ({
      date: d.date,
      total_spend: parseFloat(d.total_spend.toFixed(2)),
      total_leads: d.total_leads,
      avg_cpl: d.total_leads > 0 ? parseFloat((d.total_spend / d.total_leads).toFixed(2)) : 0
    }));

    // Transform byAd to array-friendly format
    const series = Object.values(byAd).map(ad => ({
      id: ad.id,
      name: ad.name,
      points: Object.entries(ad.data).map(([date, vals]) => ({
        date,
        spend: parseFloat(vals.spend.toFixed(2)),
        leads: vals.leads,
        cpl: vals.leads > 0 ? parseFloat((vals.spend / vals.leads).toFixed(2)) : 0
      })).sort((a, b) => a.date.localeCompare(b.date))
    }));

    res.json({ aggregate, series });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// PER-CAMPAIGN THRESHOLDS
// ============================================================

app.get("/api/accounts/:id/campaign-thresholds", async (req, res) => {
  try {
    const accountId = req.params.id;
    const uuid = await resolveAccountUuid(accountId);
    if (!uuid) return res.json([]);

    const { data, error } = await supabase
      .from("campaign_thresholds")
      .select("*")
      .eq("ad_account_id", uuid)
      .order("campaign_name");

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/accounts/:id/campaign-thresholds", async (req, res) => {
  try {
    const accountId = req.params.id;
    const { campaign_name, cpl_threshold } = req.body;

    if (!campaign_name || !cpl_threshold || cpl_threshold <= 0) {
      return res.status(400).json({ error: "Invalid campaign_name or cpl_threshold" });
    }

    const uuid = await resolveAccountUuid(accountId);
    if (!uuid) return res.status(404).json({ error: "Account not found" });

    const { data, error } = await supabase
      .from("campaign_thresholds")
      .upsert({
        ad_account_id: uuid,
        campaign_name,
        cpl_threshold
      }, { onConflict: "ad_account_id,campaign_name" })
      .select()
      .single();

    if (error) throw error;

    await logActivity("CAMPAIGN_THRESHOLD_SET", "campaign", campaign_name, {
      account_id: accountId,
      cpl_threshold
    });

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// BUDGET MONITORING (from Meta API)
// ============================================================

app.get("/api/accounts/:id/budget", async (req, res) => {
  try {
    const accountId = req.params.id;
    const accessToken = process.env.META_ACCESS_TOKEN;

    if (!accessToken) return res.status(500).json({ error: "META_ACCESS_TOKEN not set" });

    // Fetch account-level spending
    const axios = require("axios");
    const [accountRes, insightsRes] = await Promise.all([
      axios.get(`https://graph.facebook.com/v24.0/act_${accountId}`, {
        params: { fields: "spend_cap,amount_spent,daily_budget", access_token: accessToken }
      }).catch(() => null),
      axios.get(`https://graph.facebook.com/v24.0/act_${accountId}/insights`, {
        params: { date_preset: "today", fields: "spend", access_token: accessToken }
      }).catch(() => null)
    ]);

    const accountData = accountRes?.data || {};
    const todaySpend = insightsRes?.data?.data?.[0]?.spend || "0";

    res.json({
      spend_cap: parseFloat(accountData.spend_cap || "0") / 100,
      amount_spent: parseFloat(accountData.amount_spent || "0") / 100,
      spend_today: parseFloat(todaySpend),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// MULTI-ACCOUNT COMPARISON
// ============================================================

app.get("/api/compare", async (req, res) => {
  try {
    const accountIds = (req.query.accounts || "").split(",").filter(Boolean);
    const days = Math.min(parseInt(req.query.days) || 7, 30);

    if (accountIds.length === 0) return res.json([]);

    const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const results = [];

    for (const accId of accountIds) {
      const uuid = await resolveAccountUuid(accId);
      if (!uuid) continue;

      // Get account name
      const { data: accData } = await supabase
        .from("ad_accounts")
        .select("account_name, cpl_threshold")
        .eq("id", uuid)
        .single();

      // Get CPL logs for period
      const { data: logs } = await supabase
        .from("cpl_logs")
        .select("spend, leads, checked_at")
        .eq("ad_account_id", uuid)
        .gte("checked_at", sinceDate);

      // Get alert count
      const { count: alertCount } = await supabase
        .from("alert_logs")
        .select("*", { count: "exact", head: true })
        .eq("ad_account_id", uuid)
        .gte("created_at", sinceDate);

      const totalSpend = (logs || []).reduce((s, l) => s + l.spend, 0);
      const totalLeads = (logs || []).reduce((s, l) => s + l.leads, 0);

      // Daily breakdown
      const byDate = {};
      (logs || []).forEach(log => {
        const date = new Date(log.checked_at).toISOString().split("T")[0];
        if (!byDate[date]) byDate[date] = { date, spend: 0, leads: 0 };
        byDate[date].spend += log.spend;
        byDate[date].leads += log.leads;
      });

      const daily = Object.values(byDate).map(d => ({
        date: d.date,
        spend: parseFloat(d.spend.toFixed(2)),
        leads: d.leads,
        cpl: d.leads > 0 ? parseFloat((d.spend / d.leads).toFixed(2)) : 0
      }));

      results.push({
        account_id: accId,
        account_name: accData?.account_name || accId,
        cpl_threshold: accData?.cpl_threshold || 0,
        total_spend: parseFloat(totalSpend.toFixed(2)),
        total_leads: totalLeads,
        avg_cpl: totalLeads > 0 ? parseFloat((totalSpend / totalLeads).toFixed(2)) : 0,
        alert_count: alertCount || 0,
        daily
      });
    }

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// WEEKLY REPORT (Sunday automated Telegram report)
// ============================================================

async function runWeeklyReport() {
  console.log(`\n📊 Weekly Report started: ${new Date().toISOString()}`);

  try {
    // Get agency telegram chat ID
    const { data: agency, error: agencyError } = await supabase
      .from("agencies")
      .select("name, telegram_chat_id, weekly_report_enabled")
      .limit(1)
      .single();

    if (agencyError || !agency) {
      console.log("⚠️ No agency found for weekly report");
      return;
    }

    if (!agency.weekly_report_enabled) {
      console.log("ℹ️ Weekly report disabled");
      return;
    }

    if (!agency.telegram_chat_id) {
      console.log("⚠️ No Telegram chat ID configured");
      return;
    }

    // Get date range (last 7 days)
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const dateFrom = weekAgo.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const dateTo = now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

    // Get all active accounts
    const { data: accounts, error: accError } = await supabase
      .from("ad_accounts")
      .select("*")
      .eq("is_active", true);

    if (accError || !accounts || accounts.length === 0) {
      console.log("⚠️ No active accounts for weekly report");
      return;
    }

    let reportMessage = `📊 <b>Weekly Report</b>\n📅 ${dateFrom} – ${dateTo}\n\n`;

    let grandTotalSpend = 0;
    let grandTotalLeads = 0;

    for (const account of accounts) {
      const { data: logs } = await supabase
        .from("cpl_logs")
        .select("spend, leads, ad_meta_id, checked_at")
        .eq("ad_account_id", account.id)
        .gte("checked_at", weekAgo.toISOString());

      // Deduplicate: take latest snapshot per ad per day
      const dayAdMap = {};
      (logs || []).forEach(log => {
        const date = new Date(log.checked_at).toISOString().split("T")[0];
        const key = `${date}_${log.ad_meta_id}`;
        dayAdMap[key] = log;
      });

      const dedupedLogs = Object.values(dayAdMap);
      const totalSpend = dedupedLogs.reduce((s, l) => s + l.spend, 0);
      const totalLeads = dedupedLogs.reduce((s, l) => s + l.leads, 0);
      const avgCpl = totalLeads > 0 ? totalSpend / totalLeads : 0;

      grandTotalSpend += totalSpend;
      grandTotalLeads += totalLeads;

      // Get alert count for the week
      const { count: alertCount } = await supabase
        .from("alert_logs")
        .select("*", { count: "exact", head: true })
        .eq("ad_account_id", account.id)
        .gte("created_at", weekAgo.toISOString());

      const escName = String(account.account_name || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

      reportMessage += `📱 <b>${escName}</b>\n`;
      reportMessage += `  💰 Spend: $${totalSpend.toFixed(2)}\n`;
      reportMessage += `  🎯 Leads: ${totalLeads}\n`;
      reportMessage += `  📈 Avg CPL: $${avgCpl.toFixed(2)}\n`;
      if (alertCount > 0) reportMessage += `  ⚠️ Alerts: ${alertCount}\n`;
      reportMessage += `\n`;
    }

    const grandAvgCpl = grandTotalLeads > 0 ? grandTotalSpend / grandTotalLeads : 0;
    reportMessage += `━━━━━━━━━━━━━━━\n`;
    reportMessage += `💰 <b>Total Spend:</b> $${grandTotalSpend.toFixed(2)}\n`;
    reportMessage += `🎯 <b>Total Leads:</b> ${grandTotalLeads}\n`;
    reportMessage += `📈 <b>Overall CPL:</b> $${grandAvgCpl.toFixed(2)}\n`;

    await sendTelegramMessage(agency.telegram_chat_id, reportMessage);
    console.log("✅ Weekly report sent to Telegram");

    await logActivity("WEEKLY_REPORT_SENT", "system", null, {
      total_spend: grandTotalSpend.toFixed(2),
      total_leads: grandTotalLeads,
      accounts: accounts.length
    });

  } catch (error) {
    console.error("❌ Error in weekly report:", error.message);
  }
}

// Manual trigger for weekly report
app.post("/run-weekly-report", async (req, res) => {
  const authHeader = req.headers["x-cron-secret"];
  const secret = process.env.CRON_SECRET;

  if (secret && authHeader !== secret) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  await runWeeklyReport();
  res.json({ success: true, message: "Weekly report triggered" });
});

// Cron job running every 15 minutes
let isJobRunning = false;

// Core Alert Engine Logic
async function runAlertEngine() {
  if (isJobRunning) {
    console.log("⚠️ CPL Alert Engine skipped (Previous job still running)");
    return { success: false, message: "Job already running" };
  }

  isJobRunning = true;
  lastSyncTime = new Date();

  // Log based on trigger method (Cron or Manual) - simplified for shared logic
  console.log(`\n🔥 CPL Alert Engine started: ${new Date().toISOString()}`);

  try {
    // Fetch all active ad accounts
    const { data: accounts, error: accountsError } = await supabase
      .from("ad_accounts")
      .select("*")
      .eq("is_active", true);

    if (accountsError) throw accountsError;

    if (!accounts || accounts.length === 0) {
      isJobRunning = false;
      return { success: true, message: "No active accounts found" };
    }

    console.log(`✅ Found ${accounts.length} active account(s)`);

    // Process each account
    for (const account of accounts) {
      console.log(
        `\n📈 Checking account: ${account.account_name} (ID: ${account.account_id})`
      );

      // Fetch ad-level data from Meta API (check this month's performance for consistent threshold monitoring)
      const ads = await fetchAdInsights(account.account_id, "this_month");

      if (!ads || ads.length === 0) {
        console.log(`   ⚠️  No ads found for account`);
        continue;
      }

      console.log(`   📊 Found ${ads.length} active ad(s)`);

      // Collect alerts for this account to group them into a single message
      const accountAlerts = [];

      // Process each ad
      for (const ad of ads) {
        const { campaign_name, adset_name, ad_name, ad_id, spend, leads } = ad;

        // Skip ads with no spend (Meta filter handled ACTIVE status)
        if (spend === 0) {
          continue;
        }

        let alertType = null;
        let calculatedCpl = 0;
        let adPaused = false;

        // CHECK 1: Zero Leads Logic
        if (leads === 0) {
          if (spend >= account.cpl_threshold) {
            alertType = "ZERO_LEADS";
            console.log(`     🚨 Zero Leads Alert! Ad: ${ad_name} | Spend: $${spend.toFixed(2)} > Threshold ($${account.cpl_threshold})`);
          }
        }
        // CHECK 2: High CPL Logic
        else {
          calculatedCpl = spend / leads;

          // Insert into cpl_logs (only if leads > 0 to have valid CPL)
          const { error: logError } = await supabase.from("cpl_logs").insert([
            {
              ad_account_id: account.id,
              campaign_name,
              adset_name,
              ad_name,
              ad_meta_id: ad_id,
              spend,
              leads,
              calculated_cpl: calculatedCpl,
            },
          ]);

          if (logError) {
            console.error("❌ Error inserting CPL log:", logError.message);
          }

          if (calculatedCpl > account.cpl_threshold) {
            alertType = "HIGH_CPL";
            console.log(`     🚨 High CPL Alert! Ad: ${ad_name} | CPL: $${calculatedCpl.toFixed(2)} > Threshold ($${account.cpl_threshold})`);
          }
        }

        // 🤖 AUTO-PAUSE LOGIC (Triggers if any alert is active and enabled for account)
        if (alertType && account.auto_pause_enabled) {
          console.log(`     🤖 Auto-Pause enabled for this account. Evaluating...`);

          const pauseConfig = {
            thresholdCPL: account.threshold_cpl || account.cpl_threshold,
            accessToken: process.env.META_ACCESS_TOKEN
          };

          const pauseResult = await evaluateAndPauseAd({
            adId: ad_id,
            spend,
            leads,
            cpl: calculatedCpl || 0
          }, pauseConfig);

          if (pauseResult.action === "PAUSED") {
            adPaused = true;
            console.log(`     ✅ SUCCESS: Ad ${ad_id} has been PAUSED.`);
          } else if (pauseResult.action === "SKIPPED_COOLDOWN") {
            console.log(`     ⏸️  SKIPPED: Ad is currently in cooldown period.`);
          } else if (pauseResult.action === "SKIPPED_LOW_SPEND" || pauseResult.action === "SKIPPED_LOW_LEADS") {
            console.log(`     ℹ️  SKIPPED: Performance metrics below evaluation thresholds.`);
          } else if (pauseResult.action.startsWith("ERROR")) {
            console.error(`     ❌ ERROR: Auto-pause failed: ${pauseResult.error || "Unknown error"}`);
          }
        }

        // Logic for collecting alert (grouped)
        if (alertType) {
          // Anti-spam check: Look for alerts for this specific ad AND alert_type in last 2 hours
          const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

          const { data: recentAlerts, error: recentAlertsError } =
            await supabase
              .from("alert_logs")
              .select("id")
              .eq("ad_meta_id", ad_id)
              .eq("alert_type", alertType)
              .eq("ad_account_id", account.id)
              .gte("created_at", twoHoursAgo.toISOString())
              .limit(1);

          if (recentAlertsError) {
            console.error("❌ Error checking recent alerts:", recentAlertsError.message);
            continue;
          }

          // If recently alerted AND NOT paused just now, skip grouping this ad
          if (recentAlerts && recentAlerts.length > 0 && !adPaused) {
            console.log(`     ⏸️ Ad ${ad_name} skipped (duplicate within 2h)`);
            continue;
          }

          // Log to DB
          await supabase.from("alert_logs").insert([
            {
              ad_account_id: account.id,
              agency_id: account.agency_id,
              alert_type: alertType,
              ad_meta_id: ad_id,
              campaign_name,
              adset_name,
              ad_name,
              spend,
              leads,
              calculated_cpl: calculatedCpl || 0,
              cpl_threshold: account.cpl_threshold,
              message: adPaused ? "Ad Automatically Paused" : "Triggered Alert"
            },
          ]);

          accountAlerts.push({
            ad_name,
            campaign_name,
            adset_name,
            spend,
            leads,
            calculatedCpl,
            alertType,
            adPaused
          });
        }
      }

      // 📱 SEND GROUPED TELEGRAM ALERT PER ACCOUNT
      if (accountAlerts.length > 0) {
        // Fetch agency details
        const { data: agency, error: agencyError } = await supabase
          .from("agencies")
          .select("name, telegram_chat_id")
          .eq("id", account.agency_id)
          .single();

        if (agencyError || !agency || !agency.telegram_chat_id) {
          console.log("     ⚠️  Agency not found or missing Telegram ID");
          continue;
        }

        const escapeHtml = (str) => String(str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const escAccount = escapeHtml(account.account_name);

        let alertMessage = `🚨 <b>Ads Book: ${escAccount}</b> 🚨\n`;
        alertMessage += `━━━━━━━━━━━━━━━\n\n`;

        for (const al of accountAlerts) {
          const statusIcon = al.adPaused ? "✅ ⏸️ PAUSED" : "⚠️ ALERT";
          alertMessage += `<b>Campaign:</b> ${escapeHtml(al.campaign_name)}\n`;
          alertMessage += `<b>Ad Set:</b> ${escapeHtml(al.adset_name)}\n`;
          alertMessage += `<b>Ad:</b> ${escapeHtml(al.ad_name)}\n`;
          alertMessage += `<b>Status:</b> ${statusIcon}\n`;
          alertMessage += `<b>Spend:</b> $${al.spend.toFixed(2)} | <b>Leads:</b> ${al.leads}\n`;

          if (al.alertType === "ZERO_LEADS") {
            alertMessage += `<b>CPL:</b> N/A (Zero Leads)\n`;
          } else {
            alertMessage += `<b>CPL:</b> $${al.calculatedCpl.toFixed(2)}\n`;
          }
          alertMessage += `━━━━━━━━━━━━━━━\n\n`;
        }

        alertMessage += `<i>Threshold set at $${account.cpl_threshold}</i>`;

        try {
          await sendTelegramMessage(agency.telegram_chat_id, alertMessage);
          console.log(`     📱 Grouped Telegram alert sent (${accountAlerts.length} ads)`);
        } catch (teleError) {
          console.error(`     ❌ Failed to send grouped Telegram: ${teleError.message}`);
        }
      }
    }

    console.log(`\n✨ CPL Alert Engine completed: ${new Date().toISOString()}`);
    return { success: true, message: "Alert engine cycle completed" };

  } catch (error) {
    console.error("❌ Error in CPL Alert Engine:", error.message);
    return { success: false, message: error.message };
  } finally {
    isJobRunning = false;
  }
}

// Secure Manual Trigger Endpoint (Production External Cron)
app.post("/run-alert-engine", async (req, res) => {
  const authHeader = req.headers["x-cron-secret"];
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    console.error("❌ CRON_SECRET not defined in environment");
    return res.status(500).json({ error: "Server misconfiguration" });
  }

  if (authHeader !== secret) {
    console.warn("⚠️ Unauthorized attempt to trigger alert engine");
    return res.status(401).json({ error: "Unauthorized" });
  }

  console.log("🚀 Manual/External trigger for Alert Engine received");

  // Run logic
  const result = await runAlertEngine();

  res.status(200).send("OK");
});

// Internal Cron Job (Disable in Production)
if (process.env.NODE_ENV !== "production") {
  cron.schedule("0 * * * *", async () => {
    console.log("⏰ Internal cron triggered (Non-Production)", new Date().toISOString());
    await runAlertEngine();
  });
  console.log("🕒 Internal cron enabled (Non-Production)");
} else {
  console.log("🚫 Internal cron disabled (Production Mode)");
}

// Weekly Report Cron — Every Sunday at 9:00 AM UTC
cron.schedule("0 9 * * 0", async () => {
  console.log("📊 Sunday Weekly Report cron triggered", new Date().toISOString());
  await runWeeklyReport();
});
console.log("📊 Weekly Report cron scheduled (Sundays 9 AM UTC)");

app.listen(PORT, () => {
  console.log("🚀 Ads Book Production Mode Enabled");
  console.log(`🚀 Ads Book Production Server running on port ${PORT}`);
});

process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});
