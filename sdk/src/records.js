/**
 * CellNames — DNS Record Codec
 *
 * Binary encoding/decoding of CellNames DNS records.
 * See protocol/SPEC.md §4 for the full format.
 */

// Record type IDs
export const RecordType = {
  A:              0x01,
  AAAA:           0x02,
  CNAME:          0x03,
  TXT:            0x04,
  MX:             0x05,
  REDIRECT:       0x06,
  TLSA:           0x07,
  IPFS:           0x08,
  IPNS:           0x09,
  ARWEAVE:        0x0A,
  CKB_ADDR:       0x10,
  BTC_ADDR:       0x11,
  ETH_ADDR:       0x12,
  PROFILE_NAME:   0x20,
  PROFILE_AVATAR: 0x21,
  PROFILE_BIO:    0x22,
  PROFILE_URL:    0x23,
  PROFILE_EMAIL:  0x24,
  SOCIAL_TWITTER: 0x30,
  SOCIAL_GITHUB:  0x31,
  SOCIAL_TELEGRAM:0x32,
  SOCIAL_DISCORD: 0x33,
  SOCIAL_NOSTR:   0x34,
  APP_DATA:       0xF0,
  EXTENSION:      0xFF,
};

// Reverse lookup
const TYPE_NAMES = Object.fromEntries(
  Object.entries(RecordType).map(([k, v]) => [v, k])
);

export function recordTypeName(typeId) {
  return TYPE_NAMES[typeId] || `UNKNOWN(0x${typeId.toString(16)})`;
}

// Header flags
export const Flags = {
  DANE_REQUIRED: 0x01,
  ENCRYPTED:     0x02,
};

const HEADER_VERSION = 0x01;
const HEADER_SIZE = 4; // version(1) + flags(1) + record_count(2)
const encoder = new TextEncoder();
const decoder = new TextDecoder();

/**
 * Encode an array of records into CellNames binary format.
 *
 * @param {Array<{type: number, value: Uint8Array|string}>} records
 * @param {number} flags — header flags (default 0)
 * @returns {Uint8Array}
 */
export function encodeRecords(records, flags = 0) {
  // Pre-compute total size
  const encoded = records.map(r => {
    const val = typeof r.value === "string" ? encoder.encode(r.value) : r.value;
    return { type: r.type, value: val };
  });

  const dataSize = encoded.reduce((sum, r) => sum + 1 + 2 + r.value.length, 0);
  const buf = new Uint8Array(HEADER_SIZE + dataSize);

  // Header
  buf[0] = HEADER_VERSION;
  buf[1] = flags;
  buf[2] = records.length & 0xFF;
  buf[3] = (records.length >> 8) & 0xFF;

  // Records
  let offset = HEADER_SIZE;
  for (const r of encoded) {
    buf[offset] = r.type;
    buf[offset + 1] = r.value.length & 0xFF;
    buf[offset + 2] = (r.value.length >> 8) & 0xFF;
    buf.set(r.value, offset + 3);
    offset += 3 + r.value.length;
  }

  return buf;
}

/**
 * Decode CellNames binary format into header + records.
 *
 * @param {Uint8Array|string} data — raw bytes or 0x-prefixed hex
 * @returns {{ version: number, flags: number, records: Array<{type: number, typeName: string, value: Uint8Array, text: string|null}> } | null}
 */
export function decodeRecords(data) {
  let bytes;
  if (typeof data === "string") {
    const hex = data.startsWith("0x") ? data.slice(2) : data;
    bytes = new Uint8Array(hex.match(/.{2}/g).map(b => parseInt(b, 16)));
  } else {
    bytes = new Uint8Array(data);
  }

  if (bytes.length < HEADER_SIZE) return null;
  if (bytes[0] !== HEADER_VERSION) return null;

  const flags = bytes[1];
  const recordCount = bytes[2] | (bytes[3] << 8);
  const records = [];
  let offset = HEADER_SIZE;

  for (let i = 0; i < recordCount; i++) {
    if (offset + 3 > bytes.length) break;
    const type = bytes[offset];
    const len = bytes[offset + 1] | (bytes[offset + 2] << 8);
    offset += 3;
    if (offset + len > bytes.length) break;

    const value = bytes.slice(offset, offset + len);
    offset += len;

    // Try to decode text for string-type records
    let text = null;
    if (isTextRecord(type)) {
      try { text = decoder.decode(value); } catch {}
    } else if (type === RecordType.A && value.length === 4) {
      text = value.join(".");
    } else if (type === RecordType.AAAA && value.length === 16) {
      text = formatIPv6(value);
    }

    records.push({
      type,
      typeName: recordTypeName(type),
      value,
      text,
    });
  }

  return { version: bytes[0], flags, records };
}

/**
 * Check if a record type stores text data.
 */
function isTextRecord(type) {
  return (
    type === RecordType.CNAME ||
    type === RecordType.TXT ||
    type === RecordType.REDIRECT ||
    type === RecordType.IPNS ||
    (type >= RecordType.CKB_ADDR && type <= RecordType.ETH_ADDR) ||
    (type >= RecordType.PROFILE_NAME && type <= RecordType.PROFILE_EMAIL) ||
    (type >= RecordType.SOCIAL_TWITTER && type <= RecordType.SOCIAL_NOSTR)
  );
}

/**
 * Format 16-byte IPv6 address.
 */
function formatIPv6(bytes) {
  const groups = [];
  for (let i = 0; i < 16; i += 2) {
    groups.push(((bytes[i] << 8) | bytes[i + 1]).toString(16));
  }
  return groups.join(":");
}

// ── Helper builders ──

export function aRecord(ip) {
  const parts = ip.split(".").map(Number);
  return { type: RecordType.A, value: new Uint8Array(parts) };
}

export function aaaaRecord(ip) {
  const groups = ip.split(":").map(g => parseInt(g, 16));
  const bytes = new Uint8Array(16);
  groups.forEach((g, i) => { bytes[i*2] = (g >> 8) & 0xFF; bytes[i*2+1] = g & 0xFF; });
  return { type: RecordType.AAAA, value: bytes };
}

export function txtRecord(text) {
  return { type: RecordType.TXT, value: text };
}

export function cnameRecord(name) {
  return { type: RecordType.CNAME, value: name };
}

export function redirectRecord(url) {
  return { type: RecordType.REDIRECT, value: url };
}

export function tlsaRecord(usage, selector, matching, certData) {
  const header = new Uint8Array([usage, selector, matching]);
  const data = typeof certData === "string"
    ? new Uint8Array(certData.match(/.{2}/g).map(b => parseInt(b, 16)))
    : certData;
  const value = new Uint8Array(3 + data.length);
  value.set(header);
  value.set(data, 3);
  return { type: RecordType.TLSA, value };
}

export function ipfsRecord(cid) {
  return { type: RecordType.IPFS, value: typeof cid === "string" ? encoder.encode(cid) : cid };
}

export function profileRecord(field, value) {
  const typeMap = {
    name: RecordType.PROFILE_NAME,
    avatar: RecordType.PROFILE_AVATAR,
    bio: RecordType.PROFILE_BIO,
    url: RecordType.PROFILE_URL,
    email: RecordType.PROFILE_EMAIL,
  };
  return { type: typeMap[field] || RecordType.TXT, value };
}

export function socialRecord(platform, handle) {
  const typeMap = {
    twitter: RecordType.SOCIAL_TWITTER,
    github: RecordType.SOCIAL_GITHUB,
    telegram: RecordType.SOCIAL_TELEGRAM,
    discord: RecordType.SOCIAL_DISCORD,
    nostr: RecordType.SOCIAL_NOSTR,
  };
  return { type: typeMap[platform] || RecordType.TXT, value: handle };
}

export function addressRecord(chain, address) {
  const typeMap = {
    ckb: RecordType.CKB_ADDR,
    btc: RecordType.BTC_ADDR,
    eth: RecordType.ETH_ADDR,
  };
  return { type: typeMap[chain] || RecordType.TXT, value: address };
}
