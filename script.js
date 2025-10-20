(() => {
  const displayEl = document.getElementById('display');
  const keys = document.getElementById('keys');
  const sci = document.getElementById('scientific');
  const toggleSci = document.getElementById('toggleSci');
  const historyList = document.getElementById('historyList');
  const clearHistoryBtn = document.getElementById('clearHistory');
  const themeSelect = document.getElementById('theme-select');

  let current = '';
  let history = loadHistory();

  // initialize theme
  const savedTheme = localStorage.getItem('calc-theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  themeSelect.value = savedTheme;
  themeSelect.addEventListener('change', (e)=>{
    const t = e.target.value;
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem('calc-theme', t);
  });

  renderHistory();
  updateDisplay('0');

  // toggle scientific
  toggleSci.addEventListener('click', ()=>{
    sci.classList.toggle('active');
  });

  // button clicks
  document.addEventListener('click', (e)=>{
    const btn = e.target.closest('button');
    if(!btn) return;

    if(btn.dataset.value){
      appendValue(btn.dataset.value);
    }

    if(btn.dataset.action){
      handleAction(btn.dataset.action);
    }

    if(btn.dataset.fn){
      handleFunction(btn.dataset.fn);
    }
  });

  // keyboard support
  window.addEventListener('keydown', (e)=>{
    if(e.key>= '0' && e.key <= '9') appendValue(e.key);
    if(['+','-','*','/','.'].includes(e.key)) appendValue(e.key);
    if(e.key === 'Enter') compute();
    if(e.key === 'Backspace') backspace();
    if(e.key === 'Escape') clearAll();
  });

  function appendValue(v){
    if(current === '0' && v !== '.' ) current = '';
    current += v;
    updateDisplay(current);
  }

  function handleAction(action){
    switch(action){
      case 'clear': clearAll(); break;
      case 'back': backspace(); break;
      case 'equals': compute(); break;
      case 'pow2': applyImmediatePow(2); break;
      case 'pow3': applyImmediatePow(3); break;
      case 'pow': // append ^ operator which we'll treat as power
        current += '^'; updateDisplay(current); break;
      case 'fact': applyFactorial(); break;
    }
  }

  function handleFunction(fn){
    // insert function call prefix; user will provide parentheses or we add them
    if(fn === 'sqrt'){
      current += '√(';
    } else {
      current += fn + '(';
    }
    updateDisplay(current);
  }

  function applyImmediatePow(p){
    try{
      const val = parseFloat(current) || 0;
      const res = Math.pow(val, p);
      saveResult(`${val}^${p}`, res);
      current = String(res);
      updateDisplay(current);
    }catch(err){updateDisplay('Error')}
  }

  function applyFactorial(){
    try{
      const n = Math.floor(Number(current));
      if(n < 0) { updateDisplay('Error'); return; }
      const res = factorial(n);
      saveResult(`${n}!`, res);
      current = String(res);
      updateDisplay(current);
    }catch(err){updateDisplay('Error')}
  }

  function factorial(n){
    if(n === 0 || n === 1) return 1;
    let r = 1;
    for(let i=2;i<=n;i++) r *= i;
    return r;
  }

  function clearAll(){ current = ''; updateDisplay('0'); }
  function backspace(){ current = current.slice(0,-1); if(current==='') updateDisplay('0'); else updateDisplay(current); }

function compute() {
  if (!current) return;
  try {
    let exprForEval = prepareExpression(current);

    // автоматично добавяне на липсващи затварящи скоби
    const openParens = (exprForEval.match(/\(/g) || []).length;
    const closeParens = (exprForEval.match(/\)/g) || []).length;
    if (openParens > closeParens) {
      exprForEval += ')'.repeat(openParens - closeParens);
    }

    // eslint-disable-next-line no-new-func
    const result = Function(`return (${exprForEval})`)();
    if (result === undefined || isNaN(result)) throw new Error("Invalid");

    const rounded = roundResult(result);
    saveResult(current + ' =', rounded);
    current = String(rounded);
    updateDisplay(current);
  } catch (e) {
    updateDisplay('Error');
  }
}

  function roundResult(x){
    if(typeof x === 'number' && !Number.isInteger(x)) return parseFloat(x.toPrecision(12));
    return x;
  }

  function prepareExpression(s){
    // replacements: ^ -> **, ×/÷ characters -> */ , √( -> Math.sqrt(
    let t = s.replace(/×/g, '*').replace(/÷/g, '/');
    t = t.replace(/π/g, 'Math.PI');
    // avoid replacing plain 'e' inside words: replace data-value e with Math.E by earlier insertion
    t = t.replace(/\be\b/g, 'Math.E');
    t = t.replace(/\^/g, '**');
    // replace functions
    t = t.replace(/sin\(/g, 'Math.sin(')
         .replace(/cos\(/g, 'Math.cos(')
         .replace(/tan\(/g, 'Math.tan(')
         .replace(/log\(/g, 'Math.log10(')
         .replace(/ln\(/g, 'Math.log(')
         .replace(/√\(/g, 'Math.sqrt(')
         .replace(/sqrt\(/g, 'Math.sqrt(');
    return t;
  }

  function saveResult(expr, result){
    const item = {expr: expr.trim(), result: String(result), time: Date.now()};
    history.unshift(item);
    if(history.length > 200) history.pop();
    persistHistory();
    renderHistory();
  }

  function loadHistory(){
    try{ const raw = localStorage.getItem('calc-history'); return raw ? JSON.parse(raw) : []; }catch(e){return []}
  }
  function persistHistory(){ localStorage.setItem('calc-history', JSON.stringify(history)); }

  function renderHistory(){
    historyList.innerHTML = '';
    if(history.length === 0){ historyList.innerHTML = '<li class="history-item">Няма записи</li>'; return; }
    history.forEach((h, idx)=>{
      const li = document.createElement('li');
      li.className = 'history-item';
      li.innerHTML = `<strong>${escapeHtml(h.expr)} ${escapeHtml(h.result)}</strong><small>${new Date(h.time).toLocaleString('bg-BG')}</small>`;
      li.addEventListener('click', ()=>{ current = (h.expr.replace(/\s*=\s*$/,'')) ; updateDisplay(current); });
      historyList.appendChild(li);
    });
  }

  clearHistoryBtn.addEventListener('click', ()=>{ history = []; persistHistory(); renderHistory(); });

  function updateDisplay(v){ displayEl.textContent = v; }

  function escapeHtml(unsafe){ return String(unsafe).replace(/[&<>"']/g, function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#039;"}[m];}); }

})();