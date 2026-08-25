// Shared in-memory KHQR payment transaction registry

declare global {
  var __khqrPaidTransactions: Map<string, { amount: number; currency: string; timestamp: number; txId: string }> | undefined;
}

if (!global.__khqrPaidTransactions) {
  global.__khqrPaidTransactions = new Map();
}

export const paidRegistry = global.__khqrPaidTransactions;
