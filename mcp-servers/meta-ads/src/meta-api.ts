import axios from 'axios';

export interface MetaInsightsOptions {
  level?: 'ad' | 'adset' | 'campaign' | 'account' | undefined;
  date_preset?: string | undefined;
  time_range?: { since: string; until: string } | undefined;
  filtering?: unknown[] | undefined;
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

  private async post(endpoint: string, data: Record<string, unknown> = {}) {
    try {
      const response = await axios.post(`${this.baseUrl}${endpoint}`, null, {
        params: {
          access_token: this.accessToken,
          ...data,
        },
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

  // ─── Write Operations ──────────────────────────────────────────────────

  async createCampaign(adAccountId: string, params: {
    name: string;
    objective: string;
    status?: string | undefined;
    special_ad_categories?: string[] | undefined;
    daily_budget?: number | undefined;
    lifetime_budget?: number | undefined;
  }) {
    return this.post(`/${adAccountId}/campaigns`, {
      name: params.name,
      objective: params.objective,
      status: params.status ?? 'PAUSED',
      special_ad_categories: JSON.stringify(params.special_ad_categories ?? []),
      ...(params.daily_budget ? { daily_budget: params.daily_budget } : {}),
      ...(params.lifetime_budget ? { lifetime_budget: params.lifetime_budget } : {}),
    });
  }

  async createAdSet(adAccountId: string, params: {
    campaign_id: string;
    name: string;
    daily_budget: number;
    billing_event: string;
    optimization_goal: string;
    targeting: Record<string, unknown>;
    status?: string | undefined;
    start_time?: string | undefined;
    bid_amount?: number | undefined;
  }) {
    return this.post(`/${adAccountId}/adsets`, {
      campaign_id: params.campaign_id,
      name: params.name,
      daily_budget: params.daily_budget,
      billing_event: params.billing_event,
      optimization_goal: params.optimization_goal,
      targeting: JSON.stringify(params.targeting),
      status: params.status ?? 'PAUSED',
      ...(params.start_time ? { start_time: params.start_time } : {}),
      ...(params.bid_amount ? { bid_amount: params.bid_amount } : {}),
    });
  }

  async createAdCreative(adAccountId: string, params: {
    name: string;
    page_id: string;
    message?: string | undefined;
    link?: string | undefined;
    image_hash?: string | undefined;
    image_url?: string | undefined;
    call_to_action_type?: string | undefined;
  }) {
    const objectStorySpec: Record<string, unknown> = {
      page_id: params.page_id,
    };

    if (params.link) {
      objectStorySpec['link_data'] = {
        message: params.message ?? '',
        link: params.link,
        call_to_action: params.call_to_action_type ? { type: params.call_to_action_type } : undefined,
        ...(params.image_hash ? { image_hash: params.image_hash } : {}),
      };
    } else {
      objectStorySpec['link_data'] = {
        message: params.message ?? '',
        ...(params.image_hash ? { image_hash: params.image_hash } : {}),
      };
    }

    return this.post(`/${adAccountId}/adcreatives`, {
      name: params.name,
      object_story_spec: JSON.stringify(objectStorySpec),
    });
  }

  async createAd(adAccountId: string, params: {
    name: string;
    adset_id: string;
    creative_id: string;
    status?: string | undefined;
  }) {
    return this.post(`/${adAccountId}/ads`, {
      name: params.name,
      adset_id: params.adset_id,
      creative: JSON.stringify({ creative_id: params.creative_id }),
      status: params.status ?? 'PAUSED',
    });
  }

  async updateStatus(objectId: string, status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED') {
    return this.post(`/${objectId}`, { status });
  }

  async uploadImage(adAccountId: string, imageUrl: string) {
    return this.post(`/${adAccountId}/adimages`, {
      url: imageUrl,
    });
  }
}
