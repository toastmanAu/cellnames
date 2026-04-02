# CellNames

Decentralised DNS on Nervos CKB. No servers. No gateways. No intermediaries.

Your domain is a CKB cell. Your device resolves it. The chain is the only source of truth.

## How It Works

```
User types: mysite.ckb
       ↓
Browser extension computes blake2b256("mysite")
       ↓
CKB light client finds matching cell from peers
       ↓
Verifies Merkle proof → parses DNS records
       ↓
Resolves: IP address / redirect / IPFS content
```

No DNS servers. No registrars. No annual fees. You lock CKB as a storage deposit, get it all back when you're done.

## Why CKB

- **Your domain IS the cell.** Not held in a contract. Not custodied by anyone. You own it via your lock script.
- **Type scripts enforce the rules.** Domain uniqueness, valid records, mandatory DANE/TLSA — enforced at consensus, not by convention.
- **Light client verifiable.** A browser extension with the CKB WASM light client can verify any domain without trusting a gateway.
- **Any auth works.** JoyID (passkeys), hardware wallets, multisig — CKB's lock script flexibility means any signature scheme can own a domain.
- **Capacity, not rent.** Lock ~200 CKB (~$1.20) to register. No annual renewal. Reclaim 100% when you delete.

## Target Platform

**Brave Browser** — already resolves ENS and Unstoppable Domains natively. Most aligned browser for CKB DNS integration.

## Project Structure

```
cellnames/
├── protocol/           # Protocol specification
│   └── SPEC.md         # Full spec: cell layout, record format, type scripts, resolution
├── contracts/          # CKB type scripts (Rust, CKB-VM)
│   └── src/
├── sdk/                # JavaScript SDK for domain CRUD + resolution
│   └── src/
├── extension/          # Brave/Chrome browser extension
│   └── src/
├── gateway/            # Self-hostable DoH gateway (fallback)
│   └── src/
└── docs/               # Additional documentation
```

## Protocol Summary

| Concept | Implementation |
|---------|---------------|
| Domain ownership | CKB cell with JoyID/any lock script |
| Domain identity | `blake2b256(normalised_name)` as type script args |
| DNS records | Binary-encoded in cell data (A, AAAA, CNAME, TXT, REDIRECT, TLSA, IPFS...) |
| Uniqueness | Global registry cell with SMT root + non-existence proofs |
| Resolution | CKB light client (WASM) in browser extension |
| Certificates | DANE/TLSA records in cell — no Certificate Authorities |
| Cost | ~150-500 CKB locked per domain (~$0.90-3.00), 100% reclaimable |
| Updates | ~$0.00001 per transaction |

See [protocol/SPEC.md](protocol/SPEC.md) for the full specification.

## Roadmap

- **Phase 1:** SDK + CLI — register, update, resolve domains on testnet
- **Phase 2:** Type scripts — on-chain uniqueness enforcement, DANE validation
- **Phase 3:** Brave extension — client-side resolution via WASM light client
- **Phase 4:** Mainnet + DANE/TLSA + subdomain delegation

## Prior Art

| Project | Chain | What They Did | What We Add |
|---------|-------|--------------|-------------|
| .bit (DID.id) | CKB | Identity/address naming, cross-chain auth | Actual DNS records, DANE/TLSA, browser resolution |
| Handshake | HNS | Blockchain root zone, DANE, hnsd light client | CKB cell ownership model, JoyID auth, no auction |
| ENS | Ethereum | Smart contract naming, ENSIP-6 DNS wireformat | True ownership (cell not contract), 1000x cheaper updates |
| JIDSDR | CKB | On-chain settings registry | Foundation — same cell + SMT + JoyID pattern |

## Built On

- [Nervos CKB](https://www.nervos.org/) — Layer 1 common knowledge base
- [CCC](https://github.com/ckb-ccc/ccc) — Common Chains Connector SDK
- [JoyID](https://joy.id/) — WebAuthn passkey wallet
- [CKB Light Client](https://github.com/nervosnetwork/ckb-light-client) — WASM-capable light verification
- [JIDSDR](https://github.com/toastmanAu/jidsdr) — On-chain settings protocol (predecessor)

## License

GPL-3.0

---

Built by [Wyltek Industries](https://wyltekindustries.com) on [Nervos CKB](https://www.nervos.org/).
