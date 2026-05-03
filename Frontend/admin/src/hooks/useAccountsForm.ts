import { useCallback, useMemo, useState } from 'react';

import {
  createEmptyServiceForm,
  SERVICE_CONNECTION_FIELDS,
} from '../types/services';
import type {
  ServiceConnection,
  ServiceConnectionForm,
  ServiceProvider,
} from '../types';

export function validateServiceForm(
  providerKey: ServiceProvider,
  form: ServiceConnectionForm,
  connection?: Pick<ServiceConnection, 'hasSecret'> | null,
) {
  const providerConfig = SERVICE_CONNECTION_FIELDS[providerKey];
  const normalizedBaseUrl = String(form.baseUrl || '').trim();
  const normalizedMetadata = String(form.metadataJson || '').trim();
  const normalizedSecret = String(form.secretValue || '').trim();

  if (!normalizedBaseUrl) {
    throw new Error(`Renseigne ${providerConfig.baseUrlLabel.toLowerCase()} pour ${providerConfig.title}.`);
  }

  if (normalizedMetadata) {
    try {
      JSON.parse(normalizedMetadata);
    } catch {
      throw new Error(`Le champ Metadata JSON de ${providerConfig.title} doit contenir un JSON valide.`);
    }
  }

  if (providerKey !== 'N8N' && !normalizedSecret && !connection?.hasSecret) {
    throw new Error(`Renseigne ${providerConfig.secretLabel.toLowerCase()} pour ${providerConfig.title}.`);
  }
}

export function createInitialServiceForms() {
  return Object.fromEntries(
    (Object.keys(SERVICE_CONNECTION_FIELDS) as ServiceProvider[]).map((providerKey) => [
      providerKey,
      createEmptyServiceForm(null, providerKey),
    ]),
  ) as Record<ServiceProvider, ServiceConnectionForm>;
}

export function useAccountsForm() {
  const [serviceForms, setServiceForms] = useState<Record<ServiceProvider, ServiceConnectionForm>>(
    createInitialServiceForms,
  );
  const [openModalProviderKey, setOpenModalProviderKey] = useState<ServiceProvider | null>(null);

  const updateServiceForm = useCallback(
    <TField extends keyof ServiceConnectionForm>(
      providerKey: ServiceProvider,
      fieldName: TField,
      value: ServiceConnectionForm[TField],
    ) => {
      setServiceForms((current) => ({
        ...current,
        [providerKey]: {
          ...(current[providerKey] || createEmptyServiceForm(null, providerKey)),
          [fieldName]: value,
        },
      }));
    },
    [],
  );

  const loadServiceProfile = useCallback((providerKey: ServiceProvider, connection: ServiceConnection | null) => {
    setServiceForms((current) => ({
      ...current,
      [providerKey]: createEmptyServiceForm(connection),
    }));
    setOpenModalProviderKey(providerKey);
  }, []);

  const startNewServiceProfile = useCallback((providerKey: ServiceProvider) => {
    setServiceForms((current) => ({
      ...current,
      [providerKey]: createEmptyServiceForm(null, providerKey),
    }));
    setOpenModalProviderKey(providerKey);
  }, []);

  const closeModal = useCallback((providerKey: ServiceProvider) => {
    setOpenModalProviderKey(null);
    setServiceForms((current) => ({
      ...current,
      [providerKey]: createEmptyServiceForm(null, providerKey),
    }));
  }, []);

  const resetProviderForm = useCallback((providerKey: ServiceProvider, connection?: ServiceConnection | null) => {
    setServiceForms((current) => ({
      ...current,
      [providerKey]: createEmptyServiceForm(connection ?? null, providerKey),
    }));
  }, []);

  const formEntries = useMemo(() => Object.entries(serviceForms), [serviceForms]);

  return {
    formEntries,
    openModalProviderKey,
    serviceForms,
    closeModal,
    loadServiceProfile,
    resetProviderForm,
    setOpenModalProviderKey,
    setServiceForms,
    startNewServiceProfile,
    updateServiceForm,
  };
}
