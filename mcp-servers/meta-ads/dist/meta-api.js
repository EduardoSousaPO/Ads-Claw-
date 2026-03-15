import axios from 'axios';
export class MetaAdsClient {
    accessToken;
    baseUrl = 'https://graph.facebook.com/v19.0';
    constructor(accessToken) {
        this.accessToken = accessToken;
    }
    async request(endpoint, params = {}) {
        try {
            const response = await axios.get(`${this.baseUrl}${endpoint}`, {
                params: {
                    access_token: this.accessToken,
                    ...params
                }
            });
            return response.data;
        }
        catch (error) {
            const message = error.response?.data?.error?.message || error.message;
            throw new Error(`Meta API Error: ${message}`);
        }
    }
    async getAccountInsights(adAccountId, options = {}) {
        const fields = 'spend,cpc,cpm,cpp,ctr,reach,impressions,conversions,purchase_roas,cost_per_conversion';
        return this.request(`/${adAccountId}/insights`, {
            fields,
            ...options
        });
    }
    async getAdAccountByName(name) {
        const accounts = await this.request('/me/adaccounts', {
            fields: 'name,account_id'
        });
        return (accounts.data || []).find((acc) => acc.name.toLowerCase().includes(name.toLowerCase()));
    }
    async listCampaigns(adAccountId) {
        return this.request(`/${adAccountId}/campaigns`, {
            fields: 'name,status,objective,budget_remaining,daily_budget,lifetime_budget'
        });
    }
    async listAdSets(campaignId) {
        return this.request(`/${campaignId}/adsets`, {
            fields: 'name,status,billing_event,bid_amount,daily_budget,lifetime_budget'
        });
    }
    async listAds(adSetId) {
        return this.request(`/${adSetId}/ads`, {
            fields: 'name,status,creative{name,title,body,image_url,thumbnail_url}'
        });
    }
    async getCampaignInsights(campaignId, options = {}) {
        const fields = 'spend,cpc,cpm,ctr,impressions,conversions,purchase_roas,cost_per_conversion';
        return this.request(`/${campaignId}/insights`, {
            fields,
            ...options
        });
    }
}
