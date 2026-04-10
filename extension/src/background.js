// CellNames — background service worker
// Intercepts .ckb navigation before DNS and redirects to the resolve page.

const CKB_TLD = '.ckb';

chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  // Top-level frames only, not iframes
  if (details.frameId !== 0) return;

  let url;
  try { url = new URL(details.url); } catch { return; }

  if (!url.hostname.toLowerCase().endsWith(CKB_TLD)) return;

  const resolveUrl = chrome.runtime.getURL('resolve.html') +
    '?domain=' + encodeURIComponent(url.hostname) +
    '&path='   + encodeURIComponent(url.pathname + url.search);

  chrome.tabs.update(details.tabId, { url: resolveUrl });
});
