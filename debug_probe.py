from playwright.sync_api import sync_playwright
import os

files = ['assets/js/data.js', 'assets/js/jobs.js', 'assets/js/applications.js', 'assets/js/main.js']
p = sync_playwright().start()
b = p.chromium.launch(headless=True)
page = b.new_page(viewport={'width': 1280, 'height': 900})
for path in files:
    with open(path, 'r', encoding='utf-8') as f:
        code = f.read()
    try:
        page.evaluate("new Function(" + repr(code) + ")")
        print(path, 'PARSED')
    except Exception as e:
        print(path, 'ERROR', type(e).__name__, e)
        raise
b.close(); p.stop()
