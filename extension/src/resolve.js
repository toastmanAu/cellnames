import { normaliseDomain, hashDomain, fetchCell, decodeRecords } from './ckb.js';

const params   = new URLSearchParams(location.search);
const domain   = params.get('domain') ?? '';
const path     = params.get('path')   ?? '/';

const $domain = document.getElementById('domain');
const $status = document.getElementById('status');
const $error  = document.getElementById('error');

$domain.textContent = domain;

async function resolve() {
  try {
    const normalised = normaliseDomain(domain);
    $status.textContent = 'Looking up ' + normalised + '.ckb on CKB…';

    const hashHex = hashDomain(normalised);
    const cell    = await fetchCell(hashHex);

    if (!cell) {
      showError('Domain not registered: ' + domain);
      return;
    }

    const records = decodeRecords(cell.output_data);

    // Priority: REDIRECT > A/AAAA > CNAME > IPFS
    const redirect = records.find(r => r.type === 'REDIRECT');
    if (redirect) {
      $status.textContent = 'Redirecting…';
      location.replace(redirect.value);
      return;
    }

    const a = records.find(r => r.type === 'A');
    if (a) {
      $status.textContent = 'Resolved — connecting…';
      location.replace('http://' + a.value + path);
      return;
    }

    const aaaa = records.find(r => r.type === 'AAAA');
    if (aaaa) {
      location.replace('http://[' + aaaa.value + ']' + path);
      return;
    }

    const cname = records.find(r => r.type === 'CNAME');
    if (cname) {
      location.replace('http://' + cname.value + path);
      return;
    }

    const ipfs = records.find(r => r.type === 'IPFS');
    if (ipfs) {
      location.replace('https://ipfs.io/ipfs/' + ipfs.value);
      return;
    }

    showError('No resolvable records for ' + domain);

  } catch (err) {
    showError('Resolution failed: ' + err.message);
  }
}

function showError(msg) {
  document.querySelector('.spinner').style.display = 'none';
  $status.textContent = 'Could not resolve ' + domain;
  $error.textContent  = msg;
  $error.style.display = 'block';
}

resolve();
