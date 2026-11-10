
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