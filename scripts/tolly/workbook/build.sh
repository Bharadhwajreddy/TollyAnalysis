#!/usr/bin/env bash
# Tolly Index workbook: export the data, build every sheet as live formulas, recalculate in
# LibreOffice, make Excel recalculate on open, and check the workbook matches the app.
# The workbook holds IMDb numbers (personal, non-commercial use): it goes to the gitignored cache.
#
# Needs: npm run tolly:compute first; python3 with openpyxl; LibreOffice (soffice).
# Usage: npm run tolly:workbook            → .cache/tolly/Tolly_Index_Workbook.xlsx
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
OUT=".cache/tolly/Tolly_Index_Workbook.xlsx"
npx tsx "$HERE/export-bundle.mts"
python3 "$HERE/build_xlsx.py" .cache/tolly/workbook-bundle.json "$OUT"
python3 "$HERE/recalc.py" "$OUT" 900
python3 "$HERE/fix_xlsx.py" "$OUT"
python3 - "$OUT" <<'EOF'
import sys, warnings
warnings.filterwarnings("ignore")
from openpyxl import load_workbook
ws = load_workbook(sys.argv[1], data_only=True)["Start Here"]
checks = {ws.cell(r, 2).value: ws.cell(r, 3).value for r in range(1, ws.max_row + 1) if str(ws.cell(r, 2).value or "").endswith("≠ the app")}
print("checks:", checks)
bad = [k for k, v in checks.items() if v != 0]
sys.exit(f"workbook differs from the app: {bad}" if bad or not checks else 0)
EOF
echo "workbook ready: $OUT"
