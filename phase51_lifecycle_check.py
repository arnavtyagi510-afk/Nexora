#!/usr/bin/env python3
"""Phase 5.1 smoke checks for the recruiter listing expiry lifecycle."""

from pathlib import Path

root = Path(__file__).resolve().parent.parent
main_js = (root / "assets" / "js" / "main.js").read_text(encoding="utf-8")
index_html = (root / "index.html").read_text(encoding="utf-8")
required = [
    "RECRUITER_REVIEW_WINDOW_MS",
    "Expired",
    "Needs Review",
    "Reconfirm Vacancy",
    "review_required",
    "15-day review",
]
missing = [item for item in required if item not in main_js and item not in index_html]
if missing:
    print("FAIL: missing Phase 5.1 vacancy lifecycle markers: " + ", ".join(missing))
    raise SystemExit(1)

print("PASS: Phase 5.1 vacancy lifecycle markers are present.")
