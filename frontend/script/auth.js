// ---------- Backend settings ----------
const API = 'http://localhost:8000';
const AFTER_LOGIN_PAGE = 'dashboard.html';   // change this if the team wants another page

// ---------- Grab the elements we need ----------
const loginForm  = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const notice     = document.getElementById('notice');
const title      = document.getElementById('form-title');
const subtitle   = document.getElementById('form-sub');
const tabs       = document.querySelectorAll('.tab');

const text = {
  login:  { title: 'Log in',              sub: 'Use your email and password to continue.' },
  signup: { title: 'Create your account', sub: 'Enter your email and choose a password.' }
};

function showNotice(message, type) {
  notice.textContent = message;
  notice.className = 'notice ' + type;
  notice.hidden = false;
}
function hideNotice() {
  notice.hidden = true;
}

function showMode(mode) {
  const isLogin = mode === 'login';
  loginForm.hidden  = !isLogin;
  signupForm.hidden = isLogin;
  title.textContent    = text[mode].title;
  subtitle.textContent = text[mode].sub;
  tabs.forEach(tab => {
    const active = tab.dataset.mode === mode;
    tab.classList.toggle('active', active);
    tab.setAttribute('aria-selected', active);
  });
  hideNotice();
}

document.querySelectorAll('[data-mode]').forEach(el => {
  el.addEventListener('click', event => {
    event.preventDefault();
    showMode(el.dataset.mode);
  });
});

if (window.location.hash === '#signup') showMode('signup');

document.querySelectorAll('.toggle-pw').forEach(button => {
  button.addEventListener('click', () => {
    const input = document.getElementById(button.dataset.target);
    const isHidden = input.type === 'password';
    input.type = isHidden ? 'text' : 'password';
    button.textContent = isHidden ? 'Hide' : 'Show';
  });
});

// ---------- Checking input ----------
const rules = {
  required: v => v.trim() !== '' || 'This field is required.',
  email:    v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) || 'Enter a valid email address.',
  password: v => (v.length >= 8 && /[A-Za-z]/.test(v) && /\d/.test(v)) || 'Use at least 8 characters with a letter and a number.',
  confirm:  (v, form) => v === form.elements.password.value || 'Passwords do not match.'
};

function validateForm(form) {
  let allGood = true;

  form.querySelectorAll('[data-rule]').forEach(input => {
    const result = rules[input.dataset.rule](input.value, form);
    const field = input.closest('.field');

    field.classList.toggle('invalid', result !== true);
    field.querySelector('.error').textContent = result === true ? '' : result;

    if (result !== true) allGood = false;
  });

  return allGood;
}

document.querySelectorAll('[data-rule]').forEach(input => {
  input.addEventListener('input', () => {
    const field = input.closest('.field');
    field.classList.remove('invalid');
    field.querySelector('.error').textContent = '';
  });
});

// ---------- Talking to the backend ----------
// Sends JSON to the server and returns { ok, data }.
async function postJSON(path, body) {
  const response = await fetch(API + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  let data = {};
  try { data = await response.json(); } catch (e) { /* the reply had no JSON */ }
  return { ok: response.ok, data: data };
}

// The server's error looks like { "detail": "message" }.
// A 422 error has a list instead of text, so we show a general message for that.
function errorText(result) {
  const detail = result.data.detail;
  return typeof detail === 'string' ? detail : 'Please check your details and try again.';
}

function saveTokenAndGo(token) {
  localStorage.setItem('token', token);
  window.location.href = AFTER_LOGIN_PAGE;
}

// Disables the button while waiting, so nobody clicks twice.
function setBusy(form, busy) {
  const button = form.querySelector('.btn');
  button.disabled = busy;
  button.textContent = busy ? 'Please wait…' : (form === loginForm ? 'Log in' : 'Create account');
}

// ---------- Sign up ----------
signupForm.addEventListener('submit', async event => {
  event.preventDefault();
  hideNotice();
  if (!validateForm(signupForm)) return;

  const email = signupForm.elements.email.value.trim();
  const password = signupForm.elements.password.value;

  setBusy(signupForm, true);
  try {
    const created = await postJSON('/auth/register', { email: email, password: password });
    if (!created.ok) {
      showNotice(errorText(created), 'error');
      return;
    }

    // Signing up gives no token, so log in straight away with the same details
    const session = await postJSON('/auth/login', { email: email, password: password });
    if (session.ok) {
      saveTokenAndGo(session.data.access_token);
    } else {
      signupForm.reset();
      showMode('login');
      loginForm.elements.email.value = email;
      showNotice('Account created. Log in to continue.', 'success');
    }
  } catch (e) {
    showNotice('Cannot reach the server. Check that the backend is running.', 'error');
  } finally {
    setBusy(signupForm, false);
  }
});

// ---------- Log in ----------
loginForm.addEventListener('submit', async event => {
  event.preventDefault();
  hideNotice();
  if (!validateForm(loginForm)) return;

  const email = loginForm.elements.email.value.trim();
  const password = loginForm.elements.password.value;

  setBusy(loginForm, true);
  try {
    const session = await postJSON('/auth/login', { email: email, password: password });
    if (!session.ok) {
      showNotice(errorText(session), 'error');
      return;
    }
    saveTokenAndGo(session.data.access_token);
  } catch (e) {
    showNotice('Cannot reach the server. Check that the backend is running.', 'error');
  } finally {
    setBusy(loginForm, false);
  }
});