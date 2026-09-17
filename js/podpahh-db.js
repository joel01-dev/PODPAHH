/* ================================================================
   PODPAHH — Database Adapter (Supabase & Local Server Hybrid)
   Aponte para o servidor local (porta 3000) simulando o Supabase,
   ou mude para 'supabase' quando for colocar na nuvem.
   ================================================================ */
(function (window) {
  'use strict';

  var MODE = 'local'; // 'local' (usa o servidor Node no seu PC) ou 'supabase' (nuvem)
  
  var LOCAL_API = 'http://localhost:3000/api';

  var SB_CONFIG = {
    url: 'https://seu-projeto.supabase.co',
    anonKey: 'sua-chave-anon-aqui'
  };

  var supabaseClient = null;
  if (MODE === 'supabase' && window.supabase) {
    supabaseClient = window.supabase.createClient(SB_CONFIG.url, SB_CONFIG.anonKey);
  }

  window.PodpahhDB = {
    getMode: function() { return MODE; },

    // Cadastrar / Salvar Cliente (Valida e-mail duplicado no PC)
    registerCustomer: async function(name, email, password, phone) {
      if (MODE === 'supabase' && supabaseClient) {
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

    // Login (Valida senha, e-mail/usuário e TELEFONE no PC)
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
        var res = await fetch(LOCAL_API + '/settings');
        var json = await res.json();
        if (json.success) return json.data;
      } catch (err) { /* servidor offline: usa padrão */ }
      return { whatsapp: '554531977964', whatsapp_message: '' };
    }
  };

})(window);
