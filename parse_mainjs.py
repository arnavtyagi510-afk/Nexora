import esprima
from pathlib import Path

src = Path(r'c:\Users\randeep\Downloads\NEXORA 5.3\NEXORA\assets\js\main.js').read_text(encoding='utf-8')
try:
    esprima.parseScript(src)
    print('PARSED')
except Exception as e:
    import traceback
    traceback.print_exc()
    print(type(e).__name__, e)
    if hasattr(e, 'line_number'):
        print('line', e.line_number, 'col', e.column)
