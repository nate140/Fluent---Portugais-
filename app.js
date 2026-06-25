// ══ FLUENT PT — app.js ══

// ══ STATE ══
const LS_KEY = 'fluent_pt_v1';
let VOCAB = [];
let state = {
  level: 'A1',
  progress: {},
  totalSeen: 0,
  totalCorrect: 0
};

// ══ LOAD VOCAB ══
fetch('vocab.json')
  .then(r => r.json())
  .then(data => { VOCAB = data; console.log('Vocab chargé :', VOCAB.length, 'mots'); })
  .catch(e => console.error('Erreur chargement vocab.json :', e));

// ══ LOCALSTORAGE ══
function loadState() {
  try {
    const s = localStorage.getItem(LS_KEY);
    if (s) state = { ...state, ...JSON.parse(s) };
  } catch(e) {}
}
function saveState() {
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch(e) {}
}

// ══ HELPERS ══
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function normalize(s) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function getProgress(pt) {
  if (!state.progress[pt]) state.progress[pt] = { flash:0, qcm:0, dictee:0, saisie:0, sprint:0, retour:0 };
  return state.progress[pt];
}

function mastery(pt) {
  const p = getProgress(pt);
  return Object.values(p).filter(v => v >= 3).length;
}

function isMastered(pt) { return mastery(pt) >= 6; }

function getFiltered() {
  const f = appState.filter;
  const levels = ['A1','A2','B1','B2','C1'];
  let pool = [...VOCAB];
  if (levels.includes(f)) pool = pool.filter(w => w.n === f);
  else if (f !== 'all') pool = pool.filter(w => w.c === f);
  const lvlIdx = levels.indexOf(state.level);
  const inLevel = pool.filter(w => levels.indexOf(w.n) <= lvlIdx);
  const available = inLevel.length > 0 ? inLevel : pool;
  return [...available].sort((a, b) => mastery(a.pt) - mastery(b.pt));
}

function pickWord(exclude) {
  const pool = getFiltered().filter(w => !isMastered(w.pt));
  const fallback = getFiltered();
  const arr = pool.length > 3 ? pool : fallback;
  const candidates = arr.slice(0, Math.min(20, arr.length));
  let pick = candidates[Math.floor(Math.random() * Math.min(5, candidates.length))];
  if (exclude && pick && pick.pt === exclude.pt && candidates.length > 1) {
    pick = candidates[1 + Math.floor(Math.random() * (candidates.length - 1))];
  }
  return pick || VOCAB[Math.floor(Math.random() * VOCAB.length)];
}

function getDistractors(correct, count) {
  const pool = VOCAB.filter(w => w.fr !== correct.fr && w.pt !== correct.pt);
  return shuffle([...pool]).slice(0, count);
}

function masteryDotsHTML(pt) {
  const p = getProgress(pt);
  const modes = ['flash','qcm','dictee','saisie','sprint','retour'];
  return '<div class="word-mastery">' +
    modes.map(m => `<div class="mastery-dot ${p[m] >= 3 ? 'done' : ''}"></div>`).join('') +
    '</div>';
}

// ══ SCREENS ══
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + name).classList.add('active');
}

function showToast(msg, type = 'info') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show ' + type;
  clearTimeout(t._t);
  t._t = setTimeout(() => { t.className = 'toast'; }, 2200);
}

function updateNavLevel() {
  document.getElementById('nav-level').textContent = state.level;
}

// ══ APP STATE ══
let appState = {
  mode: 'flash',
  filter: 'all',
  currentWord: null,
  sprintTimer: null,
  sprintTimeLeft: 60,
  sprintScore: 0,
  showingProfil: false
};

// ══ LANDING ══
function startGuest() {
  loadState();
  showScreen('app');
  updateNavLevel();
  renderGame();
}

// ══ PLACEMENT TEST ══
const TEST_BANK = [
  {w:'casa',t:'maison',l:'A1',opts:['maison','chien','voiture','pain']},
  {w:'feliz',t:'heureux',l:'A1',opts:['triste','heureux','grand','rouge']},
  {w:'água',t:'eau',l:'A1',opts:['eau','feu','pain','air']},
  {w:'livro',t:'livre',l:'A1',opts:['stylo','table','livre','chaise']},
  {w:'amigo',t:'ami',l:'A1',opts:['ennemi','ami','frère','voisin']},
  {w:'comer',t:'manger',l:'A1',opts:['boire','manger','dormir','courir']},
  {w:'grande',t:'grand',l:'A1',opts:['petit','vieux','grand','rapide']},
  {w:'escola',t:'école',l:'A1',opts:['école','bureau','hôpital','magasin']},
  {w:'mãe',t:'mère',l:'A1',opts:['père','sœur','mère','fille']},
  {w:'bom',t:'bon',l:'A1',opts:['mauvais','bon','vieux','nouveau']},
  {w:'gato',t:'chat',l:'A1',opts:['chien','chat','oiseau','poisson']},
  {w:'sol',t:'soleil',l:'A1',opts:['lune','étoile','soleil','nuage']},
  {w:'correr',t:'courir',l:'A1',opts:['marcher','nager','courir','sauter']},
  {w:'vermelho',t:'rouge',l:'A1',opts:['bleu','vert','rouge','jaune']},
  {w:'porta',t:'porte',l:'A1',opts:['fenêtre','mur','porte','toit']},
  {w:'carro',t:'voiture',l:'A1',opts:['vélo','bus','voiture','train']},
  {w:'frio',t:'froid',l:'A1',opts:['chaud','froid','rapide','lent']},
  {w:'abrir',t:'ouvrir',l:'A1',opts:['fermer','ouvrir','casser','perdre']},
  {w:'nome',t:'nom',l:'A1',opts:['prénom','nom','adresse','âge']},
  {w:'dia',t:'jour',l:'A1',opts:['nuit','semaine','jour','mois']},
  {w:'sim',t:'oui',l:'A1',opts:['non','oui','peut-être','jamais']},
  {w:'trabalhar',t:'travailler',l:'A1',opts:['jouer','dormir','travailler','manger']},
  {w:'cidade',t:'ville',l:'A1',opts:['village','forêt','ville','montagne']},
  {w:'tempo',t:'temps / météo',l:'A1',opts:['argent','temps / météo','famille','travail']},
  {w:'viajar',t:'voyager',l:'A2',opts:['chanter','voyager','manger','dormir']},
  {w:'explicar',t:'expliquer',l:'A2',opts:['expliquer','oublier','chercher','trouver']},
  {w:'escolher',t:'choisir',l:'A2',opts:['perdre','choisir','vendre','porter']},
  {w:'resposta',t:'réponse',l:'A2',opts:['question','réponse','problème','résultat']},
  {w:'às vezes',t:'parfois',l:'A2',opts:['toujours','jamais','parfois','souvent']},
  {w:'problema',t:'problème',l:'A2',opts:['solution','réponse','problème','avantage']},
  {w:'importante',t:'important',l:'A2',opts:['facile','impossible','important','inutile']},
  {w:'lembrar',t:'se souvenir',l:'A2',opts:['oublier','se souvenir','apprendre','enseigner']},
  {w:'trazer',t:'apporter',l:'A2',opts:['apporter','prendre','laisser','envoyer']},
  {w:'limpo',t:'propre',l:'A2',opts:['sale','propre','beau','neuf']},
  {w:'cedo',t:'tôt',l:'A2',opts:['tard','tôt','vite','loin']},
  {w:'suficiente',t:'assez',l:'A2',opts:['trop','peu','assez','beaucoup']},
  {w:'livre',t:'libre',l:'A2',opts:['occupé','payant','libre','interdit']},
  {w:'saudável',t:'en bonne santé',l:'A2',opts:['malade','fatigué','en bonne santé','blessé']},
  {w:'ocupado',t:'occupé',l:'A2',opts:['libre','occupé','disponible','absent']},
  {w:'tarde',t:'tard',l:'A2',opts:['tôt','à l\'heure','tard','en avance']},
  {w:'alcançar',t:'atteindre',l:'B1',opts:['atteindre','oublier','chercher','perdre']},
  {w:'apesar de',t:'malgré',l:'B1',opts:['depuis','malgré','pendant','grâce à']},
  {w:'melhorar',t:'améliorer',l:'B1',opts:['améliorer','aggraver','changer','ignorer']},
  {w:'prova',t:'preuve',l:'B1',opts:['preuve','opinion','idée','théorie']},
  {w:'exigir',t:'exiger',l:'B1',opts:['proposer','exiger','suggérer','refuser']},
  {w:'desafio',t:'défi',l:'B1',opts:['avantage','problème','défi','solution']},
  {w:'envolver',t:'impliquer',l:'B1',opts:['exclure','impliquer','ignorer','rejeter']},
  {w:'reduzir',t:'réduire',l:'B1',opts:['augmenter','réduire','maintenir','créer']},
  {w:'consciente',t:'conscient',l:'B1',opts:['ignorant','conscient','indifférent','surpris']},
  {w:'atual',t:'actuel',l:'B1',opts:['ancien','futur','actuel','passé']},
  {w:'oportunidade',t:'opportunité',l:'B1',opts:['obstacle','opportunité','problème','risque']},
  {w:'aumentar',t:'augmenter',l:'B1',opts:['diminuer','augmenter','stabiliser','stopper']},
  {w:'semelhante',t:'similaire',l:'B1',opts:['différent','opposé','similaire','contraire']},
  {w:'depender',t:'dépendre',l:'B1',opts:['dépendre','décider','choisir','imposer']},
  {w:'fornecer',t:'fournir',l:'B1',opts:['retirer','fournir','demander','refuser']},
  {w:'gerir',t:'gérer',l:'B1',opts:['échouer','abandonner','gérer','perdre']},
  {w:'sugerir',t:'suggérer',l:'B1',opts:['refuser','imposer','suggérer','interdire']},
  {w:'esforço',t:'effort',l:'B1',opts:['résultat','effort','succès','échec']},
  {w:'mencionar',t:'mentionner',l:'B1',opts:['oublier','cacher','mentionner','nier']},
  {w:'objetivo',t:'objectif',l:'B1',opts:['résultat','cause','objectif','effet']},
  {w:'salientar',t:'souligner',l:'B2',opts:['souligner','traduire','organiser','supprimer']},
  {w:'resiliente',t:'résilient',l:'B2',opts:['résilient','fragile','logique','créatif']},
  {w:'ambíguo',t:'ambigu',l:'B2',opts:['clair','précis','ambigu','simple']},
  {w:'defensor',t:'défenseur',l:'B2',opts:['opposant','défenseur','observateur','critique']},
  {w:'coerente',t:'cohérent',l:'B2',opts:['cohérent','confus','ambigu','contradictoire']},
  {w:'subentender',t:'sous-entendre',l:'B2',opts:['affirmer','nier','sous-entendre','expliquer']},
  {w:'perceber',t:'percevoir',l:'B2',opts:['ignorer','percevoir','oublier','confondre']},
  {w:'considerável',t:'considérable',l:'B2',opts:['minime','considérable','moyen','négligeable']},
  {w:'reticente',t:'réticent',l:'B2',opts:['enthousiaste','réticent','indifférent','pressé']},
  {w:'autêntico',t:'authentique',l:'B2',opts:['faux','authentique','ordinaire','commun']},
  {w:'persistir',t:'persister',l:'B2',opts:['abandonner','persister','hésiter','renoncer']},
  {w:'afirmar',t:'affirmer',l:'B2',opts:['nier','douter','affirmer','ignorer']},
  {w:'transmitir',t:'transmettre',l:'B2',opts:['cacher','transmettre','perdre','bloquer']},
  {w:'inerente',t:'inhérent',l:'B2',opts:['externe','inhérent','artificiel','ajouté']},
  {w:'suposição',t:'supposition',l:'B2',opts:['certitude','preuve','supposition','démonstration']},
  {w:'polivalente',t:'polyvalent',l:'B2',opts:['spécialisé','polyvalent','limité','rigide']},
  {w:'dilema',t:'dilemme',l:'B2',opts:['solution','choix facile','dilemme','certitude']},
  {w:'conciso',t:'concis',l:'B2',opts:['long','vague','concis','détaillé']},
  {w:'explícito',t:'explicite',l:'B2',opts:['implicite','explicite','vague','ambigu']},
  {w:'pragmático',t:'pragmatique',l:'C1',opts:['pragmatique','symbolique','rhétorique','empirique']},
  {w:'hegemonia',t:'hégémonie',l:'C1',opts:['démocratie','hégémonie','anarchie','fédéralisme']},
  {w:'meticuloso',t:'méticuleux',l:'C1',opts:['négligent','méticuleux','ambitieux','créatif']},
  {w:'mitigar',t:'atténuer',l:'C1',opts:['atténuer','aggraver','ignorer','amplifier']},
  {w:'eloquente',t:'éloquent',l:'C1',opts:['silencieux','éloquent','hésitant','confus']},
  {w:'nuance',t:'nuance',l:'C1',opts:['nuance','généralité','exagération','simplification']},
  {w:'suscitar',t:'susciter',l:'C1',opts:['supprimer','susciter','éviter','cacher']},
  {w:'paradigma',t:'paradigme',l:'C1',opts:['exception','paradigme','anomalie','détail']},
  {w:'dicotomia',t:'dichotomie',l:'C1',opts:['harmonie','dichotomie','continuité','unité']},
  {w:'tênue',t:'ténu',l:'C1',opts:['solide','évident','ténu','certain']},
  {w:'corroborar',t:'corroborer',l:'C1',opts:['réfuter','corroborer','ignorer','contredire']},
  {w:'supérfluo',t:'superflu',l:'C1',opts:['essentiel','superflu','utile','indispensable']},
  {w:'aliviar',t:'soulager',l:'C1',opts:['aggraver','soulager','ignorer','amplifier']},
  {w:'culminar',t:'culminer',l:'C1',opts:['débuter','culminer','stagner','décliner']},
  {w:'ambivalente',t:'ambivalent',l:'C1',opts:['convaincu','ambivalent','indifférent','enthousiaste']},
  {w:'exacerbar',t:'exacerber',l:'C1',opts:['améliorer','exacerber','stabiliser','ignorer']},
  {w:'discernir',t:'discerner',l:'C1',opts:['confondre','discerner','ignorer','inventer']},
  {w:'inato',t:'inné',l:'C1',opts:['acquis','appris','inné','imposé']},
  {w:'brevidade',t:'brièveté',l:'C1',opts:['longueur','brièveté','complexité','répétition']},
];

let testIdx = 0;
let testScores = {A1:0,A2:0,B1:0,B2:0,C1:0};
let testMax    = {A1:0,A2:0,B1:0,B2:0,C1:0};
let TEST_SHUFFLED = [];

function startPlacementTest() {
  loadState();
  showScreen('test');
  testIdx = 0;
  testScores = {A1:0,A2:0,B1:0,B2:0,C1:0};
  testMax    = {A1:0,A2:0,B1:0,B2:0,C1:0};
  const byLevel = {};
  TEST_BANK.forEach(q => { if (!byLevel[q.l]) byLevel[q.l] = []; byLevel[q.l].push(q); });
  Object.keys(byLevel).forEach(l => shuffle(byLevel[l]));
  TEST_SHUFFLED = ['A1','A2','B1','B2','C1'].flatMap(l => (byLevel[l] || []).slice(0, 8));
  TEST_SHUFFLED.forEach(q => { testMax[q.l]++; });
  renderTestWord();
}

function renderTestWord() {
  if (testIdx >= TEST_SHUFFLED.length) { endPlacementTest(); return; }
  const q = TEST_SHUFFLED[testIdx];
  document.getElementById('test-progress-label').textContent = (testIdx + 1) + ' / ' + TEST_SHUFFLED.length;
  document.getElementById('test-level-label').textContent = q.l;
  document.getElementById('test-badge').textContent = q.l;
  document.getElementById('test-word').textContent = q.w;
  document.getElementById('test-bar').style.width = (testIdx / TEST_SHUFFLED.length * 100) + '%';
  const opts = shuffle([...q.opts]);
  const container = document.getElementById('test-opts');
  container.innerHTML = '';
  opts.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'test-opt';
    btn.textContent = opt;
    btn.onclick = () => handleTestAnswer(btn, opt, q);
    container.appendChild(btn);
  });
}

function handleTestAnswer(btn, chosen, q) {
  document.querySelectorAll('.test-opt').forEach(b => b.disabled = true);
  const ok = chosen === q.t;
  btn.classList.add(ok ? 'correct' : 'wrong');
  if (!ok) document.querySelectorAll('.test-opt').forEach(b => { if (b.textContent === q.t) b.classList.add('correct'); });
  if (ok) testScores[q.l]++;
  setTimeout(() => { testIdx++; renderTestWord(); }, 900);
}

function skipTest() {
  loadState();
  showScreen('app');
  updateNavLevel();
  renderGame();
}

function endPlacementTest() {
  const levels = ['A1','A2','B1','B2','C1'];
  let detected = 'A1';
  for (const l of levels) {
    const pct = testScores[l] / (testMax[l] || 8);
    if (pct >= 0.6) detected = l;
  }
  state.level = detected;
  saveState();
  showToast('Niveau détecté : ' + detected + ' 🎯', 'levelup');
  showScreen('app');
  updateNavLevel();
  renderGame();
}

// ══ APP ══
function switchMode(mode, btn) {
  appState.mode = mode;
  appState.showingProfil = false;
  appState.currentWord = null;
  document.getElementById('filter-bar').style.display = '';
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  if (mode === 'sprint') { startSprint(); return; }
  renderGame();
}

function setFilter(f, btn) {
  appState.filter = f;
  appState.currentWord = null;
  document.querySelectorAll('.filter-chip').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  if (!appState.showingProfil) renderGame();
}

function renderGame() {
  if (appState.showingProfil) return;
  const area = document.getElementById('game-area');
  const mode = appState.mode;
  if (mode === 'flash')  renderFlash(area);
  else if (mode === 'qcm')    renderQCM(area);
  else if (mode === 'dictee') renderDictee(area);
  else if (mode === 'saisie') renderSaisie(area);
  else if (mode === 'retour') renderRetour(area);
}

// ── FLASH ──
function renderFlash(area) {
  const w = pickWord(appState.currentWord);
  appState.currentWord = w;
  area.innerHTML = `
    ${masteryDotsHTML(w.pt)}
    <div class="flashcard-wrap" onclick="flipCard()">
      <div class="flashcard" id="flashcard">
        <div class="fc-face fc-front">
          <span class="fc-cat">${w.c}</span>
          <div class="fc-lang">PORTUGUÊS</div>
          <div class="fc-word">${w.pt}</div>
          ${w.xpt ? `<div class="fc-phrase">${w.xpt}</div>` : ''}
          <div class="fc-tap">Tapper pour retourner</div>
        </div>
        <div class="fc-face fc-back">
          <span class="fc-cat">${w.n}</span>
          <div class="fc-lang">FRANÇAIS</div>
          <div class="fc-word">${w.fr}</div>
          ${w.xfr ? `<div class="fc-phrase">${w.xfr}</div>` : ''}
        </div>
      </div>
    </div>
    <div class="flash-btns">
      <button class="flash-btn flash-bad"  onclick="handleFlash(0)">😕 Raté</button>
      <button class="flash-btn flash-ok"   onclick="handleFlash(1)">🤔 Presque</button>
      <button class="flash-btn flash-good" onclick="handleFlash(2)">✅ Connu</button>
    </div>`;
}

function flipCard() {
  const c = document.getElementById('flashcard');
  if (c) c.classList.toggle('flipped');
}

function handleFlash(score) {
  const w = appState.currentWord;
  if (!w) return;
  const p = getProgress(w.pt);
  if (score === 2) p.flash = Math.min(p.flash + 1, 5);
  else if (score === 0) p.flash = Math.max(p.flash - 1, 0);
  state.totalSeen++;
  if (score > 0) state.totalCorrect++;
  saveState();
  if (score === 2) showToast('✅ Bem!', 'ok');
  renderFlash(document.getElementById('game-area'));
}

// ── QCM ──
function renderQCM(area) {
  const w = pickWord(appState.currentWord);
  appState.currentWord = w;
  const opts = shuffle([w, ...getDistractors(w, 3)]);
  area.innerHTML = `
    ${masteryDotsHTML(w.pt)}
    <div class="game-card">
      <div class="game-question">${w.pt}</div>
      ${w.xpt ? `<div class="game-phrase">🇵🇹 ${w.xpt}</div>` : ''}
      <div class="qcm-opts" id="qcm-opts">
        ${opts.map(o => `<button class="qcm-opt" data-fr="${o.fr}" data-correct="${w.fr}" data-pt="${w.pt}">${o.fr}</button>`).join('')}
      </div>
    </div>`;
  document.querySelectorAll('.qcm-opt').forEach(btn => {
    btn.onclick = () => handleQCM(btn);
  });
}

function handleQCM(btn) {
  const chosen  = btn.dataset.fr;
  const correct = btn.dataset.correct;
  const pt      = btn.dataset.pt;
  document.querySelectorAll('.qcm-opt').forEach(b => b.disabled = true);
  const ok = chosen === correct;
  btn.classList.add(ok ? 'correct' : 'wrong');
  if (!ok) document.querySelectorAll('.qcm-opt').forEach(b => { if (b.dataset.fr === correct) b.classList.add('correct'); });
  const p = getProgress(pt);
  if (ok) { p.qcm = Math.min(p.qcm + 1, 5); state.totalCorrect++; showToast('✅ Correto!', 'ok'); }
  else    { p.qcm = Math.max(p.qcm - 1, 0); showToast('❌ ' + correct, 'bad'); }
  state.totalSeen++;
  saveState();
  setTimeout(() => renderQCM(document.getElementById('game-area')), 1100);
}

// ── DICTÉE ──
function renderDictee(area) {
  const w = pickWord(appState.currentWord);
  appState.currentWord = w;
  area.innerHTML = `
    ${masteryDotsHTML(w.pt)}
    <div class="game-card">
      <div style="text-align:center">
        <button class="dictee-play" id="dictee-btn" onclick="speakWord('${w.pt.replace(/'/g, "\\'")}')">🔊 Écouter</button>
      </div>
      <div class="game-subq">Écris le mot que tu entends en portugais</div>
      <input class="saisie-input" id="dictee-input" placeholder="…" autocomplete="off" autocorrect="off" spellcheck="false">
      <div id="dictee-result"></div>
      <button class="btn-submit" id="dictee-submit">Valider</button>
    </div>`;
  const input = document.getElementById('dictee-input');
  const submit = document.getElementById('dictee-submit');
  const check = () => checkDictee(w.pt, w.fr);
  submit.onclick = check;
  input.addEventListener('keydown', e => { if (e.key === 'Enter') check(); });
  setTimeout(() => speakWord(w.pt), 400);
}

function speakWord(word) {
  if (!window.speechSynthesis) return;
  const u = new SpeechSynthesisUtterance(word);
  u.lang = 'pt-PT';
  u.rate = 0.85;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}

function checkDictee(pt, fr) {
  const input = document.getElementById('dictee-input');
  if (!input || input.disabled) return;
  const val = input.value.trim();
  const ok = normalize(val) === normalize(pt);
  input.classList.add(ok ? 'correct' : 'wrong');
  input.disabled = true;
  document.getElementById('dictee-submit').disabled = true;
  const p = getProgress(pt);
  if (ok) { p.dictee = Math.min(p.dictee + 1, 5); state.totalCorrect++; showToast('✅ Perfeito!', 'ok'); }
  else    { p.dictee = Math.max(p.dictee - 1, 0); showToast('❌ ' + pt, 'bad'); }
  state.totalSeen++;
  saveState();
  const res = document.getElementById('dictee-result');
  res.innerHTML = `<div class="result-msg ${ok ? 'ok' : 'bad'}">${ok ? 'Correto!' : 'La réponse était : <strong>' + pt + '</strong> — ' + fr}</div>`;
  const btn = document.createElement('button');
  btn.className = 'btn-next';
  btn.textContent = 'Suivant →';
  btn.onclick = () => renderDictee(document.getElementById('game-area'));
  res.appendChild(btn);
}

// ── SAISIE LIBRE ──
function renderSaisie(area) {
  const w = pickWord(appState.currentWord);
  appState.currentWord = w;
  area.innerHTML = `
    ${masteryDotsHTML(w.pt)}
    <div class="game-card">
      <div class="game-question">${w.fr}</div>
      ${w.xfr ? `<div class="game-phrase">🇫🇷 ${w.xfr}</div>` : ''}
      <div class="game-subq">Comment dit-on en portugais ?</div>
      <input class="saisie-input" id="saisie-input" placeholder="…" autocomplete="off" autocorrect="off" spellcheck="false">
      <div id="saisie-result"></div>
      <button class="btn-submit" id="saisie-submit">Valider</button>
    </div>`;
  const input = document.getElementById('saisie-input');
  const submit = document.getElementById('saisie-submit');
  const check = () => checkSaisie(w.pt, w.fr);
  submit.onclick = check;
  input.addEventListener('keydown', e => { if (e.key === 'Enter') check(); });
}

function checkSaisie(pt, fr) {
  const input = document.getElementById('saisie-input');
  if (!input || input.disabled) return;
  const val = input.value.trim();
  const ok = normalize(val) === normalize(pt);
  input.classList.add(ok ? 'correct' : 'wrong');
  input.disabled = true;
  document.getElementById('saisie-submit').disabled = true;
  const p = getProgress(pt);
  if (ok) { p.saisie = Math.min(p.saisie + 1, 5); state.totalCorrect++; showToast('✅ Perfeito!', 'ok'); }
  else    { p.saisie = Math.max(p.saisie - 1, 0); showToast('❌ ' + pt, 'bad'); }
  state.totalSeen++;
  saveState();
  const res = document.getElementById('saisie-result');
  res.innerHTML = `<div class="result-msg ${ok ? 'ok' : 'bad'}">${ok ? 'Excelente!' : 'La réponse était : <strong>' + pt + '</strong>'}</div>`;
  const btn = document.createElement('button');
  btn.className = 'btn-next';
  btn.textContent = 'Suivant →';
  btn.onclick = () => renderSaisie(document.getElementById('game-area'));
  res.appendChild(btn);
}

// ── RETOURNEMENT FR→PT ──
function renderRetour(area) {
  const w = pickWord(appState.currentWord);
  appState.currentWord = w;
  const opts = shuffle([w, ...getDistractors(w, 3)]);
  area.innerHTML = `
    ${masteryDotsHTML(w.pt)}
    <div class="game-card">
      <div class="game-question">${w.fr}</div>
      ${w.xfr ? `<div class="game-phrase">🇫🇷 ${w.xfr}</div>` : ''}
      <div class="game-subq">Quel est le mot en portugais ?</div>
      <div class="qcm-opts">
        ${opts.map(o => `<button class="qcm-opt" data-pt="${o.pt}" data-correct="${w.pt}" data-fr="${w.fr}">${o.pt}</button>`).join('')}
      </div>
    </div>`;
  document.querySelectorAll('.qcm-opt').forEach(btn => {
    btn.onclick = () => handleRetour(btn);
  });
}

function handleRetour(btn) {
  const chosen  = btn.dataset.pt;
  const correct = btn.dataset.correct;
  document.querySelectorAll('.qcm-opt').forEach(b => b.disabled = true);
  const ok = chosen === correct;
  btn.classList.add(ok ? 'correct' : 'wrong');
  if (!ok) document.querySelectorAll('.qcm-opt').forEach(b => { if (b.dataset.pt === correct) b.classList.add('correct'); });
  const p = getProgress(correct);
  if (ok) { p.retour = Math.min(p.retour + 1, 5); state.totalCorrect++; showToast('✅ Correto!', 'ok'); }
  else    { p.retour = Math.max(p.retour - 1, 0); showToast('❌ ' + correct, 'bad'); }
  state.totalSeen++;
  saveState();
  setTimeout(() => renderRetour(document.getElementById('game-area')), 1100);
}

// ── SPRINT ──
function startSprint() {
  clearInterval(appState.sprintTimer);
  appState.sprintTimeLeft = 60;
  appState.sprintScore = 0;
  appState.currentWord = null;
  renderSprintWord();
  appState.sprintTimer = setInterval(() => {
    appState.sprintTimeLeft--;
    const el = document.getElementById('sprint-timer');
    if (el) {
      el.textContent = appState.sprintTimeLeft + 's';
      el.className = 'sprint-timer' + (appState.sprintTimeLeft <= 10 ? ' danger' : '');
    }
    if (appState.sprintTimeLeft <= 0) { clearInterval(appState.sprintTimer); endSprint(); }
  }, 1000);
}

function renderSprintWord() {
  const w = pickWord(appState.currentWord);
  appState.currentWord = w;
  const opts = shuffle([w, ...getDistractors(w, 3)]);
  const area = document.getElementById('game-area');
  area.innerHTML = `
    <div class="sprint-header">
      <div>
        <div class="sprint-score-lbl">Score</div>
        <div class="sprint-score-val" id="sprint-score">${appState.sprintScore}</div>
      </div>
      <div class="sprint-timer" id="sprint-timer">${appState.sprintTimeLeft}s</div>
    </div>
    <div class="game-card">
      <div class="game-question">${w.pt}</div>
      <div class="qcm-opts">
        ${opts.map(o => `<button class="qcm-opt" data-fr="${o.fr}" data-correct="${w.fr}" data-pt="${w.pt}">${o.fr}</button>`).join('')}
      </div>
    </div>`;
  document.querySelectorAll('.qcm-opt').forEach(btn => {
    btn.onclick = () => handleSprint(btn);
  });
}

function handleSprint(btn) {
  const ok = btn.dataset.fr === btn.dataset.correct;
  btn.classList.add(ok ? 'correct' : 'wrong');
  document.querySelectorAll('.qcm-opt').forEach(b => b.disabled = true);
  const p = getProgress(btn.dataset.pt);
  if (ok) { appState.sprintScore++; p.sprint = Math.min(p.sprint + 1, 5); state.totalCorrect++; }
  else    { p.sprint = Math.max(p.sprint - 1, 0); }
  state.totalSeen++;
  saveState();
  setTimeout(renderSprintWord, 400);
}

function endSprint() {
  const area = document.getElementById('game-area');
  area.innerHTML = `
    <div class="sprint-end">
      <div class="sprint-final">${appState.sprintScore}</div>
      <div class="sprint-final-lbl">mots en 60 secondes</div>
      <div class="sprint-end-btns">
        <button class="btn-primary" onclick="startSprint()">Rejouer</button>
        <button class="btn-ghost" onclick="switchMode('flash', null)">Autre mode</button>
      </div>
    </div>`;
}

// ── PROFIL ──
function showProfil() {
  appState.showingProfil = true;
  document.getElementById('filter-bar').style.display = 'none';
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  const levels = ['A1','A2','B1','B2','C1'];
  const mastered = Object.keys(state.progress).filter(pt => isMastered(pt)).length;
  const successRate = state.totalSeen ? Math.round(state.totalCorrect / state.totalSeen * 100) : 0;
  const area = document.getElementById('game-area');
  area.innerHTML = `
    <div class="profil-wrap">
      <div class="profil-hero">
        <div class="profil-name">🇵🇹 Mon Profil</div>
        <div class="profil-level">Niveau actuel : ${state.level}</div>
      </div>
      <div class="profil-stats">
        <div class="stat-box"><div class="stat-num">${mastered}</div><div class="stat-lbl">Mots maîtrisés</div></div>
        <div class="stat-box"><div class="stat-num">${state.totalSeen || 0}</div><div class="stat-lbl">Réponses</div></div>
        <div class="stat-box"><div class="stat-num">${successRate}%</div><div class="stat-lbl">Taux succès</div></div>
      </div>
      <div class="level-progress">
        <div class="level-progress-title">Progression par niveau</div>
        ${levels.map(l => {
          const inLevel = VOCAB.filter(w => w.n === l);
          const done = inLevel.filter(w => isMastered(w.pt)).length;
          const pct = inLevel.length ? Math.round(done / inLevel.length * 100) : 0;
          return `<div class="level-row">
            <div class="level-badge" style="color:${l === state.level ? 'var(--green3)' : 'var(--muted)'}">${l}</div>
            <div class="level-bar-bg"><div class="level-bar" style="width:${pct}%"></div></div>
            <div class="level-pct">${pct}%</div>
          </div>`;
        }).join('')}
      </div>
      <button class="profil-test-btn" onclick="startPlacementTest()">🎯 ${state.level === 'A1' ? 'Faire le test de placement' : 'Refaire le test'}</button>
      <button class="profil-reset-btn" onclick="resetProgress()">Réinitialiser ma progression</button>
    </div>`;
}

function resetProgress() {
  if (!confirm('Effacer toute ta progression ?')) return;
  state.progress = {};
  state.totalSeen = 0;
  state.totalCorrect = 0;
  saveState();
  showToast('Progression réinitialisée', 'bad');
  showProfil();
}

// ══ INIT ══
loadState();
updateNavLevel();
