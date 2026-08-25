import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-service-key";

/**
 * Standard Supabase client for browser & public client-side queries / realtime
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Supabase Admin client with service_role key for backend operations & storage
 */
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Helper to subscribe to live Repair Ticket status changes
 */
export function subscribeToRepairTickets(
  onUpdate: (payload: any) => void
) {
  return supabase
    .channel("public:RepairTicket")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "RepairTicket" },
      (payload) => {
        onUpdate(payload);
      }
    )
    .subscribe();
}

/**
 * Helper to subscribe to live Stock Inventory updates
 */
export function subscribeToStockUpdates(
  onUpdate: (payload: any) => void
) {
  return supabase
    .channel("public:StockItem")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "StockItem" },
      (payload) => {
        onUpdate(payload);
      }
    )
    .subscribe();
}

/**
 * Helper to subscribe to live POS Orders
 */
export function subscribeToLiveOrders(
  onUpdate: (payload: any) => void
) {
  return supabase
    .channel("public:Order")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "Order" },
      (payload) => {
        onUpdate(payload);
      }
    )
    .subscribe();
}
