"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  CardLayoutType,
  POSDisplayConfig,
  DEFAULT_POS_DISPLAY_CONFIG,
} from "@/types/product";

const STORAGE_KEY = "anachak_pos_display_config";

interface POSSettingsContextValue {
  config: POSDisplayConfig;
  setLayout: (layout: CardLayoutType) => void;
  updateConfig: (partial: Partial<POSDisplayConfig>) => Promise<void>;
  resetToDefault: () => Promise<void>;
  isSelectorOpen: boolean;
  setIsSelectorOpen: (open: boolean) => void;
  isSavingRemote: boolean;
}

const POSSettingsContext = createContext<POSSettingsContextValue | undefined>(undefined);

export function POSSettingsProvider({ children }: { children: React.ReactNode }) {
  // 1. Synchronous optimistic initialization from localStorage to eliminate any flicker
  const [config, setConfig] = useState<POSDisplayConfig>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(STORAGE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          return { ...DEFAULT_POS_DISPLAY_CONFIG, ...parsed };
        }
      } catch (e) {
        console.warn("Failed to load local pos display config:", e);
      }
    }
    return DEFAULT_POS_DISPLAY_CONFIG;
  });

  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [isSavingRemote, setIsSavingRemote] = useState(false);

  // 2. Hydrate from Supabase remotely on mount
  useEffect(() => {
    let isMounted = true;
    const fetchRemoteConfig = async () => {
      try {
        const res = await fetch("/api/settings?refresh=true", { cache: "no-store" });
        const data = await res.json();
        if (isMounted && data.success && data.posDisplayConfig) {
          const remote = data.posDisplayConfig as POSDisplayConfig;
          setConfig((prev) => {
            const merged = { ...DEFAULT_POS_DISPLAY_CONFIG, ...prev, ...remote };
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
            } catch (err) {}
            return merged;
          });
        }
      } catch (err) {
        // Silently keep local state if offline or disconnected
      }
    };

    fetchRemoteConfig();
    return () => {
      isMounted = false;
    };
  }, []);

  // 3. Update configuration: optimistic local + background Supabase sync
  const updateConfig = useCallback(async (partial: Partial<POSDisplayConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...partial };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch (err) {}
      return next;
    });

    // Background push to Supabase
    setIsSavingRemote(true);
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SAVE_POS_DISPLAY_CONFIG",
          config: partial,
        }),
      });
    } catch (e) {
      console.warn("Remote settings sync deferred:", e);
    } finally {
      setIsSavingRemote(false);
    }
  }, []);

  // 4. Convenience helper to change layout mode
  const setLayout = useCallback((layout: CardLayoutType) => {
    updateConfig({ layout });
  }, [updateConfig]);

  // 5. Reset to factory defaults
  const resetToDefault = useCallback(async () => {
    setConfig(DEFAULT_POS_DISPLAY_CONFIG);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_POS_DISPLAY_CONFIG));
    } catch (e) {}

    setIsSavingRemote(true);
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SAVE_POS_DISPLAY_CONFIG",
          config: DEFAULT_POS_DISPLAY_CONFIG,
        }),
      });
    } finally {
      setIsSavingRemote(false);
    }
  }, []);

  return (
    <POSSettingsContext.Provider
      value={{
        config,
        setLayout,
        updateConfig,
        resetToDefault,
        isSelectorOpen,
        setIsSelectorOpen,
        isSavingRemote,
      }}
    >
      {children}
    </POSSettingsContext.Provider>
  );
}

export function usePOSSettings(): POSSettingsContextValue {
  const context = useContext(POSSettingsContext);
  if (!context) {
    throw new Error("usePOSSettings must be used within a POSSettingsProvider");
  }
  return context;
}
