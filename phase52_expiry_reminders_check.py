#!/usr/bin/env python3
"""Smoke checks for the Phase 5.2 vacancy expiry reminder work."""

from pathlib import Path

root = Path(__file__).resolve().parent.parent
main_js = (root / "assets" / "js" / "main.js").read_text(encoding="utf-8")
index_html = (root / "index.html").read_text(encoding="utf-8")
required = [
    "recruiter-expiry-reminder",
    "recruiter-reminder-list",
    "dismissRecruiterReminder",
    "expiryDate",
    "daysRemaining",
    "Final 3 days before expiry",
]
missing = [item for item in required if item not in main_js and item not in index_html]
if missing:
    print("FAIL: missing Phase 5.2 reminder markers: " + ", ".join(missing))
    raise SystemExit(1)

print("PASS: Phase 5.2 expiry reminder markers are present.")
