export type ServiceProvider = 'GROQ' | 'SHOTSTACK' | 'PEXELS';

export type ServiceCategory = 'llm' | 'video' | 'photo' | 'social';

export const SERVICE_CATEGORY_LABELS: Record<ServiceCategory, string> = {
  llm: 'Modèles de langage',
  video: 'Génération vidéo',
  photo: 'Banques d\'images / vidéos',
  social: 'Réseaux sociaux',
};

export const SERVICE_PROVIDER_CATEGORY: Record<ServiceProvider | 'TIKTOK', ServiceCategory> = {
  GROQ: 'llm',
  SHOTSTACK: 'video',
  PEXELS: 'photo',
  TIKTOK: 'social',
};

export interface ServiceConnection {
  id: number;
  providerKey: ServiceProvider | string;
  displayName: string | null;
  baseUrl: string | null;
  accountIdentifier: string | null;
  metadataJson: string | null;
  hasSecret: boolean;
  status: string | null;
  active: boolean;
  validationStatus: string | null;
  validationMessage: string | null;
  connectedAt: string | null;
  lastValidatedAt: string | null;
  expiresAt?: string | null;
  lastUsedAt?: string | null;
  rateUsage?: {
    used: number;
    limit: number;
  } | null;
}

export interface ServiceConnectionForm {
  connectionId: number | null;
  displayName: string;
  baseUrl: string;
  accountIdentifier: string;
  secretValue: string;
  metadataJson: string;
}

export interface ServiceProviderFieldConfig {
  title: string;
  baseUrlLabel: string;
  identifierLabel: string;
  secretLabel: string;
  defaultBaseUrl: string;
  metadataPlaceholder: string;
  sourceLabel: string;
}

export const SERVICE_CONNECTION_FIELDS: Record<ServiceProvider, ServiceProviderFieldConfig> = {
  GROQ: {
    title: 'Groq',
    baseUrlLabel: 'API base URL',
    identifierLabel: 'Workspace / email',
    secretLabel: 'API key',
    defaultBaseUrl: 'https://api.groq.com',
    metadataPlaceholder: '{"model":"llama-3.3-70b-versatile"}',
    sourceLabel: 'Profil actif en base',
  },
  SHOTSTACK: {
    title: 'Shotstack',
    baseUrlLabel: 'API base URL',
    identifierLabel: 'Environment / owner',
    secretLabel: 'API key',
    defaultBaseUrl: 'https://api.shotstack.io/edit/v1',
    metadataPlaceholder: '{"environment":"production"}',
    sourceLabel: 'Profil actif en base',
  },
  PEXELS: {
    title: 'Pexels',
    baseUrlLabel: 'API base URL',
    identifierLabel: 'Workspace / email',
    secretLabel: 'API key',
    defaultBaseUrl: 'https://api.pexels.com',
    metadataPlaceholder: '{"orientation":"portrait"}',
    sourceLabel: 'Profil actif en base',
  },
};

export function createEmptyServiceForm(
  connection: Partial<ServiceConnection> | null = null,
  providerKey: ServiceProvider | null = null,
): ServiceConnectionForm {
  const defaultMetadata = providerKey ? SERVICE_CONNECTION_FIELDS[providerKey]?.metadataPlaceholder ?? '' : '';

  return {
    connectionId: connection?.id ?? null,
    displayName: connection?.displayName ?? '',
    baseUrl: connection?.baseUrl ?? '',
    accountIdentifier: connection?.accountIdentifier ?? '',
    secretValue: '',
    metadataJson: connection?.metadataJson ?? defaultMetadata,
  };
}
