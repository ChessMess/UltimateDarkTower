#!/usr/bin/env bash
# Reproduce the "gather + collapse + find duplicates" investigation step of a
# Dependabot triage in one shot. Read-only: fetches alerts, collapses them by
# package, prints advisory summaries, then for each flagged package shows the
# versions actually resolved in pnpm-lock.yaml and their transitive parents —
# which is how you tell a vulnerable *duplicate* copy from the already-patched
# one that also lives in the tree.
#
# Usage:  scripts/triage-alerts.sh            # auto-detects the repo via gh
#         scripts/triage-alerts.sh owner/repo
set -euo pipefail

REPO="${1:-$(gh repo view --json nameWithOwner --jq .nameWithOwner)}"
LOCKFILE="pnpm-lock.yaml"
API="/repos/${REPO}/dependabot/alerts?state=open&per_page=100"

echo "=== Repo: ${REPO} ==="
ALERTS="$(gh api -H 'Accept: application/vnd.github+json' "$API")"
N="$(jq 'length' <<<"$ALERTS")"
echo "Open Dependabot alerts: ${N}"
[ "$N" -eq 0 ] && { echo "Nothing to triage."; exit 0; }

echo
echo "=== Alerts collapsed by package (severity | pkg | vulnerable range | first patched | scope | manifest) ==="
jq -r '.[] | [.number, .security_advisory.severity, .dependency.package.name,
              .security_vulnerability.vulnerable_version_range,
              (.security_vulnerability.first_patched_version.identifier // "NONE"),
              .dependency.scope, .dependency.manifest_path] | @tsv' <<<"$ALERTS" \
  | sort -t$'\t' -k3,3 -k2,2 | column -t -s$'\t'

echo
echo "=== Advisory summaries (number | severity | pkg | GHSA | CVE) ==="
jq -r '.[] | "[\(.number)] \(.security_advisory.severity|ascii_upcase) \(.dependency.package.name)  \(.security_advisory.ghsa_id)  \(.security_advisory.cve_id // "no-cve")\n    \(.security_advisory.summary)"' <<<"$ALERTS"

echo
echo "=== Duplicate check: resolved versions + transitive parents per flagged package ==="
echo "    (A vulnerable range that also covers an OLDER major means an older duplicate"
echo "     copy is what's flagged; the newer patched copy usually already resolves in-tree.)"
for pkg in $(jq -r '.[].dependency.package.name' <<<"$ALERTS" | sort -u); do
  echo
  echo "--- ${pkg} ---"
  esc="$(printf '%s' "$pkg" | sed 's/[.[\*^$()+?{|/@]/\\&/g')"
  if [ -f "$LOCKFILE" ]; then
    echo "resolved versions in ${LOCKFILE}:"
    grep -oE "(^|[ '/])${esc}@[0-9][^:'_() ]*" "$LOCKFILE" 2>/dev/null \
      | grep -oE "${esc}@[0-9][^:'_() ]*" | sort -u | sed 's/^/    /' || echo "    (none found)"
  fi
  echo "parents (pnpm why, first lines):"
  pnpm why "$pkg" 2>/dev/null | grep -vE '^\s*$' | head -15 | sed 's/^/    /' || echo "    (pnpm why failed)"
done

echo
echo "=== Next: classify each package (see SKILL.md step 2) and pick remediation (step 3). ==="
