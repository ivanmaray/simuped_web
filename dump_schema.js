import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: 'postgresql://postgres:eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xbXlkdHF6dHFsbXBvanVlYWFoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTcxMjQyMywiZXhwIjoyMDcxMjg4NDIzfQ.SMMbLpUFRw4RIN3cuqkuBep3j1_Y9WTzNpFzKoCWJoU@db.nqmydtqztqlmpojueaah.supabase.co:5432/postgres'
});

async function dumpSchema() {
  try {
    await client.connect();
    console.log('Connected to Supabase.');

    // Get all tables in public schema
    const tablesRes = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    let schema = '';

    for (const row of tablesRes.rows) {
      const tableName = row.table_name;
      schema += `\n-- Table: ${tableName}\n`;

      // Get columns
      const columnsRes = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position;
      `, [tableName]);

      schema += `CREATE TABLE public.${tableName} (\n`;
      const cols = columnsRes.rows.map(col =>
        `  ${col.column_name} ${col.data_type}${col.is_nullable === 'NO' ? ' NOT NULL' : ''}${col.column_default ? ` DEFAULT ${col.column_default}` : ''}`
      );
      schema += cols.join(',\n');
      schema += '\n);\n';

      // Get indexes
      const indexesRes = await client.query(`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE schemaname = 'public' AND tablename = $1;
      `, [tableName]);

      for (const idx of indexesRes.rows) {
        schema += `${idx.indexdef};\n`;
      }

      // Get policies (RLS)
      const policiesRes = await client.query(`
        SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
        FROM pg_policies
        WHERE schemaname = 'public' AND tablename = $1;
      `, [tableName]);

      for (const pol of policiesRes.rows) {
        schema += `CREATE POLICY ${pol.policyname} ON public.${pol.tablename} FOR ${pol.cmd} USING (${pol.qual});\n`;
      }
    }

    // Get views
    const viewsRes = await client.query(`
      SELECT table_name, view_definition
      FROM information_schema.views
      WHERE table_schema = 'public';
    `);

    for (const view of viewsRes.rows) {
      schema += `\n-- View: ${view.table_name}\n${view.view_definition};\n`;
    }

    // Get functions
    const funcsRes = await client.query(`
      SELECT routine_name, routine_definition
      FROM information_schema.routines
      WHERE routine_schema = 'public' AND routine_type = 'FUNCTION';
    `);

    for (const func of funcsRes.rows) {
      schema += `\n-- Function: ${func.routine_name}\n${func.routine_definition};\n`;
    }

    // Write to file
    const fs = await import('fs');
    fs.writeFileSync('schema_dump.sql', schema);
    console.log('Schema dumped to schema_dump.sql');

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

dumpSchema();