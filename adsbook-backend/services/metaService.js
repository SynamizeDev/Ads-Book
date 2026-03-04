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
 * @returns {Promise<Array>} - Array of ad insights with campaign, adset, ad details and metrics
 */
async function fetchAdInsights(accountId, datePreset = "maximum", cachedCampaignIds = null) {
  try {
    const accessToken = process.env.META_ACCESS_TOKEN;

    if (!accessToken) {
      console.error("❌ META_ACCESS_TOKEN is not set in .env");
      return null;
    }

    // Step 1: Get Campaign IDs (use cached value if provided to avoid redundant Meta calls)
    const campaignIds = cachedCampaignIds !== null ? cachedCampaignIds : await getActiveCampaignIds(accountId);

    if (campaignIds.length === 0) {
      return [];
    }

    const apiUrl = `https://graph.facebook.com/v24.0/act_${accountId}/insights`;

    // Fetch insights for all ads in these campaigns (STRICT ACTIVE HIERARCHY)
    const filtering = [
      { field: "campaign.id", operator: "IN", value: campaignIds },
      { field: "adset.effective_status", operator: "IN", value: ["ACTIVE"] }, // Ensure parent ad set is active
      { field: "ad.effective_status", operator: "IN", value: ["ACTIVE"] }    // Ensure individual ad is active
    ];

    const response = await axios.get(apiUrl, {
      params: {
        level: "ad",
        date_preset: datePreset,
        fields: "campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,spend,actions",
        filtering: JSON.stringify(filtering),
        access_token: accessToken,
        limit: 500
      },
    });

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
