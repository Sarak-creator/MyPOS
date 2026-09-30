// Real-time Stock Sync Manager for Anachak POS
// Handles cross-tab, cross-window, and inter-component live synchronization
// for stock cuts (sales, installments, repairs, transfers) and ReStock (purchases, adjustments, voids).

export type StockEventType =
  | "SALE"
  | "RESTOCK"
  | "ADJUST"
  | "TRANSFER"
  | "REFUND"
  | "REPAIR"
  | "INSTALLMENT";

export interface StockSyncEvent {
  type: StockEventType;
  branchId?: string;
  productIds?: string[];
  quantities?: Record<string, number>;
  timestamp: number;
}

const CHANNEL_NAME = "anachak_stock_sync_channel";
const STORAGE_KEY = "anachak_stock_last_sync";
const EVENT_NAME = "anachak:stock-update";

// Singleton BroadcastChannel for browser environments
let broadcastChannel: BroadcastChannel | null = null;
function getBroadcastChannel(): BroadcastChannel | null {
  if (typeof window === "undefined" || !("BroadcastChannel" in window)) {
    return null;
  }
  if (!broadcastChannel) {
    try {
      broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
    } catch (e) {
      console.warn("BroadcastChannel not supported or failed to initialize:", e);
    }
  }
  return broadcastChannel;
}

/**
 * Broadcast a stock change event to all components, tabs, and windows in real-time
 */
export function broadcastStockChange(
  event: Omit<StockSyncEvent, "timestamp"> & { timestamp?: number }
) {
  if (typeof window === "undefined") return;

  const payload: StockSyncEvent = {
    ...event,
    timestamp: event.timestamp || Date.now(),
  };

  // 1. Dispatch DOM event for current window/components
  try {
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: payload }));
  } catch (e) {
    console.error("Failed to dispatch local stock event:", e);
  }

  // 2. Broadcast to other tabs/windows via BroadcastChannel
  const ch = getBroadcastChannel();
  if (ch) {
    try {
      ch.postMessage(payload);
    } catch (e) {
      console.warn("BroadcastChannel postMessage failed:", e);
    }
  }

  // 3. Fallback for cross-tab sync via localStorage storage event
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (e) {
    // Ignore quota or storage errors
  }
}

/**
 * Subscribe to real-time stock sync events across tabs and local events
 */
export function subscribeToStockSync(
  callback: (event: StockSyncEvent) => void
): () => void {
  if (typeof window === "undefined") return () => {};

  // Handler for local window CustomEvent
  const handleCustomEvent = (e: Event) => {
    const customEvent = e as CustomEvent<StockSyncEvent>;
    if (customEvent.detail) {
      callback(customEvent.detail);
    }
  };

  // Handler for cross-tab BroadcastChannel
  const ch = getBroadcastChannel();
  const handleBroadcastMessage = (e: MessageEvent) => {
    if (e.data && e.data.type) {
      callback(e.data as StockSyncEvent);
    }
  };

  // Handler for localStorage storage event fallback
  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        callback(parsed);
      } catch (err) {
        // ignore
      }
    }
  };

  window.addEventListener(EVENT_NAME, handleCustomEvent);
  ch?.addEventListener("message", handleBroadcastMessage);
  window.addEventListener("storage", handleStorageEvent);

  return () => {
    window.removeEventListener(EVENT_NAME, handleCustomEvent);
    ch?.removeEventListener("message", handleBroadcastMessage);
    window.removeEventListener("storage", handleStorageEvent);
  };
}
