/* ================================================================
   PODPAHH — Supabase Client Helpers (server-side)
   Adaptación a Express/CommonJS del patrón utils/supabase de Next.js
   - createServerClient(): usa la SECRET KEY (solo servidor, ignora RLS)
   - createPublicClient(): usa la ANON key (respeta políticas RLS)
   ================================================================ */
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

let serverClient = null;
let publicClient = null;

function requireEnv() {
  if (!SUPABASE_URL) {
    throw new Error('Falta SUPABASE_URL en .env');
  }
}

/**
 * Cliente con la SECRET KEY. Úsalo ÚNICAMENTE en el servidor
 * para operaciones administrativas (migraciones, import, RLS bypass).
 */
function createServerClient() {
  requireEnv();
  if (!SUPABASE_SECRET_KEY) {
    throw new Error('Falta SUPABASE_SECRET_KEY en .env (solo servidor, no exponer)');
  }
  if (!serverClient) {
    serverClient = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: { 'x-application-name': 'podpahh-server' },
      },
    });
  }
  return serverClient;
}

/**
 * Cliente con la ANON key. Respeta RLS. Para lectura pública
 * y operaciones del lado del navegador cuando se habilite.
 */
function createPublicClient() {
  requireEnv();
  if (!SUPABASE_ANON_KEY) {
    throw new Error('Falta SUPABASE_ANON_KEY en .env');
  }
  if (!publicClient) {
    publicClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return publicClient;
}

/**
 * Diagnóstico de conexión: verifica URL y listado de tablas.
 * Devuelve estado útil para /api/health y el painel admin.
 */
async function diagnose() {
  requireEnv();
  const results = { url: SUPABASE_URL, reachable: false, tables: null, error: null };
  try {
    const client = createServerClient();
    // SELECT 1 contra el schema para validar autenticación/red
    const { data, error } = await client
      .from('pg_catalog.pg_tables')
      .select('schemaname, tablename')
      .limit(25);
    if (error) {
      // pg_catalog puede no estar expuesto via PostgREST; probar health REST
      results.error = error.message;
    } else {
      results.tables = data;
    }
    results.reachable = true;
  } catch (err) {
    results.error = err.message;
  }
  return results;
}

module.exports = {
  createServerClient,
  createPublicClient,
  diagnose,
};