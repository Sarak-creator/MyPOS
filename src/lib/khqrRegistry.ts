// Global in-memory cache for recorded payments across API routes
declare global {
  var __khqrPaidTransactions: Map<string, { amount: number; currency: string; timestamp: number; txId: string }> | undefined;
}

if (!global.__khqrPaidTransactions) {
  global.__khqrPaidTransactions = new Map();
}

export const paidRegistry = global.__khqrPaidTransactions;
