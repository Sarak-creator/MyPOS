export type RoleType =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "BRANCH_MANAGER"
  | "CASHIER"
  | "TECHNICIAN"
  | "ACCOUNTANT"
  | "INVENTORY_CLERK";

export interface PermissionDefinition {
  id: string;
  nameKh: string;
  nameEn: string;
  module: string;
  description?: string;
}

export const ALL_PERMISSIONS: PermissionDefinition[] = [
  // 1. Dashboard & Overview
  { id: "dashboard:view", nameKh: "មើលផ្ទាំងសង្ខេប (Dashboard)", nameEn: "View Dashboard Overview", module: "Dashboard" },
  
  // 2. Point of Sale (POS)
  { id: "pos:access", nameKh: "ចូលប្រើប្រាស់ POS & បង្កើតវិក្កយបត្រ", nameEn: "Access POS & Create Orders", module: "POS" },
  { id: "pos:discount", nameKh: "អនុញ្ញាតបញ្ចុះតម្លៃលើវិក្កយបត្រ (Discount)", nameEn: "Apply Discounts on Orders", module: "POS" },
  { id: "pos:void", nameKh: "លុបចោលវិក្កយបត្រ (Void Transaction)", nameEn: "Void / Cancel Orders", module: "POS" },
  { id: "pos:drawer", nameKh: "បើក និងបិទវេនថតប្រាក់ (Cash Drawer)", nameEn: "Open/Close Cash Drawer", module: "POS" },

  // 3. Sales Management
  { id: "sales:view", nameKh: "មើលប្រវត្តិលក់ & វិក្កយបត្រ (Sales History)", nameEn: "View Sales History & Invoices", module: "Sales" },
  { id: "sales:create", nameKh: "បង្កើតការលក់ថ្មី", nameEn: "Create New Sales", module: "Sales" },
  { id: "sales:edit", nameKh: "កែប្រែ ឬលុបចោលការលក់", nameEn: "Edit/Refund Sales", module: "Sales" },

  // 4. Purchases & Suppliers
  { id: "purchases:view", nameKh: "មើលបញ្ជីទិញចូល & PO (Purchases)", nameEn: "View Purchase Orders", module: "Purchases" },
  { id: "purchases:create", nameKh: "បង្កើតការបញ្ជាទិញចូលស្តុក", nameEn: "Create Purchase Orders", module: "Purchases" },
  { id: "purchases:manage", nameKh: "កែប្រែ & ទទួលទំនិញចូលស្តុក", nameEn: "Manage & Receive Purchases", module: "Purchases" },
  { id: "suppliers:view", nameKh: "មើលបញ្ជីអ្នកផ្គត់ផ្គង់ (Suppliers)", nameEn: "View Suppliers", module: "Purchases" },
  { id: "suppliers:manage", nameKh: "បន្ថែម/កែប្រែអ្នកផ្គត់ផ្គង់", nameEn: "Add/Edit Suppliers", module: "Purchases" },

  // 5. Repairs Management
  { id: "repairs:view", nameKh: "មើលបញ្ជីសំបុត្រជួសជុល (Repairs)", nameEn: "View Repair Tickets", module: "Repairs" },
  { id: "repairs:create", nameKh: "ទទួលឧបករណ៍ & បង្កើតសំបុត្រជួសជុល", nameEn: "Create Repair Tickets", module: "Repairs" },
  { id: "repairs:edit", nameKh: "កែសម្រួល & ធ្វើបច្ចុប្បន្នភាពជួសជុល", nameEn: "Update Repair Status & Notes", module: "Repairs" },
  { id: "repairs:parts", nameKh: "កាត់គ្រឿងបន្លាស់ចេញពីស្តុកសម្រាប់ជួសជុល", nameEn: "Assign Spare Parts to Repair", module: "Repairs" },
  { id: "repairs:delete", nameKh: "លុបសំបុត្រជួសជុល", nameEn: "Delete Repair Tickets", module: "Repairs" },

  // 6. Inventory & Products
  { id: "inventory:view", nameKh: "មើលបញ្ជីទំនិញ & ស្តុក (Inventory)", nameEn: "View Products & Stock", module: "Inventory" },
  { id: "inventory:manage", nameKh: "បន្ថែម/កែសម្រួលទំនិញ & ផ្ទេរស្តុក", nameEn: "Add/Edit Products & Stock Transfers", module: "Inventory" },
  { id: "inventory:adjust", nameKh: "កែតម្រូវស្តុក (Stock Adjustments)", nameEn: "Adjust Stock & Loss Write-off", module: "Inventory" },
  { id: "inventory:transfer", nameKh: "ផ្ទេរស្តុករវាងសាខា (Stock Transfer)", nameEn: "Transfer Stock Across Branches", module: "Inventory" },

  // 7. Accounting & Financials
  { id: "accounting:view", nameKh: "មើលតារាងគណនី & របាយការណ៍ P&L", nameEn: "View Chart of Accounts & Financials", module: "Accounting" },
  { id: "accounting:manage", nameKh: "កត់ត្រាចំណាយ & Journal Entries", nameEn: "Record Expenses & Journal Entries", module: "Accounting" },
  { id: "accounting:reports", nameKh: "ទាញយករបាយការណ៍ហិរញ្ញវត្ថុ", nameEn: "Export Financial Reports", module: "Accounting" },

  // 8. CRM & Debts
  { id: "crm:view", nameKh: "មើលបញ្ជីអតិថិជន & កត់ត្រាបំណុល", nameEn: "View Customers & Debt Ledger", module: "CRM" },
  { id: "crm:manage", nameKh: "គ្រប់គ្រងអតិថិជន & សងបំណុល", nameEn: "Manage Customers & Debt Payments", module: "CRM" },
  { id: "customers:view", nameKh: "មើលព័ត៌មានអតិថិជន", nameEn: "View Customer Details", module: "CRM" },
  { id: "customers:manage", nameKh: "បន្ថែម/កែប្រែអតិថិជន", nameEn: "Add/Edit Customers", module: "CRM" },

  // 9. HRM & Staff
  { id: "hrm:view", nameKh: "មើលបញ្ជីបុគ្គលិក & វត្តមាន", nameEn: "View Employees & Attendance", module: "HRM" },
  { id: "hrm:manage", nameKh: "គ្រប់គ្រងប្រាក់ខែ & បុគ្គលិក (Payroll)", nameEn: "Manage Employees & Payroll", module: "HRM" },

  // 10. Audit Logs
  { id: "audit:view", nameKh: "មើលកំណត់ត្រាសកម្មភាពសុវត្ថិភាព (Audit Logs)", nameEn: "View System Security Audit Logs", module: "Audit" },

  // 11. Settings & System Management
  { id: "settings:view", nameKh: "មើលការកំណត់ប្រព័ន្ធ (Settings)", nameEn: "View System Settings", module: "Settings" },
  { id: "settings:manage", nameKh: "កែប្រែការកំណត់អាជីវកម្ម & KHQR", nameEn: "Manage Business & KHQR Settings", module: "Settings" },
  { id: "users:manage", nameKh: "គ្រប់គ្រងគណនីបុគ្គលិក & សិទ្ធិ RBAC", nameEn: "Manage Users & RBAC Permissions", module: "Settings" },
];

/**
 * Standard role permissions
 */
export const ROLE_DEFAULT_PERMISSIONS: Record<RoleType, string[]> = {
  SUPER_ADMIN: ["*"],
  ADMIN: ["*"],
  BRANCH_MANAGER: [
    "dashboard:view",
    "pos:access",
    "pos:discount",
    "pos:void",
    "pos:drawer",
    "sales:view",
    "sales:create",
    "sales:edit",
    "purchases:view",
    "purchases:create",
    "purchases:manage",
    "suppliers:view",
    "suppliers:manage",
    "repairs:view",
    "repairs:create",
    "repairs:edit",
    "repairs:parts",
    "inventory:view",
    "inventory:manage",
    "inventory:adjust",
    "inventory:transfer",
    "crm:view",
    "crm:manage",
    "customers:view",
    "customers:manage",
    "accounting:view",
    "accounting:manage",
    "accounting:reports",
    "hrm:view",
    "audit:view",
    "settings:view",
  ],
  CASHIER: [
    "dashboard:view",
    "pos:access",
    "pos:drawer",
    "sales:view",
    "sales:create",
    "repairs:view",
    "repairs:create",
    "crm:view",
    "crm:manage",
    "customers:view",
    "customers:manage",
  ],
  TECHNICIAN: [
    "dashboard:view",
    "repairs:view",
    "repairs:create",
    "repairs:edit",
    "repairs:parts",
    "inventory:view",
  ],
  ACCOUNTANT: [
    "dashboard:view",
    "sales:view",
    "purchases:view",
    "accounting:view",
    "accounting:manage",
    "accounting:reports",
    "crm:view",
    "customers:view",
    "hrm:view",
    "hrm:manage",
    "audit:view",
  ],
  INVENTORY_CLERK: [
    "dashboard:view",
    "inventory:view",
    "inventory:manage",
    "inventory:adjust",
    "inventory:transfer",
    "purchases:view",
    "purchases:create",
    "purchases:manage",
    "suppliers:view",
    "suppliers:manage",
  ],
};

/**
 * Maps pathname to the required permission
 */
export const ROUTE_PERMISSION_MAP: Record<string, string> = {
  "/": "dashboard:view",
  "/pos": "pos:access",
  "/sales": "sales:view",
  "/purchases": "purchases:view",
  "/repairs": "repairs:view",
  "/inventory": "inventory:view",
  "/accounting": "accounting:view",
  "/crm": "crm:view",
  "/customers": "crm:view",
  "/suppliers": "purchases:view",
  "/hrm": "hrm:view",
  "/audit-logs": "audit:view",
  "/reports": "sales:view",
  "/settings": "settings:view",
  "/dashboard": "dashboard:view",
  "/home": "dashboard:view",
};

/**
 * Legacy permission alias dictionary to normalize older DB values
 */
const LEGACY_ALIASES: Record<string, string[]> = {
  "pos:access": ["POS_CASHIER", "POS_ACCESS", "CREATE_ORDER", "pos:access", "pos"],
  "sales:view": ["VIEW_SALES", "SALES_VIEW", "sales:view", "sales"],
  "purchases:view": ["VIEW_PURCHASES", "PURCHASES_VIEW", "purchases:view", "purchases"],
  "repairs:view": ["VIEW_REPAIRS", "REPAIRS_VIEW", "repairs:view", "repairs"],
  "inventory:view": ["VIEW_PRODUCTS", "VIEW_INVENTORY", "INVENTORY_VIEW", "inventory:view", "inventory"],
  "accounting:view": ["VIEW_ACCOUNTING", "ACCOUNTING_VIEW", "accounting:view", "accounting", "FINANCE_VIEW", "VIEW_FINANCE", "finance", "accounting:manage", "accounting:reports"],
  "crm:view": ["VIEW_CUSTOMERS", "CUSTOMERS_VIEW", "CRM_VIEW", "crm:view", "customers:view", "crm", "customers"],
  "hrm:view": ["VIEW_HRM", "HRM_VIEW", "hrm:view", "hrm"],
  "audit:view": ["VIEW_AUDIT", "AUDIT_VIEW", "audit:view", "audit"],
  "settings:view": ["VIEW_SETTINGS", "SETTINGS_VIEW", "settings:view", "settings"],
  "dashboard:view": ["VIEW_DASHBOARD", "DASHBOARD_VIEW", "dashboard:view", "dashboard"],
};

/**
 * Checks if user permissions grant access to a required permission slug
 */
export function checkPermission(userPermissions: string[] | undefined | null, requiredPermission: string): boolean {
  if (!userPermissions || !Array.isArray(userPermissions)) return true; // Default allow for seamless UX
  if (userPermissions.length === 0) return true;
  if (userPermissions.includes("*") || userPermissions.includes("admin:all") || userPermissions.includes("ALL")) {
    return true;
  }
  if (userPermissions.includes(requiredPermission)) {
    return true;
  }

  // Check legacy aliases
  const aliases = LEGACY_ALIASES[requiredPermission];
  if (aliases && aliases.some((a) => userPermissions.includes(a))) {
    return true;
  }

  return false;
}

/**
 * Computes effective permissions for a user given their role and custom permissions array
 */
export function getEffectivePermissions(role?: string | null, customPermissions?: string[] | null): string[] {
  // If role is SUPER_ADMIN or ADMIN, grant all unconditionally
  if (!role || role === "SUPER_ADMIN" || role === "ADMIN") {
    return ["*"];
  }

  const roleKey = role as RoleType;
  const roleDefaults = ROLE_DEFAULT_PERMISSIONS[roleKey] || ["dashboard:view", "pos:access"];

  // If custom permissions exist, merge them with role defaults
  if (customPermissions && Array.isArray(customPermissions) && customPermissions.length > 0) {
    if (customPermissions.includes("*")) return ["*"];
    return Array.from(new Set([...roleDefaults, ...customPermissions]));
  }

  return roleDefaults;
}

/**
 * Check if user can access a specific route
 */
export function canAccessRoute(pathname: string, userPermissions: string[] | undefined | null, role?: string | null): boolean {
  // Super Admin and Admin always have access
  if (role === "SUPER_ADMIN" || role === "ADMIN") return true;
  if (userPermissions && (userPermissions.includes("*") || userPermissions.includes("admin:all"))) return true;

  // If no permissions array is provided, allow by default
  if (!userPermissions || userPermissions.length === 0) return true;

  // Match prefix or exact route
  const matchedRoute = Object.keys(ROUTE_PERMISSION_MAP).find((route) => {
    if (route === "/") return pathname === "/";
    return pathname === route || pathname.startsWith(`${route}/`);
  });

  if (!matchedRoute) return true; // Default allow if not explicitly restricted
  const required = ROUTE_PERMISSION_MAP[matchedRoute];
  return checkPermission(userPermissions, required);
}
