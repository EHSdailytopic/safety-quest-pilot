
const $ = id => document.getElementById(id);

let demoQuestions = [];
let level = 1;
let current = null;
let demoIndexByLevel = {1:0,2:0,3:0};
let xp = 0;
let attempts = {};
let selectedZone = null;
let selectedClassCard = null;
let classifyState = {};
let branchPath = [];
let branchNode = null;
let branchFinished = false;
let timedSelections = new Set();
let timerId = null;
let timerLeft = 0;

document.addEventListener('DOMContentLoaded', async () => {
  demoQuestions = await fetch('questions.demo.json').then(r=>r.json());
  document.querySelectorAll('.node').forEach(n => n.onclick = () => setLevel(Number(n.dataset.level)));
  $('checkBtn').onclick = checkAnswer;
  $('nextBtn').onclick = nextGame;
  $('loadApiBtn').onclick = loadFromApi;
  setLevel(1);
});

function setLevel(n){
  level = n;
  document.querySelectorAll('.node').forEach(x => x.classList.toggle('active', Number(x.dataset.level)===n));
  $('levelBadge').textContent = `LEVEL ${n}`;
  if($('demoMode').checked) loadDemoQuestion();
}

function questionsForLevel(){
  return demoQuestions.filter(q => Number(q.level)===level);
}

function loadDemoQuestion(){
  clearTimer();
  const list = questionsForLevel();
  if(!list.length) return;
  const idx = demoIndexByLevel[level] % list.length;
  renderQuestion(list[idx]);
}

function nextGame(){
  if($('demoMode').checked){
    const list = questionsForLevel();
    demoIndexByLevel[level] = (demoIndexByLevel[level] + 1) % list.length;
    loadDemoQuestion();
  } else {
    loadFromApi();
  }
}

async function loadFromApi(){
  clearTimer();
  const url = $('getUrl').value.trim();
  if(!url) return showFeedback(false,'Paste the Get Question Flow URL first.');
  const res = await fetch(url,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({action:'getQuestion',msnv:$('msnv').value.trim(),topic:'T01',level})
  });
  const data = await res.json();
  if(typeof data.gameConfig === 'string'){
    try{ data.gameConfig = JSON.parse(data.gameConfig); }catch{ data.gameConfig = {}; }
  }
  renderQuestion(data);
}

function resetState(){
  clearTimer();
  selectedZone = null;
  selectedClassCard = null;
  classifyState = {};
  branchPath = [];
  branchNode = null;
  branchFinished = false;
  timedSelections = new Set();
  $('feedback').className = 'feedback hidden';
  $('nextBtn').classList.add('hidden');
  $('checkBtn').classList.remove('hidden');
}

function renderQuestion(q){
  resetState();
  current = q;
  $('questionId').textContent = q.questionId || '';
  $('typePill').textContent = q.questionType || 'GAME';
  $('questionText').textContent = q.question || '';
  $('instruction').textContent = q.instruction || '';
  $('progressBar').style.width = `${(Number(q.level||1)/3)*100}%`;
  $('gameArea').innerHTML = '';
  $('timerWrap').classList.add('hidden');

  const map = {
    SpotHazard: renderSpotHazard,
    DragClassify: renderDragClassify,
    Sequence: renderSequence,
    Matching: renderMatching,
    Branching: renderBranching,
    TimedInspection: renderTimedInspection
  };
  (map[q.questionType] || renderUnsupported)(q);
}

function renderUnsupported(){
  $('gameArea').innerHTML = '<p>Unsupported game type.</p>';
}

function renderScene(cfg, multi=false){
  const objs = (cfg.sceneObjects||[]).map(o =>
    `<div class="scene-object" style="left:${o.x}%;top:${o.y}%;font-size:${o.size||40}px">${o.icon||''}</div>`
  ).join('');
  const zones = (cfg.zones||[]).map(z =>
    `<button class="hotspot" data-id="${z.id}" style="left:${z.x}%;top:${z.y}%;width:${z.w}%;height:${z.h}%">
       <span class="hint-label">${escapeHtml(z.label||z.id)}</span>
     </button>`
  ).join('');
  $('gameArea').innerHTML = `<div class="scene">${objs}${zones}</div>`;
  document.querySelectorAll('.hotspot').forEach(el => {
    el.onclick = () => {
      if(multi){
        const id = el.dataset.id;
        if(timedSelections.has(id)){ timedSelections.delete(id); el.classList.remove('selected'); }
        else { timedSelections.add(id); el.classList.add('selected'); }
      }else{
        document.querySelectorAll('.hotspot').forEach(x=>x.classList.remove('selected'));
        el.classList.add('selected');
        selectedZone = el.dataset.id;
      }
    };
  });
}

function renderSpotHazard(q){
  renderScene(q.gameConfig||{}, false);
}

function renderTimedInspection(q){
  renderScene(q.gameConfig||{}, true);
  const secs = Number((q.gameConfig||{}).timeLimit || 25);
  timerLeft = secs;
  $('timerWrap').classList.remove('hidden');
  $('timerText').textContent = timerLeft;
  $('timerBar').style.width = '100%';
  timerId = setInterval(()=>{
    timerLeft--;
    $('timerText').textContent = Math.max(timerLeft,0);
    $('timerBar').style.width = `${Math.max(timerLeft,0)/secs*100}%`;
    if(timerLeft<=0){
      clearTimer();
      showFeedback(false,'Time is up. Check your selected hazards.');
    }
  },1000);
}

function renderDragClassify(q){
  const cfg=q.gameConfig||{};
  classifyState={};
  const cards=(cfg.items||[]).map(it =>
    `<div class="class-card" draggable="true" data-id="${it.id}">${escapeHtml(it.text)}</div>`
  ).join('');
  const zones=(cfg.categories||[]).map(c =>
    `<div class="dropzone ${c.id==='SAFE'?'safe':'unsafe'}" data-cat="${c.id}">
       <h3>${c.icon||''} ${escapeHtml(c.label)}</h3>
       <div class="placed-list"></div>
     </div>`
  ).join('');
  $('gameArea').innerHTML = `<div class="classify-pool" id="classPool">${cards}</div><div class="drop-grid">${zones}</div>`;
  bindClassify();
}

function bindClassify(){
  document.querySelectorAll('.class-card').forEach(card=>{
    card.onclick=()=>{
      document.querySelectorAll('.class-card').forEach(x=>x.classList.remove('selected'));
      card.classList.add('selected');
      selectedClassCard=card.dataset.id;
    };
    card.ondragstart=e=>{
      e.dataTransfer.setData('text/plain',card.dataset.id);
      selectedClassCard=card.dataset.id;
    };
  });
  document.querySelectorAll('.dropzone').forEach(zone=>{
    zone.ondragover=e=>{e.preventDefault();zone.classList.add('over');};
    zone.ondragleave=()=>zone.classList.remove('over');
    zone.ondrop=e=>{
      e.preventDefault();zone.classList.remove('over');
      placeClassCard(e.dataTransfer.getData('text/plain'),zone.dataset.cat);
    };
    zone.onclick=e=>{
      if(e.target.closest('.placed')) return;
      if(selectedClassCard) placeClassCard(selectedClassCard,zone.dataset.cat);
    };
  });
}

function placeClassCard(id,cat){
  if(!id) return;
  classifyState[id]=cat;
  const card=document.querySelector(`.class-card[data-id="${id}"]`);
  if(card) card.remove();
  document.querySelectorAll(`.placed[data-id="${id}"]`).forEach(x=>x.remove());
  const original=(current.gameConfig.items||[]).find(x=>x.id===id);
  const placed=document.createElement('div');
  placed.className='placed';
  placed.dataset.id=id;
  placed.textContent=original?.text||id;
  placed.title='Tap to return';
  placed.onclick=()=>{
    delete classifyState[id];
    placed.remove();
    const newCard=document.createElement('div');
    newCard.className='class-card';
    newCard.draggable=true;
    newCard.dataset.id=id;
    newCard.textContent=original?.text||id;
    $('classPool').appendChild(newCard);
    bindClassify();
  };
  document.querySelector(`.dropzone[data-cat="${cat}"] .placed-list`).appendChild(placed);
  selectedClassCard=null;
  document.querySelectorAll('.class-card').forEach(x=>x.classList.remove('selected'));
}

function renderSequence(q){
  $('gameArea').innerHTML=`<div class="sequence-list" id="sequenceList">${
    (q.gameConfig?.items||[]).map(it=>`
      <div class="sequence-item" draggable="true" data-id="${it.id}">
        <span class="drag">☰</span><span class="text">${escapeHtml(it.text)}</span>
        <button class="mini up">↑</button><button class="mini down">↓</button>
      </div>`).join('')
  }</div>`;
  bindSequence();
}

function bindSequence(){
  const list=$('sequenceList');
  [...list.children].forEach(row=>{
    row.querySelector('.up').onclick=()=>{
      if(row.previousElementSibling) list.insertBefore(row,row.previousElementSibling);
    };
    row.querySelector('.down').onclick=()=>{
      if(row.nextElementSibling) list.insertBefore(row.nextElementSibling,row);
    };
    row.ondragstart=e=>e.dataTransfer.setData('text/plain',row.dataset.id);
    row.ondragover=e=>e.preventDefault();
    row.ondrop=e=>{
      e.preventDefault();
      const id=e.dataTransfer.getData('text/plain');
      const dragged=list.querySelector(`[data-id="${id}"]`);
      if(dragged && dragged!==row) list.insertBefore(dragged,row);
    };
  });
}

function renderMatching(q){
  const cfg=q.gameConfig||{};
  $('gameArea').innerHTML=(cfg.left||[]).map(l=>`
    <div class="match-row" data-left="${l.id}">
      <div class="match-left">${l.icon||''} ${escapeHtml(l.text)}</div>
      <select>
        <option value="">Choose a function…</option>
        ${(cfg.right||[]).map(r=>`<option value="${r.id}">${escapeHtml(r.text)}</option>`).join('')}
      </select>
    </div>`).join('');
}

function renderBranching(q){
  branchNode=(q.gameConfig||{}).startNode;
  branchPath=[];
  branchFinished=false;
  renderBranchNode();
}
function renderBranchNode(){
  const node=current.gameConfig.nodes[branchNode];
  if(node.terminal){
    branchFinished=true;
    $('gameArea').innerHTML=`
      <div class="branch-terminal ${node.result==='safe'?'safe':'unsafe'}">${escapeHtml(node.text)}</div>
      <div class="path-chips">${branchPath.map(x=>`<span class="path-chip">${x}</span>`).join('')}</div>`;
    return;
  }
  $('gameArea').innerHTML=`
    <div class="branch-card">
      <div class="branch-text">${escapeHtml(node.text)}</div>
      ${(node.options||[]).map(o=>`<button class="branch-option" data-value="${o.value}" data-next="${o.next}">${escapeHtml(o.label)}</button>`).join('')}
      <div class="path-chips">${branchPath.map(x=>`<span class="path-chip">${x}</span>`).join('')}</div>
    </div>`;
  document.querySelectorAll('.branch-option').forEach(btn=>btn.onclick=()=>{
    branchPath.push(btn.dataset.value);
    branchNode=btn.dataset.next;
    renderBranchNode();
  });
}

function collectAnswer(){
  if(!current) return '';
  switch(current.questionType){
    case 'SpotHazard':
      return selectedZone||'';
    case 'TimedInspection':
      return [...timedSelections].sort().join('|');
    case 'DragClassify':{
      const cats=(current.gameConfig.categories||[]).map(c=>c.id);
      if(Object.keys(classifyState).length < (current.gameConfig.items||[]).length) return '';
      return cats.map(cat=>{
        const ids=Object.entries(classifyState).filter(([,v])=>v===cat).map(([k])=>k).sort();
        return `${cat}:${ids.join(',')}`;
      }).join('|');
    }
    case 'Sequence':
      return [...document.querySelectorAll('.sequence-item')].map(x=>x.dataset.id).join('|');
    case 'Matching':{
      const rows=[...document.querySelectorAll('.match-row')];
      if(rows.some(r=>!r.querySelector('select').value)) return '';
      return rows.map(r=>`${r.dataset.left}-${r.querySelector('select').value}`).sort().join('|');
    }
    case 'Branching':
      return branchFinished ? branchPath.join('|') : '';
  }
  return '';
}

async function checkAnswer(){
  const answer=collectAnswer();
  if(!answer) return showFeedback(false,'Finish the challenge before checking.');

  if($('demoMode').checked){
    const key=current.questionId;
    attempts[key]=(attempts[key]||0)+1;
    const ok=normalize(answer)===normalize(current.correctAnswer);
    if(ok){
      const earned=attempts[key]===1?Number(current.firstXP||0):Number(current.retryXP||0);
      xp+=earned;
      $('xp').textContent=xp;
      showFeedback(true,`Correct! +${earned} XP — ${current.explanation||''}`);
      $('checkBtn').classList.add('hidden');
      $('nextBtn').classList.remove('hidden');
    }else{
      showFeedback(false,`Not quite. ${current.hint||'Try another approach.'}`);
    }
    return;
  }

  const url=$('submitUrl').value.trim();
  if(!url) return showFeedback(false,'Paste the Submit Answer Flow URL first.');
  const res=await fetch(url,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      msnv:$('msnv').value.trim(),
      topic:'T01',
      level:Number(current.level),
      questionId:current.questionId,
      answer
    })
  });
  const data=await res.json();
  if(data.correct){
    showFeedback(true,`${data.message||'Correct!'} ${data.explanation||''}`);
    $('checkBtn').classList.add('hidden');
    $('nextBtn').classList.remove('hidden');
  }else{
    showFeedback(false,data.message||'Not quite. Try another challenge!');
    if(data.reloadQuestion===true) setTimeout(loadFromApi,900);
  }
}

function showFeedback(ok,msg){
  const box=$('feedback');
  box.className=`feedback ${ok?'ok':'bad'}`;
  box.textContent=msg;
}

function normalize(s){return String(s||'').trim().toUpperCase();}
function clearTimer(){if(timerId){clearInterval(timerId);timerId=null;}}
function escapeHtml(s=''){
  return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}
