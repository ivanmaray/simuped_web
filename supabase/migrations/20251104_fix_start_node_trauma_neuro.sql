-- Migration: Fix start_node for trauma-neuro-guard
-- Fecha: 2025-11-04

DO $$
DECLARE
  v_case_id UUID;
  v_info_id UUID;
BEGIN
  SELECT id INTO v_case_id FROM public.micro_cases WHERE slug = 'trauma-neuro-guard' LIMIT 1;
  IF v_case_id IS NULL THEN
    RAISE NOTICE 'micro_case with slug trauma-neuro-guard not found; skipping';
    RETURN;
  END IF;

  SELECT id INTO v_info_id
  FROM public.micro_case_nodes
  WHERE case_id = v_case_id
    AND (metadata->>'roles_source') = 'interactiveTrainingData_v1'
  LIMIT 1;

  IF v_info_id IS NULL THEN
    RAISE NOTICE 'info node with roles_source interactiveTrainingData_v1 not found for case %; skipping', v_case_id;
    RETURN;
  END IF;

  UPDATE public.micro_cases
  SET start_node_id = v_info_id,
      updated_at = now()
  WHERE id = v_case_id;

  RAISE NOTICE 'micro_case % start_node_id set to info node %', v_case_id, v_info_id;
END $$;
