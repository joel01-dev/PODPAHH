/* ================================================================
   PODPAHH — Local Backend Server (SECURED Admin Endpoints)
   Todas as rotas /api/admin/* exigem login + token Bearer válido.
   ================================================================ */
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Carrega variáveis de ambiente do .env — SECRET KEY fica aqui
// dotenv instalado: usa path explícito para rodar de qualquer diretório.
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const db = require('./db');
// Helpers Supabase (clientes server/public + diagnóstico). Opcional se não usar.
const supabase = require('./supabase');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '15mb' }));

/* ---------------- BLOQUEIO DE PASTAS SENSÍVEIS ----------------
   O express.static serve tudo, incluindo o banco JSON (com senhas!)
   e o código do servidor. Estas rotas precisam vir ANTES do static. */
app.use((req, res, next) => {
  const blocked = ['/data', '/server', '/node_modules', '/.vscode'];
  if (blocked.some(b => req.path === b || req.path.startsWith(b + '/'))) {
    return res.status(403).send('Forbidden');
  }
  next();
});

app.use(express.static(path.join(__dirname, '..')));

/* ---------------- MIDDLEWARE DE AUTENTICAÇÃO ADMIN ---------------- */
// Bloqueia qualquer rota /api/admin/* sem token Bearer válido
function requireAdmin(req, res, next) {
  const auth = req.headers['authorization'] || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!db.verifySession(token)) {
    return res.status(401).json({ success: false, error: 'Não autorizado. Faça login como admin.' });
  }
  next();
}

// Rate limit simples de tentativas de login (5 tentativas / 10 min por IP)
const loginAttempts = new Map(); // ip -> { count, resetAt }
function loginRateLimit(req, res, next) {
  const ip = req.ip || 'unknown';
  const now = Date.now();
  let entry = loginAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + 10 * 60 * 1000 };
    loginAttempts.set(ip, entry);
  }
  if (entry.count >= 5) {
    return res.status(429).json({ success: false, error: 'Muitas tentativas. Aguarde 10 minutos.' });
  }
  entry.count++;
  next();
}

// ---------- LOGIN / LOGOUT DO ADMIN ----------
app.post('/api/admin/login', loginRateLimit, (req, res) => {
  const { username, password } = req.body || {};
  res.json(db.adminLogin(username, password));
});

app.post('/api/admin/logout', (req, res) => {
  const auth = req.headers['authorization'] || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  res.json(db.adminLogout(token));
});

// Trocar a senha do admin (exige estar logado como admin)
app.post('/api/admin/change-password', requireAdmin, (req, res) => {
  const { current_password, new_password } = req.body || {};
  res.json(db.changeAdminPassword(current_password, new_password));
});

// ---------- ROTAS PÚBLICAS (loja dos usuários) ----------
app.post('/api/auth/register', (req, res) => {
  const { name, email, password, phone } = req.body || {};
  if (!email || !password) return res.status(400).json({ success: false, error: 'E-mail e senha obrigatórios.' });
  res.json(db.registerCustomer(name, email, password, phone));
});

app.post('/api/auth/login', loginRateLimit, (req, res) => {
  const { email, password, phone } = req.body || {};
  if (!email || !password) return res.status(400).json({ success: false, error: 'Informe e-mail/usuário e senha.' });
  res.json(db.loginCustomer(email, password, phone));
});

// Configurações da loja (número do WhatsApp do checkout)
app.get('/api/settings', (req, res) => {
  res.json({ success: true, data: db.getSettings() });
});

app.post('/api/admin/settings', requireAdmin, (req, res) => {
  res.json(db.saveSettings(req.body || {}));
});

// Catálogo público: só nome/preço/imagem/estoque>0 (sem dados sensíveis)
app.get('/api/public/products', (req, res) => {
  const products = db.getProducts()
    .filter(p => p.stock > 0)
    .map(p => ({ id: p.id, source_id: p.source_id, name: p.name, price: p.price, old_price: p.old_price, image: p.image, url: p.url, category: p.category }));
  res.json({ success: true, data: products });
});

app.post('/api/orders', (req, res) => {
  res.json(db.saveOrder(req.body));
});

app.get('/api/orders', requireAdmin, (req, res) => {
  res.json({ success: true, data: db.getOrders() });
});

// ---------- ROTAS ADMIN (PROTEGIDAS) ----------
app.get('/api/admin/stats', requireAdmin, (req, res) => {
  const products = db.getProducts();
  const customers = db.getCustomers();
  const orders = db.getOrders();
  const discounted = products.filter(p => p.old_price && p.old_price > p.price);
  res.json({
    success: true,
    data: {
      totalProducts: products.length,
      totalCustomers: customers.length,
      totalOrders: orders.length,
      totalDiscounted: discounted.length
    }
  });
});

app.get('/api/admin/customers', requireAdmin, (req, res) => {
  res.json({ success: true, data: db.getCustomers() });
});

app.get('/api/admin/products', requireAdmin, (req, res) => {
  res.json({ success: true, data: db.getProducts() });
});

app.post('/api/admin/products', requireAdmin, (req, res) => {
  res.json(db.saveProduct(req.body));
});

app.delete('/api/admin/products/:id', requireAdmin, (req, res) => {
  res.json(db.deleteProduct(req.params.id));
});

app.post('/api/admin/import-catalog', requireAdmin, (req, res) => {
  const catalogPath = path.join(__dirname, '..', 'js', 'podpahh-catalog.js');
  let catalogData = req.body.catalog;
  if (!catalogData && fs.existsSync(catalogPath)) {
    try {
      const content = fs.readFileSync(catalogPath, 'utf8');
      const match = content.match(/window\.PODPAHH_CATALOG\s*=\s*(\{.*?\});/s);
      if (match) catalogData = JSON.parse(match[1]);
    } catch (e) {}
  }
  if (catalogData) return res.json(db.importCatalog(catalogData));
  res.status(400).json({ success: false, error: 'Nenhum catálogo encontrado.' });
});

/* ---------------- DIAGNÓSTICO SUPABASE ---------------- */
// EXIGE auth admin: expõe apenas estado de conexão, nunca chaves.
app.get('/api/admin/supabase-health', requireAdmin, async (req, res) => {
  try {
    const diag = await supabase.diagnose();
    res.json({ success: true, data: diag });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`[PODPAHH Server] Rodando em http://localhost:${PORT}`);
  console.log(`[PODPAHH Admin] Painel: http://localhost:${PORT}/pages/admin.html`);
  console.log('[PODPAHH Admin] Login admin protegido ativo.');
  console.log('[PODPAHH Supabase] Client helpers carregados:', !!(supabase && supabase.createServerClient));
});
