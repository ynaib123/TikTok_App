import { useCallback, useMemo, useState } from 'react';

import type { FeedbackMessage } from '../types';

export function useAccountsFeedback(initialMessage: string | null = null) {
  const [successMessage, setSuccessMessage] = useState<string | null>(initialMessage);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const clearFeedback = useCallback(() => {
    setSuccessMessage(null);
    setErrorMessage(null);
  }, []);

  const showSuccess = useCallback((message: string) => {
    setErrorMessage(null);
    setSuccessMessage(message);
  }, []);

  const showError = useCallback((message: string) => {
    setSuccessMessage(null);
    setErrorMessage(message);
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
