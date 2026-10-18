#!/usr/bin/env python3
"""Minimal smoke test for the Phase 5.4 applicant/recruiter status update work."""

from pathlib import Path
import sys

root = Path(__file__).resolve().parent.parent
main_js = (root / "assets" / "js" / "main.js").read_text(encoding="utf-8")
required = [
    "Under Review",
    "Interview Scheduled",
    "statusHistory",
    "data-recruiter-app-note",
    "recruiter-app-note",
]
missing = [item for item in required if item not in main_js]
if missing:
    print("FAIL: missing Phase 5.4 status/audit features: " + ", ".join(missing))
    raise SystemExit(1)

print("PASS: Phase 5.4 status and audit markers are present.")
