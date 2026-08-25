import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, signJwtToken } from "@/lib/auth";
import { RoleType, AccountType } from "@prisma/client";

// POST /api/auth/register - Register new store owner and initialize tenant
export async function POST(request: Request) {
  try {
    const body = await request.json();
    let {
      storeName,
      storeAddress,
      fullName,
      phone,
      username,
      password,
      email,
      branchName = "សាខាកណ្តាល ភ្នំពេញ (Main Branch)",
      businessType = "Smartphones, Electronics & Repairs",
    } = body;

    // Normalize storeAddress
    if (!storeAddress && storeName) {
      // Auto-generate slug from storeName if not provided
      const slug = storeName.toLowerCase().replace(/[^a-z0-9]/g, "");
      storeAddress = `${slug || "store"}@anajak.com`;
    }

    if (storeAddress) {
      storeAddress = storeAddress.trim().toLowerCase();
      if (!storeAddress.includes("@")) {
        storeAddress = `${storeAddress}@anajak.com`;
      }
    }

    // Validation
    if (!storeName || !storeAddress || !fullName || !phone || !username || !password) {
      return NextResponse.json(
        {
          success: false,
          error: "សូមបំពេញព័ត៌មានចាំបាច់ទាំងអស់ (Store Name, Store Address, Full Name, Phone, Username and Password are required)",
        },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: "លេខសម្ងាត់ត្រូវមានយ៉ាងតិច ៦ តួអក្សរ (Password must be at least 6 characters)" },
        { status: 400 }
      );
    }

    // 1. Check if Store Address already exists (Must be strictly UNIQUE)
    const existingTenant = await prisma.tenant.findUnique({
      where: { storeAddress },
    });

    if (existingTenant) {
      return NextResponse.json(
        {
          success: false,
          error: `អាសយដ្ឋានហាង "${storeAddress}" ត្រូវបានចុះឈ្មោះរួចហើយ សូមជ្រើសរើសអាសយដ្ឋានហាងផ្សេង (Store Address already exists)`,
        },
        { status: 400 }
      );
    }

    // 2. Create New Tenant / Business
    const tenant = await prisma.tenant.create({
      data: {
        storeAddress,
        name: storeName.trim(),
        legalName: `${storeName.trim()} Co., Ltd.`,
        phone: phone.trim(),
        email: email ? email.trim() : undefined,
        address: "ភ្នំពេញ, ប្រទេសកម្ពុជា",
        plan: "ENTERPRISE",
      },
    });

    // 3. Create Initial Main Branch & Default Warehouse
    const branch = await prisma.branch.create({
      data: {
        tenantId: tenant.id,
        code: "BR-01",
        name: branchName.trim(),
        phone: phone.trim(),
        isHeadOffice: true,
        warehouses: {
          create: [
            { name: "ឃ្លាំងទំនិញកណ្តាល (Main Warehouse)", isDefault: true },
            { name: "បន្ទប់គ្រឿងបន្លាស់ (Spare Parts Room)", isDefault: false },
          ],
        },
      },
      include: { warehouses: true },
    });

    const passwordHash = await hashPassword(password);

    // 4. Create Super Admin User for this Tenant
    const user = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        branchId: branch.id,
        username: username.trim(),
        email: email ? email.trim() : undefined,
        fullName: fullName.trim(),
        fullNameKh: fullName.trim(),
        phone: phone.trim(),
        passwordHash,
        role: RoleType.SUPER_ADMIN,
        permissions: ["*"],
      },
      include: {
        branch: true,
        tenant: true,
      },
    });

    // 5. Create Standard Chart of Accounts (COA) for this Tenant
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
        data: {
          tenantId: tenant.id,
          ...acc,
        },
      }).catch(() => {});
    }

    // 6. Create Default Categories for this Tenant
    const defaultCategories = [
      { nameKh: "ទូរស័ព្ទដៃ & ថេប្លេត", nameEn: "Smartphones & Tablets", slug: "smartphones", icon: "smartphone" },
      { nameKh: "គ្រឿងបន្សំ & កាស", nameEn: "Accessories & Audio", slug: "accessories", icon: "sparkles" },
      { nameKh: "គ្រឿងបន្លាស់ទូរស័ព្ទ", nameEn: "Phone Spare Parts", slug: "spare-parts", icon: "cpu" },
      { nameKh: "សេវាកម្មជួសជុល & កម្មវិធី", nameEn: "Repair Services & Labor", slug: "repair-services", icon: "wrench" },
    ];

    for (const cat of defaultCategories) {
      await prisma.category.create({
        data: {
          tenantId: tenant.id,
          ...cat,
        },
      }).catch(() => {});
    }

    // 7. Record Audit Log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "SETTINGS_CHANGED",
        entity: "Tenant",
        entityId: tenant.id,
        details: {
          event: "STORE_REGISTERED",
          storeAddress: tenant.storeAddress,
          storeName: tenant.name,
          owner: user.fullName,
          timestamp: new Date().toISOString(),
        },
      },
    }).catch(() => {});

    // 8. Sign Session Token
    const token = signJwtToken({
      userId: user.id,
      tenantId: user.tenantId,
      storeAddress: tenant.storeAddress,
      branchId: user.branchId,
      username: user.username,
      fullName: user.fullNameKh || user.fullName,
      role: user.role,
      permissions: ["*"],
    });

    const response = NextResponse.json({
      success: true,
      message: "ហាង និងគណនី Admin ត្រូវបានបង្កើតដោយជោគជ័យ!",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullNameKh || user.fullName,
        role: user.role,
        branchId: user.branchId,
        branchName: branch.name,
        tenantName: tenant.name,
        storeAddress: tenant.storeAddress,
        permissions: ["*"],
      },
      token,
    });

    // Set Session Cookie
    response.cookies.set("anachak_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      sameSite: "lax",
    });

    return response;
  } catch (error: any) {
    console.error("POST /api/auth/register error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
