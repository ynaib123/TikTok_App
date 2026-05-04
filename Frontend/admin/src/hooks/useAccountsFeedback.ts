import { useCallback, useMemo, useState } from 'react';

import type { FeedbackMessage } from '../types';

export function useAccountsFeedback(initialMessage: string | null = null) {
  const [localSuccessMessage, setLocalSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const successMessage = localSuccessMessage ?? initialMessage;

  const clearFeedback = useCallback(() => {
    setLocalSuccessMessage(null);
    setErrorMessage(null);
  }, []);

  const showSuccess = useCallback((message: string) => {
    setErrorMessage(null);
    setLocalSuccessMessage(message);
  }, []);

  const showError = useCallback((message: string) => {
    setLocalSuccessMessage(null);
    setErrorMessage(message);
  }, []);

  const setSuccessMessage = useCallback((message: string | null) => {
    setLocalSuccessMessage(message);
  }, []);

  const feedbackItems = useMemo<FeedbackMessage[]>(
    () => [
      { type: 'error', message: errorMessage },
      { type: 'success', message: successMessage },
    ],
    [errorMessage, successMessage],
  );

  return {
    errorMessage,
    successMessage,
    feedbackItems,
    clearFeedback,
    setErrorMessage,
    setSuccessMessage,
    showError,
    showSuccess,
  };
}
