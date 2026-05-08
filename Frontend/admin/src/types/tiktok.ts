export type TikTokAccountStatus = 'ACTIVE' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR' | string;

export interface TikTokAccount {
  id: number;
  nickname: string | null;
  openId: string | null;
  scope: string | null;
  environment: string | null;
  status: TikTokAccountStatus | null;
  expiresAt?: string | null;
  lastUsedAt?: string | null;
  scopes?: string[] | null;
  rateUsage?: {
    used: number;
    limit: number;
  } | null;
}

export interface TikTokOAuthAuthorizeResponse {
  authUrl: string;
}

export interface TikTokOAuthCallbackResponse {
  success: boolean;
  account: TikTokAccount | null;
}

export interface TikTokAccountContextRequest {
  tiktokAccountOpenId: string;
}

export interface TikTokAccountContextResponse {
  tiktokAccountOpenId: string;
  accessToken: string;
  tokenType: string;
  scope: string;
  privacyLevelOptions: string[];
  selectedPrivacyLevel: string | null;
}

export interface TikTokInitPublishContextResponse {
  contentIdeaId: number;
  tiktokAccountOpenId: string;
  accessToken: string;
  tokenType: string;
  title: string;
  shotstackUrl: string;
  privacyLevelOptions: string[];
  selectedPrivacyLevel: string | null;
}

export interface UploadTikTokMediaResponse {
  success: boolean;
  statusCode: number;
  uploadedBytes: number;
  responseBody: string | null;
}
