import { normaliseDomain, hashDomain, domainHashHex } from '../../sdk/src/domain.js';
import { decodeRecords, RecordType } from '../../sdk/src/records.js';
import { config } from './config.js';

const decoder = new TextDecoder();

async function fetchCell(hashHex) {
  const body = {
    id: 1,
    jsonrpc: '2.0',
    method: 'get_cells',
    params: [
      {
        script: {
          code_hash: config.cellnamesTypeHash,
          hash_type: 'type',
          args: hashHex,
        },
        script_type: 'type',
      },
      'desc',
      '0x1',
    ],
  };

  const res = await fetch(config.ckbRpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const json = await res.json();
  if (json.error) throw new Error(`CKB RPC: ${json.error.message}`);
  return json.result?.objects?.[0] ?? null;
}

export async function resolve(domainName) {
  const normalised = normaliseDomain(domainName);
  const hash = hashDomain(normalised);
  const hex = domainHashHex(hash);
  const cell = await fetchCell(hex);
  if (!cell) return null;
  return decodeRecords(cell.output_data);
}

export function buildAnswers(name, qtype, decoded) {
  if (!decoded) return [];

  const ttl = config.ttl;
  const answers = [];

  for (const record of decoded.records) {
    switch (record.type) {
      case RecordType.A:
        if (qtype === 'A' || qtype === 'ANY')
          answers.push({ type: 'A', class: 'IN', name, ttl, data: record.text });
        break;

      case RecordType.AAAA:
        if (qtype === 'AAAA' || qtype === 'ANY')
          answers.push({ type: 'AAAA', class: 'IN', name, ttl, data: record.text });
        break;

      case RecordType.CNAME:
        if (qtype === 'CNAME' || qtype === 'ANY')
          answers.push({ type: 'CNAME', class: 'IN', name, ttl, data: record.text });
        break;

      case RecordType.TXT:
        if (qtype === 'TXT' || qtype === 'ANY')
          answers.push({ type: 'TXT', class: 'IN', name, ttl, data: [record.text] });
        break;

      case RecordType.MX:
        if (qtype === 'MX' || qtype === 'ANY') {
          const priority = record.value[0] | (record.value[1] << 8);
          const exchange = decoder.decode(record.value.slice(2));
          answers.push({ type: 'MX', class: 'IN', name, ttl, data: { priority, exchange } });
        }
        break;

      // REDIRECT, IPFS, identity records etc. have no DNS equivalent — ignored here,
      // handled by the browser extension / gateway redirect layer.
    }
  }

  return answers;
}
