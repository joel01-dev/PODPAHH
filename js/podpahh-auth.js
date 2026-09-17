/* ================================================================
   PODPAHH — Auth & Account Local Backend Handler
   Conecta os formulários da página Minha Conta com o Servidor Local Node.js
   LOGIN/CADASTRO exigem: e-mail (ou usuário) + WHATSAPP + senha
   ================================================================ */
document.addEventListener('DOMContentLoaded', function () {
  'use strict';

  // ---- Utilitários de telefone ----
  function phoneDigits(v) {
    return String(v || '').replace(/\D/g, '');
  }

  // Valida telefone BR: 11 dígitos, DDD 11-99, dígito 3 = 9 (celular)
  function isValidPhone(v) {
    var d = phoneDigits(v);
    if (d.length !== 11) return false;
    var ddd = parseInt(d.substring(0, 2), 10);
    if (ddd < 11 || ddd > 99) return false;
    if (d[2] !== '9') return false;
    return true;
  }

  // Máscara (41) 99999-9999 enquanto digita
  function maskPhone(input) {
    var raw = phoneDigits(input.value).substring(0, 11);
    if (!raw) { input.value = ''; return; }
    if (raw.length <= 2) input.value = '(' + raw;
    else if (raw.length <= 6) input.value = '(' + raw.substring(0, 2) + ') ' + raw.substring(2);
    else if (raw.length <= 10) input.value = '(' + raw.substring(0, 2) + ') ' + raw.substring(2, 6) + '-' + raw.substring(6);
    else input.value = '(' + raw.substring(0, 2) + ') ' + raw.substring(2, 7) + '-' + raw.substring(7);
  }

  // Aplica máscara em todos os campos marcados com .vs-phone-input
  document.querySelectorAll('.vs-phone-input').forEach(function (f) {
    f.addEventListener('input', function () { maskPhone(f); });
    f.addEventListener('keydown', function (e) {
      // Só deixa digitar números e teclas de controle
      if ([8, 9, 37, 38, 39, 40, 46].indexOf(e.keyCode) !== -1) return;
      if (e.ctrlKey || e.metaKey) return;
      if ((e.keyCode < 48 || e.keyCode > 57) && (e.keyCode < 96 || e.keyCode > 105)) e.preventDefault();
    });
  });

  // Intercepta formulário de Registro (Criar Conta)
  var regForm = document.querySelector('form.woocommerce-form-register');
  if (regForm) {
    regForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      var usernameInput = regForm.querySelector('#reg_username');
      var emailInput = regForm.querySelector('#reg_email');
      var phoneInput = regForm.querySelector('#reg_phone');
      var passInput = regForm.querySelector('#reg_password');

      var username = usernameInput ? usernameInput.value.trim() : '';
      var email = emailInput ? emailInput.value.trim() : '';
      var phone = phoneInput ? phoneInput.value.trim() : '';
      var password = passInput ? passInput.value.trim() : '';

      if (!email || !password) {
        alert('Por favor, preencha o e-mail e a senha.');
        return;
      }

      // WhatsApp OBRIGATÓRIO no cadastro
      if (!phoneDigits(phone)) {
        alert('Por favor, informe seu número de WhatsApp com DDD. É obrigatório para criar a conta.');
        phoneInput && phoneInput.focus();
        return;
      }
      if (!isValidPhone(phone)) {
        alert('Número de WhatsApp inválido. Use o formato (41) 99999-9999 — celular com 9 após o DDD.');
        phoneInput && phoneInput.focus();
        return;
      }

      if (window.PodpahhDB) {
        try {
          var result = await window.PodpahhDB.registerCustomer(
            username || email.split('@')[0],
            email,
            password,
            phoneDigits(phone)
          );

          if (!result.success) {
            alert(result.error || 'Erro ao criar conta.');
            return;
          }

          // Salva sessão local ativa
          localStorage.setItem('podpahh_logged_user', JSON.stringify(result.data));

          alert('Conta criada com sucesso! Seu WhatsApp foi vinculado à conta.');
          window.location.reload();
        } catch (err) {
          console.error(err);
          alert('Erro de conexão com o servidor local.');
        }
      }
    });
  }

  // Intercepta formulário de Login (Entrar)
  var loginForm = document.querySelector('form.woocommerce-form-login');
  if (loginForm) {
    loginForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      var userinput = loginForm.querySelector('#username');
      var phoneInput = loginForm.querySelector('#login_phone');
      var passinput = loginForm.querySelector('#password');

      var user = userinput ? userinput.value.trim() : '';
      var phone = phoneInput ? phoneInput.value.trim() : '';
      var pass = passinput ? passinput.value.trim() : '';

      if (!user || !pass) {
        alert('Por favor, informe seu e-mail e senha.');
        return;
      }

      // WhatsApp OBRIGATÓRIO no login
      if (!phoneDigits(phone)) {
        alert('Por favor, informe seu número de WhatsApp com DDD. Ele é obrigatório para entrar.');
        phoneInput && phoneInput.focus();
        return;
      }
      if (!isValidPhone(phone)) {
        alert('Número de WhatsApp inválido. Use o formato (41) 99999-9999.');
        phoneInput && phoneInput.focus();
        return;
      }

      if (window.PodpahhDB) {
        try {
          var result = await window.PodpahhDB.loginCustomer(user, pass, phoneDigits(phone));

          if (!result.success) {
            alert(result.error || 'Conta não encontrada ou senha incorreta.');
            return;
          }

          localStorage.setItem('podpahh_logged_user', JSON.stringify(result.data));
          alert('Login efetuado com sucesso!');
          window.location.reload();
        } catch (err) {
          console.error(err);
          alert('Erro ao conectar com o servidor local.');
        }
      }
    });
  }

  // Verifica se há usuário logado e atualiza a interface se necessário
  var logged = null;
  try {
    logged = JSON.parse(localStorage.getItem('podpahh_logged_user'));
  } catch(e) {}

  if (logged && logged.email) {
    var authWrap = document.querySelector('.ma-auth-wrap');
    if (authWrap) {
      var maskedPhone = '';
      if (logged.phone) {
        var p = String(logged.phone);
        maskedPhone = p.length === 11
          ? ' (' + p.substring(0, 2) + ') ' + p.substring(2, 7) + '-' + p.substring(7)
          : ' ' + p;
      }
      authWrap.innerHTML = '<div style="background:#111119;border:1px solid rgba(45,122,255,.2);padding:40px;border-radius:12px;text-align:center;color:#fff">' +
        '<i class="fa fa-user-check" style="font-size:3rem;color:var(--c,#2d7aff);margin-bottom:16px"></i>' +
        '<h2 style="margin:0 0 10px">Bem-vindo(a), ' + (logged.name || logged.email) + '</h2>' +
        '<p style="color:rgba(232,232,240,.7);margin-bottom:8px">Você está conectado(a) no banco de dados local do seu PC.</p>' +
        (maskedPhone
          ? '<p style="color:rgba(232,232,240,.7);margin-bottom:24px"><i class="fa-brands fa-whatsapp"></i> WhatsApp da conta:<b>' + maskedPhone + '</b></p>'
          : '') +
        '<button onclick="localStorage.removeItem(\'podpahh_logged_user\');window.location.reload();" class="pp-btn-ghost" style="border-color:rgba(255,50,50,.3);color:#ff5252"><i class="fa fa-sign-out-alt"></i> SAIR DA CONTA</button>' +
        '</div>';
    }
  }
});
