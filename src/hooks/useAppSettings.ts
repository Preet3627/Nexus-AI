import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { AppSettings, AppSettingsPatch } from "../types/settings";

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const next = await invoke<AppSettings>("get_app_settings");
      setSettings(next);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateSettings = useCallback(async (patch: AppSettingsPatch) => {
    const next = await invoke<AppSettings>("update_app_settings", { patch });
    setSettings(next);
    return next;
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    settings,
    isLoading,
    refresh,
    updateSettings,
  };
}
