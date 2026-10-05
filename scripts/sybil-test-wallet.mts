/**
 * Generates a throwaway local wallet from a public test mnemonic, so the risk
 * page can be opened in MetaMask without touching a real account.
 *
 * Then copies one of the seeded risk profiles onto that address, because the
 * scorer can only report on activity it holds records for — a brand-new
 * address has none, and would correctly show zero.
 *
 * Local dev only. The key is derived from a publicly known mnemonic: it must
 * never hold anything.
 *
 *   node --experimental-strip-types scripts/sybil-test-wallet.mts [clean|farm|ghost]
 */
import { HDKey } from "ethereum-cryptography/hdkey.js";
import { bytesToHex } from "ethereum-cryptography/utils.js";
import { keccak256 } from "ethereum-cryptography/keccak.js";
import { mnemonicToSeedSync } from "ethereum-cryptography/bip39.js";
import { config as loadEnv } from "dotenv";
loadEnv({ path: new URL("../.env.local", import.meta.url) });

/** Hardhat's default mnemonic. Public knowledge — never use it for real funds. */
const MNEMONIC =
  "test test test test test test test test test test test junk";

const profile = (process.argv[2] ?? "clean").toLowerCase();
const PROFILES = ["clean", "farm", "ghost"];
if (!PROFILES.includes(profile)) {
  console.error(`usage: sybil-test-wallet.mts [${PROFILES.join("|")}]`);
  process.exit(1);
}

const root = HDKey.fromMasterSeed(mnemonicToSeedSync(MNEMONIC, ""));
const child = root.derive("m/44'/60'/0'/0/0");
const privateKey = `0x${bytesToHex(child.privateKey!)}`;

// Address = last 20 bytes of keccak256(uncompressed pubkey without the 0x04 tag)
const address = `0x${bytesToHex(keccak256(child.publicKey!.slice(1)).slice(-20))}`;

// The seeded profile lives on a fixed placeholder address. Move it onto the
// freshly derived wallet so the page has something real to read.
const PLACEHOLDERS: Record<string, string> = {
  clean: "0x1111111111111111111111111111111111111111",
  farm: "0x2222222222222222222222222222222222222222",
  ghost: "0x3333333333333333333333333333333333333333",
};
const from = PLACEHOLDERS[profile];
const to = address.toLowerCase();

const url =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:5432/app_db";
const pg = (await import("pg")).default;
const pool = new pg.Pool({ connectionString: url });
const client = await pool.connect();

try {
  await client.query("begin");

  // Clear anything already on the derived address so this is repeatable.
  for (const t of [
    "prediction_activities",
    "wallet_socials",
    "wallet_streaks",
  ]) {
    await client.query(`delete from ${t} where wallet_address = $1`, [to]);
  }

  // Move the profile across. ON CONFLICT keeps the unique index happy if the
  // placeholder already has a row for this wallet.
  const moved: string[] = [];
  for (const t of [
    "prediction_activities",
    "wallet_socials",
    "wallet_streaks",
    "game_scores",
  ]) {
    const { rowCount } = await client.query(
      `update ${t} set wallet_address = $1 where wallet_address = $2`,
      [to, from]
    );
    if (rowCount) moved.push(`${t}(${rowCount})`);
  }

  // shared handles: a shared handle needs every wallet in the group to point at
  // the same string, so the placeholder rows must come along too.
  if (profile === "farm") {
    const ring = [
      "0x4444444444444444444444444444444444444444",
      "0x5555555555555555555555555555555555555555",
      "0x6666666666666666666666666666666666666666",
    ];
    for (const w of ring) {
      await client.query(
        `insert into wallet_socials (wallet_address, platform, handle)
         values ($1, 'twitter', 'alpha_degen')
         on conflict do nothing`,
        [w]
      );
    }
  }

  await client.query("commit");
  console.log(`moved profile "${profile}": ${moved.join(", ") || "(nothing)"}`);
} catch (e) {
  await client.query("rollback");
  console.error("copy failed:", (e as Error).message);
  client.release();
  await pool.end();
  process.exit(1);
} finally {
  client.release();
  await pool.end();
}

console.log(`
Sybil test wallet — profile "${profile}"
─────────────────────────────────────────
THROWAWAY key from a public mnemonic. Never hold anything real in it.

Address: ${address}
Private: ${privateKey}

MetaMask → Import account → paste the private key
Then open http://localhost:3000/sybil and sign.
`);
