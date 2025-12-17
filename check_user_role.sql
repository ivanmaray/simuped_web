-- Verificar qué userRole tiene el usuario en la app
-- Buscar en el código cómo se determina userRole
grep -r "userRole\|user_role" src/ --include="*.jsx" --include="*.js" | grep -v "node_modules" | head -5
