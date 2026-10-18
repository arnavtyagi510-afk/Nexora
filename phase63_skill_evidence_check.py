#!/usr/bin/env python3
"""Phase 6.3 smoke checks for student skill evidence and verification."""

from pathlib import Path

root = Path(__file__).resolve().parent.parent
main_js = (root / "assets" / "js" / "main.js").read_text(encoding="utf-8")
index_html = (root / "index.html").read_text(encoding="utf-8")
required = [
    "Self-Reported",
    "Evidence Submitted",
    "Under Review",
    "Verified",
    "Rejected / More Evidence Needed",
    "student-skill-evidence",
    "verificationStatus",
    "renderSkillEvidenceReviewQueue",
]
missing = [item for item in required if item not in main_js and item not in index_html]
if missing:
    print("FAIL: missing Phase 6.3 evidence and verification markers: " + ", ".join(missing))
    raise SystemExit(1)
print("PASS: Phase 6.3 evidence and verification markers are present.")
