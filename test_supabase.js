import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient('https://nqmydtqztqlmpojueaah.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xbXlkdHF6dHFsbXBvanVlYWFoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTcxMjQyMywiZXhwIjoyMDcxMjg4NDIzfQ.SMMbLpUFRw4RIN3cuqkuBep3j1_Y9WTzNpFzKoCWJoU');

async function getSchema() {
  try {
    // Try to query information_schema.tables
    const { data, error } = await supabase.rpc('execute_sql', { sql: 'SELECT table_name FROM information_schema.tables WHERE table_schema = \'public\';' });

    if (error) {
      console.log('Error:', error);
      return;
    }

    console.log('Tables:', data);
  } catch (err) {
    console.log('Error:', err);
  }
}

getSchema();