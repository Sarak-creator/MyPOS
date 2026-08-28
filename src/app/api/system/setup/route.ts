import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { AccountType, RoleType } from "@prisma/client";

export const dynamic = "force-dynamic";

// POST /api/system/setup - Initial Store & Owner Creation for Fresh Database
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      storeName,
      storeAddress,
      legalName,
      phone,
      address,
      branchName = "សាខាកណ្តាល (Head Office Branch)",
      ownerFullNameKh,
      ownerFullNameEn,
      ownerUsername,
      ownerPassword,
      ownerPhone,
      ownerEmail,
    } = body;

    // 1. Validation
    if (!storeName || !storeName.trim()) {
      return NextResponse.json({ success: false, error: "សូមបញ្ចូលឈ្មោះហាង (Store name is required)" }, { status: 400 });
    }

    if (!ownerUsername || !ownerUsername.trim()) {
      return NextResponse.json({ success: false, error: "សូមបញ្ចូលឈ្មោះគណនីម្ចាស់ហាង (Owner username is required)" }, { status: 400 });
    }

    if (!ownerPassword || ownerPassword.length < 6) {
      return NextResponse.json({ success: false, error: "លេខសម្ងាត់ត្រូវមានយ៉ាងតិច ៦ តួអក្សរ (Password must be at least 6 characters)" }, { status: 400 });
    }

    // Format storeAddress (e.g. store@anajak.com)
    let cleanStoreAddress = storeAddress ? storeAddress.trim().toLowerCase() : "";
    if (!cleanStoreAddress) {
      const slug = storeName.toLowerCase().replace(/[^a-z0-9]/g, "");
      cleanStoreAddress = `${slug || "store"}@anajak.com`;
    } else if (!cleanStoreAddress.includes("@")) {
      cleanStoreAddress = `${cleanStoreAddress}@anajak.com`;
    }

    // Check if storeAddress already taken
    const existingTenant = await prisma.tenant.findUnique({
      where: { storeAddress: cleanStoreAddress },
    });

    if (existingTenant) {
      return NextResponse.json({
        success: false,
        error: `អាសយដ្ឋានហាង "${cleanStoreAddress}" នេះមានរួចហើយ សូមជ្រើសរើសអាសយដ្ឋានផ្សេង!`,
      }, { status: 400 });
    }

    // 2. Create Master Tenant and Initial Head Office Branch
    const tenant = await prisma.tenant.create({
      data: {
        storeAddress: cleanStoreAddress,
        name: storeName.trim(),
        legalName: legalName ? legalName.trim() : `${storeName.trim()} Co., Ltd.`,
        phone: phone ? phone.trim() : (ownerPhone || "012000000"),
        email: ownerEmail ? ownerEmail.trim() : `contact@${cleanStoreAddress.split("@")[0]}.com`,
        address: address ? address.trim() : "រាជធានីភ្នំពេញ, ប្រទេសកម្ពុជា",
        plan: "ENTERPRISE",
        branches: {
          create: [
            {
              code: "BR-01",
              name: branchName.trim() || "សាខាកណ្តាល (Head Office Branch)",
              nameEn: "Head Office Branch",
              phone: phone ? phone.trim() : (ownerPhone || "012000000"),
              isHeadOffice: true,
              warehouses: {
                create: [
                  { name: "ឃ្លាំងទំនិញកណ្តាល (Main Warehouse)", isDefault: true },
                  { name: "ឃ្លាំងគ្រឿងបន្លាស់ (Spare Parts Warehouse)", isDefault: false },
                ],
              },
            },
          ],
        },
      },
      include: {
        branches: {
          include: { warehouses: true },
        },
      },
    });

    const headBranch = tenant.branches[0];

    // 3. Create Super Admin Owner User
    const passwordHash = await bcrypt.hash(ownerPassword.trim(), 10);
    const cleanUsername = ownerUsername.trim().toLowerCase();

    const ownerUser = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        branchId: headBranch?.id || null,
        username: cleanUsername,
        email: ownerEmail ? ownerEmail.trim().toLowerCase() : `${cleanUsername}@${cleanStoreAddress.split("@")[0]}.com`,
        fullName: ownerFullNameEn ? ownerFullNameEn.trim() : (ownerFullNameKh ? ownerFullNameKh.trim() : "Store Owner"),
        fullNameKh: ownerFullNameKh ? ownerFullNameKh.trim() : "ម្ចាស់ហាង",
        phone: ownerPhone ? ownerPhone.trim() : (phone || null),
        passwordHash,
        role: RoleType.SUPER_ADMIN,
        permissions: ["*"],
      },
    });

    // 4. Seed Standard Chart of Accounts (COA) for this Tenant
    const defaultAccounts = [
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
    ];

    for (const acc of defaultAccounts) {
      await prisma.account.create({
        data: {
          tenantId: tenant.id,
          code: acc.code,
          nameKh: acc.nameKh,
          nameEn: acc.nameEn,
          type: acc.type,
        },
      }).catch(() => {});
    }

    // 5. Seed Standard Product Categories for this Tenant
    const defaultCategories = [
      { nameKh: "ទូរស័ព្ទដៃ & ថេប្លេត", nameEn: "Smartphones & Tablets", slug: "smartphones", icon: "smartphone" },
      { nameKh: "គ្រឿងបន្សំ & កាស", nameEn: "Accessories & Audio", slug: "accessories", icon: "sparkles" },
      { nameKh: "គ្រឿងបន្លាស់ទូរស័ព្ទ", nameEn: "Phone Spare Parts", slug: "spare-parts", icon: "cpu" },
      { nameKh: "សេវាកម្មជួសជុល & កម្មវិធី", nameEn: "Repair Services & Labor", slug: "repair-services", icon: "wrench" },
      { nameKh: "កុំព្យូទ័រ & ឡេបថប", nameEn: "Laptops & Computers", slug: "laptops", icon: "laptop" },
    ];

    for (const cat of defaultCategories) {
      await prisma.category.create({
        data: {
          tenantId: tenant.id,
          nameKh: cat.nameKh,
          nameEn: cat.nameEn,
          slug: cat.slug,
          icon: cat.icon,
        },
      }).catch(() => {});
    }

    console.log(`✨ Store "${tenant.name}" (${tenant.storeAddress}) & Owner "${ownerUser.username}" created successfully with empty tables!`);

    return NextResponse.json({
      success: true,
      message: "ហាង និងគណនីម្ចាស់ហាងត្រូវបានបង្កើតដោយជោគជ័យ!",
      storeAddress: tenant.storeAddress,
      ownerUsername: ownerUser.username,
    });
  } catch (error: any) {
    console.error("POST /api/system/setup error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to setup store and owner" },
      { status: 500 }
    );
  }
}
