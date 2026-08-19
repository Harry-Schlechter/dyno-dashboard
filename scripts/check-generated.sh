#!/usr/bin/env bash
# check-generated.sh — guardrail for agent-authored pages under src/pages/generated/.
#
# Fails CI / pre-push if a generated page:
#   - imports anything outside the allow-list (../../components/generated and @mui/material)
#   - calls a React hook (useState / useEffect / useRef / useMemo / useCallback / useContext / useReducer / useLayoutEffect)
#   - references forbidden globals (fetch, localStorage, sessionStorage, document, window)
#   - uses dangerouslySetInnerHTML
#
# Also enforces:
#   - registry.ts has no duplicate slugs
#
# Exit 0 = all clean. Non-zero = at least one violation, with details.

set -o pipefail

GEN_DIR="src/pages/generated"
REGISTRY="${GEN_DIR}/registry.ts"
EXIT=0

red()   { printf '\033[31m%s\033[0m\n' "$*"; }
green() { printf '\033[32m%s\033[0m\n' "$*"; }
yellow(){ printf '\033[33m%s\033[0m\n' "$*"; }

if [[ ! -d "$GEN_DIR" ]]; then
  yellow "no $GEN_DIR — nothing to check"
  exit 0
fi

# Collect generated page files (excluding registry.ts).
# Depth 2 so the demo/ subdirectory is covered too — those pages ship in the
# public demo and must obey the same rules as agent-authored ones.
FILES=$(find "$GEN_DIR" -maxdepth 2 -name '*.tsx' -type f | sort)

count=$(echo "$FILES" | grep -c . || true)
if [[ -z "$FILES" || "$count" -eq 0 ]]; then
  green "no generated pages — clean"
  exit 0
fi

echo "checking $count generated page(s)…"

for f in $FILES; do
  rel="${f#./}"

  # 1. Import allow-list — only @mui/material, @mui/icons-material, react, and
  #    ../../components/generated permitted. Use python to extract the `from`
  #    clause from each (possibly multi-line) import statement.
  bad_imports=$(python3 - "$f" <<'PYEOF'
import re, sys
src = open(sys.argv[1]).read()
# Match: import ... from '<spec>';  (handles multi-line)
allowed = {
    "../../components/generated",
    # Demo pages live one level deeper (generated/demo/), so the barrel is
    # one more ../ away. Same barrel, same guarantees.
    "../../../components/generated",
    "@mui/material",
    "@mui/icons-material",
    "react",
}
violations = []
for m in re.finditer(r"^import[\s\S]*?from\s+['\"]([^'\"]+)['\"]\s*;?", src, re.MULTILINE):
    spec = m.group(1)
    if spec not in allowed:
        violations.append(spec)
for v in violations:
    print(v)
PYEOF
)
  if [[ -n "$bad_imports" ]]; then
    red "✗ $rel: forbidden import(s):"
    echo "$bad_imports" | sed 's/^/    /'
    EXIT=1
  fi

  # 2. No React hooks.
  if grep -nE '\b(useState|useEffect|useRef|useMemo|useCallback|useContext|useReducer|useLayoutEffect|useImperativeHandle)\(' "$f" >/dev/null; then
    red "✗ $rel: uses React hooks (forbidden in generated pages)"
    grep -nE '\b(useState|useEffect|useRef|useMemo|useCallback|useContext|useReducer|useLayoutEffect|useImperativeHandle)\(' "$f" | head -3 | sed 's/^/    /'
    EXIT=1
  fi

  # 3. No global fetch / storage / DOM access.
  if grep -nE '\b(fetch\(|localStorage|sessionStorage|document\.|window\.)' "$f" >/dev/null; then
    red "✗ $rel: uses forbidden globals (fetch / storage / DOM)"
    grep -nE '\b(fetch\(|localStorage|sessionStorage|document\.|window\.)' "$f" | head -3 | sed 's/^/    /'
    EXIT=1
  fi

  # 4. No dangerouslySetInnerHTML.
  if grep -n 'dangerouslySetInnerHTML' "$f" >/dev/null; then
    red "✗ $rel: uses dangerouslySetInnerHTML"
    EXIT=1
  fi
done

# 5. Registry: no duplicate slugs.
if [[ -f "$REGISTRY" ]]; then
  dupes=$(grep -E "^\s*slug:\s*'" "$REGISTRY" | sort | uniq -d)
  if [[ -n "$dupes" ]]; then
    red "✗ $REGISTRY: duplicate slugs"
    echo "$dupes" | sed 's/^/    /'
    EXIT=1
  fi
fi

if [[ $EXIT -eq 0 ]]; then
  green "✓ all generated pages pass guardrails"
else
  red ""
  red "Generated-page guardrails failed. See dashboard.md for the rules."
fi

exit $EXIT
