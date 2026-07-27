const $ = selector => document.querySelector(selector);
const money = value => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
const storageKey = 'loan-emi-calculator-v1';
let mode = 'login';
let currentUser = readState().user || null;

function readState() {
  try { return JSON.parse(localStorage.getItem(storageKey)) || { users: [], plans: [] }; }
  catch { return { users: [], plans: [] }; }
}
function saveState(state) { localStorage.setItem(storageKey, JSON.stringify(state)); }
function calculate() {
  const principal = Number($('#amount').value);
  const annualRate = Number($('#rate').value);
  const months = Number($('#tenure').value) * 12;
  const monthlyRate = annualRate / 1200;
  const emi = monthlyRate ? principal * monthlyRate * (1 + monthlyRate) ** months / ((1 + monthlyRate) ** months - 1) : principal / months;
  const total = emi * months;
  $('#amountOut').textContent = money(principal); $('#rateOut').textContent = `${annualRate.toFixed(1)}%`; $('#tenureOut').textContent = `${$('#tenure').value} years`;
  $('#emi').textContent = money(emi); $('#months').textContent = months; $('#principal').textContent = money(principal); $('#interest').textContent = money(total - principal); $('#total').textContent = money(total);
  $('#principalBar').style.width = `${(principal / total) * 100}%`;
  return { principal, annualRate, months, emi, total };
}
['amount', 'rate', 'tenure'].forEach(id => $(`#${id}`).addEventListener('input', calculate));

function showCalculator() { $('#landing').classList.add('hidden'); $('#appView').classList.remove('hidden'); $('#calculator').classList.remove('hidden'); $('#historyView').classList.add('hidden'); }
function showHistory() { if (!currentUser) return showAuth('login'); $('#landing').classList.add('hidden'); $('#appView').classList.remove('hidden'); $('#calculator').classList.add('hidden'); $('#historyView').classList.remove('hidden'); renderHistory(); }
function showLanding() { $('#landing').classList.remove('hidden'); $('#appView').classList.add('hidden'); }
function showAuth(next) {
  mode = next; $('#modal').classList.remove('hidden'); $('#nameGroup').classList.toggle('hidden', mode === 'login');
  $('#modalLabel').textContent = mode === 'login' ? 'WELCOME BACK' : 'GET STARTED';
  $('#modalTitle').textContent = mode === 'login' ? 'Log in to Loan EMI Calculator' : 'Create your Loan EMI Calculator account';
  $('#switchText').innerHTML = mode === 'login' ? 'New here? <button class="text-btn" id="switchMode">Create an account</button>' : 'Already have an account? <button class="text-btn" id="switchMode">Log in</button>';
  $('#switchMode').onclick = () => showAuth(mode === 'login' ? 'signup' : 'login'); $('#authError').textContent = '';
}
function closeAuth() { $('#modal').classList.add('hidden'); }
function renderNav() {
  $('#nav-actions').innerHTML = currentUser ? `<span class="hello">Hi, ${escapeHtml(currentUser.name.split(' ')[0])}</span><button class="link" id="calculatorNav">Calculator</button><button class="pill" id="historyNav">History</button><button class="link" id="logout">Log out</button>` : '<button class="link" id="loginButton">Log in</button><button class="pill" id="signupButton">Create account</button>';
  $('#calculatorNav')?.addEventListener('click', showCalculator); $('#historyNav')?.addEventListener('click', showHistory);
  $('#logout')?.addEventListener('click', () => { currentUser = null; const state = readState(); delete state.user; saveState(state); renderNav(); showLanding(); });
  $('#loginButton')?.addEventListener('click', () => showAuth('login')); $('#signupButton')?.addEventListener('click', () => showAuth('signup'));
}
function renderHistory() {
  const plans = readState().plans.filter(plan => plan.email === currentUser.email).sort((a, b) => b.createdAt - a.createdAt);
  $('#historyList').innerHTML = plans.length ? plans.map(plan => `<article class="history-card"><h3>${escapeHtml(plan.name)}</h3><b>${money(plan.emi)}<small>/mo</small></b><p>${money(plan.principal)} · ${plan.annualRate}% · ${plan.months / 12} yrs</p></article>`).join('') : '<p class="empty">No saved plans yet. Use the calculator and select Save plan.</p>';
}
function escapeHtml(value) { const el = document.createElement('div'); el.textContent = value; return el.innerHTML; }

$('#authForm').addEventListener('submit', event => {
  event.preventDefault(); const email = $('#authEmail').value.trim().toLowerCase(); const password = $('#authPassword').value; const name = $('#authName').value.trim(); const state = readState();
  if (password.length < 6) return $('#authError').textContent = 'Password must be at least 6 characters.';
  if (mode === 'signup') { if (name.length < 2) return $('#authError').textContent = 'Please enter your name.'; if (state.users.some(user => user.email === email)) return $('#authError').textContent = 'An account with this email already exists.'; state.users.push({ name, email, password }); currentUser = { name, email }; }
  else { const user = state.users.find(item => item.email === email && item.password === password); if (!user) return $('#authError').textContent = 'Email or password is incorrect.'; currentUser = { name: user.name, email: user.email }; }
  state.user = currentUser; saveState(state); closeAuth(); renderNav(); showCalculator();
});
$('#saveBtn').addEventListener('click', () => {
  if (!currentUser) return showAuth('login'); const result = calculate(); const state = readState();
  state.plans.push({ email: currentUser.email, name: $('#loanName').value.trim() || 'My loan', ...result, createdAt: Date.now() }); saveState(state); $('#loanName').value = ''; $('#saveBtn').textContent = 'Saved ✓'; setTimeout(() => $('#saveBtn').textContent = 'Save plan', 1400);
});
$('#landingCta').addEventListener('click', () => { showCalculator(); });
$('#brandLink').addEventListener('click', event => { event.preventDefault(); currentUser ? showCalculator() : showLanding(); });
$('#closeModal').addEventListener('click', closeAuth);
calculate(); renderNav(); currentUser ? showCalculator() : showLanding();
