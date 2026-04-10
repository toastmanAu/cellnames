import http from 'http';
import dnsPacket from 'dns-packet';
import { resolve, buildAnswers } from './resolver.js';
import { config } from './config.js';
import { setupPage } from './setup-page.js';

function base64urlDecode(str) {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(base64, 'base64');
}

async function handleQuery(queryBuf, res) {
  let query;
  try {
    query = dnsPacket.decode(queryBuf);
  } catch {
    res.writeHead(400);
    res.end('Bad Request: invalid DNS message');
    return;
  }

  const question = query.questions?.[0];
  if (!question) {
    res.writeHead(400);
    res.end('Bad Request: no question');
    return;
  }

  const { name, type: qtype } = question;

  if (!name.toLowerCase().endsWith('.ckb')) {
    sendResponse(res, dnsPacket.encode({
      type: 'response', id: query.id, rcode: 'REFUSED', questions: query.questions,
    }), config.ttl);
    return;
  }

  let decoded;
  try {
    decoded = await resolve(name);
  } catch (err) {
    console.error(`[resolver] ${name}: ${err.message}`);
    sendResponse(res, dnsPacket.encode({
      type: 'response', id: query.id, rcode: 'SERVFAIL', questions: query.questions,
    }), 0);
    return;
  }

  const answers = buildAnswers(name, qtype, decoded);
  sendResponse(res, dnsPacket.encode({
    type: 'response',
    id: query.id,
    flags: dnsPacket.AUTHORITATIVE_ANSWER,
    rcode: decoded ? 'NOERROR' : 'NXDOMAIN',
    questions: query.questions,
    answers,
  }), config.ttl);
}

function sendResponse(res, buf, ttl) {
  res.writeHead(200, {
    'Content-Type': 'application/dns-message',
    'Cache-Control': ttl > 0 ? `max-age=${ttl}` : 'no-store',
  });
  res.end(buf);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${config.port}`);

  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', rpc: config.ckbRpcUrl }));
    return;
  }

  if (url.pathname === '/' || url.pathname === '/setup') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(setupPage(req));
    return;
  }

  if (url.pathname !== '/dns-query') {
    res.writeHead(404);
    res.end('Not Found');
    return;
  }

  if (req.method === 'GET') {
    const param = url.searchParams.get('dns');
    if (!param) { res.writeHead(400); res.end('Missing dns parameter'); return; }
    handleQuery(base64urlDecode(param), res);
    return;
  }

  if (req.method === 'POST') {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => handleQuery(Buffer.concat(chunks), res));
    return;
  }

  res.writeHead(405);
  res.end('Method Not Allowed');
});

server.listen(config.port, () => {
  console.log(`CellNames DoH  :${config.port}/dns-query`);
  console.log(`CKB RPC        ${config.ckbRpcUrl}`);
  console.log(`Type hash      ${config.cellnamesTypeHash}`);
});
