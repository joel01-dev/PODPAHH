/* Teste de conexão Supabase (executa: node scripts/test-supabase.js) */
const path = require('path');
const fs = require('fs');

// Carrega .env (mesmo parser do server)
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const m = t.match(/^([A-Za-z0-9_]+)\s*=\s*(.*)$/);
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const sb = require('../server/supabase');

(async () => {
  console.log('SUPABASE_URL      =', process.env.SUPABASE_URL);
  console.log('SECRET key set    =', !!process.env.SUPABASE_SECRET_KEY);
  console.log('ANON key set      =', !!process.env.SUPABASE_ANON_KEY);

  const client = sb.createServerClient();
  console.log('Server client OK  =', !!client);

  try {
    const { data, error } = await client.from('products').select('id').limit(3);
    console.log('\n-- SELECT from "products" --');
    console.log('error:', error ? error.message : 'none');
    console.log('data :', JSON.stringify(data));
  } catch (e) {
    console.log('\nEXCEPTION:', e.message);
  }

  console.log('\n-- diagnose() --');
  const diag = await sb.diagnose();
  console.log(JSON.stringify(diag, null, 2));
})();