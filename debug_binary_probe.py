from playwright.sync_api import sync_playwright

path = 'assets/js/main.js'
lines = open(path, 'r', encoding='utf-8').read().splitlines()

p = sync_playwright().start()
b = p.chromium.launch(headless=True)
page = b.new_page()

def parse_range(start, end):
    txt = '\n'.join(lines[start:end])
    page.evaluate('new Function(' + repr(txt) + ')')
    return True

# First, identify a failure region by binary-searching the file.
lo, hi = 0, len(lines)
while lo + 1 < hi:
    mid = (lo + hi) // 2
    try:
        parse_range(0, mid)
        lo = mid
    except Exception:
        hi = mid
print('candidate range', lo, hi)
# Then drill down one line at a time around the first failing region.
for i in range(max(0, lo - 20), min(len(lines), hi + 20)):
    txt = '\n'.join(lines[:i+1])
    try:
        page.evaluate('new Function(' + repr(txt) + ')')
    except Exception as e:
        print('fails at line', i+1, type(e).__name__, e)
        break

b.close(); p.stop()
