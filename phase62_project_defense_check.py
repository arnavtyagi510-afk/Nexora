#!/usr/bin/env python3
"""Phase 6.2 smoke checks for the project defense flow."""

from pathlib import Path

root = Path(__file__).resolve().parent.parent
main_js = (root / "assets" / "js" / "main.js").read_text(encoding="utf-8")
index_html = (root / "index.html").read_text(encoding="utf-8")
required = [
    "Project Defense",
    "student-defense-view",
    "buildDefenseQuestions",
    "saveDefenseAnswer",
    "finishStudentDefense",
    "startStudentDefense",
    "Project purpose and problem solved",
    "Architecture",
    "Debugging",
    "shareWithRecruiters",
]
missing = [item for item in required if item not in main_js and item not in index_html]
if missing:
    print("FAIL: missing Phase 6.2 defense markers: " + ", ".join(missing))
    raise SystemExit(1)
print("PASS: Phase 6.2 project defense markers are present.")
