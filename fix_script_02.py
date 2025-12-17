#!/usr/bin/env python3
import re

# Leer el archivo
with open('/Users/ivanmaray/Desktop/SIMUPED_web/escenarios_sql/02_parada_cardiorrespiratoria.sql', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Convertir hints de ARRAY a jsonb (segunda ocurrencia de ARRAY en cada question)
def convert_hints(match):
    full = match.group(0)
    # Buscar el segundo ARRAY (hints)
    parts = full.split('ARRAY[')
    if len(parts) >= 3:  # roles ARRAY + hints ARRAY
        # El tercer elemento es hints
        hints_part = 'ARRAY[' + parts[2]
        # Extraer el contenido del ARRAY
        hints_match = re.search(r"ARRAY\[(.*?)\],\s*(\d+)\s*\);", hints_part, re.DOTALL)
        if hints_match:
            hints_content = hints_match.group(1)
            time_limit = hints_match.group(2)
            # Convertir a jsonb
            jsonb_hints = hints_content.replace("'", '"')
            new_hints = f'\'[{jsonb_hints}]\'::jsonb,\n  {time_limit}\n);'
            # Reconstruir
            return full.replace(hints_match.group(0), new_hints)
    return full

# Buscar todos los INSERT INTO questions y convertir hints
pattern = r'INSERT INTO questions.*?;'
content = re.sub(pattern, convert_hints, content, flags=re.DOTALL)

# 2. Convertir objectives, critical_actions, red_flags, competencies a jsonb
# Buscar las líneas que empiezan con '  ["xxx"' y añadir ::jsonb al final antes de la coma
content = re.sub(
    r"^  (\[\".*?\"\])(,)$",
    r"  \1'::jsonb\2",
    content,
    flags=re.MULTILINE
)

# 3. Corregir case_resources VALUES - necesita source, year, free_access
# Esto es más complejo, lo haremos manualmente después

# Escribir el archivo modificado
with open('/Users/ivanmaray/Desktop/SIMUPED_web/escenarios_sql/02_parada_cardiorrespiratoria.sql', 'w', encoding='utf-8') as f:
    f.write(content)

print("Archivo corregido")
