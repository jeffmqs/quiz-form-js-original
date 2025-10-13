/* =================== CONFIG =================== */
const GAS_URL = 'https://script.google.com/macros/s/AKfycbzLyUA0qYb-J_FANJ8wxYK_lL9mKrSHGJkRX7Fdfe78Goplb_6X8MgnFdJn-L5sfBGSaw/exec';

/* =================== TELAS =================== */
const scrIntro  = document.getElementById('screen-intro');
const scrSign   = document.getElementById('screen-signup');
const scrQuiz   = document.getElementById('screen-quiz');
const scrResult = document.getElementById('screen-result');

function show(el){
  [scrIntro, scrSign, scrQuiz, scrResult].forEach(s => s.classList.remove('active'));
  el.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'instant' });
}
function goTo(name){
  if (name === 'intro')  return show(scrIntro);
  if (name === 'signup') return show(scrSign);
  if (name === 'quiz')   return show(scrQuiz);
  if (name === 'result') return show(scrResult);
}

/* =================== INTRO → CADASTRO =================== */
document.getElementById('btnStart').addEventListener('click', () => {
  resetFlowForNewRun();
  goTo('signup');
});

/* =================== VOLTAR =================== */
document.querySelectorAll('.formHeader .btn.ghost').forEach(btn => {
  btn.textContent = '';
  btn.setAttribute('aria-label', 'Voltar');
  btn.addEventListener('click', onBack);
});
function onBack(){
  if (scrResult.classList.contains('active')) return goTo('intro');
  if (scrQuiz.classList.contains('active')){
    if (step > 0){ step--; renderQuestion(); }
    else { goTo('signup'); }
    return;
  }
  if (scrSign.classList.contains('active')) return goTo('intro');
  goTo('intro');
}

/* =================== CADASTRO =================== */
const formSignup = document.getElementById('form-signup');

const setErr = (name, msg) => {
  const el = document.querySelector(`.error[data-for="${name}"]`);
  if (el) el.textContent = msg || '';
};
function clearFormErrors(){ ['nome','telefone','escola','serie','quiz','consent'].forEach(n => setErr(n,'')); }

let signupData = {};

/* Helpers de validação de telefone */
const onlyDigits = s => (s || '').replace(/\D+/g, '');
function isAllSame(str){ return /^(\d)\1+$/.test(str); }
function isSequentialAsc(str){
  if (str.length < 3) return false;
  for (let i=1;i<str.length;i++){
    const prev = Number(str[i-1]), cur = Number(str[i]);
    if ((prev+1) % 10 !== cur) return false;
  }
  return true;
}
function isSequentialDesc(str){
  if (str.length < 3) return false;
  for (let i=1;i<str.length;i++){
    const prev = Number(str[i-1]), cur = Number(str[i]);
    if ((prev+9) % 10 !== cur) return false;
  }
  return true;
}

/* DDDs válidos no Brasil (ANATEL) */
const VALID_DDDS = new Set([
  11,12,13,14,15,16,17,18,19,
  21,22,24,27,28,
  31,32,33,34,35,37,38,
  41,42,43,44,45,46,47,48,49,
  51,53,54,55,
  61,62,63,64,65,66,67,68,69,
  71,73,74,75,77,79,
  81,82,83,84,85,86,87,88,89,
  91,92,93,94,95,96,97,98,99
]);

/* Escola — impedir abreviações aleatórias e exigir nome completo
   Regras:
   - Deve começar com um dos prefixos: Colégio, Escola, Instituto, Centro, Liceu
   - Deve conter pelo menos 2 palavras com 3+ letras (evita "Colégio X" e "Esc. ABC")
   - Não aceitar abreviações comuns como "Col.", "Esc.", "Inst.", "Cen.", "Lic."
*/
const SCHOOL_PREFIX = /^(col[eé]gio|escola|instituto|centro|liceu)\b/i;
const FORBIDDEN_ABBR = /\b(col\.|esc\.|inst\.|cen\.|lic\.)\b/i;
function isValidSchoolName(name){
  const s = (name || '').trim().replace(/\s+/g,' ');
  if (!SCHOOL_PREFIX.test(s)) return false;
  if (FORBIDDEN_ABBR.test(s)) return false;
  const parts = s.split(' ').filter(w => w.length >= 3);
  return parts.length >= 2;
}

formSignup.addEventListener('submit', (e) => {
  e.preventDefault();
  clearFormErrors();
  const data = Object.fromEntries(new FormData(formSignup).entries());
  let ok = true;

  // Nome
  if (!data.nome || data.nome.trim().length < 3) { setErr('nome', 'Informe seu nome completo.'); ok=false; }

  // Telefone
  const tel = onlyDigits(data.telefone);
  if (tel.length !== 11){
    setErr('telefone', 'Informe um telefone com DDD (11 dígitos).');
    ok = false;
  } else {
    const ddd = Number(tel.slice(0,2));
    if (!VALID_DDDS.has(ddd)){
      setErr('telefone', 'DDD inválido para o Brasil.');
      ok = false;
    } else if (isAllSame(tel) || isSequentialAsc(tel) || isSequentialDesc(tel)){
      setErr('telefone', 'Telefone não pode ter todos iguais ou sequência (123… / 987…).');
      ok = false;
    }
  }

  // Escola
  if (!data.escola || !isValidSchoolName(data.escola)){
    setErr('escola', 'Digite o nome completo da escola (ex.: Colégio Motivo, Escola Adventista).');
    ok = false;
  }

  // Série (select)
  if (!data.serie){
    setErr('serie', 'Selecione sua série.');
    ok = false;
  }

  // LGPD
  const consentEl = document.getElementById('consent');
  const consentGiven = !!consentEl?.checked;
  if (!consentGiven){
    setErr('consent', 'Para continuar, é necessário aceitar o tratamento de dados (LGPD).');
    ok = false;
  }

  const CONSENT_TEXT_VERSION = 'v1.0 (2025-09-24)';
  const consentAtISO = new Date().toISOString();
  const userAgent = navigator.userAgent || '';

  if (!ok) return;

  signupData = {
    ...data,
    telefone: tel,
    consent: consentGiven,
    consent_at: consentAtISO,
    consent_text_version: CONSENT_TEXT_VERSION,
    user_agent: userAgent
  };
  goTo('quiz');
  step = 0;
  renderQuestion();
});

/* =================== QUIZ =================== */
const questions = [
  { title: 'Quando você pensa no seu futuro, o que mais te motiva?',
    options: [
      { label: 'Comunicar ideias que inspiram ou informam o mundo.', k: 'H' },
      { label: 'Criar soluções inteligentes para problemas complexos.', k: 'E' },
      { label: 'Cuidar das pessoas e fazer diferença na vida delas.', k: 'S' },
    ]},
  { title: 'Imagine que está vivendo um dia perfeito. O que você está fazendo?',
    options: [
      { label: 'Conversando, escrevendo ou apresentando um projeto criativo.', k:'H' },
      { label: 'Resolvendo desafios lógicos, programando ou construindo algo novo.', k:'E' },
      { label: 'Ajudando alguém com atenção, empatia e conhecimento.', k:'S' },
    ]},
  { title: 'Seus amigos sempre te procuram para…',
    options: [
      { label: 'Falar sobre sentimentos, conselhos ou ideias inspiradoras.', k:'H' },
      { label: 'Ajudar a entender algo difícil ou resolver um problema.',    k:'E' },
      { label: 'Oferecer apoio, cuidado ou acolhimento.',                    k:'S' },
    ]},
  { title: 'Sobre seu jeito de ver o mundo...',
    options: [
      { label: '“As palavras têm o poder de mudar o mundo.”', k:'H' },
      { label: '“Tudo tem uma lógica. É só encontrar a fórmula.”', k:'E' },
      { label: '“Cuidar de alguém é a forma mais nobre de se conectar.”', k:'S' },
    ]},
  { title: 'Onde você se imagina trabalhando daqui a 10 anos?',
    options: [
      { label: 'Em uma agência, redação, palco ou frente às câmeras.', k:'H' },
      { label: 'Num laboratório, escritório de tecnologia ou empresa de inovação.', k:'E' },
      { label: 'Em um hospital, clínica, ONG ou comunidade.', k:'S' },
    ]},
  { title: 'Se você fosse liderar uma campanha social, qual seria o tema?',
    options: [
      { label: 'Combate à desinformação e valorização da cultura.', k:'H' },
      { label: 'Soluções sustentáveis e tecnologias verdes.',        k:'E' },
      { label: 'Saúde mental e bem-estar para todos.',               k:'S' },
    ]},
  { title: 'Seu estilo de aprendizado é mais próximo de...',
    options: [
      { label: 'Atividades práticas com interação e criatividade.', k:'H' },
      { label: 'Raciocínio analítico, exatas e desafios com lógica.', k:'E' },
      { label: 'Experiências reais e empatia com o outro.', k:'S' },
    ]},
  { title: 'Qual é o seu papel natural em uma equipe?',
    options: [
      { label: 'Aquele que articula, apresenta ideias e motiva.', k:'H' },
      { label: 'Quem organiza, estrutura e propõe soluções técnicas.', k:'E' },
      { label: 'O que escuta, acolhe e traz equilíbrio ao grupo.', k:'S' },
    ]},
  { title: 'O que mais importa para você em uma profissão?',
    options: [
      { label: 'Liberdade de expressão e impacto cultural.', k:'H' },
      { label: 'Desafios constantes, inovação e raciocínio.', k:'E' },
      { label: 'Transformar vidas e promover bem-estar.',     k:'S' },
    ]},
  { title: 'Num universo cheio de protagonistas incríveis, quem tem mais a ver com você?',
    options: [
      { label: 'Como o Homem-Aranha (Peter Parker) ou a Katara (...), você sente que nasceu para cuidar das pessoas e fazer a diferença com empatia e coragem.', k:'S' },
      { label: 'Como o Tony Stark (...) ou a Hermione Granger (...), você é movido(a) pela curiosidade, ama resolver problemas e usa a mente como sua maior ferramenta.', k:'E' },
      { label: 'Como o Miles Morales (...) ou a Raven (...), você tem estilo, visão crítica e se expressa com intensidade. Sua força está em ser autêntico(a).', k:'H' },
    ]},
];

let answers = [];
let scores  = { H:0, E:0, S:0 };
let step    = 0;

const qTitle      = document.getElementById('qTitle');
const qOptions    = document.getElementById('qOptions');
const btnNext     = document.getElementById('btnNext');
const progressTxt = document.getElementById('progressText');
const progressBar = document.getElementById('progressBar');

/* Embaralhamento estável por pergunta */
const shuffledOptions = {};
function shuffleArray(arr){
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function renderQuestion(){
  setErr('quiz','');
  const q = questions[step];
  if (!shuffledOptions[step]) shuffledOptions[step] = shuffleArray(q.options);
  const opts = shuffledOptions[step];

  qTitle.textContent = q.title;
  qOptions.innerHTML = '';
  const letters = ['A','B','C'];
  opts.forEach((opt, idx) => {
    const id = `opt-${step}-${idx}`;
    const wrap = document.createElement('label');
    wrap.className = 'option';
    wrap.setAttribute('data-letter', letters[idx]);
    wrap.innerHTML = `
      <input type="radio" name="answer" value="${opt.k}" id="${id}">
      <span>${opt.label}</span>
    `;
    qOptions.appendChild(wrap);
  });

  if (answers[step]) {
    const val = answers[step];
    const optToSelect = Array.from(qOptions.querySelectorAll('label.option'))
      .find(l => l.querySelector('input')?.value === val);
    if (optToSelect) {
      optToSelect.classList.add('selected');
      optToSelect.querySelector('input').checked = true;
    }
  }

  progressTxt.textContent = `${step+1}/${questions.length}`;
  progressBar.style.width = `${((step+1)/questions.length)*100}%`;
}

qOptions.addEventListener('click', (e) => {
  const label = e.target.closest('label.option');
  if (!label) return;
  const input = label.querySelector('input[type="radio"]');
  if (input) input.checked = true;
  qOptions.querySelectorAll('.option').forEach(o => o.classList.remove('selected'));
  label.classList.add('selected');
});

/* Envio */
async function postToGAS(payload){
  try{
    const resp = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
    return (resp.type === 'opaque' || resp.ok);
  }catch(e){
    console.error(e);
    return false;
  }
}

btnNext.addEventListener('click', async () => {
  const chosen = document.querySelector('input[name="answer"]:checked');
  if (!chosen){
    setErr('quiz', 'Selecione uma opção para continuar.');
    return;
  }
  setErr('quiz','');

  const newK = chosen.value;
  const prevK = answers[step];

  if (prevK) { scores[prevK] = Math.max(0, scores[prevK] - 1); }
  answers[step] = newK;
  scores[newK]++;

  if (step < questions.length - 1){
    step++;
    renderQuestion();
  } else {
    const result = pickWinner(scores);

    const oldLabel = btnNext.textContent;
    btnNext.disabled = true;
    btnNext.textContent = 'Enviando…';

    const ok = await postToGAS({
      ...signupData,
      respostas: answers,
      placar: scores,
      perfil: result
    });

    btnNext.disabled = false;
    btnNext.textContent = oldLabel;

    renderResult(result);
    goTo('result');

    const sendMsg = document.getElementById('sendMsg');
    const btnSendEl = document.getElementById('btnSend');
    if (ok){
      if (sendMsg){ sendMsg.style.color = '#1a7f37'; sendMsg.textContent = '✅ Concluído com sucesso!'; }
    }else{
      if (sendMsg){ sendMsg.style.color = '#b40000'; sendMsg.textContent = '⚠️ Não foi possível enviar automaticamente. Você pode tentar novamente pelo botão acima.'; }
    }
    if (btnSendEl){ btnSendEl.remove(); }
  }
});

/* Desempate aleatório entre os maiores */
function pickWinner({H,E,S}){
  const max = Math.max(H, E, S);
  const tied = [];
  if (H === max) tied.push('H');
  if (E === max) tied.push('E');
  if (S === max) tied.push('S');
  const idx = Math.floor(Math.random() * tied.length);
  return tied[idx];
}

/* =================== RESULTADO =================== */
const resultContent = document.getElementById('resultContent');
let finalProfile = '';

function renderResult(k){
  let title='', desc='', cursos=[];
  if (k==='H'){
    title = 'Seu perfil é: Humanas & Comunicação';
    desc  = 'Você tem o dom da expressão, da empatia e da conexão com o outro. Seu futuro pode estar entre as palavras, ideias e relações.';
    cursos = [
      'Administração','Ciências Econômicas','Ciências Contábeis','Direito','Filosofia','Fotografia',
      'Gestão de RH','História','Jornalismo','Letras (Português, Português e Inglês, Português e Espanhol)',
      'Pedagogia','Psicologia','Publicidade e Propaganda','Serviço Social','Teologia'
    ];
  }
  if (k==='E'){
    title = 'Seu perfil é: Exatas & Tecnologia';
    desc  = 'Você tem uma mente lógica, investigativa e movida a desafios. Curioso por natureza, adora entender como as coisas funcionam e busca criar soluções para o mundo.';
    cursos = [
      'Arquitetura e Urbanismo','Banco de Dados – IA e Ciência de Dados','Ciência da Computação',
      'Ciências Contábeis','Ciências Econômicas','Engenharia da Complexidade (pioneiro e internacional)',
      'Engenharias (Civil, de Produção, Química e Ambiental)','Física','Inteligência Artificial',
      'Jogos Digitais','Logística','Química','Sistemas para a Internet','Matemática'
    ];
  }
  if (k==='S'){
    title = 'Seu perfil é: Saúde & Ciências da Vida';
    desc  = 'Você tem empatia, sensibilidade e vontade genuína de cuidar do outro. Sua vocação é transformar vidas por meio do conhecimento e do acolhimento.';
    cursos = [
      'Medicina','Enfermagem','Psicologia','Fisioterapia','Fonoaudiologia','Farmácia','Nutrição','Ciências Biológicas'
    ];
  }

  resultContent.innerHTML = `
    <h3>${title}</h3>
    <p>${desc}</p>
    <p><strong>Cursos Unicap para você:</strong></p>
    <ul>${cursos.map(c => `<li>${c}</li>`).join('')}</ul>
  `;

  finalProfile = k;
}

/* =================== ENVIO → GOOGLE SHEETS =================== */
const btnSend = document.getElementById('btnSend');
const sendMsg = document.getElementById('sendMsg');

/* botão “Enviar” é removido quando o envio já ocorreu no último OK */
if (btnSend){ btnSend.remove(); }

/* =================== UTIL =================== */
function resetFlowForNewRun(){
  answers = [];
  scores  = {H:0,E:0,S:0};
  step    = 0;
  for (const k in shuffledOptions) delete shuffledOptions[k];
  const sendMsg = document.getElementById('sendMsg');
  if (sendMsg) sendMsg.textContent = '';
}
