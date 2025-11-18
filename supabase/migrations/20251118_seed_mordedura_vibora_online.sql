-- Migration: Seed escenario online — Mordedura de víbora
-- Fecha: 2025-11-18
-- Idempotente: puede ejecutarse repetidamente sin duplicar registros.
-- Instrucciones: Antes de ejecutar, sube los PDFs a Supabase Storage (bucket público) y reemplaza las URLs de ejemplo en la sección "resources".

DO $$
DECLARE
  v_scenario_id INT;
  v_status TEXT := 'Publicado'; -- Cambia a 'Borrador' o 'En construcción: en proceso' si lo prefieres
BEGIN
  -- Buscar escenario por título
  SELECT id INTO v_scenario_id
  FROM public.scenarios
  WHERE title = 'Mordedura de víbora'
  LIMIT 1;

  IF v_scenario_id IS NULL THEN
    -- Intentar insertar (manejo de constraint de status por compatibilidad con migraciones previas)
    BEGIN
      INSERT INTO public.scenarios (
        title,
        summary,
        status,
        mode,
        level,
        difficulty,
        estimated_minutes,
        max_attempts
      ) VALUES (
        'Mordedura de víbora',
        'Escenario online: adulto con mordedura de víbora en miembro inferior. Objetivos: reconocer signos de envenenamiento sistémico, ordenar pruebas y decidir indicación de suero antiofídico.',
        v_status,
        ARRAY['online'],
        'medio',
        'Intermedio',
        20,
        3
      ) RETURNING id INTO v_scenario_id;
    EXCEPTION WHEN check_violation THEN
      -- Fallback si la constraint de status no acepta el valor elegido
      IF SQLERRM LIKE '%scenarios_status_check%' THEN
        INSERT INTO public.scenarios (
          title,
          summary,
          status,
          mode,
          level,
          difficulty,
          estimated_minutes,
          max_attempts
        ) VALUES (
          'Mordedura de víbora',
          'Escenario online: adulto con mordedura de víbora en miembro inferior. Objetivos: reconocer signos de envenenamiento sistémico, ordenar pruebas y decidir indicación de suero antiofídico.',
          'En construcción: en proceso',
          ARRAY['online'],
          'medio',
          'Intermedio',
           20,
           3
        ) RETURNING id INTO v_scenario_id;
      ELSE
        RAISE;
      END IF;
    END;
  ELSE
    -- Actualizar campos relevantes
    BEGIN
      UPDATE public.scenarios
      SET
        summary = 'Escenario online: adulto con mordedura de víbora en miembro inferior. Objetivos: reconocer signos de envenenamiento sistémico, ordenar pruebas y decidir indicación de suero antiofídico.',
        status = v_status,
        mode = ARRAY['online'],
        level = 'medio',
        difficulty = 'Intermedio',
        estimated_minutes = 20,
        max_attempts = 3
      WHERE id = v_scenario_id;
    EXCEPTION WHEN check_violation THEN
      IF SQLERRM LIKE '%scenarios_status_check%' THEN
        UPDATE public.scenarios
        SET
          summary = 'Escenario online: adulto con mordedura de víbora en miembro inferior. Objetivos: reconocer signos de envenenamiento sistémico, ordenar pruebas y decidir indicación de suero antiofídico.',
          status = 'En construcción: en proceso',
          mode = ARRAY['online'],
          level = 'medio',
          difficulty = 'Intermedio',
          estimated_minutes = 20,
          max_attempts = 3
        WHERE id = v_scenario_id;
      ELSE
        RAISE;
      END IF;
    END;
  END IF;

  -- Si existe la tabla public.scenario_resources, insertar bibliografía (solo si no existe ya)
  IF to_regclass('public.scenario_resources') IS NOT NULL THEN
    -- Reemplaza las URLs con las de tu bucket público en Supabase Storage antes de correr la migración
    INSERT INTO public.scenario_resources (scenario_id, label, url, kind, created_at)
    SELECT v_scenario_id, 'Suero antiofídico — Red Antídotos (ViperaTAb)', 'https://<your-project>.supabase.co/storage/v1/object/public/public/Suero-antiofidico-ViperaTAb_Red-Antidotos_2025-1.pdf', 'pdf', now()
    WHERE NOT EXISTS (
      SELECT 1 FROM public.scenario_resources sr WHERE sr.scenario_id = v_scenario_id AND sr.url = 'https://<your-project>.supabase.co/storage/v1/object/public/public/Suero-antiofidico-ViperaTAb_Red-Antidotos_2025-1.pdf'
    );

    INSERT INTO public.scenario_resources (scenario_id, label, url, kind, created_at)
    SELECT v_scenario_id, 'Suero antiofídico — Viperfav (Red Antídotos)', 'https://<your-project>.supabase.co/storage/v1/object/public/public/Suero-antiofidico-Viperfav_Red-Antidotos_2025-1.pdf', 'pdf', now()
    WHERE NOT EXISTS (
      SELECT 1 FROM public.scenario_resources sr WHERE sr.scenario_id = v_scenario_id AND sr.url = 'https://<your-project>.supabase.co/storage/v1/object/public/public/Suero-antiofidico-Viperfav_Red-Antidotos_2025-1.pdf'
    );
  END IF;

  RAISE NOTICE 'Seed aplicado para escenario "Mordedura de víbora" (scenario_id=%). Reemplaza las URLs de resources si es necesario.', v_scenario_id;
END $$;

-- NOTAS:
-- 1) Si tu proyecto no tiene la tabla `public.scenario_resources`, puedes crearla manualmente con un esquema simple:
--
-- CREATE TABLE public.scenario_resources (
--   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
--   scenario_id int NOT NULL REFERENCES public.scenarios(id) ON DELETE CASCADE,
--   label text NOT NULL,
--   url text NOT NULL,
--   kind text,
--   created_at timestamptz DEFAULT now()
-- );
--
-- 2) Sube los PDFs a Supabase Storage (bucket público) y reemplaza las URLs en este archivo antes de ejecutar la migración.
-- 3) Si prefieres que deje el escenario en estado 'Borrador' o con otro `mode` (p.ej. dual), cambia la variable `v_status` y `mode` arriba.
