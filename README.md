# CellNames

**Decentralised DNS on Nervos CKB.** Each domain is a CKB cell you own outright. DNS records stored on-chain, resolved via DNS-over-HTTPS — works in Firefox, Chrome, and Brave today with a single settings change.

> `wyltekindustries.ckb` is live on CKB testnet right now. Try it.

---

## Resolve `.ckb` Domains in 30 Seconds

### Firefox

1. Open `about:preferences`
2. Scroll to **Network Settings** → click **Settings...**
3. Check **Enable DNS over HTTPS**
4. Select **Custom** from the dropdown
5. Paste the gateway URL:
   ```
   https://ckb.wyltekindustries.com/dns-query
   ```
6. Click **OK** — done

### Chrome

1. Open `chrome://settings/security`
2. Under **Advanced**, find **Use secure DNS**
3. Switch it **On** → select **With Custom provider**
4. Paste:
   ```
   https://ckb.wyltekindustries.com/dns-query
   ```

### Brave

1. Open `brave://settings/security`
2. **Use secure DNS** → turn **On** → **With Custom**
3. Paste:
   ```
   https://ckb.wyltekindustries.com/dns-query
   ```

### Auto-Setup (Linux / macOS)

Configures Firefox automatically:

```bash
curl -fsSL https://raw.githubusercontent.com/toastmanAu/cellnames/main/setup.sh | bash
```

---

## Test It

After setup, visit `http://wyltekindustries.ckb` in your browser.

Or verify from the command line:

```bash
# Query the public gateway directly
curl -s "https://ckb.wyltekindustries.com/health"

# DNS lookup via the gateway
dig TXT wyltekindustries.ckb @ckb.wyltekindustries.com
```

---

## How It Works

```
Browser types: mysite.ckb
       ↓
DoH query → gateway /dns-query
       ↓
blake2b256("mysite") → type script args
       ↓
CKB indexer: find live cell matching type hash + args
       ↓
Decode cell data → DNS records (A, AAAA, TXT, CNAME...)
       ↓
RFC 8484 DNS wire format response → browser resolves
```

Each domain is a CKB cell. The owner's lock script (JoyID, secp256k1, multisig) controls it. Records are stored in binary format in cell data. No registrar. No servers. No annual fee.

---

## Register a Domain

You need ~250 CKB on testnet (faucet: [faucet.nervos.org](https://faucet.nervos.org)).

```bash
git clone https://github.com/toastmanAu/cellnames.git
cd cellnames/sdk
npm install

PRIVATE_KEY=0x<your_private_key> node scripts/register.js <domain> [options]
```

**Record options:**

| Flag | Example | Description |
|------|---------|-------------|
| `--ip <addr>` | `--ip 1.2.3.4` | A record |
| `--ip6 <addr>` | `--ip6 2001:db8::1` | AAAA record |
| `--txt <text>` | `--txt "v=cellnames1"` | TXT record |
| `--redirect <url>` | `--redirect https://example.com` | HTTP redirect |
| `--cname <host>` | `--cname example.com` | CNAME |

**Example:**

```bash
PRIVATE_KEY=0x... node scripts/register.js mysite \
  --ip 93.184.216.34 \
  --txt "v=cellnames1"
```

Registers `mysite.ckb`. Cost: ~250 CKB locked (no annual renewal, 100% reclaimable on deletion).

---

## Self-Host the Gateway

```bash
cd cellnames/gateway
npm install

CELLNAMES_TYPE_HASH=0x1bfe13e7f28aa1bf9196ec8f149e79af3b1364e942d251038a6031b563b2aa24 \
CKB_RPC_URL=https://testnet.ckbapp.dev \
npm start
```

Then point your browser at `http://localhost:8053/dns-query`.

| Env var | Default | Description |
|---------|---------|-------------|
| `PORT` | `8053` | HTTP listen port |
| `CKB_RPC_URL` | `https://testnet.ckbapp.dev` | CKB node RPC |
| `CELLNAMES_TYPE_HASH` | *(testnet)* | CellNames type script hash |
| `DNS_TTL` | `300` | DNS response TTL in seconds |

### Endpoints

| Path | Method | Description |
|------|--------|-------------|
| `/dns-query` | GET, POST | RFC 8484 DNS-over-HTTPS |
| `/health` | GET | `{"status":"ok"}` |
| `/setup` | GET | Interactive browser setup guide |

---

## Why CKB

| Property | Detail |
|----------|--------|
| **You own the cell** | Domain is a UTXO asset, not contract state. No admin can freeze or modify it. |
| **Type script enforcement** | Uniqueness, record validation, mandatory TLSA — enforced at consensus. |
| **Light client verifiable** | WASM light client in browser extension can verify without trusting a gateway. |
| **Any auth** | JoyID (passkeys), hardware wallets, multisig — any CKB lock script owns a domain. |
| **Capacity not rent** | Lock ~250 CKB (~$1.50). No annual renewal. Reclaim everything on deletion. |
| **UTXO parallelism** | Updates to `alice.ckb` never contend with updates to `bob.ckb`. |

---

## Prior Art

| Project | Chain | Gap CellNames fills |
|---------|-------|---------------------|
| [.bit / d.id](https://did.id) | CKB | Identity only — no A/AAAA/CNAME/TXT, no browser DNS |
| [Handshake](https://handshake.org) | HNS | Own chain, ICANN-hostile, no passkey auth |
| [ENS](https://ens.domains) | Ethereum | Contract state (not cell ownership), expensive updates |
| [JIDSDR](https://github.com/toastmanAu/jidsdr) | CKB | On-chain settings — foundation pattern for CellNames |

---

## Project Structure

```
cellnames/
  protocol/SPEC.md              — Full protocol specification
  sdk/
    src/records.js              — Binary record codec (encode/decode)
    src/domain.js               — Domain normalisation + CKB blake2b hashing
    scripts/register.js         — Domain registration CLI
  gateway/
    src/server.js               — RFC 8484 DoH server
    src/resolver.js             — CKB cell lookup + DNS answer builder
    src/config.js               — Configuration
  contracts/
    always-success/             — Testnet placeholder type script (Rust/RISC-V)
  deploy/
    deployment.toml             — ckb-cli deploy config
    deployment-info.json        — Deployed contract addresses
  setup.sh                      — Auto-configure Firefox/system DNS
```

---

## Deployed Contracts (Testnet)

| Contract | Type ID |
|----------|---------|
| `cellnames-always-success` (demo) | `0x1bfe13e7f28aa1bf9196ec8f149e79af3b1364e942d251038a6031b563b2aa24` |
| Cell TX | `0x87722bff32b21f6c6710aacc688c82cdd2fae3d9907f9ef6be1374b0d083b0e7` |

> The always-success type is a testnet demo — it accepts any cell. The production type script (uniqueness enforcement, record validation, DANE) is in development.

---

## Roadmap

- [x] Protocol spec
- [x] SDK — record codec + CKB blake2b hashing
- [x] DoH gateway — RFC 8484, self-hostable
- [x] Always-success type script deployed to testnet
- [x] `wyltekindustries.ckb` live and resolving
- [ ] Browser setup automation page (`/setup`)
- [ ] Production type script — uniqueness + record validation
- [ ] Browser extension with WASM light client (trustless, no gateway)
- [ ] DANE/TLSA enforcement via type script
- [ ] Mainnet deployment

---

## License

GPL-3.0

---

Built by [Wyltek Industries](https://wyltekindustries.com) on [Nervos CKB](https://www.nervos.org/).
