import * as SecureStore from 'expo-secure-store';
import { useCallback, useEffect, useState } from 'react';

const KEY_COMPLETED = 'onboardingCompleted';
const KEY_CONSENT = 'consentC1';
const KEY_ANALYTICS = 'analyticsOptIn';

export type OnboardingState = {
  completed: boolean;
  loading: boolean;
  consentTokenC1?: string | null;
  analyticsOptIn: boolean;
  setAnalyticsOptIn: (value: boolean) => Promise<void>;
  setConsentToken: (token: string) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  resetOnboarding: () => Promise<void>;
};

async function getItem(key: string) {
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

async function setItem(key: string, value: string) {
  try {
    await SecureStore.setItemAsync(key, value);
  } catch {}
}

export function useOnboarding(): OnboardingState {
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [consentTokenC1, setConsentTokenC1] = useState<string | null>(null);
  const [analyticsOptIn, setAnalyticsOptInState] = useState<boolean>(false);

  useEffect(() => {
    (async () => {
      const flag = await getItem(KEY_COMPLETED);
      const c1 = await getItem(KEY_CONSENT);
      const ao = await getItem(KEY_ANALYTICS);
      setCompleted(flag === 'true');
      setConsentTokenC1(c1);
      setAnalyticsOptInState(ao === 'true');
      setLoading(false);
    })();
  }, []);

  const setAnalyticsOptIn = useCallback(async (value: boolean) => {
    await setItem(KEY_ANALYTICS, value ? 'true' : 'false');
    setAnalyticsOptInState(value);
  }, []);

  const setConsentToken = useCallback(async (token: string) => {
    await setItem(KEY_CONSENT, token);
    setConsentTokenC1(token);
  }, []);

  const completeOnboarding = useCallback(async () => {
    await setItem(KEY_COMPLETED, 'true');
    setCompleted(true);
    // If analytics opt-in is enabled, queue first-run AN1 event (do not send here)
    if (analyticsOptIn) {
      // Placeholder: persist a queued analytics event token if needed
      // e.g., SecureStore.setItemAsync('queuedAN1', `AN1:first_run|TS:${new Date().toISOString()}`)
    }
  }, [analyticsOptIn]);

  const resetOnboarding = useCallback(async () => {
    await setItem(KEY_COMPLETED, 'false');
    setCompleted(false);
  }, []);

  return {
    completed,
    loading,
    consentTokenC1,
    analyticsOptIn,
    setAnalyticsOptIn,
    setConsentToken,
    completeOnboarding,
    resetOnboarding,
  };
}
