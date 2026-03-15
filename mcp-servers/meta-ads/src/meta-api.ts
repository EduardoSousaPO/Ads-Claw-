import axios from 'axios';

export interface MetaInsightsOptions {
  level?: 'ad' | 'adset' | 'campaign' | 'account';
  date_preset?: string;
  time_range?: { since: string; until: string };
  filtering?: any[];
}

export class MetaAdsClient {
  private accessToken: string;
  private baseUrl = 'https://graph.facebook.com/v19.0';

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private async request(endpoint: string, params: any = {}) {
    try {
      const response = await axios.get(`${this.baseUrl}${endpoint}`, {
        params: {
          access_token: this.accessToken,
          ...params
        }
      });
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.error?.message || error.message;
      throw new Error(`Meta API Error: ${message}`);
    }
  }

  async getAccountInsights(adAccountId: string, options: MetaInsightsOptions = {}) {
    const fields = 'spend,cpc,cpm,cpp,ctr,reach,impressions,conversions,purchase_roas,cost_per_conversion';
    return this.request(`/${adAccountId}/insights`, {
      fields,
      ...options
    });
  }

  async getAdAccountByName(name: string) {
    const accounts = await this.request('/me/adaccounts', {
      fields: 'name,account_id'
    });
    return (accounts.data || []).find((acc: any) => acc.name.toLowerCase().includes(name.toLowerCase()));
  }

  async listCampaigns(adAccountId: string) {
    return this.request(`/${adAccountId}/campaigns`, {
      fields: 'name,status,objective,budget_remaining,daily_budget,lifetime_budget'
    });
  }

  async listAdSets(campaignId: string) {
    return this.request(`/${campaignId}/adsets`, {
      fields: 'name,status,billing_event,bid_amount,daily_budget,lifetime_budget'
    });
  }

  async listAds(adSetId: string) {
    return this.request(`/${adSetId}/ads`, {
      fields: 'name,status,creative{name,title,body,image_url,thumbnail_url}'
    });
  }

  async getCampaignInsights(campaignId: string, options: MetaInsightsOptions = {}) {
    const fields = 'spend,cpc,cpm,ctr,impressions,conversions,purchase_roas,cost_per_conversion';
    return this.request(`/${campaignId}/insights`, {
      fields,
      ...options
    });
  }
}
