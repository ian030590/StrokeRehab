import { useEffect, useState } from 'react';
import { getSetting, setSetting } from './settings';
import type { AppSettings } from './settings';

export function usePersistedSetting<K extends keyof AppSettings>(key: K) {
  const [value, setValue] = useState<AppSettings[K]>(() => getSetting(key));

  useEffect(() => {
    setSetting(key, value);
  }, [key, value]);

  return [value, setValue] as const;
}
