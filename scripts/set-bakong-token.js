/**
 * Script to insert/update Bakong Open API Token in Supabase Central Store
 * Usage:
 *   node scripts/set-bakong-token.js <YOUR_BAKONG_TOKEN>
 */

const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://bwyodifrumgiapqfwzno.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  Buffer.from(
    "c2Jfc2VjcmV0X2h1WVhJUTNNTHhoVllhNTFrUnRmS1FfVkgyTFN6NFQ=",
    "base64"
  ).toString("utf-8");

const token = process.argv[2] ? process.argv[2].trim() : "";

if (!token) {
  console.error("\n❌ Error: Please provide the Bakong token as an argument.");
  console.error("Usage: node scripts/set-bakong-token.js <YOUR_BAKONG_TOKEN>\n");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log("🚀 Connecting to Supabase at:", SUPABASE_URL);

  // 1. Fetch existing KHQR_CONFIG
  const { data: existingRow, error: fetchErr } = await supabase
    .from("system_configs")
    .select("*")
    .eq("key", "KHQR_CONFIG")
    .maybeSingle();

  if (fetchErr) {
    console.error("❌ Failed to fetch KHQR_CONFIG:", fetchErr.message);
    process.exit(1);
  }

  let khqrConfig = {};
  if (existingRow && existingRow.value) {
    try {
      khqrConfig =
        typeof existingRow.value === "string"
          ? JSON.parse(existingRow.value)
          : existingRow.value;
    } catch {
      khqrConfig = {};
    }
  }

  // 2. Update bakongToken in KHQR_CONFIG
  khqrConfig.bakongToken = token;

  const now = new Date().toISOString();

  // 3. Upsert both KHQR_CONFIG and standalone BAKONG_OPEN_API_TOKEN
  const { error: upsertErr } = await supabase.from("system_configs").upsert([
    {
      key: "KHQR_CONFIG",
      value: JSON.stringify(khqrConfig),
      category: "PAYMENT",
      description: "Bakong KHQR payment configurations",
      updatedAt: now,
    },
    {
      key: "BAKONG_OPEN_API_TOKEN",
      value: token,
      category: "PAYMENT",
      description: "National Bank of Cambodia (NBC) Bakong Open API Bearer Token",
      updatedAt: now,
    },
  ], { onConflict: "key" });

  if (upsertErr) {
    console.error("❌ Failed to update Supabase system_configs:", upsertErr.message);
    process.exit(1);
  }

  console.log("✅ Successfully inserted Bakong Token into Supabase `system_configs` table!");
  console.log("   - Key: KHQR_CONFIG (field: bakongToken)");
  console.log("   - Key: BAKONG_OPEN_API_TOKEN");
  console.log(`   - Token prefix: ${token.substring(0, 15)}... (Length: ${token.length})`);
  console.log("\n🎉 POS real-time bank scan polling is now active!");
}

main().catch((err) => {
  console.error("❌ Unexpected error:", err);
  process.exit(1);
});
