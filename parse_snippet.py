import esprima
from pathlib import Path
p = Path(r'c:\Users\randeep\Downloads\NEXORA 5.3\NEXORA\assets\js\main.js')
text = p.read_text(encoding='utf-8')
for start in [1668,1678,1680,1684,1686,1688]:
    end = start + 30
    snippet = '\n'.join(text.splitlines()[start-1:end-1])
    print('---SNIP', start, end)
    print(repr(snippet[:800]))
    try:
        esprima.parseScript(snippet)
        print('PARSED')
    except Exception as e:
        print('ERR', type(e).__name__, e)
