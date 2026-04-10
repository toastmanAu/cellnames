#!/usr/bin/env bash
# CellNames — Browser & System DNS Setup
# Configures Firefox (user.js) and optionally system DNS to resolve .ckb domains.
# Usage: bash setup.sh [--gateway <url>] [--local]

set -euo pipefail

GATEWAY="${CELLNAMES_GATEWAY:-https://ckb.wyltekindustries.com/dns-query}"
LOCAL=false

for arg in "$@"; do
  case $arg in
    --gateway) GATEWAY="$2"; shift 2 ;;
    --local)   GATEWAY="http://localhost:8053/dns-query"; LOCAL=true; shift ;;
  esac
done

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info()    { echo -e "${CYAN}[cellnames]${NC} $*"; }
success() { echo -e "${GREEN}[cellnames]${NC} $*"; }
warn()    { echo -e "${YELLOW}[cellnames]${NC} $*"; }

echo ""
echo "  CellNames DNS Setup"
echo "  Gateway: $GATEWAY"
echo ""

# ── Firefox ──────────────────────────────────────────────────────────────────

setup_firefox() {
  info "Detecting Firefox profiles..."

  local profile_dirs=()

  # Linux
  [[ -d "$HOME/.mozilla/firefox" ]] && \
    while IFS= read -r -d '' p; do profile_dirs+=("$p"); done \
    < <(find "$HOME/.mozilla/firefox" -maxdepth 1 -name "*.default*" -o -name "*.release" -print0 2>/dev/null)

  # macOS
  [[ -d "$HOME/Library/Application Support/Firefox/Profiles" ]] && \
    while IFS= read -r -d '' p; do profile_dirs+=("$p"); done \
    < <(find "$HOME/Library/Application Support/Firefox/Profiles" -maxdepth 1 -mindepth 1 -type d -print0 2>/dev/null)

  if [[ ${#profile_dirs[@]} -eq 0 ]]; then
    warn "No Firefox profiles found. Configure manually:"
    warn "  about:preferences → Network Settings → DNS over HTTPS → Custom → $GATEWAY"
    return
  fi

  for profile in "${profile_dirs[@]}"; do
    local userjs="$profile/user.js"
    info "Writing to: $userjs"

    # Remove any existing CellNames entries
    if [[ -f "$userjs" ]]; then
      grep -v "network.trr" "$userjs" > "${userjs}.tmp" && mv "${userjs}.tmp" "$userjs"
    fi

    cat >> "$userjs" << EOF

// CellNames — .ckb domain resolution via DNS-over-HTTPS
user_pref("network.trr.mode", 3);
user_pref("network.trr.uri", "$GATEWAY");
user_pref("network.trr.bootstrapAddress", "1.1.1.1");
user_pref("network.trr.allow-rfc1918", true);
EOF
    success "Firefox profile configured: $(basename "$profile")"
  done

  warn "Restart Firefox for changes to take effect."
}

# ── systemd-resolved (Linux) ──────────────────────────────────────────────────

setup_systemd_resolved() {
  if ! command -v systemd-resolve &>/dev/null && ! command -v resolvectl &>/dev/null; then
    return
  fi

  info "systemd-resolved detected — DoH is not natively supported."
  info "For system-wide .ckb resolution, run the gateway locally and add:"
  echo ""
  echo "  # /etc/systemd/resolved.conf.d/cellnames.conf"
  echo "  [Resolve]"
  echo "  DNS=127.0.0.53"
  echo ""
  info "Then use dnsproxy to bridge DoH → UDP:"
  echo "  dnsproxy -u $GATEWAY -l 127.0.0.1 -p 53"
  echo ""
}

# ── Summary ───────────────────────────────────────────────────────────────────

setup_firefox
setup_systemd_resolved

echo ""
success "Done! Test with: curl -s https://ckb.wyltekindustries.com/health"
echo ""
echo "  Firefox:  about:preferences → Network Settings (verify DoH is set)"
echo "  Chrome:   chrome://settings/security → Use secure DNS → Custom → $GATEWAY"
echo "  Brave:    brave://settings/security → Use secure DNS → Custom → $GATEWAY"
echo ""
