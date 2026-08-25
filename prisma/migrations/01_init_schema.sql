-- ====================================================================
-- អាណាចក្រPOS (Anachak POS) Enterprise Database SQL Migration Script
-- Target RDBMS: PostgreSQL 14+ / 15+ / 16+
-- Schema: public / multi-tenant
-- ====================================================================

-- Enable UUID generator
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create Enums
CREATE TYPE "RoleType" AS ENUM (
    'SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER', 'CASHIER', 'TECHNICIAN', 'ACCOUNTANT', 'INVENTORY_CLERK'
);

CREATE TYPE "ProductType" AS ENUM (
    'STANDARD_ITEM', 'SERIAL_IMEI_ITEM', 'VARIANT_ITEM', 'SERVICE_LABOR', 'SPARE_PART'
);

CREATE TYPE "StockStatus" AS ENUM (
    'IN_STOCK', 'RESERVED', 'SOLD', 'USED_IN_REPAIR', 'DEFECTIVE', 'TRANSFERRED'
);

CREATE TYPE "TransferStatus" AS ENUM (
    'PENDING', 'APPROVED', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED'
);

CREATE TYPE "AdjustmentReason" AS ENUM (
    'DAMAGE', 'EXPIRED', 'THEFT_LOSS', 'COUNT_CORRECTION', 'SCRAP'
);

CREATE TYPE "OrderStatus" AS ENUM (
    'COMPLETED', 'HELD', 'REFUNDED', 'PARTIALLY_REFUNDED', 'CANCELLED'
);

CREATE TYPE "PaymentMethod" AS ENUM (
    'CASH_USD', 'CASH_KHR', 'KHQR_ABA', 'KHQR_BAKONG', 'CREDIT_CARD', 'CUSTOMER_CREDIT', 'SPLIT_PAYMENT'
);

CREATE TYPE "RepairStatus" AS ENUM (
    'RECEIVED', 'DIAGNOSING', 'QUOTED', 'APPROVED_BY_CUSTOMER', 'IN_PROGRESS', 'WAITING_FOR_PARTS', 'READY_FOR_PICKUP', 'DELIVERED', 'CANCELLED', 'UNDER_WARRANTY'
);

CREATE TYPE "AccountType" AS ENUM (
    'ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'
);

CREATE TYPE "POStatus" AS ENUM (
    'DRAFT', 'ORDERED', 'RECEIVED', 'CANCELLED'
);

CREATE TYPE "DebtStatus" AS ENUM (
    'PENDING', 'PARTIALLY_PAID', 'PAID', 'OVERDUE'
);

-- 2. Multi-Tenancy & Branches
CREATE TABLE "Tenant" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "name" VARCHAR(255) NOT NULL,
    "legalName" VARCHAR(255),
    "vatNumber" VARCHAR(50),
    "phone" VARCHAR(50),
    "email" VARCHAR(100),
    "address" TEXT,
    "logoUrl" TEXT,
    "plan" VARCHAR(50) DEFAULT 'ENTERPRISE',
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Branch" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "tenantId" UUID NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "nameEn" VARCHAR(255),
    "phone" VARCHAR(50),
    "email" VARCHAR(100),
    "address" TEXT,
    "isHeadOffice" BOOLEAN DEFAULT false,
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "uq_branch_tenant_code" UNIQUE ("tenantId", "code")
);

CREATE TABLE "Warehouse" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "branchId" UUID NOT NULL REFERENCES "Branch"("id") ON DELETE CASCADE,
    "name" VARCHAR(255) NOT NULL,
    "location" TEXT,
    "isDefault" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Users, Roles & Security
CREATE TABLE "User" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "tenantId" UUID NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
    "branchId" UUID REFERENCES "Branch"("id") ON DELETE SET NULL,
    "username" VARCHAR(100) UNIQUE NOT NULL,
    "email" VARCHAR(100) UNIQUE,
    "passwordHash" VARCHAR(255) NOT NULL,
    "fullName" VARCHAR(255) NOT NULL,
    "fullNameKh" VARCHAR(255),
    "phone" VARCHAR(50),
    "role" "RoleType" DEFAULT 'CASHIER',
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN DEFAULT true,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "AuditLog" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "action" VARCHAR(100) NOT NULL,
    "entity" VARCHAR(100) NOT NULL,
    "entityId" VARCHAR(100),
    "details" JSONB,
    "ipAddress" VARCHAR(50),
    "userAgent" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Products & Catalog
CREATE TABLE "Category" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "tenantId" UUID NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
    "nameKh" VARCHAR(255) NOT NULL,
    "nameEn" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "icon" VARCHAR(100),
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Brand" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "name" VARCHAR(255) NOT NULL,
    "logoUrl" TEXT
);

CREATE TABLE "Product" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "tenantId" UUID NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
    "categoryId" UUID REFERENCES "Category"("id") ON DELETE SET NULL,
    "brandId" UUID REFERENCES "Brand"("id") ON DELETE SET NULL,
    "sku" VARCHAR(100) UNIQUE NOT NULL,
    "barcode" VARCHAR(100) UNIQUE,
    "nameKh" VARCHAR(255) NOT NULL,
    "nameEn" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "type" "ProductType" DEFAULT 'STANDARD_ITEM',
    "costPriceUsd" NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    "salePriceUsd" NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    "salePriceKhr" NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    "wholesalePriceUsd" NUMERIC(12, 2),
    "minStockAlert" INTEGER DEFAULT 5,
    "unit" VARCHAR(50) DEFAULT 'Pcs',
    "imageUrl" TEXT,
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "StockItem" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "productId" UUID NOT NULL REFERENCES "Product"("id") ON DELETE CASCADE,
    "warehouseId" UUID NOT NULL REFERENCES "Warehouse"("id") ON DELETE CASCADE,
    "branchId" UUID NOT NULL REFERENCES "Branch"("id") ON DELETE CASCADE,
    "serialOrImei" VARCHAR(100) UNIQUE,
    "batchNumber" VARCHAR(100),
    "expirationDate" TIMESTAMP WITH TIME ZONE,
    "quantity" INTEGER DEFAULT 1,
    "costPriceUsd" NUMERIC(12, 2) NOT NULL,
    "status" "StockStatus" DEFAULT 'IN_STOCK',
    "orderItemId" UUID,
    "repairPartId" UUID,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Customers & CRM
CREATE TABLE "Customer" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "tenantId" UUID NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
    "name" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(50) UNIQUE NOT NULL,
    "email" VARCHAR(100),
    "address" TEXT,
    "tier" VARCHAR(50) DEFAULT 'RETAIL',
    "loyaltyPoints" INTEGER DEFAULT 0,
    "creditLimitUsd" NUMERIC(12, 2) DEFAULT 0.00,
    "currentDebtUsd" NUMERIC(12, 2) DEFAULT 0.00,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. POS Orders & Payments
CREATE TABLE "CashDrawerShift" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "branchId" UUID NOT NULL REFERENCES "Branch"("id") ON DELETE CASCADE,
    "userId" UUID NOT NULL REFERENCES "User"("id"),
    "openingTime" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "closingTime" TIMESTAMP WITH TIME ZONE,
    "startingCashUsd" NUMERIC(12, 2) NOT NULL,
    "startingCashKhr" NUMERIC(14, 2) NOT NULL,
    "actualCashUsd" NUMERIC(12, 2),
    "actualCashKhr" NUMERIC(14, 2),
    "differenceUsd" NUMERIC(12, 2),
    "notes" TEXT,
    "status" VARCHAR(20) DEFAULT 'OPEN'
);

CREATE TABLE "Order" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "invoiceNumber" VARCHAR(100) UNIQUE NOT NULL,
    "branchId" UUID NOT NULL REFERENCES "Branch"("id") ON DELETE CASCADE,
    "customerId" UUID REFERENCES "Customer"("id") ON DELETE SET NULL,
    "cashierId" UUID NOT NULL REFERENCES "User"("id"),
    "cashDrawerId" UUID REFERENCES "CashDrawerShift"("id") ON DELETE SET NULL,
    "status" "OrderStatus" DEFAULT 'COMPLETED',
    "subtotalUsd" NUMERIC(12, 2) NOT NULL,
    "discountType" VARCHAR(20),
    "discountAmount" NUMERIC(12, 2) DEFAULT 0.00,
    "taxRatePercent" NUMERIC(5, 2) DEFAULT 0.00,
    "taxAmountUsd" NUMERIC(12, 2) DEFAULT 0.00,
    "totalUsd" NUMERIC(12, 2) NOT NULL,
    "totalKhr" NUMERIC(14, 2) NOT NULL,
    "exchangeRateKhr" NUMERIC(10, 2) DEFAULT 4100.00,
    "notes" TEXT,
    "khqrQrString" TEXT,
    "khqrMd5" VARCHAR(100),
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "OrderItem" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "orderId" UUID NOT NULL REFERENCES "Order"("id") ON DELETE CASCADE,
    "productId" UUID NOT NULL REFERENCES "Product"("id"),
    "unitCostUsd" NUMERIC(12, 2) NOT NULL,
    "unitPriceUsd" NUMERIC(12, 2) NOT NULL,
    "unitPriceKhr" NUMERIC(14, 2) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "discountAmount" NUMERIC(12, 2) DEFAULT 0.00,
    "totalPriceUsd" NUMERIC(12, 2) NOT NULL
);

CREATE TABLE "Payment" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "orderId" UUID NOT NULL REFERENCES "Order"("id") ON DELETE CASCADE,
    "method" "PaymentMethod" NOT NULL,
    "amountUsd" NUMERIC(12, 2) NOT NULL,
    "amountKhr" NUMERIC(14, 2) DEFAULT 0.00,
    "exchangeRate" NUMERIC(10, 2) DEFAULT 4100.00,
    "tenderedUsd" NUMERIC(12, 2),
    "changeUsd" NUMERIC(12, 2),
    "referenceNumber" VARCHAR(100),
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Repairs & Job Tickets
CREATE TABLE "RepairTicket" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "ticketNumber" VARCHAR(100) UNIQUE NOT NULL,
    "branchId" UUID NOT NULL REFERENCES "Branch"("id") ON DELETE CASCADE,
    "customerId" UUID NOT NULL REFERENCES "Customer"("id") ON DELETE CASCADE,
    "technicianId" UUID REFERENCES "User"("id"),
    "deviceType" VARCHAR(100) NOT NULL,
    "deviceBrand" VARCHAR(100) NOT NULL,
    "deviceModel" VARCHAR(100) NOT NULL,
    "imeiOrSerial" VARCHAR(100),
    "passcode" VARCHAR(50),
    "patternLock" VARCHAR(50),
    "cosmeticCondition" TEXT,
    "customerProblem" TEXT NOT NULL,
    "diagnosticNotes" TEXT,
    "estimatedCostUsd" NUMERIC(12, 2),
    "finalCostUsd" NUMERIC(12, 2),
    "depositPaidUsd" NUMERIC(12, 2) DEFAULT 0.00,
    "status" "RepairStatus" DEFAULT 'RECEIVED',
    "warrantyDays" INTEGER DEFAULT 30,
    "completedAt" TIMESTAMP WITH TIME ZONE,
    "deliveredAt" TIMESTAMP WITH TIME ZONE,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "RepairStatusLog" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "repairTicketId" UUID NOT NULL REFERENCES "RepairTicket"("id") ON DELETE CASCADE,
    "fromStatus" "RepairStatus" NOT NULL,
    "toStatus" "RepairStatus" NOT NULL,
    "changedBy" VARCHAR(100) NOT NULL,
    "notes" TEXT,
    "notifiedCustomer" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "RepairPartUsed" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "repairTicketId" UUID NOT NULL REFERENCES "RepairTicket"("id") ON DELETE CASCADE,
    "productId" UUID NOT NULL REFERENCES "Product"("id"),
    "quantity" INTEGER DEFAULT 1,
    "costPriceUsd" NUMERIC(12, 2) NOT NULL,
    "salePriceUsd" NUMERIC(12, 2) NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "TechnicianCommission" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "repairTicketId" UUID NOT NULL REFERENCES "RepairTicket"("id") ON DELETE CASCADE,
    "technicianId" UUID NOT NULL,
    "commissionUsd" NUMERIC(12, 2) NOT NULL,
    "isPaid" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Chart of Accounts & General Ledger
CREATE TABLE "Account" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "tenantId" UUID NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
    "code" VARCHAR(50) NOT NULL,
    "nameKh" VARCHAR(255) NOT NULL,
    "nameEn" VARCHAR(255) NOT NULL,
    "type" "AccountType" NOT NULL,
    "balanceUsd" NUMERIC(14, 2) DEFAULT 0.00,
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "uq_account_tenant_code" UNIQUE ("tenantId", "code")
);

CREATE TABLE "JournalEntry" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "entryNumber" VARCHAR(100) UNIQUE NOT NULL,
    "date" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "reference" VARCHAR(100),
    "description" TEXT NOT NULL,
    "isPosted" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "JournalLineItem" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "journalEntryId" UUID NOT NULL REFERENCES "JournalEntry"("id") ON DELETE CASCADE,
    "accountId" UUID NOT NULL REFERENCES "Account"("id"),
    "debitUsd" NUMERIC(14, 2) DEFAULT 0.00,
    "creditUsd" NUMERIC(14, 2) DEFAULT 0.00,
    "memo" TEXT
);

CREATE TABLE "Expense" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "branchId" UUID NOT NULL REFERENCES "Branch"("id") ON DELETE CASCADE,
    "accountId" UUID NOT NULL REFERENCES "Account"("id"),
    "category" VARCHAR(100) NOT NULL,
    "amountUsd" NUMERIC(12, 2) NOT NULL,
    "amountKhr" NUMERIC(14, 2) DEFAULT 0.00,
    "receiptUrl" TEXT,
    "paidTo" VARCHAR(255),
    "notes" TEXT,
    "date" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. HRM & Attendance
CREATE TABLE "Employee" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID UNIQUE REFERENCES "User"("id") ON DELETE SET NULL,
    "employeeCode" VARCHAR(50) UNIQUE NOT NULL,
    "fullNameKh" VARCHAR(255) NOT NULL,
    "fullNameEn" VARCHAR(255) NOT NULL,
    "position" VARCHAR(100) NOT NULL,
    "baseSalaryUsd" NUMERIC(10, 2) NOT NULL,
    "hireDate" DATE NOT NULL,
    "bankAccount" VARCHAR(100),
    "phone" VARCHAR(50) NOT NULL,
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Attendance" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "employeeId" UUID NOT NULL REFERENCES "Employee"("id") ON DELETE CASCADE,
    "branchId" UUID NOT NULL REFERENCES "Branch"("id") ON DELETE CASCADE,
    "date" DATE NOT NULL,
    "checkIn" TIMESTAMP WITH TIME ZONE NOT NULL,
    "checkOut" TIMESTAMP WITH TIME ZONE,
    "status" VARCHAR(50) DEFAULT 'PRESENT',
    "notes" TEXT
);

CREATE TABLE "PayrollRecord" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "employeeId" UUID NOT NULL REFERENCES "Employee"("id") ON DELETE CASCADE,
    "monthYear" VARCHAR(20) NOT NULL,
    "baseSalaryUsd" NUMERIC(10, 2) NOT NULL,
    "overtimePayUsd" NUMERIC(10, 2) DEFAULT 0.00,
    "commissionUsd" NUMERIC(10, 2) DEFAULT 0.00,
    "bonusUsd" NUMERIC(10, 2) DEFAULT 0.00,
    "deductionUsd" NUMERIC(10, 2) DEFAULT 0.00,
    "netSalaryUsd" NUMERIC(10, 2) NOT NULL,
    "isDisbursed" BOOLEAN DEFAULT false,
    "disbursedAt" TIMESTAMP WITH TIME ZONE,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Debt & Credit (បំណុល)
CREATE TABLE "DebtPaymentSchedule" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "customerId" UUID NOT NULL REFERENCES "Customer"("id") ON DELETE CASCADE,
    "orderId" VARCHAR(100),
    "totalDebtUsd" NUMERIC(12, 2) NOT NULL,
    "paidAmountUsd" NUMERIC(12, 2) DEFAULT 0.00,
    "remainingUsd" NUMERIC(12, 2) NOT NULL,
    "dueDate" TIMESTAMP WITH TIME ZONE NOT NULL,
    "status" "DebtStatus" DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Indexes for High-Performance Queries
CREATE INDEX idx_product_sku ON "Product"("sku");
CREATE INDEX idx_product_barcode ON "Product"("barcode");
CREATE INDEX idx_stock_imei ON "StockItem"("serialOrImei");
CREATE INDEX idx_order_invoice ON "Order"("invoiceNumber");
CREATE INDEX idx_repair_ticket ON "RepairTicket"("ticketNumber");
CREATE INDEX idx_customer_phone ON "Customer"("phone");
