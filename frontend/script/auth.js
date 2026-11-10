
const loginForm  = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const notice     = document.getElementById('notice');
const title      = document.getElementById('form-title');
const subtitle   = document.getElementById('form-sub');
const tabs       = document.querySelectorAll('.tab');

const text = {
  login:  { title: 'Log in',              sub: 'Use your Student ID and password to continue.' },
  signup: { title: 'Create your account', sub: 'Add your hostel details so your issues reach the right place.' }
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

const rules = {
  required:  v => v.trim() !== '' || 'This field is required.',
  name:      v => v.trim().length >= 2 || 'Enter your full name.',
  studentId: v => /^[BM]\d{2}[A-Z]{2,3}\d{3}$/i.test(v.trim()) || 'Enter a valid Student ID, like B25CS030.',
  email:     v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) || 'Enter a valid email address.',
  phone:     v => /^\d{10}$/.test(v.trim()) || 'Enter a 10-digit mobile number.',
  hostel:    v => v !== '' || 'Choose your hostel.',
  room:      v => v.trim() !== '' || 'Enter your room number.',
  password:  v => (v.length >= 8 && /[A-Za-z]/.test(v) && /\d/.test(v)) || 'Use at least 8 characters with a letter and a number.',
  confirm:   (v, form) => v === form.elements.password.value || 'Passwords do not match.'
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

function getUsers() {
  try {
    return JSON.parse(localStorage.getItem('warden_users')) || [];
  } catch (e) {
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem('warden_users', JSON.stringify(users));
}

signupForm.addEventListener('submit', event => {
  event.preventDefault();
  hideNotice();
  if (!validateForm(signupForm)) return;

  const f = signupForm.elements;
  const users = getUsers();
  const studentId = f.studentId.value.trim().toUpperCase();

  if (users.some(u => u.studentId.toLowerCase() === studentId.toLowerCase())) {
    showNotice('An account with this Student ID already exists. Try logging in.', 'error');
    return;
  }

  users.push({
    name: f.name.value.trim(),
    studentId: studentId,
    email: f.email.value.trim(),
    phone: f.phone.value.trim(),
    hostel: f.hostel.value,
    room: f.room.value.trim(),
    password: f.password.value
  });
  saveUsers(users);

  signupForm.reset();
  showMode('login');
  loginForm.elements.studentId.value = studentId;
  showNotice('Account created. Log in to continue.', 'success');
  loginForm.elements.password.focus();
});

loginForm.addEventListener('submit', event => {
  event.preventDefault();
  hideNotice();
  if (!validateForm(loginForm)) return;

  const id = loginForm.elements.studentId.value.trim().toLowerCase();
  const password = loginForm.elements.password.value;

  const user = getUsers().find(u => u.studentId.toLowerCase() === id);

  if (!user || user.password !== password) {
    showNotice('Student ID or password is incorrect.', 'error');
    return;
  }

  localStorage.setItem('warden_session', JSON.stringify({ studentId: user.studentId, name: user.name }));
  window.location.href = 'dashboard.html';
});