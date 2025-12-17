-- SQL para obtener la estructura actual de las tablas en Supabase
-- Ejecuta esta consulta en el SQL Editor de Supabase (Dashboard > SQL Editor)
-- Copia el resultado y pégalo aquí para que lo guarde en un archivo

SELECT
  'Tabla: ' || t.table_name || E'\n' ||
  string_agg(
    '  ' || c.column_name || ' ' || c.data_type ||
    CASE WHEN c.is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
    CASE WHEN c.column_default IS NOT NULL THEN ' DEFAULT ' || c.column_default ELSE '' END,
    E'\n'
  ) || E'\n' as estructura
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name AND t.table_schema = c.table_schema
WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
GROUP BY t.table_name
ORDER BY t.table_name;