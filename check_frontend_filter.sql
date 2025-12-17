-- Verificar si hay filtros adicionales en el frontend
-- Buscar en el código cómo se filtran las preguntas
grep -r "roles.*null\|roles.*filter\|isVisibleForRole" src/ --include="*.jsx" --include="*.js" | head -10
