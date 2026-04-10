import { config } from './config.js';

export function setupPage(req) {
  const host = req.headers['host'] ?? `localhost:${config.port}`;
  const proto = host.startsWith('localhost') ? 'http' : 'https';
  const gatewayUrl = `${proto}://${host}/dns-query`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>CellNames — Browser Setup</title>
<style>
  :root { --ckb: #00cc9a; --bg: #0f1117; --card: #1a1d27; --text: #e8eaf0; --muted: #888; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: var(--bg); color: var(--text); font: 16px/1.6 system-ui, sans-serif; padding: 2rem 1rem; }
  .wrap { max-width: 700px; margin: 0 auto; }
  h1 { font-size: 1.8rem; margin-bottom: .25rem; }
  h1 span { color: var(--ckb); }
  .sub { color: var(--muted); margin-bottom: 2.5rem; }
  .card { background: var(--card); border-radius: 10px; padding: 1.5rem; margin-bottom: 1.5rem; }
  .card h2 { font-size: 1.1rem; margin-bottom: 1rem; display: flex; align-items: center; gap: .5rem; }
  .steps { counter-reset: step; list-style: none; }
  .steps li { counter-increment: step; padding: .4rem 0 .4rem 2.2rem; position: relative; }
  .steps li::before { content: counter(step); position: absolute; left: 0; width: 1.5rem; height: 1.5rem;
    background: var(--ckb); color: #000; border-radius: 50%; font-size: .75rem; font-weight: 700;
    display: flex; align-items: center; justify-content: center; top: .5rem; }
  .url-box { background: #0f1117; border: 1px solid #333; border-radius: 6px;
    padding: .6rem 1rem; font-family: monospace; font-size: .9rem;
    display: flex; align-items: center; gap: .75rem; margin: .5rem 0; }
  .copy-btn { background: var(--ckb); color: #000; border: none; border-radius: 4px;
    padding: .25rem .75rem; font-size: .8rem; font-weight: 600; cursor: pointer; flex-shrink: 0; }
  .copy-btn:hover { opacity: .85; }
  .url-text { flex: 1; word-break: break-all; }
  .status { display: flex; align-items: center; gap: .5rem; padding: .75rem 1rem;
    background: #0f1117; border-radius: 6px; font-size: .9rem; margin-bottom: 1rem; }
  .dot { width: 8px; height: 8px; border-radius: 50%; background: #555; flex-shrink: 0; }
  .dot.ok { background: var(--ckb); }
  code { background: #0f1117; padding: .15rem .4rem; border-radius: 3px; font-size: .85rem; }
  .tabs { display: flex; gap: .5rem; margin-bottom: 1rem; flex-wrap: wrap; }
  .tab { padding: .4rem 1rem; border-radius: 6px; border: 1px solid #333; cursor: pointer;
    font-size: .85rem; background: transparent; color: var(--text); }
  .tab.active { background: var(--ckb); color: #000; border-color: var(--ckb); font-weight: 600; }
  .panel { display: none; }
  .panel.active { display: block; }
  footer { text-align: center; color: var(--muted); font-size: .85rem; margin-top: 3rem; }
  a { color: var(--ckb); text-decoration: none; }
  a:hover { text-decoration: underline; }
</style>
</head>
<body>
<div class="wrap">
  <h1><span>.ckb</span> Domain Setup</h1>
  <p class="sub">Configure your browser to resolve CellNames domains in 30 seconds.</p>

  <div class="card">
    <div class="status" id="status">
      <div class="dot" id="dot"></div>
      <span id="status-text">Checking gateway...</span>
    </div>
    <strong>Gateway URL</strong>
    <div class="url-box">
      <span class="url-text" id="gateway-url">${gatewayUrl}</span>
      <button class="copy-btn" onclick="copyUrl()">Copy</button>
    </div>
  </div>

  <div class="card">
    <h2>Browser Setup</h2>
    <div class="tabs">
      <button class="tab active" onclick="showTab('firefox', this)">Firefox</button>
      <button class="tab" onclick="showTab('chrome', this)">Chrome</button>
      <button class="tab" onclick="showTab('brave', this)">Brave</button>
    </div>

    <div id="tab-firefox" class="panel active">
      <ol class="steps">
        <li>Open <a href="about:preferences" target="_blank"><code>about:preferences</code></a></li>
        <li>Scroll to <strong>Network Settings</strong> → click <strong>Settings...</strong></li>
        <li>Check <strong>Enable DNS over HTTPS</strong></li>
        <li>Select <strong>Custom</strong> from the dropdown</li>
        <li>Paste the gateway URL above</li>
        <li>Click <strong>OK</strong> and restart Firefox</li>
      </ol>
    </div>

    <div id="tab-chrome" class="panel">
      <ol class="steps">
        <li>Open <a href="chrome://settings/security" target="_blank"><code>chrome://settings/security</code></a></li>
        <li>Scroll to <strong>Advanced</strong> → <strong>Use secure DNS</strong></li>
        <li>Toggle it <strong>On</strong></li>
        <li>Select <strong>With Custom provider</strong></li>
        <li>Paste the gateway URL above</li>
      </ol>
    </div>

    <div id="tab-brave" class="panel">
      <ol class="steps">
        <li>Open <a href="brave://settings/security" target="_blank"><code>brave://settings/security</code></a></li>
        <li>Find <strong>Use secure DNS</strong></li>
        <li>Toggle it <strong>On</strong> → select <strong>With Custom</strong></li>
        <li>Paste the gateway URL above</li>
      </ol>
    </div>
  </div>

  <div class="card">
    <h2>Auto-Setup (Linux / macOS)</h2>
    <p style="margin-bottom:.75rem;color:var(--muted);font-size:.9rem">Configures Firefox automatically via <code>user.js</code>:</p>
    <div class="url-box">
      <span class="url-text">curl -fsSL https://raw.githubusercontent.com/toastmanAu/cellnames/main/setup.sh | bash</span>
      <button class="copy-btn" onclick="copySetup()">Copy</button>
    </div>
  </div>

  <div class="card">
    <h2>Test It</h2>
    <p style="margin-bottom:.75rem;color:var(--muted);font-size:.9rem">After setup, visit:</p>
    <div class="url-box"><span class="url-text">http://wyltekindustries.ckb</span></div>
    <p style="margin-top:.75rem;font-size:.9rem;color:var(--muted)">
      Or check the gateway health: <a href="/health">/health</a>
    </p>
  </div>

  <footer>
    <a href="https://github.com/toastmanAu/cellnames">CellNames</a> —
    Decentralised DNS on <a href="https://nervos.org">Nervos CKB</a> •
    Built by <a href="https://wyltekindustries.com">Wyltek Industries</a>
  </footer>
</div>

<script>
const gatewayUrl = ${JSON.stringify(gatewayUrl)};

async function checkGateway() {
  try {
    const res = await fetch('/health');
    const dot = document.getElementById('dot');
    const text = document.getElementById('status-text');
    if (res.ok) {
      dot.className = 'dot ok';
      text.textContent = 'Gateway online ✓';
    } else {
      text.textContent = 'Gateway error — check server logs';
    }
  } catch {
    document.getElementById('status-text').textContent = 'Gateway unreachable';
  }
}

function copyUrl() {
  navigator.clipboard.writeText(gatewayUrl).then(() => {
    const btn = event.target;
    btn.textContent = 'Copied!';
    setTimeout(() => btn.textContent = 'Copy', 1500);
  });
}

function copySetup() {
  const cmd = 'curl -fsSL https://raw.githubusercontent.com/toastmanAu/cellnames/main/setup.sh | bash';
  navigator.clipboard.writeText(cmd).then(() => {
    const btn = event.target;
    btn.textContent = 'Copied!';
    setTimeout(() => btn.textContent = 'Copy', 1500);
  });
}

function showTab(name, btn) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  btn.classList.add('active');
}

checkGateway();
</script>
</body>
</html>`;
}
