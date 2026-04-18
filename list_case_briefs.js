import { createClient } from '@supabase/supabase-js';

const url = 'https://nqmydtqztqlmpojueaah.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xbXlkdHF6dHFsbXBvanVlYWFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3MTI0MjMsImV4cCI6MjA3MTI4ODQyM30.no1-c5aL9_WE_Rj899oj-wszhpsyPwmBM1tFQcU17Nk';

const supabase = createClient(url, key);

async function listCaseBriefs() {
  const { data, error } = await supabase
    .from('case_briefs')
    .select('scenario_id, title')
    .order('scenario_id', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Case briefs in database:');
    data.forEach(cb => {
      console.log(`  scenario_id: ${cb.scenario_id}, title: ${cb.title}`);
    });
  }
}

listCaseBriefs();
