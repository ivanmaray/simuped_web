-- Debug: Verificar qué datos llegan al frontend
-- Agregar console.log en Online_Detalle.jsx línea 974 para ver qué preguntas se filtran

-- En el código, después de .filter((q) => isVisibleForRole(q.roles, userRole))
-- Agregar: console.log('Filtered questions:', filteredQuestions.length, 'userRole:', userRole);
