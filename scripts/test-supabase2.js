/* Lista tabelas + testa REST com SECRET e ANON keys via supabase-js */
const path = require('path');
const fs = require('fs');

const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const m = t.match(/^([A-Za-z0-9_]+)\s*=\s*(.*)$/);
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const sb = require('../server/supabase');

(async () => {
  // 1) Secret key: consulta o schema de tabelas do projeto
  const secret = sb.createServerClient();
  console.log('=== SECRET KEY ===');
  try {
    // healthcheck público do Supabase
    const hc = await fetch(process.env.SUPABASE_URL + '/health', { headers: { apikey: process.env.SUPABASE_SECRET_KEY } });
    console.log('POSTGRES health status:', hc.status, await hc.text());
  } catch (e) { console.log('health exc:', e.message); }

  // 2) Tenta listar tabelas via information schema (REST não expõe, mas tentamos)
  for (const tbl of ['products', 'customers', 'orders', 'settings', 'users']) {
    const { data, error } = await secret.from(tbl).select('*').limit(1);
    if (error) console.log(`table "${tbl}": ERRO -> ${error.message}`);
    else console.log(`table "${tbl}": OK -> ${JSON.stringify(data)}`);
  }

  // 3) ANON key igual teste
  const anon = sb.createPublicClient();
  console.log('\n=== ANON KEY ===');
  const { data: ad, error: ae } = await anon.from('products').select('id').limit(1);
  console.log('anon products:', ae ? 'ERRO: ' + ae.message : 'OK ' + JSON.stringify(ad));
})();