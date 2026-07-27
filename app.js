const $ = selector => document.querySelector(selector);
const money = value => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
let mode = 'login', currentUser = null, pendingEmail = '';

function calculate() {
  const principal = +$('#amount').value, monthlyRate = +$('#rate').value / 1200, months = +$('#tenure').value * 12;
  const emi = monthlyRate ? principal * monthlyRate * (1 + monthlyRate) ** months / ((1 + monthlyRate) ** months - 1) : principal / months;
  const total = emi * months, interest = total - principal;
  $('#amountOut').textContent = money(principal); $('#rateOut').textContent = (monthlyRate * 1200).toFixed(1) + '%'; $('#tenureOut').textContent = $('#tenure').value + ' years';
  $('#emi').textContent = money(emi); $('#months').textContent = months;
  $('#principal').textContent = money(principal); $('#interest').textContent = money(interest); $('#total').textContent = money(total); $('#principalBar').style.width = (principal / total * 100) + '%';
  return { principal, annual_rate: monthlyRate * 1200, tenure_months: months };
}
['amount', 'rate', 'tenure'].forEach(id => $('#' + id).addEventListener('input', calculate));
calculate();

function showCalculator() {
  $('#landing').classList.add('hidden'); $('#appView').classList.remove('hidden'); $('#calculator').classList.remove('hidden'); $('#historyView').classList.add('hidden');
}
function showHistory() {
  if (!currentUser) return showAuth('login');
  $('#landing').classList.add('hidden'); $('#appView').classList.remove('hidden'); $('#calculator').classList.add('hidden'); $('#historyView').classList.remove('hidden');
  loadHistory();
}
function showLanding() { $('#landing').classList.remove('hidden'); $('#appView').classList.add('hidden'); }

$('#landingCta').addEventListener('click', () => showAuth('login'));
$('#brandLink').addEventListener('click', event => { event.preventDefault(); currentUser ? showCalculator() : showLanding(); });

function showAuth(next) {
  mode = next; $('#modal').classList.remove('hidden'); $('#authForm').classList.remove('hidden'); $('#otpForm').classList.add('hidden');
  $('#nameGroup').classList.toggle('hidden', mode === 'login'); $('#modalLabel').textContent = mode === 'login' ? 'WELCOME BACK' : 'LET’S GET STARTED';
  $('#modalTitle').textContent = mode === 'login' ? 'Log in to Loan EMI Calculator' : 'Create your Loan EMI Calculator account'; $('#authSubmit').textContent = 'Continue'; $('#switchText').classList.remove('hidden');
  $('#switchText').innerHTML = mode === 'login' ? 'New here? <button class="text-btn" onclick="showAuth(\'signup\')">Create an account</button>' : 'Already have an account? <button class="text-btn" onclick="showAuth(\'login\')">Log in</button>';
  $('#authError').textContent = '';
}
function closeAuth() { $('#modal').classList.add('hidden'); }

async function requestOtp() {
  const data = { action: mode, email: $('#authEmail').value, password: $('#authPassword').value };
  if (mode === 'signup') data.name = $('#authName').value;
  const response = await fetch('/api/request-otp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  const body = await response.json();
  if (!response.ok) { $('#authError').textContent = body.error; return; }
  pendingEmail = data.email; $('#authForm').classList.add('hidden'); $('#otpForm').classList.remove('hidden'); $('#switchText').classList.add('hidden');
  $('#modalLabel').textContent = 'ONE-TIME PASSWORD'; $('#modalTitle').textContent = 'Verify your identity'; $('#otpEmail').textContent = pendingEmail; $('#demoOtp').textContent = 'Demo code: ' + body.development_otp; $('#authError').textContent = '';
}
$('#authForm').addEventListener('submit', event => { event.preventDefault(); requestOtp(); });
$('#otpForm').addEventListener('submit', async event => {
  event.preventDefault();
  const response = await fetch('/api/verify-otp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: pendingEmail, otp: $('#otpCode').value }) });
  const body = await response.json();
  if (!response.ok) { $('#authError').textContent = body.error; return; }
  currentUser = body.user; closeAuth(); renderNav(); showCalculator(); loadHistory();
});

function renderNav() {
  $('#nav-actions').innerHTML = currentUser
    ? `<span class="hello">Hi, ${escapeHtml(currentUser.name.split(' ')[0])}</span><button class="link" id="calculatorNav">Calculator</button><button class="pill" id="historyNav">History</button><button class="link" id="logout">Log out</button>`
    : `<button class="link" onclick="showAuth('login')">Log in</button><button class="pill" onclick="showAuth('signup')">Create account</button>`;
  const calculatorButton = $('#calculatorNav'), historyButton = $('#historyNav'), logoutButton = $('#logout');
  if (calculatorButton) calculatorButton.onclick = showCalculator;
  if (historyButton) historyButton.onclick = showHistory;
  if (logoutButton) logoutButton.onclick = async () => { await fetch('/api/logout', { method: 'POST' }); currentUser = null; renderNav(); showLanding(); };
}

$('#saveBtn').onclick = async () => {
  if (!currentUser) return showAuth('login');
  const data = calculate(); data.loan_name = $('#loanName').value;
  const response = await fetch('/api/calculations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  if (response.ok) { $('#loanName').value = ''; $('#saveBtn').textContent = 'Saved ✓'; setTimeout(() => $('#saveBtn').textContent = 'Save plan', 1400); loadHistory(); }
};
async function loadHistory() {
  const box = $('#historyList');
  if (!currentUser) { box.innerHTML = '<p class="empty">Sign in to save and view your loan plans.</p>'; return; }
  const response = await fetch('/api/calculations'), data = await response.json();
  box.innerHTML = data.calculations.length ? data.calculations.map(item => `<article class="history-card"><h3>${escapeHtml(item.loan_name)}</h3><b>${money(item.emi)}<small>/mo</small></b><p>${money(item.principal)} · ${item.annual_rate}% · ${item.tenure_months / 12} yrs</p></article>`).join('') : '<p class="empty">No saved plans yet. Use the calculator and select Save plan.</p>';
}
function escapeHtml(value) { const element = document.createElement('div'); element.textContent = value; return element.innerHTML; }
fetch('/api/me').then(response => response.json()).then(data => { currentUser = data.user; renderNav(); currentUser ? showCalculator() : showLanding(); });
