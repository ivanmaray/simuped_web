#!/usr/bin/env python3
"""
Script para extraer TODO el SQL de un escenario de Supabase
Genera: case_brief, steps, questions, case_resources

Uso:
  python3 dump_scenario.py <scenario_id>
  
Ejemplo:
  python3 dump_scenario.py 57
"""

import sys
import json
from supabase import create_client, Client

# Configurar credenciales (usa variables de entorno o hardcode)
SUPABASE_URL = "https://your-project.supabase.co"
SUPABASE_KEY = "your-anon-key"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def escape_sql(value):
    """Escapa valores para SQL"""
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, dict) or isinstance(value, list):
        json_str = json.dumps(value)
        return f"'{json_str.replace(chr(39), chr(39)*2)}'::jsonb"
    return f"'{str(value).replace(chr(39), chr(39)*2)}'"

def dump_scenario(scenario_id):
    print(f"\n-- ==============================================================================")
    print(f"-- EXTRACCIÓN COMPLETA ESCENARIO ID {scenario_id}")
    print(f"-- ==============================================================================\n")
    
    # 1. CASE BRIEF
    print("-- PASO 1: CASE BRIEF")
    print("-- ==============================================================================\n")
    
    try:
        cb_response = supabase.table('case_briefs').select('*').eq('scenario_id', scenario_id).execute()
        case_brief = cb_response.data[0] if cb_response.data else None
        
        if not case_brief:
            print(f"❌ No se encontró case_brief para scenario_id {scenario_id}\n")
            return
        
        print(f"DELETE FROM case_briefs WHERE scenario_id = {scenario_id};\n")
        print("INSERT INTO case_briefs (")
        print("  scenario_id,")
        print("  title,")
        print("  context,")
        print("  chief_complaint,")
        print("  history,")
        print("  exam,")
        print("  vitals,")
        print("  quick_labs,")
        print("  objectives,")
        print("  critical_actions,")
        print("  red_flags,")
        print("  competencies,")
        print("  triangle")
        print(") VALUES (")
        print(f"  {case_brief['scenario_id']},")
        print(f"  {escape_sql(case_brief['title'])},")
        print(f"  {escape_sql(case_brief['context'])},")
        print(f"  {escape_sql(case_brief['chief_complaint'])},")
        print(f"  {escape_sql(case_brief['history'])},")
        print(f"  {escape_sql(case_brief['exam'])},")
        print(f"  {escape_sql(case_brief['vitals'])},")
        print(f"  {escape_sql(case_brief['quick_labs'])},")
        print(f"  {escape_sql(case_brief['objectives'])},")
        print(f"  {escape_sql(case_brief['critical_actions'])},")
        print(f"  {escape_sql(case_brief['red_flags'])},")
        print(f"  {escape_sql(case_brief['competencies'])},")
        print(f"  {escape_sql(case_brief['triangle'])}")
        print(");\n")
        
    except Exception as e:
        print(f"❌ Error obteniendo case_brief: {e}\n")
        return
    
    # 2. STEPS
    print("-- PASO 2: STEPS")
    print("-- ==============================================================================\n")
    
    try:
        steps_response = supabase.table('steps').select('*').eq('scenario_id', scenario_id).order('step_order').execute()
        steps = steps_response.data or []
        
        if not steps:
            print(f"❌ No se encontraron steps para scenario_id {scenario_id}\n")
            return
        
        for step in steps:
            print("INSERT INTO steps (scenario_id, step_order, narrative, description, role_specific)")
            print("VALUES (")
            print(f"  {step['scenario_id']},")
            print(f"  {step['step_order']},")
            print(f"  {escape_sql(step['narrative'])},")
            print(f"  {escape_sql(step['description'])},")
            print(f"  {'true' if step['role_specific'] else 'false'}")
            print(");\n")
    
    except Exception as e:
        print(f"❌ Error obteniendo steps: {e}\n")
        return
    
    # 3. QUESTIONS
    print("-- PASO 3: QUESTIONS")
    print("-- ==============================================================================\n")
    
    try:
        step_ids = [s['id'] for s in steps]
        
        print(f"DELETE FROM attempt_answers WHERE question_id IN (SELECT q.id FROM questions q JOIN steps s ON s.id = q.step_id WHERE s.scenario_id = {scenario_id});")
        print(f"DELETE FROM questions WHERE step_id IN (SELECT id FROM steps WHERE scenario_id = {scenario_id});\n")
        
        questions_response = supabase.table('questions').select('*').in_('step_id', step_ids).order('step_id').execute()
        questions = questions_response.data or []
        
        if not questions:
            print(f"-- No hay preguntas para este escenario\n")
        else:
            print("INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale) VALUES")
            
            for idx, q in enumerate(questions):
                roles_array = q.get('roles', [])
                if isinstance(roles_array, str):
                    roles_array = [roles_array]
                roles_list = [f"'{r}'" for r in roles_array]
                roles_sql = f"ARRAY[{', '.join(roles_list)}]"
                
                print(f"({q['step_id']}, {escape_sql(q['question_text'])}, {escape_sql(q['options'])}, {q['correct_option']}, {escape_sql(q['explanation'])}, {roles_sql}, {'true' if q.get('is_critical') else 'false'}, {escape_sql(q.get('hints'))}, {q.get('time_limit', 90)}, {escape_sql(q.get('critical_rationale')) if q.get('critical_rationale') else 'null'}){'' if idx == len(questions)-1 else ','}")
            
            print(";\n")
    
    except Exception as e:
        print(f"⚠️  Error obteniendo questions: {e}\n")
    
    # 4. RESOURCES
    print("-- PASO 4: CASE RESOURCES")
    print("-- ==============================================================================\n")
    
    try:
        resources_response = supabase.table('case_resources').select('*').eq('scenario_id', scenario_id).order('resource_order').execute()
        resources = resources_response.data or []
        
        if not resources:
            print(f"-- No hay case_resources para este escenario\n")
        else:
            print(f"DELETE FROM case_resources WHERE scenario_id = {scenario_id};\n")
            print("INSERT INTO case_resources (scenario_id, resource_order, resource_type, title, url, description) VALUES")
            
            for idx, r in enumerate(resources):
                print(f"({r['scenario_id']}, {r['resource_order']}, {escape_sql(r['resource_type'])}, {escape_sql(r['title'])}, {escape_sql(r['url'])}, {escape_sql(r['description'])}){'' if idx == len(resources)-1 else ','}")
            
            print(";\n")
    
    except Exception as e:
        print(f"⚠️  Error obteniendo resources: {e}\n")
    
    print(f"-- ==============================================================================")
    print(f"-- FIN EXTRACCIÓN ESCENARIO {scenario_id}")
    print(f"-- ==============================================================================\n")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("❌ Uso: python3 dump_scenario.py <scenario_id>")
        sys.exit(1)
    
    try:
        scenario_id = int(sys.argv[1])
        dump_scenario(scenario_id)
    except ValueError:
        print("❌ scenario_id debe ser un número")
        sys.exit(1)
