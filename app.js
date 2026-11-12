'use strict';
const $=q=>document.querySelector(q);
const state={page:0,before:3,after:3,nickname:'',feeling:'',sound:true,knotIndex:0,knotStep:0,beats:0,ripped:false,clothsCleared:0,cloths:[],wish:'평안',drawing:false,drawnLength:0,charInk:[0,0]};
const screens=['시작','해원','살풀이','액막이','완료'];
let audioCtx=null,draggingKnot=false,fallAnim=null,clothDrag=null,canvasCtx=null,lastPt=null,clothStarted=false;
function escapeHTML(t){return String(t||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function message(t){const el=document.createElement('div');el.textContent=t;el.style.cssText='position:fixed;bottom:26px;left:50%;transform:translateX(-50%);z-index:99;background:#f4d89c;color:#281b1a;border-radius:18px;padding:11px 14px;font-size:12px;max-width:92%;box-shadow:0 10px 30px #0006';document.body.append(el);setTimeout(()=>el.remove(),2200)}
function info(title,desc,extra=''){return `<div class="info"><b>◈ 무속적 의미 · ${title}</b>${desc}${extra?`<div style="margin-top:7px">${extra}</div>`:''}<em>※ 지역·전승에 따라 다르며, 이 앱의 조작은 실제 굿의 표준 절차가 아닌 창작적 변형입니다.</em></div>`}
function progress(){ $('#progress').innerHTML=screens.map((n,i)=>`<i class="${i<=state.page?'on':''}" title="${n}"></i>`).join(''); const back=$('#backBtn'); if(back)back.disabled=state.page===0; }
function score(which){return `<div class="score">${[1,2,3,4,5].map(n=>`<button class="${state[which]===n?'active':''}" onclick="changeScore('${which}',${n})">${n}</button>`).join('')}</div><div class="row small"><span>편안함</span><span>매우 불편함</span></div>`}
function changeScore(k,n){state[k]=n;render()}
function emotionSegments(){
  const txt=(state.feeling||'').trim();
  if(!txt) return ['서운함','분노','답답함'];
  // Commas, line breaks and whitespace all separate individual emotions.
  // e.g. "배고픔 짜증남 졸림" => ["배고픔", "짜증남", "졸림"].
  const parts=txt.split(/[\s,，、]+/).map(v=>v.trim()).filter(Boolean).slice(0,3);
  while(parts.length<3) parts.push('감정 '+(parts.length+1));
  return parts.map(v=>v.length>10?v.slice(0,10)+'…':v);
}
// Three visibly different rope geometries: tight knot, expanded loops, and a straightened rope.
function knotTargetPositions(){return [{x:269,y:73},{x:316,y:110},{x:329,y:157}];}
function drawKnot(){
  const seg=emotionSegments()[state.knotIndex]||'감정';
  const t=knotTargetPositions()[Math.min(state.knotStep,2)];
  return `<svg id="ropeSvg" viewBox="0 0 360 240" role="img" aria-label="감정이 묶인 줄을 세 차례 당겨 푸는 장면">
  <defs><linearGradient id="ropeFiber" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#fff0cf"/><stop offset=".48" stop-color="#ddc49a"/><stop offset="1" stop-color="#aa8964"/></linearGradient></defs>
  <path id="ropeBack" class="rope-back" d="" fill="none" stroke="#b69876" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>
  <path id="ropeMain" class="rope-front" d="" fill="none" stroke="url(#ropeFiber)" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
  <path id="ropeFiber" d="" fill="none" stroke="#fff8dc" opacity=".43" stroke-width="2" stroke-dasharray="3 6" stroke-linecap="round"/>
  <g id="feelingTag" transform="translate(102 47) rotate(-6)"><rect x="0" y="0" width="116" height="36" rx="7" fill="#f0d69e" stroke="#a87943" stroke-width="2"/><text id="ropeFeelingLabel" x="58" y="23" text-anchor="middle" class="float-tag">${escapeHTML(seg)}</text></g>
  <path class="knot-pull-guide" d="M250 126 L${t.x} ${t.y}"/>
  <circle cx="${t.x}" cy="${t.y}" r="17" fill="none" stroke="#efd49a" stroke-width="3" stroke-dasharray="5 5"/>
  <circle id="knotHandleHit" class="knot-grab" cx="250" cy="126" r="35" fill="transparent"/><circle id="knotHandle" class="knot-grab" cx="250" cy="126" r="21" fill="#d9a765" stroke="#fff0cc" stroke-width="4"/>
  <text id="knotHandleText" x="250" y="132" text-anchor="middle" fill="#2f241d" font-size="12" font-weight="800" pointer-events="none" style="user-select:none;-webkit-user-select:none">당김</text>
  </svg>`;
}
function updateKnotVisual(progress=0){
 const step=state.knotStep;
 const p=Math.max(0,Math.min(1,progress));
 const mix=(a,b)=>a+(b-a)*p;
 // Stage 0 opens the left loop, stage 1 extracts the strand, stage 2 straightens the knot.
 let curve;
 if(step===0){
   const loop=mix(15,62);const y=mix(110,75);
   curve=`M8 129 C55 129 83 125 108 123 C124 121 128 ${y} 165 ${y} C${165+loop*.3} ${y-loop} ${194+loop*.42} ${y-loop} ${210+loop*.12} ${y} C218 ${y+28} 162 177 142 157 C118 137 144 100 187 112 C218 121 228 149 251 133 L352 129`;
 } else if(step===1){
   const lift=mix(0,59);const spread=mix(0,54);
   curve=`M8 129 C62 129 96 126 122 122 C140 ${106-lift} ${154-spread} ${67-lift} ${192-spread} ${91-lift} C${225+spread*.3} ${111-lift} ${229+spread*.42} 165 186 166 C151 166 134 141 151 124 C171 107 ${218+spread} ${110-lift*.3} ${250+spread*.4} 130 L352 129`;
 } else {
   const spread=mix(0,1);
   curve=`M8 129 C62 129 92 125 124 126 C${148+28*spread} ${108+19*spread} ${150+38*spread} ${52+77*spread} ${197+25*spread} ${96+33*spread} C${223+24*spread} ${140-11*spread} ${185+27*spread} ${165-36*spread} ${198+29*spread} ${145-16*spread} C${210+26*spread} ${125+4*spread} ${246+25*spread} 129 352 129`;
 }
 const main=$('#ropeMain'),back=$('#ropeBack'),fiber=$('#ropeFiber');
 for(const el of [main,back,fiber]) if(el)el.setAttribute('d',curve);
 const tag=$('#feelingTag');if(tag)tag.setAttribute('transform',`translate(102 ${47-20*(step+p)/3}) rotate(${-6+8*(step+p)/3})`);
 const targets=knotTargetPositions();const previous=step===0?{x:250,y:126}:targets[step-1];const target=targets[step];
 const x=mix(previous.x,target.x),y=mix(previous.y,target.y);
 $('#knotHandle')?.setAttribute('cx',x);$('#knotHandle')?.setAttribute('cy',y);$('#knotHandleHit')?.setAttribute('cx',x);$('#knotHandleHit')?.setAttribute('cy',y);
 $('#knotHandleText')?.setAttribute('x',x);$('#knotHandleText')?.setAttribute('y',y+5);
}
function refreshEmotionPreview(){
  // Update only labels, never replace an active input/textarea during typing.
  const labels=emotionSegments();
  const tags=document.querySelector('.emotion-tags');
  if(tags) tags.querySelectorAll('span').forEach((el,i)=>{el.textContent=`${i+1}. ${labels[i]}`;});
  const tabs=document.querySelector('.knot-tabs');
  if(tabs) tabs.querySelectorAll('button').forEach((el,i)=>{el.textContent=(i<state.knotIndex?'✓ ':'')+labels[i];});
  const tag=$('#ropeFeelingLabel');
  if(tag) tag.textContent=labels[state.knotIndex]||'감정';
}
function knotInstruction(){
  return ['① 고리를 느슨하게 위로 끌어올리기','② 옆으로 빼내며 고리 열기','③ 끝줄을 아래로 당겨 매듭 풀기'][state.knotStep] || '매듭을 풀었습니다.';
}
function drumSVG(){return `<svg viewBox="0 0 260 260" aria-hidden="true"><defs><radialGradient id="skin"><stop stop-color="#f6e5c9"/><stop offset=".8" stop-color="#deb983"/><stop offset="1" stop-color="#a7794c"/></radialGradient><linearGradient id="barrel"><stop stop-color="#704029"/><stop offset=".52" stop-color="#b56c42"/><stop offset="1" stop-color="#643820"/></linearGradient></defs><ellipse cx="130" cy="214" rx="99" ry="26" fill="#0d0a10" opacity=".65"/><path d="M33 95 L227 95 L215 196 Q130 245 45 196Z" fill="url(#barrel)" stroke="#d69e64" stroke-width="6"/><path d="M50 109 L204 214 M78 104 L180 224 M209 109 L54 214 M184 103 L84 222" stroke="#eac39a" stroke-width="6" opacity=".8"/><ellipse cx="130" cy="90" rx="101" ry="66" fill="#52321e" stroke="#e1af71" stroke-width="7"/><ellipse cx="130" cy="88" rx="90" ry="55" fill="url(#skin)" stroke="#926540" stroke-width="5"/><ellipse cx="130" cy="89" rx="68" ry="38" fill="none" stroke="#a68153" stroke-width="2" opacity=".45"/>${state.beats>=15&&!state.ripped?'<path d="M126 57 L143 82 L130 98 L147 125" fill="none" stroke="#86603e" stroke-width="2.5"/>':''}${state.ripped?'<path d="M122 40 L145 72 L124 98 L164 124 L118 134 L104 105 L81 127 L100 88 L79 61 Z" fill="#281c19" stroke="#875b37" stroke-width="5"/><path d="M122 40 L123 84 L104 105 M145 72 L164 124 M124 98 L118 134" fill="none" stroke="#f3d5a0" stroke-width="3" opacity=".8"/>':''}</svg>`}
function render(){
  progress();
  let h='';
  if(state.page===0){h=`<div class="eyebrow">MVP 시작</div><h1 class="title">마음풀이 의식을<br>시작합니다</h1><p class="lead">지금의 답답함을 짧은 의식으로 정리해보세요. 시작 전 마음 상태를 먼저 골라주세요.</p>${info('앱의 방식','해원 → 살풀이 → 액막이의 순서로 진행합니다. 각각은 맺힌 감정 풀기, 감정 털어내기, 평안 기원하기의 의미를 가집니다.')}<div class="card"><div class="field">현재 스트레스 강도 (1~5)</div>${score('before')}</div><button class="cta" onclick="goto(1)">해원 시작하기</button>`}
  if(state.page===1){
    const labels=emotionSegments();
    h=`<div class="eyebrow">第一 · 해원 解冤</div><h1 class="title">감정을 적고,<br>매듭에서 직접 풀어내세요</h1><p class="lead">적어둔 감정이 종잇조각처럼 매듭에 묶입니다. 빛나는 순서대로 고리를 느슨하게 만들고, 빼내고, 끝줄을 당겨 풀어보세요.</p>${info('해원·고풀이','해원은 맺힌 원한이나 억울함을 푼다는 뜻입니다. 전라도 씻김굿의 고풀이에서는 매듭을 풀어 한을 해소하는 모습을 상징적으로 표현합니다.','이 화면에서는 사용자가 적은 감정 조각을 매듭에 매단 뒤, 3단계 동작으로 풀어내는 창작적 체험으로 바꾸었습니다.')}<label class="field" for="nick">마음에 걸리는 대상·상황의 별명 (선택)</label><input class="input" id="nick" maxlength="30" placeholder="예: 직장 동료, 마감, 관계" value="${escapeHTML(state.nickname)}" oninput="state.nickname=this.value"><label class="field" for="feeling">풀어내고 싶은 감정이나 말 (선택)</label><textarea class="input" id="feeling" maxlength="300" placeholder="예: 배고픔 짜증남 졸림 (띄어쓰기 또는 쉼표로 구분)" oninput="state.feeling=this.value;refreshEmotionPreview()">${escapeHTML(state.feeling)}</textarea><div class="emotion-tags">${labels.map((x,i)=>`<span>${i+1}. ${escapeHTML(x)}</span>`).join('')}</div><div class="card"><div class="row"><b>감정 매듭 ${Math.min(3,state.knotIndex+1)} / 3</b><span class="badge">3단계로 풀기</span></div><div class="knot-tabs">${labels.map((x,i)=>`<button class="${i<state.knotIndex?'done':i===state.knotIndex?'active':''}" onclick="selectKnot(${i})">${i<state.knotIndex?'✓ ':''}${escapeHTML(x)}</button>`).join('')}</div><div class="knot-card">${drawKnot()}</div><div class="step-list"><div class="${state.knotStep>0?'done':state.knotStep===0?'active':''}">느슨하게 올리기</div><div class="${state.knotStep>1?'done':state.knotStep===1?'active':''}">고리 빼내기</div><div class="${state.knotStep>2?'done':state.knotStep===2?'active':''}">끝줄 당기기</div></div><p class="hint center" id="knotHint">${state.knotIndex>=3?'세 감정의 매듭을 모두 풀었습니다.':knotInstruction()}</p><div class="meter"><div style="width:${(state.knotIndex/3)*100}%"></div></div><button class="secondary" onclick="assistKnot()">동작이 어려우면 현재 매듭 건너뛰기</button></div><button class="cta" onclick="goto(2)" ${state.knotIndex<3?'disabled':''}>살풀이로 이어가기</button>`;
  }
  if(state.page===2){
    h=`<div class="eyebrow">第二 · 살풀이 煞풀이</div><h1 class="title">북을 울리고,<br>하늘의 흰 천을 날려보내세요</h1><p class="lead">북을 여러 번 두드려 장단을 만들고, 30회가 지나면 북가죽이 상징적으로 찢어집니다. 이후 하늘에서 내려오는 흰 천들을 땅에 닿기 전에 밀어 화면 밖으로 보내세요.</p>${info('살풀이·굿 장단','살풀이는 액이나 나쁜 기운을 풀어낸다는 의미와 연결됩니다. 굿에서는 북 같은 타악기가 의례의 장단과 몰입감을 이끕니다. 살풀이춤은 흰 수건으로 감정을 흘려보내는 정서를 보여줍니다.','앱에서의 북 파열은 전통 굿의 고정 절차가 아니라 “안에 갇힌 감정이 터져 밖으로 나온다”는 상징적 전환입니다.')}<div class="card center"><div class="small">북을 눌러 타격음을 들어보세요 · 30회 이상 두드리면 전환</div><div class="drum-area"><div class="ripples" id="ripples"></div><button id="drum" class="drum-btn" onclick="hitDrum()" aria-label="북 두드리기" ${state.ripped?'disabled':''}>${drumSVG()}</button></div><div class="count" id="beatCount">${state.beats} <span style="font-size:14px;color:#cabac7">/ 30</span></div><div class="meter"><div id="drumMeter" style="width:${Math.min(100,state.beats/30*100)}%"></div></div><p class="${state.ripped?'success':'small'}">${state.ripped?'북가죽이 열리듯 응어리가 밖으로 터져 나왔습니다. 이제 떨어지는 흰 천을 밀어 밖으로 날려보내세요.':'북소리 · 파동 · 진동이 함께 반응합니다.'}</p><button class="secondary" onclick="resetDrum()">북 다시 만들기</button></div><div class="card ${state.ripped?'':'hidden'}"><div class="row"><b>흰 천 보내기</b><span class="badge">${state.clothsCleared} / ${state.cloths.length||6}</span></div><p class="small">북을 완전히 두드린 뒤, 아래 버튼을 눌렀을 때부터 천이 떨어집니다. 천을 땅에 닿기 전에 좌우로 스와이프하세요. 놓치면 다시 내려옵니다. 놓친 천은 위에서 다시 떨어집니다.</p><button class="fall-start" onclick="startCloths()" id="clothStart">${clothStarted?'↻ 떨어뜨리기 다시 시작':'☁ 흰 천 떨어뜨리기 시작'}</button><div class="fall-stage ${clothStarted?'':'waiting'}" id="fallStage"><div class="sky-note">← 또는 → 로 밀어 보내기</div><div class="ground"></div></div><div class="meter"><div style="width:${(state.clothsCleared/(state.cloths.length||6))*100}%"></div></div><button class="secondary" onclick="resetCloths()">천 위치 초기화</button></div><button class="cta" onclick="goto(3)" ${!(state.ripped && state.clothsCleared>=(state.cloths.length||6))?'disabled':''}>액막이로 이어가기</button>`;
  }
  if(state.page===3){
    h=`<div class="eyebrow">第三 · 액막이 厄막이</div><h1 class="title">부적의 한자를 따라 쓰며<br>평안을 기원해요</h1><p class="lead">평안·용기·개운·건강의 뜻을 담은 한자를 크게 배치했습니다. 손가락이나 마우스로 연한 회색 안내 글씨 위를 붓으로 먹을 찍듯 시작하고, 천천히 눌러 쓰다가 끝에서 가볍게 떼어보세요.</p>${info('액막이·부적','액막이는 앞으로 닥칠 액을 막고 안녕을 기원하는 관습입니다. 전통 부적에는 붉은 글씨·한자·부호가 다양한 방식으로 배치됩니다.','이 화면은 실제 평안과 길상을 기원하는 한자 어휘를 차용한 창작 배치입니다. 전통 부적의 효험을 그대로 재현한다고 주장하지 않습니다.')}<div class="field">기원할 뜻을 고르세요</div><div class="choices">${['평안','용기','새출발','건강'].map(w=>`<button class="chip ${state.wish===w?'selected':''}" onclick="changeWish('${w}')">${w}</button>`).join('')}</div><div class="card center"><div class="small">붓끝처럼 획 굵기가 변하는 한자 따라 쓰기</div><div class="amulet-shell"><div class="amulet-title">✦ ${escapeHTML(state.wish)} 부적 ✦</div><div class="talisman-wrap"><div class="grid-lines"></div><div class="talisman-text">${talismanColumns(state.wish)}</div><canvas id="traceCanvas"></canvas><div class="trace-mark">연한 안내 글씨를 붉게 따라 쓰기</div></div></div><p class="hint">두 글자를 각각 붓으로 따라 써주세요. 한 글자만 쓰면 완료되지 않습니다.</p><div class="row small"><span id="char1Progress">첫째 글자 · 0%</span><span id="char2Progress">둘째 글자 · 0%</span></div><div class="meter"><div id="drawMeter" style="width:${Math.round((Math.min(1,state.charInk[0]/110)+Math.min(1,state.charInk[1]/110))*50)}%"></div></div><button class="secondary" onclick="clearDrawing()">다시 쓰기</button></div><button class="cta" id="finishBtn" onclick="finish()" ${!bothCharactersDone()?'disabled':''}>의식 마무리하기</button>`;
  }
  if(state.page===4){
    h=`<div class="eyebrow">마무리</div><h1 class="title">의식을 마쳤습니다</h1><p class="lead">지금의 마음 상태를 다시 골라보세요.</p><div class="card"><div class="field">의식 후 스트레스 강도 (1~5)</div>${score('after')}</div><div class="card center"><div class="small">익명 완료 기록을 이 기기에만 남길 수 있습니다.</div><div class="notice">${state.before}점 → ${state.after}점</div></div><button class="cta" onclick="saveSummary()">익명 완료 기록 저장</button><button class="secondary" onclick="restart()">처음부터 다시 하기</button><button class="secondary" onclick="clearRecords()">저장한 완료 기록 삭제</button><p id="saveStatus" class="small center"></p>`;
  }
  $('#screen').innerHTML=h;
  if(state.page===1){updateKnotVisual(0);bindKnot();}
  if(state.page===2 && state.ripped) initCloths();
  if(state.page===3) initCanvas();
}
function goto(p){stopClothAnim(); state.page=p; render(); window.scrollTo({top:0,behavior:'smooth'});}
function goBack(){if(state.page>0) goto(state.page-1);} 
function selectKnot(i){if(i===state.knotIndex) message('빛나는 원을 향해 손잡이를 끌어가며 매듭을 풀어보세요.'); else if(i>state.knotIndex) message('앞선 감정의 매듭부터 차례대로 풀어주세요.');}
function assistKnot(){ if(state.knotIndex>=3) return; state.knotStep=0; state.knotIndex++; if(state.knotIndex>=3) message('세 감정의 매듭을 모두 풀었습니다.'); render(); }
function bindKnot(){
 const svg=$('#ropeSvg'),handle=$('#knotHandle');if(!svg||!handle||state.knotIndex>=3)return;
 let dragging=false,start=null,progress=0;
 const point=e=>{const r=svg.getBoundingClientRect();return {x:(e.clientX-r.left)/r.width*360,y:(e.clientY-r.top)/r.height*240}};
 svg.addEventListener('pointerdown',e=>{if(!e.target.closest('.knot-grab'))return;e.preventDefault();dragging=true;start=point(e);svg.setPointerCapture(e.pointerId)});
 svg.addEventListener('pointermove',e=>{
   if(!dragging)return;e.preventDefault();const current=point(e);const dx=current.x-start.x,dy=current.y-start.y;
   // Direction changes in the third action: lift -> pull right -> pull down.
   progress=Math.max(0,Math.min(1,state.knotStep===0?(-dy)/55:state.knotStep===1?dx/66:dy/65));
   updateKnotVisual(progress);
   const hint=$('#knotHint');if(hint)hint.textContent=`${knotInstruction()} · ${Math.round(progress*100)}%`;
 });
 const release=()=>{
   if(!dragging)return;dragging=false;
   if(progress>=.82){state.knotStep++;navigator.vibrate?.(22);if(state.knotStep>=3){state.knotStep=0;state.knotIndex++;message(state.knotIndex>=3?'세 감정을 모두 풀었습니다.':'하나의 감정이 풀렸습니다.');}render();}
   else {updateKnotVisual(0);const hint=$('#knotHint');if(hint)hint.textContent=knotInstruction();}
   progress=0;
 };
 svg.addEventListener('pointerup',release);svg.addEventListener('pointercancel',release);
}
function getAudioCtx(){if(!state.sound)return null;try{audioCtx=audioCtx||new(window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==='suspended')audioCtx.resume();return audioCtx;}catch(e){return null;}}
function noiseBurst(ctx,at,duration,frequency,gain,kind='lowpass'){
 const length=Math.max(64,Math.floor(ctx.sampleRate*duration));const buf=ctx.createBuffer(1,length,ctx.sampleRate);const data=buf.getChannelData(0);
 for(let i=0;i<length;i++)data[i]=(Math.random()*2-1)*(1-i/length);
 const src=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),amp=ctx.createGain();src.buffer=buf;filter.type=kind;filter.frequency.value=frequency;
 amp.gain.setValueAtTime(Math.max(.0001,gain),at);amp.gain.exponentialRampToValueAtTime(.001,at+duration);
 src.connect(filter);filter.connect(amp);amp.connect(ctx.destination);src.start(at);src.stop(at+duration);
}
function playDrum(){
 const ctx=getAudioCtx();if(!ctx)return;const t=ctx.currentTime;const variation=1+(Math.random()-.5)*.09;
 // Layered low resonant membrane modes and a short beater impact, approximating a Korean buk.
 [[118,.52,.53],[172,.23,.31],[238,.10,.19]].forEach(([f,vol,d])=>{
   const osc=ctx.createOscillator(),amp=ctx.createGain(),low=ctx.createBiquadFilter();osc.type='sine';osc.frequency.setValueAtTime(f*variation*1.2,t);osc.frequency.exponentialRampToValueAtTime(f*variation*.76,t+.20);low.type='lowpass';low.frequency.value=780;
   amp.gain.setValueAtTime(.001,t);amp.gain.exponentialRampToValueAtTime(vol,t+.007);amp.gain.exponentialRampToValueAtTime(.001,t+d);
   osc.connect(low);low.connect(amp);amp.connect(ctx.destination);osc.start(t);osc.stop(t+d+.01);
 });
 noiseBurst(ctx,t,.10,420,.25,'bandpass');
}
function playRip(){
 const ctx=getAudioCtx();if(!ctx)return;const t=ctx.currentTime;
 noiseBurst(ctx,t,.45,1400,.55,'highpass');noiseBurst(ctx,t+.08,.38,530,.34,'bandpass');
 for(let k=0;k<4;k++)noiseBurst(ctx,t+.06*k,.055,900+k*230,.13,'bandpass');
}
function playWind(){
 const ctx=getAudioCtx();if(!ctx)return;const t=ctx.currentTime;
 const duration=.85, length=Math.floor(ctx.sampleRate*duration),buf=ctx.createBuffer(1,length,ctx.sampleRate),arr=buf.getChannelData(0);
 for(let i=0;i<length;i++)arr[i]=Math.random()*2-1;
 const src=ctx.createBufferSource(),band=ctx.createBiquadFilter(),amp=ctx.createGain();src.buffer=buf;band.type='bandpass';band.Q.value=.75;band.frequency.setValueAtTime(350,t);band.frequency.exponentialRampToValueAtTime(1100,t+.28);band.frequency.exponentialRampToValueAtTime(280,t+.85);
 amp.gain.setValueAtTime(.001,t);amp.gain.linearRampToValueAtTime(.19,t+.12);amp.gain.exponentialRampToValueAtTime(.001,t+.85);
 src.connect(band);band.connect(amp);amp.connect(ctx.destination);src.start(t);src.stop(t+duration);
}
function audio(){playDrum()}
function hitDrum(){
  if(state.ripped) return;
  state.beats += 1; audio(); if(navigator.vibrate) navigator.vibrate(24);
  const b=$('#drum'); b?.classList.add('hit'); setTimeout(()=>b?.classList.remove('hit'),80);
  const rp=document.createElement('i'); rp.className='ripple'; $('#ripples')?.appendChild(rp); setTimeout(()=>rp.remove(),900);
  if(state.beats>=30){ state.ripped=true; playRip(); if(navigator.vibrate) navigator.vibrate([55,60,80]); if(!state.cloths.length) setupCloths(); render(); message('북이 찢어졌습니다. 응어리가 터져 밖으로 나온다는 긍정적 전환을 상징합니다.'); }
  else { $('#beatCount').innerHTML=state.beats+' <span style="font-size:14px;color:#cabac7">/ 30</span>'; $('#drumMeter').style.width=Math.min(100,state.beats/30*100)+'%'; if(state.beats===15) $('#drum').innerHTML=drumSVG(); }
}
function resetDrum(){ state.beats=0; state.ripped=false; state.clothsCleared=0; state.cloths=[]; clothStarted=false; stopClothAnim(); render(); }
function setupCloths(){
  const labels=emotionSegments().concat(['걱정','답답함','한숨']).slice(0,6);
  state.cloths=labels.map((label,i)=>({id:i,label,x:40+Math.random()*220,y:-20-Math.random()*220,vy:0.5+Math.random()*0.55,rot:-20+Math.random()*40,cleared:false,grounded:false}));
  state.clothsCleared=0;
}
function initCloths(){ if(!state.cloths.length) setupCloths(); drawCloths(); if(clothStarted) startClothAnim(); }
function startCloths(){stopClothAnim();setupCloths();clothStarted=true;render();message("지금부터 천이 떨어집니다. 좌우로 밀어보세요.");}
function drawCloths(){
  const stage=$('#fallStage'); if(!stage) return;
  stage.querySelectorAll('.cloth').forEach(n=>n.remove());
  state.cloths.filter(c=>!c.cleared).forEach(c=>{
    const el=document.createElement('div'); el.className='cloth'; el.dataset.id=c.id; el.textContent=c.label; el.style.left=c.x+'px'; el.style.top=c.y+'px'; el.style.transform=`translate(-50%,-50%) rotate(${c.rot}deg)`;
    bindCloth(el,c); stage.appendChild(el);
  });
}
function bindCloth(el,cloth){
  let start=null;
  el.addEventListener('pointerdown',e=>{start={x:e.clientX,y:e.clientY}; clothDrag={el,cloth,startX:e.clientX,lastX:e.clientX}; el.setPointerCapture(e.pointerId);});
  el.addEventListener('pointermove',e=>{if(!clothDrag||clothDrag.cloth.id!==cloth.id) return; const dx=e.clientX-clothDrag.startX; cloth.x+= (e.clientX-clothDrag.lastX); cloth.rot=Math.max(-50,Math.min(50,cloth.rot+dx*0.01)); clothDrag.lastX=e.clientX; el.style.left=cloth.x+'px'; el.style.transform=`translate(-50%,-50%) rotate(${cloth.rot}deg)`;});
  function end(e){ if(!clothDrag||clothDrag.cloth.id!==cloth.id) return; const dx=e.clientX-clothDrag.startX; if(Math.abs(dx)>60){ sweepCloth(cloth,dx>0?1:-1); } clothDrag=null; }
  el.addEventListener('pointerup',end); el.addEventListener('pointercancel',()=>{clothDrag=null});
}
function sweepCloth(cloth,dir){
  playWind();cloth.cleared=true; state.clothsCleared++; const stage=$('#fallStage'); const el=stage?.querySelector(`.cloth[data-id="${cloth.id}"]`); if(el){ el.classList.add('swept'); el.style.transform=`translate(${dir*220}px,-20px) rotate(${dir*35}deg)`; }
  if(navigator.vibrate) navigator.vibrate(18); if(state.clothsCleared>=state.cloths.length){ stopClothAnim(); setTimeout(()=>render(),380); message('떨어지는 흰 천을 모두 화면 밖으로 보냈습니다.'); }
}
function startClothAnim(){ if(fallAnim) return; const stage=$('#fallStage'); if(!stage) return; const H=stage.clientHeight; const groundY=H*0.71;
  const tick=()=>{ state.cloths.forEach(c=>{ if(c.cleared) return; if(!c.grounded){ c.y+=c.vy; c.rot+=0.4; if(c.y>=groundY){ c.y=-50-Math.random()*85; c.x=45+Math.random()*(stage.clientWidth-90); c.vy=Math.max(.45,c.vy*.85); } const el=stage.querySelector(`.cloth[data-id="${c.id}"]`); if(el){ el.style.top=c.y+'px'; el.style.transform=`translate(-50%,-50%) rotate(${c.rot}deg)`; } } }); fallAnim=requestAnimationFrame(tick); };
  fallAnim=requestAnimationFrame(tick);
}
function stopClothAnim(){ if(fallAnim){ cancelAnimationFrame(fallAnim); fallAnim=null; } }
function resetCloths(){ stopClothAnim(); setupCloths(); clothStarted=false; render(); }
function talismanColumns(wish){
  const words={'평안':['平','安'],'용기':['勇','氣'],'새출발':['開','運'],'건강':['健','康']};
  const pair=words[wish]||words['평안'];
  return `<span class="talisman-seal">天</span>${pair.map(ch=>`<span class="big-hanja">${ch}</span>`).join('')}<span class="talisman-seal">福</span>`;
}
const CHARACTER_TARGET=110;
function bothCharactersDone(){return state.charInk.every(v=>v>=CHARACTER_TARGET)}
function initCanvas(){
  const canvas=$('#traceCanvas');if(!canvas)return;
  const wrap=canvas.parentElement,dpr=window.devicePixelRatio||1;
  canvas.width=Math.round(wrap.clientWidth*dpr);canvas.height=Math.round(wrap.clientHeight*dpr);
  canvas.style.width=wrap.clientWidth+'px';canvas.style.height=wrap.clientHeight+'px';
  canvasCtx=canvas.getContext('2d');canvasCtx.scale(dpr,dpr);
  canvasCtx.strokeStyle='#b52320';canvasCtx.fillStyle='#b52320';canvasCtx.lineCap='round';canvasCtx.lineJoin='round';
  const glyphs=Array.from(wrap.querySelectorAll('.big-hanja'));
  const getArea=()=>{
    const r=canvas.getBoundingClientRect();
    return glyphs.map(el=>{
      const b=el.getBoundingClientRect();
      return {x:b.left-r.left-8,y:b.top-r.top-8,w:b.width+16,h:b.height+16};
    });
  };
  const areas=getArea();
  const seen=[new Set(),new Set()];
  let pointerId=null,lastDraw=null,lastT=0,prevWidth=2,strokeDistance=0,stampNumber=0;
  const position=e=>{const r=canvas.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top,t:performance.now(),pressure:e.pressure||.5}};
  const whichArea=p=>areas.findIndex(a=>p.x>=a.x&&p.x<=a.x+a.w&&p.y>=a.y&&p.y<=a.y+a.h);
  function refresh(){
    const p=state.charInk.map(n=>Math.min(100,Math.round(n/CHARACTER_TARGET*100)));
    const a=$('#char1Progress'),b=$('#char2Progress');
    if(a)a.textContent=`첫째 글자 · ${p[0]}%`;
    if(b)b.textContent=`둘째 글자 · ${p[1]}%`;
    const meter=$('#drawMeter');if(meter)meter.style.width=((p[0]+p[1])/2)+'%';
    const button=$('#finishBtn');if(button){button.disabled=!bothCharactersDone();button.textContent=bothCharactersDone()?'✓ 두 글자 완성 · 의식 마무리하기':'두 글자를 모두 따라 쓴 후 마무리하기';}
  }
  // Wet-ink brush: tapered onset, broad belly, fast thin strokes, translucent edges.
  // Each ellipse is stamped along the path, aligned with the stroke and accented by dry-brush grain.
  function dab(x,y,width,angle,alpha=1){
    canvasCtx.save();
    canvasCtx.translate(x,y); canvasCtx.rotate(angle);
    canvasCtx.globalAlpha=.90*alpha;
    canvasCtx.fillStyle='#9d211d';
    canvasCtx.beginPath();canvasCtx.ellipse(0,0,width*.43,width*.50,0,0,Math.PI*2);canvasCtx.fill();
    canvasCtx.globalAlpha=.20*alpha; canvasCtx.fillStyle='#d65039';
    canvasCtx.beginPath();canvasCtx.ellipse(-width*.13,0,width*.14,width*.42,0,0,Math.PI*2);canvasCtx.fill();
    if(stampNumber%4===0){
      canvasCtx.globalAlpha=.17*alpha; canvasCtx.fillStyle='#68201b';
      canvasCtx.fillRect(width*.11,-width*.26,Math.max(.4,width*.1),width*.64);
    }
    canvasCtx.restore(); stampNumber++;
  }
  function stroke(from,to){
    const dx=to.x-from.x,dy=to.y-from.y,dist=Math.hypot(dx,dy);
    if(dist<.4)return;
    const dt=Math.max(7,to.t-from.t),speed=dist/dt;
    // Slowly drawn strokes retain ink; faster movement resembles lifting a brush.
    const pressure=to.pressure && to.pressure>0 ? to.pressure : .5;
    const normalizedPressure=Math.max(0,Math.min(1,pressure));
    // Cap brush size and damp pressure to avoid covering the printed guide.
    const desired=Math.max(2.5,Math.min(7.5,6.1-speed*1.1+(normalizedPressure-.5)*1.1));
    const angle=Math.atan2(dy,dx)+.24;
    const n=Math.max(1,Math.ceil(dist/1.6));
    const base=strokeDistance;
    for(let k=1;k<=n;k++){
      const t=k/n, travel=base+dist*t;
      const ease=Math.min(1,Math.max(.14,travel/20));
      const target=desired*ease;
      prevWidth+=((target-prevWidth)*.12);
      dab(from.x+dx*t,from.y+dy*t,prevWidth,angle,1);
    }
    strokeDistance+=dist;
  }
  function brushLift(pt){
    if(!pt||strokeDistance<1)return;
    // Final fine nib imitates a brush lifted from the paper.
    const a=lastBrushAngle;
    for(let i=0;i<9;i++){
      const f=i/8;
      dab(pt.x+Math.cos(a)*f*8,pt.y+Math.sin(a)*f*8,
        Math.max(.45,prevWidth*(1-f)*.55),a,1-f*.35);
    }
  }
  let lastBrushAngle=0;
  function track(from,to){
    const distance=Math.hypot(to.x-from.x,to.y-from.y);
    if(distance>100)return;
    const steps=Math.max(1,Math.ceil(distance/5));
    for(let k=0;k<=steps;k++){
      const f=k/steps,p={x:from.x+(to.x-from.x)*f,y:from.y+(to.y-from.y)*f};
      const i=whichArea(p);if(i<0)continue;
      const key=`${Math.floor(p.x/9)},${Math.floor(p.y/9)}`;
      if(!seen[i].has(key)){seen[i].add(key);state.charInk[i]+=3.3;}
    }
  }
  canvas.addEventListener('pointerdown',e=>{
    const p=position(e),i=whichArea(p);
    if(i<0)return;
    e.preventDefault();pointerId=e.pointerId;lastDraw=p;state.drawing=true;prevWidth=1;strokeDistance=0;lastBrushAngle=0;canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove',e=>{
    if(!state.drawing||e.pointerId!==pointerId||!lastDraw)return;
    e.preventDefault();const p=position(e);
    // Only draw inside the two large character regions.
    if(whichArea(p)>=0&&whichArea(lastDraw)>=0){lastBrushAngle=Math.atan2(p.y-lastDraw.y,p.x-lastDraw.x)+.24;stroke(lastDraw,p);track(lastDraw,p);refresh();}
    lastDraw=p;
  });
  const stop=()=>{if(state.drawing)brushLift(lastDraw);state.drawing=false;pointerId=null;lastDraw=null;canvasCtx?.beginPath();};
  canvas.addEventListener('pointerup',stop);canvas.addEventListener('pointercancel',stop);
  refresh();
}
function clearDrawing(){state.drawnLength=0;state.charInk=[0,0];render()}
function changeWish(w){state.wish=w;state.drawnLength=0;state.charInk=[0,0];render()}
function finish(){if(!bothCharactersDone()){message('첫째와 둘째 글자를 각각 따라 써주세요.');return}goto(4)}
function saveSummary(){ try{ const entries=JSON.parse(localStorage.getItem('maeumpuri_summary')||'[]'); entries.push({date:new Date().toISOString().slice(0,10),before:state.before,after:state.after,completed:true}); localStorage.setItem('maeumpuri_summary',JSON.stringify(entries.slice(-30))); $('#saveStatus').textContent='익명 완료 기록을 이 브라우저에 저장했습니다.'; }catch(e){ message('이 브라우저에서는 저장할 수 없습니다.'); } }
function clearRecords(){ try{ localStorage.removeItem('maeumpuri_summary'); message('로컬 완료 기록을 삭제했습니다.'); }catch(e){ message('삭제 기능을 사용할 수 없습니다.'); } }
function restart(){ stopClothAnim(); clothStarted=false; Object.assign(state,{page:0,before:3,after:3,nickname:'',feeling:'',knotIndex:0,knotStep:0,beats:0,ripped:false,clothsCleared:0,cloths:[],wish:'평안',drawing:false,drawnLength:0,charInk:[0,0]}); render(); }
$('#soundBtn').addEventListener('click',()=>{state.sound=!state.sound; $('#soundBtn').textContent=state.sound?'🔊 소리 켜짐':'🔇 소리 꺼짐';});
render();
