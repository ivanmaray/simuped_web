#!/usr/bin/env node

/**
 * Script para extraer todo el SQL de un escenario (scenario_id)
 * Genera INSERT completos para: case_brief, steps, questions y case_resources
 * Uso: node dump_scenario_sql.js <scenario_id>
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'your-key';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function escapeSQL(str) {
  if (str === null || str === undefined) return 'null';
  if (typeof str === 'object') {
    return `'${JSON.stringify(str).replace(/'/g, "''")}'::jsonb`;
  }
  return `'${String(str).replace(/'/g, "''")}'`;
}

async function dumpScenario(scenarioId) {
  console.log(`\n-- ==============================================================================`);
  console.log(`-- EXTRACCIÓN COMPLETA ESCENARIO ID ${scenarioId}`);
  console.log(`-- ==============================================================================\n`);

  try {
    // 1. Obtener case_brief
    console.log(`-- PASO 1: CASE BRIEF`);
    console.log(`-- ==============================================================================\n`);
    
    const { data: caseBrief, error: cbError } = await supabase
      .from('case_briefs')
      .select('*')
      .eq('scenario_id', scenarioId)
      .single();

    if (cbError || !caseBrief) {
      console.error(`❌ No se encontró case_brief para scenario_id ${scenarioId}`);
      return;
    }

    console.log(generateCaseBriefInsert(caseBrief));

    // 2. Obtener steps
    console.log(`\n-- PASO 2: STEPS`);
    console.log(`-- ==============================================================================\n`);
    
    const { data: steps, error: stepsError } = await supabase
      .from('steps')
      .select('*')
      .eq('scenario_id', scenarioId)
      .order('step_order', { ascending: true });

    if (stepsError || !steps || steps.length === 0) {
      console.error(`❌ No se encontraron steps para scenario_id ${scenarioId}`);
      return;
    }

    for (const step of steps) {
      console.log(generateStepInsert(step));
    }

    // 3. Obtener questions
    console.log(`\n-- PASO 3: QUESTIONS`);
    console.log(`-- ==============================================================================\n`);
    
    const stepIds = steps.map(s => s.id);
    const { data: questions, error: qError } = await supabase
      .from('questions')
      .select('*')
      .in('step_id', stepIds)
      .order('step_id', { ascending: true });

    if (qError || !questions || questions.length === 0) {
      console.warn(`⚠️  No se encontraron preguntas para este escenario`);
    } else {
      console.log(generateQuestionsInsert(questions));
    }

    // 4. Obtener case_resources
    console.log(`\n-- PASO 4: CASE RESOURCES`);
    console.log(`-- ==============================================================================\n`);
    
    const { data: resources, error: rError } = await supabase
      .from('case_resources')
      .select('*')
      .eq('scenario_id', scenarioId)
      .order('resource_order', { ascending: true });

    if (rError) {
      console.warn(`⚠️  No se encontraron resources: ${rError.message}`);
    } else if (resources && resources.length > 0) {
      console.log(generateResourcesInsert(resources));
    } else {
      console.log(`-- No hay case_resources definidos para este escenario\n`);
    }

    console.log(`\n-- ==============================================================================`);
    console.log(`-- FIN EXTRACCIÓN ESCENARIO ${scenarioId}`);
    console.log(`-- ==============================================================================\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

function generateCaseBriefInsert(cb) {
  return `DELETE FROM case_briefs WHERE scenario_id = ${cb.scenario_id};

INSERT INTO case_briefs (
  scenario_id,
  title,
  context,
  chief_complaint,
  history,
  exam,
  vitals,
  quick_labs,
  objectives,
  critical_actions,
  red_flags,
  competencies,
  triangle
) VALUES (
  ${cb.scenario_id},
  ${escapeSQL(cb.title)},
  ${escapeSQL(cb.context)},
  ${escapeSQL(cb.chief_complaint)},
  ${escapeSQL(cb.history)},
  ${escapeSQL(cb.exam)},
  ${escapeSQL(cb.vitals)},
  ${escapeSQL(cb.quick_labs)},
  ${escapeSQL(cb.objectives)},
  ${escapeSQL(cb.critical_actions)},
  ${escapeSQL(cb.red_flags)},
  ${escapeSQL(cb.competencies)},
  ${escapeSQL(cb.triangle)}
);\n`;
}

function generateStepInsert(step) {
  return `INSERT INTO steps (scenario_id, step_order, narrative, description, role_specific)
VALUES (
  ${step.scenario_id},
  ${step.step_order},
  ${escapeSQL(step.narrative)},
  ${escapeSQL(step.description)},
  ${step.role_specific ? 'true' : 'false'}
);\n`;
}

function generateQuestionsInsert(questions) {
  let sql = `DELETE FROM attempt_answers WHERE question_id IN (SELECT q.id FROM questions q JOIN steps s ON s.id = q.step_id WHERE s.scenario_id = ${questions[0]?.step_id ? 'X' : 'NULL'});
DELETE FROM questions WHERE step_id IN (SELECT id FROM steps WHERE scenario_id = ${questions[0]?.step_id ? 'X' : 'NULL'});

INSERT INTO questions (step_id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale) VALUES\n`;

  sql += questions.map((q, idx) => {
    const rolesArray = Array.isArray(q.roles) ? q.roles : [q.roles];
    const rolesSQL = `ARRAY[${rolesArray.map(r => `'${r}'`).join(', ')}]`;
    
    return `(${q.step_id}, ${escapeSQL(q.question_text)}, ${escapeSQL(q.options)}, ${q.correct_option}, ${escapeSQL(q.explanation)}, ${rolesSQL}, ${q.is_critical ? 'true' : 'false'}, ${escapeSQL(q.hints)}, ${q.time_limit || 90}, ${q.critical_rationale ? escapeSQL(q.critical_rationale) : 'null'})${idx < questions.length - 1 ? ',' : ';'}`;
  }).join('\n');

  return sql + '\n';
}

function generateResourcesInsert(resources) {
  let sql = `DELETE FROM case_resources WHERE scenario_id = ${resources[0].scenario_id};

INSERT INTO case_resources (scenario_id, resource_order, resource_type, title, url, description) VALUES\n`;

  sql += resources.map((r, idx) => {
    return `(${r.scenario_id}, ${r.resource_order}, '${r.resource_type}', ${escapeSQL(r.title)}, ${escapeSQL(r.url)}, ${escapeSQL(r.description)})${idx < resources.length - 1 ? ',' : ';'}`;
  }).join('\n');

  return sql + '\n';
}

// Main
const scenarioId = process.argv[2];
if (!scenarioId) {
  console.error('❌ Uso: node dump_scenario_sql.js <scenario_id>');
  process.exit(1);
}

dumpScenario(parseInt(scenarioId));
