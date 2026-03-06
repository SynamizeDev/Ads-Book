const axios = require("axios");

/**
 * Fetch campaign IDs for an ad account (all statuses to capture recently paused)
 * @param {string} accountId - Ad account ID
 * @returns {Promise<Array>} - Array of campaign IDs
 */
async function getActiveCampaignIds(accountId) {
  try {
    const accessToken = process.env.META_ACCESS_TOKEN;
    const apiUrl = `https://graph.facebook.com/v24.0/act_${accountId}/campaigns`;

    const response = await axios.get(apiUrl, {
      params: {
        fields: "id,name,effective_status",
        access_token: accessToken,
        limit: 1000
      },
    });

    const campaigns = response.data.data || [];

    if (campaigns.length === 0) {
      return [];
    }

    // ONLY return IDs for campaigns that are currently ACTIVE
    const ids = campaigns
      .filter(c => c.effective_status === "ACTIVE")
      .map(c => c.id);

    return ids;

  } catch (error) {
    console.error(`   ❌ Error fetching campaigns for account ${accountId}:`, error.message);
    return [];
  }
}

/**
 * Fetch ad-level insights from Meta (Facebook) for a specific ad account
 * @param {string} accountId - Ad account ID (without act_ prefix)
 * @param {string} datePreset - Meta API date_preset (e.g., "maximum", "today", "last_7d")
 * @param {Array|null} cachedCampaignIds - Pre-fetched campaign IDs to avoid redundant Meta calls
 * @param {{ since: string, until: string }|null} timeRange - Custom date range (YYYY-MM-DD). When provided, overrides datePreset.
 * @param {boolean} activeOnly - When true (default), filters to currently ACTIVE campaigns/adsets/ads only.
 *   Pass false for historical reports (e.g. weekly report) so paused/off campaigns from the period are included.
 * @returns {Promise<Array>} - Array of ad insights with campaign, adset, ad details and metrics
 */
async function fetchAdInsights(accountId, datePreset = "maximum", cachedCampaignIds = null, timeRange = null, activeOnly = true) {
  try {
    const accessToken = process.env.META_ACCESS_TOKEN;

    if (!accessToken) {
      console.error("❌ META_ACCESS_TOKEN is not set in .env");
      return null;
    }

    const apiUrl = `https://graph.facebook.com/v24.0/act_${accountId}/insights`;

    let filtering = [];

    if (activeOnly) {
      // Alert engine mode: only currently ACTIVE campaigns/adsets/ads
      const campaignIds = cachedCampaignIds !== null ? cachedCampaignIds : await getActiveCampaignIds(accountId);
      if (campaignIds.length === 0) return [];

      filtering = [
        { field: "campaign.id", operator: "IN", value: campaignIds },
        { field: "adset.effective_status", operator: "IN", value: ["ACTIVE"] },
        { field: "ad.effective_status", operator: "IN", value: ["ACTIVE"] }
      ];
    }
    // Historical mode (activeOnly = false): no status filters — let time_range return all
    // ads that had any activity in the period, regardless of current status.

    const params = {
      level: "ad",
      // Use time_range for custom date windows (e.g. last week), fall back to date_preset
      ...(timeRange
        ? { time_range: JSON.stringify(timeRange) }
        : { date_preset: datePreset }
      ),
      fields: "campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,spend,actions",
      access_token: accessToken,
      limit: 500
    };

    if (filtering.length > 0) {
      params.filtering = JSON.stringify(filtering);
    }

    const response = await axios.get(apiUrl, { params });

    const data = response.data.data;

    if (!data || data.length === 0) {
      return [];
    }

    // Parse each ad and extract relevant metrics
    const ads = data.map((item) => {
      let leads = 0;

      // Extract leads from actions (considering multiple conversion types)
      if (item.actions && Array.isArray(item.actions)) {
        // 1. Standard Leads
        const standardLead = item.actions.find(a => a.action_type === "lead")?.value || 0;
        // 2. Pixel Leads
        const pixelLead = item.actions.find(a => a.action_type === "offsite_conversion.fb_pixel_lead")?.value || 0;
        // 3. Messaging Leads (Start of reply/chat)
        const messagingLead = item.actions.find(a => a.action_type === "onsite_conversion.messaging_first_reply")?.value || 0;

        leads = (parseInt(standardLead) || 0) + (parseInt(pixelLead) || 0) + (parseInt(messagingLead) || 0);
      }

      return {
        campaign_name: item.campaign_name || "N/A",
        adset_name: item.adset_name || "N/A",
        adset_id: item.adset_id || null,
        ad_name: item.ad_name || "N/A",
        ad_id: item.ad_id || null,
        spend: parseFloat(item.spend) || 0,
        leads: leads,
      };
    });

    return ads;
  } catch (error) {
    if (error.response && error.response.status === 400) {
      console.warn(
        `⚠️  Invalid account ID or API error for account: ${accountId}`,
        JSON.stringify(error.response.data, null, 2)
      );
    } else {
      console.error(
        `❌ Error fetching ad insights for account ${accountId}:`,
        error.message
      );
    }
    return [];
  }
}

/**
 * Fetch generic generic Account Name from Meta
 * @param {string} accountId - Ad account ID
 * @returns {Promise<string|null>} - Account Name or null
 */
async function fetchAccountName(accountId) {
  try {
    const accessToken = process.env.META_ACCESS_TOKEN;
    const apiUrl = `https://graph.facebook.com/v24.0/act_${accountId}`;

    const response = await axios.get(apiUrl, {
      params: {
        fields: "name",
        access_token: accessToken,
      },
    });

    return { name: response.data.name || null, error: null };
  } catch (error) {
    // Extract the specific Meta error message if available
    const metaError = error.response?.data?.error;
    const metaMessage = metaError
      ? `${metaError.message} (Code: ${metaError.code})`
      : error.message;
    console.error(`❌ Meta API validation failed for account ${accountId}:`, metaMessage);
    return { name: null, error: metaMessage };
  }
}

module.exports = { fetchAdInsights, fetchAccountName, getActiveCampaignIds };
