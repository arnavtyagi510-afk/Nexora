#!/usr/bin/env python3
"""Phase 6.1 smoke checks for GitHub profile and repository portfolio integration."""

from pathlib import Path

root = Path(__file__).resolve().parent.parent
main_js = (root / "assets" / "js" / "main.js").read_text(encoding="utf-8")
index_html = (root / "index.html").read_text(encoding="utf-8")
required = [
    "githubRepositories",
    "isGitHubProfileUrl",
    "isGitHubRepositoryUrl",
    "student-profile-github",
    "student-github-repository-url",
    "fetchGitHubRepositoryMetadata",
    "GitHub portfolio",
    "Repository URL"
]
missing = [item for item in required if item not in main_js and item not in index_html]
if missing:
    print("FAIL: missing Phase 6.1 GitHub portfolio markers: " + ", ".join(missing))
    raise SystemExit(1)
print("PASS: Phase 6.1 GitHub portfolio markers are present.")
