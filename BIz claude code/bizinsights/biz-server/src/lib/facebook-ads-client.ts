/**
 * Facebook Marketing API Client
 *
 * Direct REST API integration for Facebook Ads data.
 * Uses Facebook Graph API v19.0
 */

export interface FacebookAdAccount {
  id: string;
  account_id: string;
  name: string;
  currency: string;
  timezone_name: string;
  account_status: number;
}

export interface FacebookCampaign {
  id: string;
  name: string;
  status: string;
  objective: string;
  created_time: string;
  start_time?: string;
  stop_time?: string;
  daily_budget?: string;
  lifetime_budget?: string;
}

export interface FacebookAdInsights {
  campaign_id: string;
  campaign_name: string;
  date_start: string;
  date_stop: string;
  impressions: string;
  clicks: string;
  spend: string;
  reach: string;
  frequency: string;
  cpm: string;
  cpc: string;
  ctr: string;
  actions?: Array<{
    action_type: string;
    value: string;
  }>;
  action_values?: Array<{
    action_type: string;
    value: string;
  }>;
}

export class FacebookAdsClient {
  private accessToken: string;
  private apiVersion = 'v19.0';
  private baseUrl = 'https://graph.facebook.com';

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  /**
   * Make API request to Facebook Graph API
   */
  private async makeRequest<T>(endpoint: string, params: Record<string, any> = {}): Promise<T> {
    const url = new URL(`${this.baseUrl}/${this.apiVersion}/${endpoint}`);

    // Add access token and params to URL
    url.searchParams.append('access_token', this.accessToken);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(`Facebook API Error: ${error.error?.message || error.message || response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get user's ad accounts
   */
  async getAdAccounts(): Promise<FacebookAdAccount[]> {
    const response = await this.makeRequest<{ data: FacebookAdAccount[] }>('me/adaccounts', {
      fields: 'account_id,name,currency,timezone_name,account_status',
    });

    return response.data;
  }

  /**
   * Get ad account details
   */
  async getAdAccount(adAccountId: string): Promise<FacebookAdAccount> {
    // Ensure adAccountId has 'act_' prefix
    const accountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;

    return this.makeRequest<FacebookAdAccount>(accountId, {
      fields: 'account_id,name,currency,timezone_name,account_status',
    });
  }

  /**
   * Get campaigns for an ad account
   */
  async getCampaigns(
    adAccountId: string,
    options: {
      limit?: number;
      status?: string[];
    } = {}
  ): Promise<FacebookCampaign[]> {
    const accountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;
    const { limit = 100, status = ['ACTIVE', 'PAUSED'] } = options;

    const response = await this.makeRequest<{ data: FacebookCampaign[] }>(
      `${accountId}/campaigns`,
      {
        fields: 'name,status,objective,created_time,start_time,stop_time,daily_budget,lifetime_budget',
        limit,
        filtering: JSON.stringify([
          {
            field: 'status',
            operator: 'IN',
            value: status,
          },
        ]),
      }
    );

    return response.data;
  }

  /**
   * Get campaign insights with performance metrics
   */
  async getCampaignInsights(
    campaignId: string,
    startDate: string,
    endDate: string
  ): Promise<FacebookAdInsights> {
    const response = await this.makeRequest<{ data: FacebookAdInsights[] }>(
      `${campaignId}/insights`,
      {
        fields: [
          'campaign_id',
          'campaign_name',
          'date_start',
          'date_stop',
          'impressions',
          'clicks',
          'spend',
          'reach',
          'frequency',
          'cpm',
          'cpc',
          'ctr',
          'actions',
          'action_values',
        ].join(','),
        time_range: JSON.stringify({
          since: startDate,
          until: endDate,
        }),
        level: 'campaign',
      }
    );

    return response.data[0] || ({} as FacebookAdInsights);
  }

  /**
   * Get insights for all campaigns in an ad account
   */
  async getAdAccountInsights(
    adAccountId: string,
    startDate: string,
    endDate: string,
    options: {
      level?: 'account' | 'campaign' | 'adset' | 'ad';
      breakdowns?: string[];
    } = {}
  ): Promise<FacebookAdInsights[]> {
    const accountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;
    const { level = 'campaign', breakdowns = [] } = options;

    const params: Record<string, any> = {
      fields: [
        'campaign_id',
        'campaign_name',
        'date_start',
        'date_stop',
        'impressions',
        'clicks',
        'spend',
        'reach',
        'frequency',
        'cpm',
        'cpc',
        'ctr',
        'actions',
        'action_values',
      ].join(','),
      time_range: JSON.stringify({
        since: startDate,
        until: endDate,
      }),
      level,
      limit: 500,
    };

    if (breakdowns.length > 0) {
      params.breakdowns = breakdowns.join(',');
    }

    const response = await this.makeRequest<{ data: FacebookAdInsights[] }>(
      `${accountId}/insights`,
      params
    );

    return response.data;
  }

  /**
   * Get ad sets for a campaign
   */
  async getAdSets(campaignId: string): Promise<any[]> {
    const response = await this.makeRequest<{ data: any[] }>(`${campaignId}/adsets`, {
      fields: 'name,status,daily_budget,lifetime_budget,start_time,end_time,targeting',
      limit: 100,
    });

    return response.data;
  }

  /**
   * Get ads for an ad set
   */
  async getAds(adSetId: string): Promise<any[]> {
    const response = await this.makeRequest<{ data: any[] }>(`${adSetId}/ads`, {
      fields: 'name,status,creative,adset_id',
      limit: 100,
    });

    return response.data;
  }

  /**
   * Calculate ROAS (Return on Ad Spend)
   */
  calculateROAS(insights: FacebookAdInsights): number {
    const spend = parseFloat(insights.spend || '0');
    if (spend === 0) return 0;

    // Find purchase conversion value
    const purchaseValue = insights.action_values?.find(
      (av) => av.action_type === 'omni_purchase' || av.action_type === 'purchase'
    );

    if (!purchaseValue) return 0;

    const revenue = parseFloat(purchaseValue.value || '0');
    return revenue / spend;
  }

  /**
   * Get conversion actions count
   */
  getConversionCount(insights: FacebookAdInsights, actionType: string): number {
    const action = insights.actions?.find((a) => a.action_type === actionType);
    return action ? parseInt(action.value || '0') : 0;
  }

  /**
   * Calculate CPM (Cost Per 1000 Impressions)
   */
  calculateCPM(spend: number, impressions: number): number {
    if (impressions === 0) return 0;
    return (spend / impressions) * 1000;
  }

  /**
   * Calculate CPC (Cost Per Click)
   */
  calculateCPC(spend: number, clicks: number): number {
    if (clicks === 0) return 0;
    return spend / clicks;
  }

  /**
   * Calculate CTR (Click Through Rate)
   */
  calculateCTR(clicks: number, impressions: number): number {
    if (impressions === 0) return 0;
    return (clicks / impressions) * 100;
  }

  /**
   * Validate access token
   */
  async validateAccessToken(): Promise<{
    isValid: boolean;
    userId?: string;
    scopes?: string[];
    expiresAt?: number;
  }> {
    try {
      const response = await this.makeRequest<{
        data: {
          app_id: string;
          type: string;
          application: string;
          expires_at: number;
          is_valid: boolean;
          scopes: string[];
          user_id: string;
        };
      }>('debug_token', {
        input_token: this.accessToken,
      });

      return {
        isValid: response.data.is_valid,
        userId: response.data.user_id,
        scopes: response.data.scopes,
        expiresAt: response.data.expires_at,
      };
    } catch (error) {
      return { isValid: false };
    }
  }

  /**
   * Get long-lived access token
   */
  async getLongLivedToken(appId: string, appSecret: string): Promise<string> {
    const url = new URL(`${this.baseUrl}/oauth/access_token`);
    url.searchParams.append('grant_type', 'fb_exchange_token');
    url.searchParams.append('client_id', appId);
    url.searchParams.append('client_secret', appSecret);
    url.searchParams.append('fb_exchange_token', this.accessToken);

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error('Failed to get long-lived token');
    }

    const data = await response.json();
    return data.access_token;
  }
}

/**
 * Helper function to format Facebook date for API
 */
export function formatFacebookDate(date: Date): string {
  return date.toISOString().split('T')[0]; // YYYY-MM-DD
}

/**
 * Helper function to get date range for insights
 */
export function getDateRange(days: number): { startDate: string; endDate: string } {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - days);

  return {
    startDate: formatFacebookDate(startDate),
    endDate: formatFacebookDate(endDate),
  };
}
