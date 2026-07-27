/**
 * PETUK database seed — node seed.mjs (from any directory)
 * Uses absolute pnpm store paths to avoid ESM resolution issues.
 */
import { createRequire } from "module";
const require = createRequire(import.meta.url);

const pg      = require("/home/runner/workspace/node_modules/.pnpm/pg@8.22.0/node_modules/pg");
const bcrypt  = require("/home/runner/workspace/node_modules/.pnpm/bcryptjs@3.0.3/node_modules/bcryptjs");

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const q = (sql, p = []) => pool.query(sql, p);

// ── Admin Users ───────────────────────────────────────────────────────────────
const USERS = [
  { username: "admin",      displayName: "Admin",        role: "Admin",       station: "All" },
  { username: "manager",    displayName: "Manager",      role: "Manager",     station: "All" },
  { username: "cashier1",   displayName: "Cashier 1",    role: "Cashier",     station: "POS" },
  { username: "chef",       displayName: "Head Chef",    role: "Chef",        station: "Kitchen" },
  { username: "juicebar",   displayName: "Juice Bar",    role: "Juice Bar",   station: "Juice Bar" },
  { username: "teacounter", displayName: "Tea Counter",  role: "Tea Counter", station: "Tea Counter" },
  { username: "kitchen1",   displayName: "Kitchen 1",    role: "Kitchen",     station: "Kitchen" },
];

// ── Menu Items ────────────────────────────────────────────────────────────────
const MENU = [
  // Rice & Noodles
  { name: "Chicken Fried Rice",        price: "160", category: "Rice & Noodles", emoji: "🍳" },
  { name: "Beef Fried Rice",           price: "180", category: "Rice & Noodles", emoji: "🍳" },
  { name: "Vegetable Fried Rice",      price: "130", category: "Rice & Noodles", emoji: "🍚" },
  { name: "Chicken Noodles",           price: "150", category: "Rice & Noodles", emoji: "🍜" },
  { name: "Beef Noodles",             price: "170", category: "Rice & Noodles", emoji: "🍜" },
  { name: "Vegetable Noodles",         price: "120", category: "Rice & Noodles", emoji: "🍜" },
  { name: "Special Mixed Fried Rice",  price: "200", category: "Rice & Noodles", emoji: "🍛" },
  // Chicken
  { name: "Crispy Fried Chicken",      price: "120", category: "Chicken",        emoji: "🍗" },
  { name: "Chicken Manchurian",        price: "180", category: "Chicken",        emoji: "🍗" },
  { name: "Chicken Chilli",            price: "180", category: "Chicken",        emoji: "🌶️" },
  { name: "Chicken Lollipop (6pcs)",   price: "220", category: "Chicken",        emoji: "🍗" },
  { name: "Chicken Wings (6pcs)",      price: "200", category: "Chicken",        emoji: "🍗" },
  { name: "Chicken Nuggets (8pcs)",    price: "160", category: "Chicken",        emoji: "🐔" },
  // Beef
  { name: "Beef Chilli",               price: "200", category: "Beef",           emoji: "🥩" },
  { name: "Beef Manchurian",           price: "200", category: "Beef",           emoji: "🥩" },
  { name: "Beef Steak",                price: "250", category: "Beef",           emoji: "🥩" },
  // Snacks & Sides
  { name: "French Fries",              price: "80",  category: "Snacks & Sides", emoji: "🍟" },
  { name: "Cheese Fries",              price: "110", category: "Snacks & Sides", emoji: "🧀" },
  { name: "Spring Roll (4pcs)",        price: "100", category: "Snacks & Sides", emoji: "🥢" },
  { name: "Vegetable Samosa (4pcs)",   price: "60",  category: "Snacks & Sides", emoji: "🥟" },
  { name: "Garlic Bread",              price: "70",  category: "Snacks & Sides", emoji: "🍞" },
  // Soup
  { name: "Chicken Corn Soup",         price: "100", category: "Soup",           emoji: "🍲" },
  { name: "Tom Yum Soup",              price: "120", category: "Soup",           emoji: "🍲" },
  { name: "Vegetable Hot & Sour Soup", price: "90",  category: "Soup",           emoji: "🍲" },
  // Beverages
  { name: "Fresh Lime Juice",          price: "60",  category: "Beverages",      emoji: "🍋" },
  { name: "Mango Juice",               price: "70",  category: "Beverages",      emoji: "🥭" },
  { name: "Mixed Fruit Juice",         price: "80",  category: "Beverages",      emoji: "🍹" },
  { name: "Cold Coffee",               price: "90",  category: "Beverages",      emoji: "☕" },
  { name: "Milk Tea",                  price: "30",  category: "Beverages",      emoji: "🍵" },
  { name: "Lemon Tea",                 price: "30",  category: "Beverages",      emoji: "🍵" },
  { name: "Soft Drink (Can)",          price: "50",  category: "Beverages",      emoji: "🥤" },
  { name: "Water Bottle",              price: "20",  category: "Beverages",      emoji: "💧" },
  // Desserts
  { name: "Ice Cream (1 scoop)",       price: "60",  category: "Desserts",       emoji: "🍨" },
  { name: "Chocolate Brownie",         price: "90",  category: "Desserts",       emoji: "🍫" },
  { name: "Mishti Doi",                price: "50",  category: "Desserts",       emoji: "🍮" },
];

async function main() {
  // Admin users
  console.log("Seeding admin users…");
  const hash = await bcrypt.hash("password", 10);
  for (const u of USERS) {
    await q(
      `INSERT INTO admin_users (username, display_name, password_hash, role, station, is_active)
       VALUES ($1,$2,$3,$4,$5,true)
       ON CONFLICT (username) DO UPDATE
         SET display_name=$2, password_hash=$3, role=$4, station=$5, is_active=true`,
      [u.username, u.displayName, hash, u.role, u.station]
    );
    console.log(`  ✓ ${u.username} (${u.role})`);
  }

  // Menu items
  console.log("\nSeeding menu items…");
  for (const item of MENU) {
    await q(
      `INSERT INTO menu_items (name, price, category, emoji, is_available)
       VALUES ($1,$2,$3,$4,true)
       ON CONFLICT DO NOTHING`,
      [item.name, item.price, item.category, item.emoji]
    );
    console.log(`  ✓ ${item.name}`);
  }

  // Settings
  console.log("\nSeeding settings…");
  await q(
    `INSERT INTO settings (
       id, restaurant_name, address, phone,
       tax_enabled, tax_rate, tax_name, currency, paper_width,
       delivery_fee, delivery_fee_enabled,
       points_per_100_taka, points_redemption_rate,
       max_cashier_discount_percent, max_cashier_discount_amount,
       sync_api_key)
     VALUES (1,'PETUK','Gudaraghat, Jhawchar, Hazaribagh, Dhaka-1211','01990800951',
       false,'5.00','VAT','৳',48,'60.00',true,1,'1.00','5.00','100.00','petuk_sync_key_2025')
     ON CONFLICT (id) DO NOTHING`
  );
  console.log("  ✓ settings");

  await pool.end();
  console.log("\n✅ Database seeded successfully!");
}

main().catch(err => { console.error(err); process.exit(1); });
