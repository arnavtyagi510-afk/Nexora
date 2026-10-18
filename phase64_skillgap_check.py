#!/usr/bin/env python3
"""Phase 6.4 smoke checks for the skill-gap and recommendation UI."""

from pathlib import Path

root = Path(__file__).resolve().parent.parent
main_js = (root / "assets" / "js" / "main.js").read_text(encoding="utf-8")
index_html = (root / "index.html").read_text(encoding="utf-8")
required = [
    "Partially Matched Skills",
    "Indicative skills-match score",
    "skill-gap-partial",
    "skillGapPartialMatch",
    "skill-gap-readiness",
    "recommendation-formula",
]
missing = [item for item in required if item not in main_js and item not in index_html]
if missing:
    print("FAIL: missing Phase 6.4 skill-gap markers: " + ", ".join(missing))
    raise SystemExit(1)
print("PASS: Phase 6.4 skill-gap and recommendation markers are present.")
