
let demoQuestions=[], demoIndex=0, current=null, xp=0, selectedImage=null, selectedZone=null;

const $=id=>document.getElementById(id);
document.addEventListener('DOMContentLoaded', async ()=>{
  demoQuestions = await fetch('questions.demo.json').then(r=>r.json());
  $('startBtn').onclick=loadQuestion;
  $('submitBtn').onclick=submitAnswer;
  $('nextDemo').onclick=()=>{if(!$('demoMode').checked)return;demoIndex=(demoIndex+1)%demoQuestions.length;renderQuestion(demoQuestions[demoIndex]);};
  $('prevDemo').onclick=()=>{if(!$('demoMode').checked)return;demoIndex=(demoIndex-1+demoQuestions.length)%demoQuestions.length;renderQuestion(demoQuestions[demoIndex]);};
});

async function loadQuestion(){
  if($('demoMode').checked){
    const lvl=Number($('level').value);
    const matches=demoQuestions.filter(q=>q.level===lvl);
    if(!matches.length)return;
    const q=matches[demoIndex%matches.length];
    renderQuestion(q);
    return;
  }
  const url=$('getUrl').value.trim();
  if(!url)return alert('Paste Get Question Flow URL');
  const res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
    action:'getQuestion',msnv:$('msnv').value.trim(),topic:'T01',level:Number($('level').value)
  })});
  const data=await res.json();
  if(typeof data.gameConfig==='string'){try{data.gameConfig=JSON.parse(data.gameConfig)}catch{data.gameConfig={}}}
  renderQuestion(data);
}

function renderQuestion(q){
  current=q; selectedImage=null; selectedZone=null;
  $('gameCard').classList.remove('hidden');
  $('feedback').className='feedback hidden';
  $('questionId').textContent=q.questionId||'';
  $('typePill').textContent=q.questionType||'Question';
  $('questionText').textContent=q.question||'';
  $('instruction').textContent=q.instruction||'';
  $('progressBar').style.width=((Number(q.level||1)/3)*100)+'%';
  $('gameArea').innerHTML='';
  renderByType(q);
}

function renderByType(q){
  const t=q.questionType;
  if(['MCQ','TrueFalse','Scenario'].includes(t)) return renderSingleChoice(q);
  if(t==='ImageChoice') return renderImageChoice(q);
  if(t==='MultiSelect') return renderMultiSelect(q);
  if(t==='Sequence') return renderSequence(q);
  if(t==='Matching') return renderMatching(q);
  if(t==='SpotHazard') return renderSpotHazard(q);
  if(t==='Puzzle') return renderPuzzle(q);
  renderSingleChoice(q);
}

function options(q){return [['A',q.optionA],['B',q.optionB],['C',q.optionC],['D',q.optionD]].filter(x=>x[1]);}

function renderSingleChoice(q){
  $('gameArea').innerHTML=options(q).map(([k,v])=>`<label class="option"><input type="radio" name="answer" value="${k}"><span><b>${k}.</b> ${esc(v)}</span></label>`).join('');
}
function renderMultiSelect(q){
  $('gameArea').innerHTML=options(q).map(([k,v])=>`<label class="option"><input type="checkbox" name="multi" value="${k}"><span><b>${k}.</b> ${esc(v)}</span></label>`).join('');
}
function renderImageChoice(q){
  const cards=(q.gameConfig||{}).cards||options(q).map(([id,label])=>({id,label,icon:'🖼️'}));
  $('gameArea').innerHTML=`<div class="image-grid">${cards.map(c=>`<div class="image-card" data-id="${c.id}"><div class="image-icon">${c.icon||'🖼️'}</div><b>${esc(c.label)}</b></div>`).join('')}</div>`;
  document.querySelectorAll('.image-card').forEach(el=>el.onclick=()=>{
    document.querySelectorAll('.image-card').forEach(x=>x.classList.remove('selected'));
    el.classList.add('selected'); selectedImage=el.dataset.id;
  });
}
function renderSequence(q){
  const items=[...((q.gameConfig||{}).items||[])];
  $('gameArea').innerHTML=`<div id="sequenceList">${items.map((it,i)=>sequenceRow(it,i,items.length)).join('')}</div>`;
  bindSequence();
}
function sequenceRow(it,i,n){return `<div class="sequence-item" data-id="${it.id}"><span class="text">${esc(it.text)}</span><button class="mini up" ${i===0?'disabled':''}>↑</button><button class="mini down" ${i===n-1?'disabled':''}>↓</button></div>`}
function bindSequence(){
  document.querySelectorAll('.sequence-item .up').forEach(btn=>btn.onclick=()=>{
    const row=btn.parentElement, prev=row.previousElementSibling;if(prev)row.parentElement.insertBefore(row,prev);bindSequence();
  });
  document.querySelectorAll('.sequence-item .down').forEach(btn=>btn.onclick=()=>{
    const row=btn.parentElement, next=row.nextElementSibling;if(next)row.parentElement.insertBefore(next,row);bindSequence();
  });
  const rows=[...document.querySelectorAll('.sequence-item')];
  rows.forEach((r,i)=>{r.querySelector('.up').disabled=i===0;r.querySelector('.down').disabled=i===rows.length-1;});
}
function renderMatching(q){
  const cfg=q.gameConfig||{}, right=cfg.right||[];
  $('gameArea').innerHTML=(cfg.left||[]).map(l=>`<div class="match-row" data-left="${l.id}"><b>${esc(l.text)}</b><select><option value="">Choose...</option>${right.map(r=>`<option value="${r.id}">${esc(r.text)}</option>`).join('')}</select></div>`).join('');
}
function renderSpotHazard(q){
  const cfg=q.gameConfig||{}, zones=cfg.zones||[];
  $('gameArea').innerHTML=`<div class="scene">${zones.map(z=>`<div class="zone" data-id="${z.id}" title="${esc(z.label)}" style="left:${z.x}%;top:${z.y}%;width:${z.w}%;height:${z.h}%"></div>`).join('')}</div>`;
  document.querySelectorAll('.zone').forEach(z=>z.onclick=()=>{
    document.querySelectorAll('.zone').forEach(x=>x.classList.remove('selected'));
    z.classList.add('selected');selectedZone=z.dataset.id;
  });
}
function renderPuzzle(q){
  const p=(q.gameConfig||{}).placeholder||'Type your answer';
  $('gameArea').innerHTML=`<input id="puzzleInput" class="puzzle-input" placeholder="${esc(p)}">`;
}

function collectAnswer(){
  const t=current.questionType;
  if(['MCQ','TrueFalse','Scenario'].includes(t)) return document.querySelector('input[name="answer"]:checked')?.value||'';
  if(t==='ImageChoice') return selectedImage||'';
  if(t==='MultiSelect') return [...document.querySelectorAll('input[name="multi"]:checked')].map(x=>x.value).sort().join('|');
  if(t==='Sequence') return [...document.querySelectorAll('.sequence-item')].map(x=>x.dataset.id).join('|');
  if(t==='Matching') return [...document.querySelectorAll('.match-row')].map(r=>`${r.dataset.left}-${r.querySelector('select').value}`).join('|');
  if(t==='SpotHazard') return selectedZone||'';
  if(t==='Puzzle') return ($('puzzleInput')?.value||'').trim().toUpperCase();
  return '';
}

async function submitAnswer(){
  const answer=collectAnswer();
  if(!answer)return show(false,'Choose or enter an answer first.');

  if($('demoMode').checked){
    const ok=answer.toUpperCase()===(current.correctAnswer||'').toUpperCase();
    if(ok){xp+=Number(current.level===1?10:current.level===2?15:20);$('xp').textContent=xp;show(true,'Correct! '+(current.explanation||''));}
    else show(false,'Not quite. Try another challenge!');
    return;
  }

  const url=$('submitUrl').value.trim();
  if(!url)return alert('Paste Submit Answer Flow URL');
  const res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
    msnv:$('msnv').value.trim(),topic:'T01',level:Number(current.level),questionId:current.questionId,answer
  })});
  const data=await res.json();
  if(data.correct){show(true,(data.message||'Correct!')+' '+(data.explanation||''));}
  else{
    show(false,data.message||'Not quite. Try another challenge!');
    if(data.reloadQuestion===true)setTimeout(loadQuestion,900);
  }
}
function show(ok,msg){const f=$('feedback');f.className='feedback '+(ok?'ok':'bad');f.textContent=msg;}
function esc(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}
