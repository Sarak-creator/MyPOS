const dbUrl = Buffer.from('cG9zdGdyZXNxbDovL3Bvc3RncmVzLmJ3eW9kaWZydW1naWFwcWZ3em5vOkFuYWphazM3NjAyMjlAYXdzLTAtYXAtbm9ydGhlYXN0LTIucG9vbGVyLnN1cGFiYXNlLmNvbTo2NTQzL3Bvc3RncmVzP2Nvbm5lY3Rpb25fbGltaXQ9MTAmcG9vbF90aW1lb3V0PTIw', 'base64').toString('utf-8') + '&pgbouncer=true';
process.env.DATABASE_URL = dbUrl;
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });

async function migrate() {
  console.log('🚀 Starting DB migration for Installments, Pawn and Warranty...');

  // 1. Create Enums if not exist
  const enums = [
    `DO $$ BEGIN
      CREATE TYPE "InstallmentStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'OVERDUE', 'DEFAULTED', 'CANCELLED');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;`,
    `DO $$ BEGIN
      CREATE TYPE "SchedulePaymentStatus" AS ENUM ('PENDING', 'PARTIALLY_PAID', 'PAID', 'OVERDUE');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;`,
    `DO $$ BEGIN
      CREATE TYPE "PawnStatus" AS ENUM ('ACTIVE', 'REDEEMED', 'EXTENDED', 'OVERDUE', 'DEFAULTED_FORFEITED');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;`,
    `DO $$ BEGIN
      CREATE TYPE "PawnPaymentType" AS ENUM ('INTEREST_PAYMENT', 'LOAN_REDUCTION', 'FULL_REDEMPTION', 'PENALTY_FEE');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;`
  ];

  for (const q of enums) {
    await prisma.$executeRawUnsafe(q);
  }
  console.log('✅ Enums verified/created');

  // 2. Add warrantyDays to Product and OrderItem if not exist
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "warrantyDays" INTEGER DEFAULT 30;
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "warrantyDays" INTEGER DEFAULT 30;
  `);
  console.log('✅ Product & OrderItem warrantyDays columns verified/created');

  // 3. Create InstallmentContract table
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "InstallmentContract" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "contractNumber" TEXT NOT NULL UNIQUE,
      "tenantId" TEXT NOT NULL,
      "branchId" TEXT NOT NULL,
      "customerId" TEXT NOT NULL,
      "productId" TEXT,
      "productName" TEXT NOT NULL,
      "productImeiOrSerial" TEXT,
      "totalPriceUsd" DECIMAL(12, 2) NOT NULL,
      "downPaymentUsd" DECIMAL(12, 2) NOT NULL DEFAULT 0,
      "downPaymentKhr" DECIMAL(14, 2) NOT NULL DEFAULT 0,
      "principalRemainingUsd" DECIMAL(12, 2) NOT NULL,
      "interestRatePercent" DECIMAL(5, 2) NOT NULL DEFAULT 1.5,
      "durationMonths" INTEGER NOT NULL,
      "monthlyAmountUsd" DECIMAL(12, 2) NOT NULL,
      "totalRepaymentUsd" DECIMAL(12, 2) NOT NULL,
      "totalPaidUsd" DECIMAL(12, 2) NOT NULL DEFAULT 0,
      "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "endDate" TIMESTAMP(3) NOT NULL,
      "status" "InstallmentStatus" NOT NULL DEFAULT 'ACTIVE',
      "guarantorName" TEXT,
      "guarantorPhone" TEXT,
      "guarantorNationalId" TEXT,
      "guarantorAddress" TEXT,
      "customerNationalId" TEXT,
      "notes" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "InstallmentContract_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "InstallmentContract_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "InstallmentContract_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE
    );
  `);
  console.log('✅ InstallmentContract table verified/created');

  // 4. Create InstallmentSchedule table
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "InstallmentSchedule" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "contractId" TEXT NOT NULL,
      "installmentNumber" INTEGER NOT NULL,
      "dueDate" TIMESTAMP(3) NOT NULL,
      "principalAmountUsd" DECIMAL(12, 2) NOT NULL,
      "interestAmountUsd" DECIMAL(12, 2) NOT NULL,
      "totalDueUsd" DECIMAL(12, 2) NOT NULL,
      "paidAmountUsd" DECIMAL(12, 2) NOT NULL DEFAULT 0,
      "paidDate" TIMESTAMP(3),
      "paymentMethod" "PaymentMethod",
      "status" "SchedulePaymentStatus" NOT NULL DEFAULT 'PENDING',
      "daysOverdue" INTEGER NOT NULL DEFAULT 0,
      "penaltyAmountUsd" DECIMAL(12, 2) NOT NULL DEFAULT 0,
      "penaltyPaidUsd" DECIMAL(12, 2) NOT NULL DEFAULT 0,
      "notes" TEXT,
      "collectedBy" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "InstallmentSchedule_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "InstallmentContract"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `);
  console.log('✅ InstallmentSchedule table verified/created');

  // 5. Create PawnTicket table
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "PawnTicket" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "ticketNumber" TEXT NOT NULL UNIQUE,
      "tenantId" TEXT NOT NULL,
      "branchId" TEXT NOT NULL,
      "customerId" TEXT NOT NULL,
      "customerNationalId" TEXT,
      "itemName" TEXT NOT NULL,
      "itemCategory" TEXT NOT NULL,
      "itemBrand" TEXT,
      "itemModel" TEXT,
      "imeiOrSerial" TEXT,
      "itemCondition" TEXT,
      "storageLocation" TEXT,
      "estimatedValueUsd" DECIMAL(12, 2) NOT NULL,
      "loanAmountUsd" DECIMAL(12, 2) NOT NULL,
      "monthlyInterestRate" DECIMAL(5, 2) NOT NULL DEFAULT 2.5,
      "monthlyInterestUsd" DECIMAL(12, 2) NOT NULL,
      "durationMonths" INTEGER NOT NULL DEFAULT 1,
      "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "maturityDate" TIMESTAMP(3) NOT NULL,
      "status" "PawnStatus" NOT NULL DEFAULT 'ACTIVE',
      "totalInterestPaidUsd" DECIMAL(12, 2) NOT NULL DEFAULT 0,
      "daysOverdue" INTEGER NOT NULL DEFAULT 0,
      "penaltyAmountUsd" DECIMAL(12, 2) NOT NULL DEFAULT 0,
      "redeemedDate" TIMESTAMP(3),
      "redeemedAmountUsd" DECIMAL(12, 2),
      "notes" TEXT,
      "handledBy" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "PawnTicket_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "PawnTicket_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `);
  console.log('✅ PawnTicket table verified/created');

  // 6. Create PawnPaymentLog table
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "PawnPaymentLog" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "pawnTicketId" TEXT NOT NULL,
      "paymentType" "PawnPaymentType" NOT NULL DEFAULT 'INTEREST_PAYMENT',
      "amountPaidUsd" DECIMAL(12, 2) NOT NULL,
      "penaltyPaidUsd" DECIMAL(12, 2) NOT NULL DEFAULT 0,
      "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'CASH_USD',
      "monthsExtended" INTEGER NOT NULL DEFAULT 0,
      "newMaturityDate" TIMESTAMP(3),
      "paidDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "receivedBy" TEXT NOT NULL,
      "receiptNumber" TEXT,
      "notes" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "PawnPaymentLog_pawnTicketId_fkey" FOREIGN KEY ("pawnTicketId") REFERENCES "PawnTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `);
  console.log('✅ PawnPaymentLog table verified/created');

  console.log('🎉 ALL TABLES & SCHEMAS MIGRATED SUCCESSFULLY!');
}

migrate()
  .catch(e => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
