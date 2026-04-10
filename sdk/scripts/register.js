/**
 * CellNames — Domain Registration Script
 *
 * Usage:
 *   PRIVATE_KEY=0x... node scripts/register.js <domain> [--ip 1.2.3.4] [--txt "v=..."] [--redirect https://...]
 *
 * Example:
 *   PRIVATE_KEY=0x... node scripts/register.js wyltekindustries --redirect https://wyltekindustries.com
 */

import { ccc } from "@ckb-ccc/ccc";
import { normaliseDomain, hashDomain, domainHashHex } from "../src/domain.js";
import {
  encodeRecords,
  aRecord,
  aaaaRecord,
  txtRecord,
  redirectRecord,
  cnameRecord,
} from "../src/records.js";

const CELLNAMES_TYPE_HASH = process.env.CELLNAMES_TYPE_HASH
  ?? "0x1bfe13e7f28aa1bf9196ec8f149e79af3b1364e942d251038a6031b563b2aa24";

// Deployed always-success cell — provides the type script code
const CELLNAMES_CELL_DEP = {
  outPoint: {
    txHash: process.env.CELLNAMES_TX_HASH
      ?? "0x87722bff32b21f6c6710aacc688c82cdd2fae3d9907f9ef6be1374b0d083b0e7",
    index: 0,
  },
  depType: "code",
};

const PRIVATE_KEY = process.env.PRIVATE_KEY;
if (!PRIVATE_KEY) {
  console.error("Error: PRIVATE_KEY env var required (0x-prefixed hex)");
  process.exit(1);
}

// ── Parse CLI args ────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const domainArg = args[0];
if (!domainArg) {
  console.error("Usage: node scripts/register.js <domain> [--ip X] [--txt X] [--redirect X] [--cname X]");
  process.exit(1);
}

const records = [];
for (let i = 1; i < args.length; i++) {
  switch (args[i]) {
    case "--ip":     records.push(aRecord(args[++i]));       break;
    case "--ip6":    records.push(aaaaRecord(args[++i]));    break;
    case "--txt":    records.push(txtRecord(args[++i]));     break;
    case "--redirect": records.push(redirectRecord(args[++i])); break;
    case "--cname":  records.push(cnameRecord(args[++i]));   break;
    default:
      console.error(`Unknown flag: ${args[i]}`);
      process.exit(1);
  }
}

if (records.length === 0) {
  console.error("Error: at least one record required (--ip, --txt, --redirect, --cname)");
  process.exit(1);
}

// ── Register ──────────────────────────────────────────────────────────────────

async function register() {
  const client = new ccc.ClientPublicTestnet();
  const signer = new ccc.SignerCkbPrivateKey(client, PRIVATE_KEY);

  const normalised = normaliseDomain(domainArg);
  const hash = hashDomain(normalised);
  const hashHex = domainHashHex(hash);
  const data = encodeRecords(records);

  console.log(`Domain:    ${normalised}.ckb`);
  console.log(`Hash:      ${hashHex}`);
  console.log(`Records:   ${records.length}`);
  console.log(`Data size: ${data.length} bytes`);
  console.log(`Type hash: ${CELLNAMES_TYPE_HASH}`);
  console.log();

  const lockScript = (await signer.getAddressObjSecp256k1()).script;

  const tx = ccc.Transaction.from({
    cellDeps: [CELLNAMES_CELL_DEP],
    outputs: [{
      lock: lockScript,
      type: ccc.Script.from({
        codeHash: CELLNAMES_TYPE_HASH,
        hashType: "type",
        args: hashHex,
      }),
    }],
    outputsData: [ccc.hexFrom(data)],
  });

  await tx.addCellDepsOfKnownScripts(client, ccc.KnownScript.Secp256k1Blake160);
  await tx.completeInputsByCapacity(signer);
  await tx.completeFeeBy(signer, 1000);

  const txHash = await signer.sendTransaction(tx);
  console.log(`Registered! tx: ${txHash}`);
  console.log(`\nTo verify: ckb-cli --url https://testnet.ckbapp.dev rpc get_transaction --hash ${txHash}`);
}

register().catch(err => {
  console.error("Error:", err.message);
  process.exit(1);
});
