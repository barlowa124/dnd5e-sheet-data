// Smoke test for sheet.html — run via cdp_test.mjs:
//   node cdp_test.mjs <chrome-debug-port> "http://localhost:8931/sheet.html" "@test_smoke.js"
// Exercises: monster autofill, target/AC resolution, save-vs-tracker, conc badge.
(() => {
  localStorage.clear();
  initOrder.length = 0; curTarget = -1;
  const out = {};
  // monster autofill (full index, not just companion beasts)
  el('initName').value = 'erinyes x2'; addInit();
  el('initName').value = 'wolf'; addInit();
  out.order = initOrder.map(e => `${e.n}|ac${e.ac}|${e.atk}|${e.dmg}`);
  // click-to-target + attack verdict on roll line
  setTarget(initOrder.findIndex(e => e.n === 'wolf'));
  const btn = [...document.querySelectorAll('button')].find(b => b.dataset.h && b.closest('tr'));
  attackRow(btn); attackRow(btn);
  out.atkLogs = [...el('log').children].slice(0, 6).map(d => d.textContent.slice(9));
  // save spell vs tracker — inject dc if the loaded spell lacks one
  const sp = ALLSPELLS.find(s => s.n === 'Hail of Thorns');
  if (sp) { sp.dc = sp.dc || {a: 'DEX', h: 'half'}; castVsTracker('Hail of Thorns'); }
  out.hpAfter = initOrder.map(e => `${e.n}:hp${e.hp}`);
  out.saveLogs = [...el('log').children].slice(0, 6).map(d => d.textContent.slice(9));
  // concentration badge on player row
  el('concSpell').value = "Hunter's Mark";
  initOrder.push({n: curChar, v: 5}); renderInit();
  out.concBadge = el('initList').innerHTML.includes('◈ Hunter');
  // aria-labeled controls still generate
  out.aria = document.querySelectorAll('[aria-label]').length;
  return out;
})()
