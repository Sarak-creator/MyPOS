import { PrismaClient, RoleType, ProductType, RepairStatus, AccountType, POStatus, OrderStatus, PaymentMethod, DebtStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/**
 * Delete only data belonging to a specific Tenant (Optimized Layered Parallel Deletion)
 */
export async function deleteTenantData(tenantId: string) {
  console.log(`🧹 Deleting data for tenant ${tenantId}...`);

  // Layer 1: Delete all leaf records (logs, items, payments)
  await Promise.all([
    prisma.auditLog.deleteMany({ where: { user: { tenantId } } }).catch(() => {}),
    prisma.technicianCommission.deleteMany({ where: { repairTicket: { branch: { tenantId } } } }).catch(() => {}),
    prisma.repairStatusLog.deleteMany({ where: { repairTicket: { branch: { tenantId } } } }).catch(() => {}),
    prisma.repairPartUsed.deleteMany({ where: { repairTicket: { branch: { tenantId } } } }).catch(() => {}),
    prisma.debtPaymentLog.deleteMany({ where: { debtSchedule: { customer: { tenantId } } } }).catch(() => {}),
    prisma.payment.deleteMany({ where: { order: { branch: { tenantId } } } }).catch(() => {}),
    prisma.orderItem.deleteMany({ where: { order: { branch: { tenantId } } } }).catch(() => {}),
    prisma.purchaseOrderItem.deleteMany({ where: { purchaseOrder: { supplier: { tenantId } } } }).catch(() => {}),
    prisma.stockTransferItem.deleteMany({ where: { transfer: { fromBranch: { tenantId } } } }).catch(() => {}),
    prisma.stockAdjustmentItem.deleteMany({ where: { adjustment: { warehouse: { branch: { tenantId } } } } }).catch(() => {}),
    prisma.payrollRecord.deleteMany({ where: { employee: { user: { tenantId } } } }).catch(() => {}),
    prisma.attendance.deleteMany({ where: { branch: { tenantId } } }).catch(() => {}),
    prisma.journalLineItem.deleteMany({ where: { account: { tenantId } } }).catch(() => {}),
  ]);

  // Layer 2: Delete intermediate transactional parents & stock records
  await Promise.all([
    prisma.repairTicket.deleteMany({ where: { branch: { tenantId } } }).catch(() => {}),
    prisma.debtPaymentSchedule.deleteMany({ where: { customer: { tenantId } } }).catch(() => {}),
    prisma.order.deleteMany({ where: { branch: { tenantId } } }).catch(() => {}),
    prisma.cashDrawerShift.deleteMany({ where: { branch: { tenantId } } }).catch(() => {}),
    prisma.purchaseOrder.deleteMany({ where: { supplier: { tenantId } } }).catch(() => {}),
    prisma.stockTransfer.deleteMany({ where: { fromBranch: { tenantId } } }).catch(() => {}),
    prisma.stockAdjustment.deleteMany({ where: { warehouse: { branch: { tenantId } } } }).catch(() => {}),
    prisma.stockItem.deleteMany({ where: { product: { tenantId } } }).catch(() => {}),
    prisma.productVariant.deleteMany({ where: { product: { tenantId } } }).catch(() => {}),
    prisma.expense.deleteMany({ where: { branch: { tenantId } } }).catch(() => {}),
  ]);

  // Layer 3: Delete master entities (products, categories, accounts, suppliers, customers, employees)
  await Promise.all([
    prisma.product.deleteMany({ where: { tenantId } }).catch(() => {}),
    prisma.category.deleteMany({ where: { tenantId } }).catch(() => {}),
    prisma.account.deleteMany({ where: { tenantId } }).catch(() => {}),
    prisma.supplier.deleteMany({ where: { tenantId } }).catch(() => {}),
    prisma.customer.deleteMany({ where: { tenantId } }).catch(() => {}),
    prisma.employee.deleteMany({ where: { user: { tenantId } } }).catch(() => {}),
  ]);

  console.log(`🗑️ Successfully deleted all business transactions and inventory for store ${tenantId}`);
}

/**
 * Restore standard master catalog and demo transactions for a specific Tenant
 */
export async function restoreTenantData(tenantId: string) {
  console.log(`✨ Restoring fresh enterprise master data for tenant ${tenantId}...`);

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      branches: { include: { warehouses: true } },
      users: true,
    },
  });

  if (!tenant) throw new Error("Tenant not found");

  let branchHQ = tenant.branches[0];
  if (!branchHQ) {
    branchHQ = await prisma.branch.create({
      data: {
        tenantId: tenant.id,
        code: "BR-01",
        name: "សាខាកណ្តាល ភ្នំពេញ (Phnom Penh Main)",
        nameEn: "Phnom Penh Main Branch",
        phone: tenant.phone || "012 888 999",
        isHeadOffice: true,
        warehouses: {
          create: [
            { name: "ឃ្លាំងទំនិញកណ្តាល (Main Warehouse)", isDefault: true },
            { name: "ឃ្លាំងគ្រឿងបន្លាស់ជួសជុល (Spare Parts Room)", isDefault: false },
          ],
        },
      },
      include: { warehouses: true },
    });
  }

  const mainWarehouse = branchHQ.warehouses.find((w) => w.isDefault) || branchHQ.warehouses[0];

  // 1. Chart of Accounts (COA)
  const coaData = [
    { code: "1010", nameKh: "សាច់ប្រាក់ក្នុងដៃ (Cash on Hand USD)", nameEn: "Cash on Hand USD", type: AccountType.ASSET },
    { code: "1020", nameKh: "សាច់ប្រាក់រៀល (Cash KHR)", nameEn: "Cash on Hand KHR", type: AccountType.ASSET },
    { code: "1030", nameKh: "គណនីធនាគារ ABA (ABA Bank Account)", nameEn: "ABA Bank Account", type: AccountType.ASSET },
    { code: "1100", nameKh: "គណនីត្រូវទារ / បំណុលអតិថិជន (Accounts Receivable)", nameEn: "Accounts Receivable (AR)", type: AccountType.ASSET },
    { code: "1200", nameKh: "ស្តុកទំនិញក្នុងដៃ (Merchandise Inventory)", nameEn: "Merchandise Inventory", type: AccountType.ASSET },
    { code: "2010", nameKh: "គណនីត្រូវសងអ្នកផ្គត់ផ្គង់ (Accounts Payable)", nameEn: "Accounts Payable (AP)", type: AccountType.LIABILITY },
    { code: "4010", nameKh: "ចំណូលពីការលក់ទំនិញ POS (POS Retail Sales)", nameEn: "Retail Sales Revenue", type: AccountType.REVENUE },
    { code: "4020", nameKh: "ចំណូលពីសេវាកម្មជួសជុល (Repair Service Revenue)", nameEn: "Repair Service Revenue", type: AccountType.REVENUE },
    { code: "5010", nameKh: "ថ្លៃដើមទំនិញលក់ចេញ (Cost of Goods Sold - COGS)", nameEn: "Cost of Goods Sold", type: AccountType.EXPENSE },
    { code: "6010", nameKh: "ចំណាយប្រាក់បៀវត្សបុគ្គលិក (Salaries & Wages)", nameEn: "Salaries Expense", type: AccountType.EXPENSE },
    { code: "6020", nameKh: "ចំណាយថ្លៃជួលទីតាំង & អគ្គិសនី (Rent & Utilities)", nameEn: "Rent & Utilities", type: AccountType.EXPENSE },
  ];

  for (const acc of coaData) {
    await prisma.account.create({
      data: { tenantId: tenant.id, ...acc },
    }).catch(() => {});
  }

  // 2. Categories
  const catPhones = await prisma.category.create({
    data: { tenantId: tenant.id, nameKh: "ទូរស័ព្ទដៃ & ថេប្លេត", nameEn: "Smartphones & Tablets", slug: "smartphones", icon: "smartphone" },
  });
  const catAcc = await prisma.category.create({
    data: { tenantId: tenant.id, nameKh: "គ្រឿងបន្សំ & កាស", nameEn: "Accessories & Audio", slug: "accessories", icon: "sparkles" },
  });
  const catParts = await prisma.category.create({
    data: { tenantId: tenant.id, nameKh: "គ្រឿងបន្លាស់ទូរស័ព្ទ", nameEn: "Phone Spare Parts", slug: "spare-parts", icon: "cpu" },
  });
  const catServices = await prisma.category.create({
    data: { tenantId: tenant.id, nameKh: "សេវាកម្មជួសជុល & កម្មវិធី", nameEn: "Repair Services & Labor", slug: "repair-services", icon: "wrench" },
  });

  // 3. Brands
  let brandApple = await prisma.brand.findFirst({ where: { name: "Apple" } });
  if (!brandApple) {
    brandApple = await prisma.brand.create({ data: { name: "Apple" } });
  }

  // 4. Products with Stock & Serial/IMEI
  const p1 = await prisma.product.create({
    data: {
      tenantId: tenant.id,
      categoryId: catPhones.id,
      brandId: brandApple.id,
      sku: `IP15PM-256-NT-${Date.now().toString().slice(-4)}`,
      nameKh: "iPhone 15 Pro Max 256GB Natural Titanium (LL/A)",
      nameEn: "iPhone 15 Pro Max 256GB Natural Titanium",
      type: ProductType.SERIAL_IMEI_ITEM,
      costPriceUsd: 1040.0,
      salePriceUsd: 1169.0,
      salePriceKhr: 1169.0 * 4100,
      minStockAlert: 3,
      unit: "គ្រឿង",
      stockItems: {
        create: [
          {
            branchId: branchHQ.id,
            warehouseId: mainWarehouse?.id,
            serialOrImei: `3598761${Date.now().toString().slice(-8)}`,
            quantity: 1,
            costPriceUsd: 1040.0,
            status: "IN_STOCK",
          },
        ],
      },
    },
  });

  const p2 = await prisma.product.create({
    data: {
      tenantId: tenant.id,
      categoryId: catAcc.id,
      brandId: brandApple.id,
      sku: `AP-20W-USB-C-${Date.now().toString().slice(-4)}`,
      nameKh: "ក្បាលឆ្នាំងសាក Apple 20W USB-C Power Adapter (Original)",
      nameEn: "Apple 20W USB-C Power Adapter",
      type: ProductType.STANDARD_ITEM,
      costPriceUsd: 6.5,
      salePriceUsd: 12.0,
      salePriceKhr: 12.0 * 4100,
      minStockAlert: 10,
      unit: "ដើម",
      stockItems: {
        create: [
          {
            branchId: branchHQ.id,
            warehouseId: mainWarehouse?.id,
            quantity: 45,
            costPriceUsd: 6.5,
            status: "IN_STOCK",
          },
        ],
      },
    },
  });

  // 5. Suppliers & Customers
  const supplier1 = await prisma.supplier.create({
    data: {
      tenantId: tenant.id,
      companyName: "Hong Kong Tech Wholesale Co., Ltd.",
      contactPerson: "David Chan",
      phone: "+852 9876 5432",
      email: "orders@hktech.hk",
      address: "Mong Kok, Kowloon, Hong Kong",
      currentBalanceUsd: 0,
    },
  });

  const customer1 = await prisma.customer.create({
    data: {
      tenantId: tenant.id,
      name: "អ៊ុច វីរៈ (Ouch Virak)",
      phone: `012${Math.floor(100000 + Math.random() * 900000)}`,
      tier: "VIP",
      loyaltyPoints: 120,
      creditLimitUsd: 500.0,
      currentDebtUsd: 0,
    },
  });

  console.log(`🎉 Restored fresh master catalog and stock for store ${tenant.name}!`);
}

/**
 * Global database wipe (All Tenants)
 */
export async function deleteAllDatabaseData() {
  console.log("🧹 Deleting ALL data from Supabase PostgreSQL database...");

  await prisma.auditLog.deleteMany().catch(() => {});
  await prisma.technicianCommission.deleteMany().catch(() => {});
  await prisma.repairStatusLog.deleteMany().catch(() => {});
  await prisma.repairPartUsed.deleteMany().catch(() => {});
  await prisma.repairTicket.deleteMany().catch(() => {});
  await prisma.debtPaymentLog.deleteMany().catch(() => {});
  await prisma.debtPaymentSchedule.deleteMany().catch(() => {});
  await prisma.payment.deleteMany().catch(() => {});
  await prisma.orderItem.deleteMany().catch(() => {});
  await prisma.order.deleteMany().catch(() => {});
  await prisma.cashDrawerShift.deleteMany().catch(() => {});
  await prisma.purchaseOrderItem.deleteMany().catch(() => {});
  await prisma.purchaseOrder.deleteMany().catch(() => {});
  await prisma.supplier.deleteMany().catch(() => {});
  await prisma.stockTransferItem.deleteMany().catch(() => {});
  await prisma.stockTransfer.deleteMany().catch(() => {});
  await prisma.stockAdjustmentItem.deleteMany().catch(() => {});
  await prisma.stockAdjustment.deleteMany().catch(() => {});
  await prisma.stockItem.deleteMany().catch(() => {});
  await prisma.productVariant.deleteMany().catch(() => {});
  await prisma.product.deleteMany().catch(() => {});
  await prisma.brand.deleteMany().catch(() => {});
  await prisma.category.deleteMany().catch(() => {});
  await prisma.journalLineItem.deleteMany().catch(() => {});
  await prisma.journalEntry.deleteMany().catch(() => {});
  await prisma.expense.deleteMany().catch(() => {});
  await prisma.account.deleteMany().catch(() => {});
  await prisma.payrollRecord.deleteMany().catch(() => {});
  await prisma.attendance.deleteMany().catch(() => {});
  await prisma.employee.deleteMany().catch(() => {});
  await prisma.customer.deleteMany().catch(() => {});
  await prisma.user.deleteMany().catch(() => {});
  await prisma.warehouse.deleteMany().catch(() => {});
  await prisma.branch.deleteMany().catch(() => {});
  await prisma.tenant.deleteMany().catch(() => {});

  console.log("🗑️ Complete database wipe finished: ALL tables are now empty!");
}

/**
 * Global master restore
 */
export async function restoreMasterData() {
  console.log("✨ Restoring fresh enterprise master data into Supabase...");

  // 1. Create Default Master Tenant
  const tenant = await prisma.tenant.create({
    data: {
      storeAddress: "anajak@anajak.com",
      name: "អាណាចក្រPOS (Anachak POS)",
      legalName: "Anachak Technologies Co., Ltd.",
      vatNumber: "K008-902348911",
      phone: "012 888 999",
      email: "contact@anachakpos.com",
      address: "#128, មហាវិថីព្រះមុនីវង្ស, សង្កាត់បឹងរាំង, ខណ្ឌដូនពេញ, រាជធានីភ្នំពេញ",
      plan: "ENTERPRISE",
    },
  });

  // 2. Create Branches & Warehouses
  const branchHQ = await prisma.branch.create({
    data: {
      tenantId: tenant.id,
      code: "BR-PP01",
      name: "សាខាកណ្តាល ភ្នំពេញ (Phnom Penh HQ)",
      nameEn: "Phnom Penh Main Branch",
      phone: "012 778 899",
      address: "#128, មហាវិថីព្រះមុនីវង្ស, ភ្នំពេញ",
      isHeadOffice: true,
      warehouses: {
        create: [
          { name: "ឃ្លាំងទំនិញកណ្តាល (Main Warehouse)", isDefault: true },
          { name: "ឃ្លាំងគ្រឿងបន្លាស់ជួសជុល (Spare Parts Room)", isDefault: false },
        ],
      },
    },
    include: { warehouses: true },
  });

  // 3. Create Users with RBAC permissions
  const passwordHash = await bcrypt.hash("admin123", 10);
  const staffPassword = await bcrypt.hash("123456", 10);

  const admin = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      branchId: branchHQ.id,
      username: "admin",
      email: "admin@anachakpos.com",
      fullName: "Chea Sokha (ជា សុខា)",
      fullNameKh: "ជា សុខា",
      passwordHash,
      role: RoleType.SUPER_ADMIN,
      permissions: ["*"],
    },
  });

  const cashier = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      branchId: branchHQ.id,
      username: "cashier1",
      email: "cashier1@anachakpos.com",
      fullName: "Heng Bopha (ហេង បុប្ផា)",
      fullNameKh: "ហេង បុប្ផា",
      passwordHash: staffPassword,
      role: RoleType.CASHIER,
      permissions: ["POS_CASHIER", "VIEW_PRODUCTS", "CREATE_ORDER", "VIEW_CUSTOMERS", "VIEW_REPAIRS"],
    },
  });

  const tech = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      branchId: branchHQ.id,
      username: "tech_dara",
      email: "tech.dara@anachakpos.com",
      fullName: "Keo Dara (កែវ ដារ៉ា)",
      fullNameKh: "កែវ ដារ៉ា",
      passwordHash: staffPassword,
      role: RoleType.TECHNICIAN,
      permissions: ["REPAIR_TECHNICIAN", "VIEW_REPAIRS", "UPDATE_REPAIRS", "VIEW_PRODUCTS", "VIEW_INVENTORY"],
    },
  });

  await restoreTenantData(tenant.id);
}

export async function resetAndSeedDatabase() {
  await deleteAllDatabaseData();
  await restoreMasterData();
}

async function main() {
  await resetAndSeedDatabase();
}

if (require.main === module) {
  main()
    .catch((e) => {
      console.error("❌ Reset and seed failed:", e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
