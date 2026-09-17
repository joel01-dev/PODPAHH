/* ================================================================
   PODPAHH — Database Adapter (Supabase & Local Server Hybrid)
   Modo:
     'local'     -> usa o servidor Node local (porta 3000)
     'supabase'  -> usa o Supabase na nuvem (RLS ativo)
   Para produção: troque MODE para 'supabase' (o schema SQL já cria
   as tabelas e políticas RLS — veja supabase/schema.sql).
   ================================================================ */
(function (window) {
  'use strict';

  var MODE = 'local'; // 'local' ou 'supabase'

  var LOCAL_API = 'http://localhost:3000/api';

  // Chaves PÚBLICAS — seguras no navegador SOMENTE com RLS habilitado.
  // A SECRET KEY nunca entra aqui (fica no servidor, .env).
  var SB_CONFIG = {
    url: 'https://qmspfcfdcuvvaxdqggzg.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtc3BmY2ZkY3V2dmF4ZHFnZ3pnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3MDIzMzUsImV4cCI6MjEwMzI3ODMzNX0.IYsEPUTEGyV43xVPCgb7QnglSMISBaxRpY5uBoBYVBc'
  };

  var supabaseClient = null;
  if (MODE === 'supabase' && window.supabase) {
    supabaseClient = window.supabase.createClient(SB_CONFIG.url, SB_CONFIG.anonKey);
  }

  window.PodpahhDB = {
    getMode: function() { return MODE; },
    getConfig: function() { return { mode: MODE, url: SB_CONFIG.url }; },

    // Cadastrar / Salvar Cliente
    registerCustomer: async function(name, email, password, phone) {
      if (MODE === 'supabase' && supabaseClient) {
        // Insere com hash? Não: quem deve guardar o hash é o servidor.
        // No modo supabase direto, o backend calcula o hash usando RPC.
        // Esta chamada usa a anon (RLS): insere a linha e o trigger
        // /backend RPC hasheia. Para simplicidade de produção com RLS,
        // recomendamos manter a rota local /api/auth/register como
        // gateway, que faz o hash scrypt e grava no Supabase via SECRET.
        var { data, error } = await supabaseClient.from('customers').insert([{ name, email, password, phone }]).select();
        if (error) throw error;
        return { success: true, data: data[0] };
      } else {
        try {
          var res = await fetch(LOCAL_API + '/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password, phone })
          });
          return await res.json();
        } catch (err) {
          console.error('Erro de conexão com o servidor local:', err);
          return { success: false, error: 'Servidor local offline.' };
        }
      }
    },

    // Login
    loginCustomer: async function(email, password, phone) {
      if (MODE === 'supabase' && supabaseClient) {
        var { data, error } = await supabaseClient.from('customers').select('*').eq('email', email).single();
        if (error || !data || data.password !== password || data.phone !== phone) {
          return { success: false, error: 'E-mail, WhatsApp ou senha incorretos.' };
        }
        return { success: true, data: data };
      } else {
        try {
          var res = await fetch(LOCAL_API + '/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, phone })
          });
          return await res.json();
        } catch (err) {
          console.error('Erro de conexão:', err);
          return { success: false, error: 'Servidor local offline.' };
        }
      }
    },

    // Salvar Pedido
    saveOrder: async function(orderData) {
      if (MODE === 'supabase' && supabaseClient) {
        var { data, error } = await supabaseClient.from('orders').insert([orderData]).select();
        if (error) throw error;
        return { success: true, data: data[0] };
      } else {
        try {
          var res = await fetch(LOCAL_API + '/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
          });
          return await res.json();
        } catch (err) {
          return { success: false, error: 'Servidor offline.' };
        }
      }
    },

    // Buscar configurações da loja (número do WhatsApp do checkout)
    getSettings: async function() {
      try {
        if (MODE === 'supabase' && supabaseClient) {
          var { data, error } = await supabaseClient.from('settings').select('whatsapp, whatsapp_message').single();
          if (!error && data) return { whatsapp: data.whatsapp, whatsapp_message: data.whatsapp_message };
        } else {
          var res = await fetch(LOCAL_API + '/settings');
          var json = await res.json();
          if (json.success) return json.data;
        }
      } catch (err) { /* servidor offline: usa padrão */ }
      return { whatsapp: '5547999453628', whatsapp_message: '' };
    }
  };

})(window);