/**
 * Offline Sync Engine for អាណាចក្រPOS
 * Stores pending orders in browser IndexedDB/LocalStorage and syncs with backend when online
 */

export interface OfflinePendingOrder {
  id: string; // Client-side generated UUID
  invoiceNumber: string;
  branchId: string;
  customerId?: string | null;
  items: Array<{
    productId: string;
    quantity: number;
    priceUsd: number;
    discountAmount: number;
  }>;
  totalUsd: number;
  totalKhr: number;
  paymentMethod: string;
  tenderedUsd?: number;
  changeUsd?: number;
  createdAt: string;
  isSynced: boolean;
}

const STORAGE_KEY = "anachak_pos_offline_queue";

export class OfflineSyncManager {
  static getQueue(): OfflinePendingOrder[] {
    if (typeof window === "undefined") return [];
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  static queueOrder(order: Omit<OfflinePendingOrder, "isSynced">): void {
    if (typeof window === "undefined") return;
    const current = this.getQueue();
    const newEntry: OfflinePendingOrder = { ...order, isSynced: false };
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...current, newEntry]));
  }

  static async syncPendingOrders(): Promise<{ syncedCount: number; errors: any[] }> {
    const queue = this.getQueue().filter((item) => !item.isSynced);
    if (queue.length === 0) return { syncedCount: 0, errors: [] };

    let syncedCount = 0;
    const errors = [];

    for (const order of queue) {
      try {
        const response = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(order),
        });

        if (response.ok) {
          syncedCount++;
          // Remove or mark as synced
          this.removeOrder(order.id);
        } else {
          errors.push({ id: order.id, status: response.status });
        }
      } catch (err) {
        errors.push({ id: order.id, error: err });
      }
    }

    return { syncedCount, errors };
  }

  static removeOrder(orderId: string): void {
    if (typeof window === "undefined") return;
    const remaining = this.getQueue().filter((item) => item.id !== orderId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
  }

  static clearQueue(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_KEY);
  }
}
