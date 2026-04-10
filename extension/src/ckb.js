// CKB domain hashing and cell resolution
import { blake2b } from '@noble/hashes/blake2b';

const CKB_PERSONALIZATION = new TextEncoder().encode('ckb-default-hash');

export const CELLNAMES_TYPE_HASH = '0x1bfe13e7f28aa1bf9196ec8f149e79af3b1364e942d251038a6031b563b2aa24';
export const CKB_RPC = 'https://testnet.ckbapp.dev';

export function normaliseDomain(name) {
  let n = name.trim().toLowerCase();
  if (n.endsWith('.ckb')) n = n.slice(0, -4);
  while (n.endsWith('.')) n = n.slice(0, -1);
  if (!n) throw new Error('empty domain');
  return n;
}

export function hashDomain(normalised) {
  const bytes = new TextEncoder().encode(normalised);
  const hash = blake2b(bytes, { dkLen: 32, personalization: CKB_PERSONALIZATION });
  return '0x' + Array.from(hash).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function fetchCell(hashHex) {
  const res = await fetch(CKB_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: 1, jsonrpc: '2.0', method: 'get_cells',
      params: [
        { script: { code_hash: CELLNAMES_TYPE_HASH, hash_type: 'type', args: hashHex }, script_type: 'type' },
        'desc', '0x1',
      ],
    }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  return json.result?.objects?.[0] ?? null;
}

// Record type IDs
const RT = { A:1, AAAA:2, CNAME:3, TXT:4, MX:5, REDIRECT:6, IPFS:8 };
const decoder = new TextDecoder();

export function decodeRecords(hexData) {
  const hex = hexData.startsWith('0x') ? hexData.slice(2) : hexData;
  if (!hex) return [];
  const bytes = new Uint8Array(hex.match(/.{2}/g).map(b => parseInt(b, 16)));
  if (bytes.length < 4 || bytes[0] !== 0x01) return [];

  const count = bytes[2] | (bytes[3] << 8);
  const records = [];
  let i = 4;
  for (let n = 0; n < count && i + 3 <= bytes.length; n++) {
    const type = bytes[i];
    const len  = bytes[i + 1] | (bytes[i + 2] << 8);
    i += 3;
    if (i + len > bytes.length) break;
    const value = bytes.slice(i, i + len);
    i += len;

    switch (type) {
      case RT.A:        records.push({ type: 'A',        value: Array.from(value).join('.') }); break;
      case RT.AAAA:     records.push({ type: 'AAAA',     value: formatIPv6(value) }); break;
      case RT.CNAME:    records.push({ type: 'CNAME',    value: decoder.decode(value) }); break;
      case RT.TXT:      records.push({ type: 'TXT',      value: decoder.decode(value) }); break;
      case RT.REDIRECT: records.push({ type: 'REDIRECT', value: decoder.decode(value) }); break;
      case RT.IPFS:     records.push({ type: 'IPFS',     value: decoder.decode(value) }); break;
    }
  }
  return records;
}

function formatIPv6(bytes) {
  const groups = [];
  for (let i = 0; i < 16; i += 2)
    groups.push(((bytes[i] << 8) | bytes[i + 1]).toString(16));
  return groups.join(':');
}
