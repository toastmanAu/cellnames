# CellNames Protocol Specification

> Decentralised DNS on Nervos CKB — serverless, local-first, light-client verifiable.

**Version:** 0.1.0-draft
**Authors:** Phill (wyltek)
**Status:** Draft

---

## 1. Overview

CellNames is a decentralised naming and DNS resolution protocol built on Nervos CKB. Each domain is a CKB cell owned by the registrant's lock script. DNS records are stored directly in cell data. Resolution is performed client-side via the CKB light client — no servers, no gateways, no intermediaries.

### Design Principles

- **The chain is the database.** Cells store DNS records. The p2p network serves them. The light client verifies them.
- **The client does all the work.** Resolution, proof verification, record parsing — all client-side compute. Zero server infrastructure.
- **One cell, one domain.** Each domain is a single CKB cell. The owner controls it via their lock script. No contract intermediary holds your domain.
- **Type scripts enforce protocol rules.** Domain uniqueness, record format validation, mandatory DANE/TLSA, expiry, subdomain delegation — all enforced at consensus level.
- **Lock script flexibility.** JoyID (WebAuthn/Passkey), secp256k1, multisig, any CKB-supported signature scheme can own a domain.

---

## 2. Cell Layout

### 2.1 Domain Cell

```
Cell {
  capacity:  <minimum CKB for occupied bytes>
  lock:      <owner's lock script (e.g. JoyID)>
  type: {
    code_hash: CELLNAMES_TYPE_HASH    // deployed type script
    hash_type: "type"
    args:      <domain_hash (32 bytes)>  // blake2b256(normalised_domain)
  }
  data:      <CellNames record payload>
}
```

### 2.2 Registry Cell (Global)

A single cell holding the SMT root of all registered domain hashes. Every registration/deregistration transaction must update this cell.

```
Cell {
  capacity:  <minimum>
  lock:      <governance lock or always-success for testnet>
  type: {
    code_hash: CELLNAMES_REGISTRY_TYPE_HASH
    hash_type: "type"
    args:      0x00  // singleton
  }
  data: {
    version:    u8        // 0x01
    count:      u64       // total registered domains
    root:       [u8; 32]  // SMT root of all domain hashes
  }
}
```

**SMT key:** `blake2b256(normalised_domain)` (32 bytes)
**SMT value:** `blake2b256(owner_lock_hash)` (32 bytes)

Registration requires an SMT **non-existence proof** for the domain hash. The type script verifies the proof against the old root, then verifies the new root includes the new entry.

---

## 3. Domain Naming

### 3.1 Normalisation

Domains are normalised before hashing:

1. Convert to lowercase (ASCII only for v1)
2. Strip leading/trailing whitespace
3. Strip trailing dots
4. Validate: `[a-z0-9]([a-z0-9-]*[a-z0-9])?` per label, max 63 chars per label, max 253 total
5. No `.ckb` suffix stored — it's implicit

**Examples:**
- `mysite` → `mysite` → `blake2b256("mysite")`
- `MyApp` → `myapp` → `blake2b256("myapp")`
- `sub.domain` → `sub.domain` → `blake2b256("sub.domain")`

### 3.2 Human-Readable Format

Users see: `mysite.ckb`
On-chain: `blake2b256("mysite")` as type args

### 3.3 Subdomain Delegation

Subdomains can be:
- **Inline:** Records for `sub.example` stored in the `example` domain cell (simple, owner manages all)
- **Delegated:** Separate cell for `sub.example` with its own lock script. Parent domain cell authorises delegation via a `delegate` record.

---

## 4. Record Format

Cell data uses a compact binary encoding.

### 4.1 Header

| Offset | Size | Field | Description |
|--------|------|-------|-------------|
| 0 | 1 | version | `0x01` |
| 1 | 1 | flags | Bit 0: DANE required. Bit 1: encrypted. Bits 2-7: reserved |
| 2 | 2 | record_count | Number of records (little-endian u16) |
| 4 | ... | records | Record entries |

### 4.2 Record Entry

| Offset | Size | Field | Description |
|--------|------|-------|-------------|
| 0 | 1 | type | Record type (see table below) |
| 1 | 2 | length | Value length in bytes (little-endian u16) |
| 3 | length | value | Record value (encoding depends on type) |

### 4.3 Record Types

| Type ID | Name | Value Encoding | Description |
|---------|------|---------------|-------------|
| 0x01 | A | 4 bytes (IPv4) | IPv4 address |
| 0x02 | AAAA | 16 bytes (IPv6) | IPv6 address |
| 0x03 | CNAME | UTF-8 string | Canonical name |
| 0x04 | TXT | UTF-8 string | Text record |
| 0x05 | MX | u16 priority + UTF-8 host | Mail exchange |
| 0x06 | REDIRECT | UTF-8 URL | HTTP 301/302 redirect |
| 0x07 | TLSA | u8 usage + u8 selector + u8 matching + bytes cert_data | DANE certificate |
| 0x08 | IPFS | 32+ bytes CID | IPFS content hash |
| 0x09 | IPNS | UTF-8 string | IPNS name |
| 0x0A | ARWEAVE | 32 bytes tx_id | Arweave transaction |
| 0x10 | CKB_ADDR | UTF-8 CKB address | CKB payment address |
| 0x11 | BTC_ADDR | UTF-8 BTC address | Bitcoin payment address |
| 0x12 | ETH_ADDR | 20 bytes | Ethereum address |
| 0x20 | PROFILE_NAME | UTF-8 string | Display name |
| 0x21 | PROFILE_AVATAR | UTF-8 URL | Avatar URL |
| 0x22 | PROFILE_BIO | UTF-8 string | Bio/description |
| 0x23 | PROFILE_URL | UTF-8 URL | Website |
| 0x24 | PROFILE_EMAIL | UTF-8 string | Email |
| 0x30 | SOCIAL_TWITTER | UTF-8 handle | Twitter/X |
| 0x31 | SOCIAL_GITHUB | UTF-8 handle | GitHub |
| 0x32 | SOCIAL_TELEGRAM | UTF-8 handle | Telegram |
| 0x33 | SOCIAL_DISCORD | UTF-8 handle | Discord |
| 0x34 | SOCIAL_NOSTR | UTF-8 npub | Nostr public key |
| 0xF0 | APP_DATA | UTF-8 namespace + bytes | App-specific data (JIDSDR compatible) |
| 0xFF | EXTENSION | u16 type_id + bytes | Future extension |

### 4.4 Example: Minimal Web Domain

```
version: 0x01
flags:   0x01 (DANE required)
records: 3

[A]        → 93.184.216.34
[TXT]      → "v=cellnames1"
[TLSA]     → 3 1 1 <sha256 of server cert>
```

Total data: 1 + 1 + 2 + (1+2+4) + (1+2+13) + (1+2+35) = 65 bytes
Cell capacity: ~61 (overhead) + 65 (type) + 65 (data) = **~191 CKB**

### 4.5 Example: Full Identity + DNS

```
[A]            → 93.184.216.34
[AAAA]         → 2606:2800:220:1:248:1893:25c8:1946
[TLSA]         → 3 1 1 <cert hash>
[TXT]          → "v=cellnames1"
[REDIRECT]     → "https://mysite.com"
[IPFS]         → bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi
[CKB_ADDR]     → ckt1qz...
[PROFILE_NAME] → "Alice"
[SOCIAL_TWITTER] → "alice_ckb"
[SOCIAL_GITHUB]  → "alice"
```

Total data: ~350 bytes → **~476 CKB** (~$2.86 at $0.006/CKB)

---

## 5. Type Script Rules

### 5.1 Domain Type Script (`CELLNAMES_TYPE`)

Validates domain cell state transitions:

**Creation (no matching input):**
- Registry cell must be in transaction inputs (updated)
- SMT non-existence proof in witness for domain hash
- New SMT root in registry output includes the new domain
- Cell data must have valid header (version 0x01)
- At least one record required

**Update (matching input and output):**
- Same domain hash (type args unchanged)
- Same lock script (owner unchanged) OR valid transfer witness
- Version must not decrease
- Record format must be valid

**Deletion (input with no matching output):**
- Registry cell must be in transaction (updated)
- SMT existence proof in witness
- New SMT root excludes the domain
- Capacity returned to owner

### 5.2 Registry Type Script (`CELLNAMES_REGISTRY_TYPE`)

Validates the global registry cell:

- Exactly one registry cell input, one registry cell output
- Domain count updated correctly (+1 for registration, -1 for deletion)
- SMT root transition is valid (verified against witness proofs)
- No other modifications to registry data

### 5.3 Transfer

Domain ownership transfer:
- Input cell: old owner's lock
- Output cell: new owner's lock, same type script
- Registry cell: update SMT value from old owner hash to new owner hash
- Both old and new owner must sign (or old owner signs transfer + new owner's lock is set)

---

## 6. Resolution Flow

### 6.1 Client-Side Resolution (Trustless)

```
User enters: mysite.ckb
                ↓
[1] Browser extension intercepts .ckb URL
                ↓
[2] Normalise domain: "mysite"
                ↓
[3] Compute type args: blake2b256("mysite")
                ↓
[4] CKB light client: find live cell with
    type = (CELLNAMES_TYPE_HASH, domain_hash)
                ↓
[5] Light client requests compact block filter
    matches from CKB peers
                ↓
[6] Verify Merkle proof for cell existence
                ↓
[7] Parse cell data → DNS records
                ↓
[8] If REDIRECT record: navigate to URL
    If A/AAAA record: resolve to IP
    If IPFS record: load via IPFS gateway
    If TLSA record: verify server cert via DANE
```

### 6.2 DoH Resolution (Self-Hosted Fallback)

For users without the extension, a DNS-over-HTTPS endpoint:

```
GET https://your-node:8053/dns-query?name=mysite.ckb&type=A

→ DoH server reads CKB cell via local node
→ Returns standard DNS wireformat response
→ Browser resolves normally
```

Self-hostable. No trust required if you run the node yourself.

### 6.3 Gateway Resolution (Zero-Install)

```
https://mysite.ckb.page    → gateway reads cell, proxies content
https://ckb.page/mysite    → same, path-based
```

Centralised but pragmatic for adoption. Anyone can run a gateway.

---

## 7. DANE/TLSA (Certificate Verification Without CAs)

CellNames can eliminate Certificate Authorities for `.ckb` domains:

1. Domain owner generates a self-signed TLS certificate
2. Stores TLSA record in their domain cell: `3 1 1 <sha256 of cert public key>`
3. Browser extension resolves domain → gets TLSA record from cell
4. Connects to server, receives self-signed cert
5. Verifies cert hash matches TLSA record from on-chain data
6. **Trust chain: CKB consensus → cell data → TLSA → cert** (no CA involved)

The type script can enforce that any cell with an A or AAAA record MUST include a TLSA record (flag bit 0 in header). This makes DANE a protocol-level requirement, not a convention.

---

## 8. Cost Analysis

### Storage Costs (Locked, Not Spent)

| Domain Type | Data Size | Total Cell Size | CKB Locked | USD (@ $0.006) |
|-------------|-----------|-----------------|------------|-----------------|
| Minimal (A + TXT) | ~25 B | ~151 B | ~151 CKB | ~$0.91 |
| Web (A + TLSA + TXT) | ~65 B | ~191 B | ~191 CKB | ~$1.15 |
| Full identity | ~350 B | ~476 B | ~476 CKB | ~$2.86 |
| Redirect only | ~80 B | ~206 B | ~206 CKB | ~$1.24 |
| SMT registry cell | ~41 B | ~167 B | ~167 CKB | ~$1.00 |

### Transaction Fees

| Operation | Tx Size | Fee (shannons) | Fee (CKB) | Fee (USD) |
|-----------|---------|----------------|-----------|-----------|
| Register | ~800 B | ~800 | ~0.000008 | ~$0.00000005 |
| Update records | ~600 B | ~600 | ~0.000006 | ~$0.00000004 |
| Transfer | ~900 B | ~900 | ~0.000009 | ~$0.00000005 |
| Delete (reclaim) | ~600 B | ~600 | ~0.000006 | ~$0.00000004 |

### Comparison

| Platform | Registration Cost | Annual Renewal | Update Cost | Reclaim? |
|----------|------------------|---------------|-------------|----------|
| ICANN (.com) | ~$10 | ~$10/yr | Free | No |
| ENS (.eth) | $5+/yr | $5+/yr | $5-50 gas | No |
| Unstoppable | $20-100 one-time | None | $0.01-1 gas | No |
| Handshake | Auction-based | Biennial | ~$0.01 | Partial |
| **CellNames** | **~$1-3 locked** | **None** | **~$0.00001** | **Yes, 100%** |

---

## 9. Roadmap

### Phase 1: Protocol + SDK (Testnet)
- [ ] Record codec (encode/decode binary format)
- [ ] Domain cell CRUD via CCC SDK
- [ ] Registry cell with SMT (using nervos-smt crate)
- [ ] JoyID authentication
- [ ] CLI tool for domain management
- [ ] Testnet deployment

### Phase 2: Type Scripts (Testnet)
- [ ] Domain type script (Rust, CKB-VM)
- [ ] Registry type script with SMT verification
- [ ] Uniqueness enforcement
- [ ] DANE/TLSA validation
- [ ] Deploy to testnet

### Phase 3: Resolution
- [ ] Browser extension (Chrome/Firefox)
- [ ] WASM light client integration
- [ ] DoH gateway (self-hostable)
- [ ] DANE certificate verification
- [ ] IPFS/Arweave content resolution

### Phase 4: Production
- [ ] Security audit
- [ ] Mainnet deployment
- [ ] Subdomain delegation
- [ ] Transfer marketplace
- [ ] SDK packages (npm, crates.io, PyPI)

---

## 10. References

- [Nervos CKB](https://www.nervos.org/) — Layer 1 blockchain
- [CKB Cell Model](https://docs.nervos.org/docs/basics/concepts/cell-model/) — UTXO-based state
- [JoyID](https://joy.id/) — WebAuthn passkey wallet
- [.bit / DID.id](https://docs.d.id/) — Prior art on CKB naming (identity, not DNS)
- [Handshake](https://handshake.org/) — Blockchain DNS root zone
- [ENS ENSIP-6](https://docs.ens.domains/ensip/6/) — DNS wireformat on-chain
- [RFC 6698 (DANE/TLSA)](https://tools.ietf.org/html/rfc6698) — Certificate auth via DNS
- [RFC 8484 (DoH)](https://tools.ietf.org/html/rfc8484) — DNS over HTTPS
- [CKB Light Client WASM](https://github.com/nervosnetwork/ckb-light-client) — Browser-native verification
- [JIDSDR](https://github.com/toastmanAu/jidsdr) — Predecessor: on-chain settings registry

---

*CellNames — Local decentralised DNS on Nervos CKB.*
*Built by [Wyltek Industries](https://wyltekindustries.com).*
