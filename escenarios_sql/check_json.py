import re
import json

with open('02_parada_cardiorrespiratoria.sql', 'r') as f:
    content = f.read()

hints = re.findall(r"hints,\s*'([^']*)'::jsonb", content)
for i, hint in enumerate(hints):
    try:
        json.loads(hint)
        print(f'Hint {i+1}: OK')
    except json.JSONDecodeError as e:
        print(f'Hint {i+1}: ERROR - {e}')
        print(f'  Content: {hint}')