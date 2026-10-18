from playwright.sync_api import sync_playwright

path = 'assets/js/main.js'

lines = open(path, 'r', encoding='utf-8').read().splitlines()

p = sync_playwright().start()
b = p.chromium.launch(headless=True)
page = b.new_page()
chunk = 200
start = 0
while start < len(lines):
    end = min(start + chunk, len(lines))
    txt = '\n'.join(lines[start:end])
    try:
        page.evaluate('new Function(' + repr(txt) + ')')
        print('OK', start + 1, end)
    except Exception as e:
        print('FAIL', start + 1, end, type(e).__name__, e)
        break
    start = end
b.close()
p.stop()
