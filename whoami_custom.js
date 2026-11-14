// Who Am I — Customize By Player: one secret guess, reviewed by the player who wrote its word.
const WHO_CUSTOM_PREP_MS=60000;
const WHO_CUSTOM_FALLBACK=['แตงโม','มะม่วง','ช้าง','แมว','สุนัข','ดวงจันทร์','สายรุ้ง','รถไฟ','พิซซ่า','แพนด้า','ไดโนเสาร์','จักรยาน','ต้นไม้','นาฬิกา','ดาวเสาร์','หุ่นยนต์','กระต่าย','น้ำตก','กีตาร์','ช็อกโกแลต','ดอกทานตะวัน','สนามบิน','ปลาวาฬ','ฉลาม','หิ่งห้อย','ปราสาท','เครื่องบิน','ซูชิ','ภูเขา','สมาร์ตโฟน','ห้องสมุด','รองเท้า','นักบินอวกาศ','ประภาคาร','เรือใบ','แมงกะพรุน','ฟักทอง','ดาวอังคาร','เมฆ','สายฟ้า','ผีเสื้อ','ม้าลาย','กุญแจ','โดนัท','เครื่องซักผ้า','แว่นตา','โรงภาพยนตร์','ต้นกระบองเพชร','ลูกโป่ง','นกเพนกวิน','ไข่ดาว'];
let activeWhoCustomKey='',lastWhoCustomNoticeToken='';
function whoCustomSetup(r,ids){
 if(r.gameMode!=='whoami_custom'||r.status!=='lobby'||ids.length<2)return false;
 const order=shuffle(ids);
 r.whoCustomAssignments=Object.fromEntries(order.map((id,i)=>[id,order[(i+1)%order.length]]));
 r.whoCustomSubmitted={};r.whoCustomWords={};r.whoCustomGuesses={};r.whoCustomAutoWords={};r.whoCustomPending={};r.whoCustomReviews={};
 r.whoCustomDeadline=serverNow()+WHO_CUSTOM_PREP_MS;
 // The placeholder role allows the original reconnect routine to recognise players during setup.
 r.roles=Object.fromEntries(ids.map(id=>[id,'__pending__']));
 r.gamePlayers=copyPack(r.players);
 r.playerProfiles={...(r.playerProfiles||{}),...copyPack(r.players)};
 r.status='whoami_prepare';r.gamesPlayed=(Number(r.gamesPlayed)||0)+1;
 r.result=null;r.lastActivityAt=TIMESTAMP();return true;
}
function whoCustomEveryoneConfirmed(r){
 const writers=Object.keys(r.whoCustomAssignments||{});
 return writers.length>=2&&writers.every(id=>r.whoCustomSubmitted?.[id]===true);
}
function whoCustomBegin(r){
 if(r.gameMode!=='whoami_custom'||r.status!=='whoami_prepare')return false;
 const assignments=r.whoCustomAssignments||{},ids=Object.keys(assignments);
 if(ids.length<2)return false;
 const words={...r.whoCustomWords},used=new Set(Object.values(words).map(norm));
 const automated={};
 for(const [i,id] of ids.entries()){
  if(String(words[id]||'').trim())continue;
  let fallback=WHO_CUSTOM_FALLBACK.find(w=>!used.has(norm(w)));
  if(!fallback)fallback='คำปริศนา '+(i+1);
  words[id]=fallback;used.add(norm(fallback));automated[id]=true;
 }
 r.roles=words;r.whoCustomAutoWords=automated;
 r.whoCustomDeadline=null;r.status='playing';
 r.attempts=Object.fromEntries(ids.map(id=>[id,1]));
 r.guessDetails={};r.guessedCorrectly={};r.correctOrder=[];r.whoCustomGuesses={};r.whoCustomPending={};r.whoCustomReviews={};
 r.turnOrder=shuffle(ids);r.currentTurnIndex=0;r.currentRound=1;r.totalRounds=Number(r.settingValue)||2;
 r.turnStartedAt=null;r.playDeadline=null;r.finalDeadline=null;r.whoTimeRemaining={};
 r.lastActivityAt=TIMESTAMP();return true;
}
function whoCustomClock(r){
 if($('whoCustomScreen').hidden)return;
 $('whoCustomTimer').textContent=formatLeft(r.whoCustomDeadline);
 $('whoCustomSubmitBtn').disabled=!!r.whoCustomSubmitted?.[myId]||serverNow()>=Number(r.whoCustomDeadline||0);
}
function renderWhoCustomPrepare(r){
 const assignments=r.whoCustomAssignments||{},targetId=assignments[myId];
 const players=gameParticipants(r),ids=Object.keys(assignments),count=ids.filter(id=>r.whoCustomSubmitted?.[id]).length;
 const key=roomId+':'+(r.gamesPlayed||0)+':'+myId;
 if(key!==activeWhoCustomKey){activeWhoCustomKey=key;$('whoCustomWordInput').value='';}
 $('whoCustomTarget').textContent=players[targetId]?.name||'ผู้เล่น';
 $('whoCustomConfirmCount').textContent='ยืนยันแล้ว '+count+' / '+ids.length+' คน';
 $('whoCustomSubmittedNote').hidden=!r.whoCustomSubmitted?.[myId];
 $('whoCustomEntry').hidden=!!r.whoCustomSubmitted?.[myId];
 $('whoCustomWordInput').disabled=!!r.whoCustomSubmitted?.[myId];
 $('whoCustomTimer').textContent=formatLeft(r.whoCustomDeadline);
 $('whoCustomSubmitBtn').disabled=!!r.whoCustomSubmitted?.[myId]||serverNow()>=Number(r.whoCustomDeadline||0);
 renderGameStats('whoCustomProgress',[
  {label:'รูปแบบ',value:'Customize By Player'},
  {label:'ยืนยันโจทย์แล้ว',value:count+' / '+ids.length},
  {label:'เวลาคิด',value:formatLeft(r.whoCustomDeadline)}
 ]);
}
function whoCustomHasPending(r){return Object.keys(r.whoCustomPending||{}).length>0;}
function whoCustomAllGuessesSubmitted(r){
 const ids=Object.keys(r.gamePlayers||r.players||{});
 return ids.length>0&&ids.every(id=>Number(r.attempts?.[id]||0)===0);
}
function whoCustomCompleteIfReady(r){
 if(r.gameMode!=='whoami_custom')return;
 if(whoCustomAllGuessesSubmitted(r)){
  r.status=whoCustomHasPending(r)?'whoami_review':'results';
  r.finalDeadline=null;
 }else if(r.status==='whoami_review'){
  r.status='final_guess';
  r.finalDeadline=serverNow()+FINAL_MS;
 }
}
function whoCustomWriterFor(r,targetId){
 return Object.keys(r.whoCustomAssignments||{}).find(writerId=>r.whoCustomAssignments?.[writerId]===targetId)||null;
}
function renderWhoCustomGuessHistory(r){
 const box=$('whoCustomGuessHistory');box.replaceChildren();box.hidden=r.gameMode!=='whoami_custom';
 if(r.gameMode!=='whoami_custom')return;
 const guesses=r.whoCustomGuesses?.[myId]||[];
 guesses.forEach((g,i)=>{
  const awaiting=g.status==='pending'||g.correct==null;
  const line=document.createElement('div');line.className='who-custom-guess-item '+(awaiting?'pending':g.correct?'correct':'incorrect');
  const answer=document.createElement('span');answer.textContent='คำตอบของคุณ: '+g.answer;
  const verdict=document.createElement('b');verdict.textContent=awaiting?'⏳ รอตรวจ':g.correct?'✓ ถูกต้อง':'✕ ไม่ถูกต้อง';
  line.append(answer,verdict);box.append(line);
 });
}
function whoCustomPendingForWriter(r,writerId){
 return Object.entries(r?.whoCustomPending||{}).find(([target,pending])=>
  pending?.writerId===writerId&&r.whoCustomAssignments?.[writerId]===target
 )||null;
}
function renderWhoCustomJudgePanel(r){
 const panel=$('whoCustomJudgePanel'),alert=$('whoCustomReviewAlert');
 const match=whoCustomPendingForWriter(r,myId),assigned=match?.[0],pending=match?.[1];
 const active=['playing','final_guess','whoami_review'].includes(r.status),visible=!!(active&&pending);
 panel.hidden=!visible;alert.hidden=!visible;
 const awaiting=$('whoCustomAwaiting'),myPending=r.whoCustomPending?.[myId];
 awaiting.hidden=!active||!myPending;
 if(myPending){
  const judge=(r.gamePlayers?.[myPending.writerId]||r.playerProfiles?.[myPending.writerId])?.name||'เพื่อนที่ตั้งคำ';
  awaiting.textContent='ส่งคำตอบแล้ว · รอ '+judge+' กดตัดสินถูกหรือผิด';
 }
 if(!visible)return;
 const players=gameParticipants(r),sender=players[assigned]?.name||'เพื่อนของคุณ';
 $('whoCustomJudgeName').textContent=sender;
 $('whoCustomJudgeAnswer').textContent=String(pending.answer||'');
 $('whoCustomJudgeStatus').textContent='เลือกผลคำตอบเพื่อยืนยันให้เพื่อน · ส่งได้ครั้งเดียว';
 alert.textContent='📨 '+sender+' ส่งคำตอบมา · กดตรวจ';
 const token=roomId+':'+(r.gamesPlayed||0)+':'+assigned+':'+pending.submittedAt;
 if(token!==lastWhoCustomNoticeToken){
  lastWhoCustomNoticeToken=token;
  toast('มีคำตอบใหม่จาก '+sender+' ให้คุณตรวจ', 'info');
 }
}
$('whoCustomReviewAlert').onclick=()=>{
 const panel=$('whoCustomJudgePanel');
 if(panel.hidden)return;
 panel.scrollIntoView({behavior:'smooth',block:'center'});
 $('whoCustomJudgeCorrect').focus({preventScroll:true});
};
async function whoCustomJudge(correct){
 const r=roomState;
 if(!roomId||r?.gameMode!=='whoami_custom'||!['playing','final_guess','whoami_review'].includes(r.status))return;
 const target=whoCustomPendingForWriter(r,myId)?.[0];
 if(!target)return;
 const button=correct?$('whoCustomJudgeCorrect'):$('whoCustomJudgeWrong');
 button.disabled=true;
 try{
  const result=await getRef().transaction(x=>{
   if(!x||x.gameMode!=='whoami_custom'||!['playing','final_guess','whoami_review'].includes(x.status)||
    !x.players?.[myId]||x.whoCustomAssignments?.[myId]!==target||
    x.whoCustomPending?.[target]?.writerId!==myId||x.whoCustomReviews?.[target])return;
   const pending=x.whoCustomPending[target],round=Number(pending.round)||1;
   const points=correct?Math.max(1,Number(x.totalRounds||2)-round+1):0;
   x.guessedCorrectly||={};x.guessedCorrectly[target]=correct;
   x.guessDetails||={};
   x.guessDetails[target]={correct,points,round,answer:pending.answer,correctAnswer:x.roles?.[target]||'',attempts:1,reviewedBy:myId};
   x.whoCustomGuesses||={};x.whoCustomGuesses[target]=[{answer:pending.answer,correct,round,reviewedBy:myId}];
   x.whoCustomReviews||={};x.whoCustomReviews[target]={correct,reviewedBy:myId,reviewedAt:serverNow()};
   if(correct){
    x.correctOrder||=[];if(!x.correctOrder.includes(target))x.correctOrder.push(target);
    x.scores||={};x.scores[target]=(Number(x.scores[target])||0)+points;
   }
   delete x.whoCustomPending[target];
   whoCustomCompleteIfReady(x);
   x.lastActivityAt=TIMESTAMP();return x;
  },undefined,false);
  toast(result.committed?'ยืนยันผลคำตอบให้เพื่อนแล้ว':'คำตอบนี้ถูกตรวจไปแล้วหรือไม่สามารถตัดสินได้',result.committed?'success':'error');
 }catch(e){error(e);}finally{button.disabled=false;}
}
$('whoCustomJudgeCorrect').onclick=()=>whoCustomJudge(true);
$('whoCustomJudgeWrong').onclick=()=>whoCustomJudge(false);
$('whoCustomSubmitBtn').onclick=async()=>{
 if(roomState?.gameMode!=='whoami_custom'||roomState.status!=='whoami_prepare'||!roomId)return;
 const word=$('whoCustomWordInput').value.trim().replace(/\s+/g,' ');
 if(!word||word.length>100){toast('กรุณาตั้งคำตอบยาว 1–100 ตัวอักษร','error');return;}
 const button=$('whoCustomSubmitBtn');button.disabled=true;
 try{
  const res=await getRef().transaction(r=>{
   const target=r?.whoCustomAssignments?.[myId];
   if(!r||r.gameMode!=='whoami_custom'||r.status!=='whoami_prepare'||!target||
     !r.players?.[myId]||r.whoCustomSubmitted?.[myId]||serverNow()>=Number(r.whoCustomDeadline||0))return;
   r.whoCustomWords||={};r.whoCustomSubmitted||={};
   r.whoCustomWords[target]=word;r.whoCustomSubmitted[myId]=true;
   if(whoCustomEveryoneConfirmed(r))whoCustomBegin(r);
   r.lastActivityAt=TIMESTAMP();return r;
  },undefined,false);
  toast(res.committed?'ยืนยันคำให้เพื่อนแล้ว':'หมดเวลาหรือเคยยืนยันแล้ว',res.committed?'success':'error');
 }catch(e){error(e);}finally{button.disabled=false;}
};
$('whoCustomWordInput').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.isComposing)$('whoCustomSubmitBtn').click()});
async function whoCustomGuess(){
 if(roomState?.gameMode!=='whoami_custom'||!roomId)return;
 const answer=$('guessInput').value.trim().replace(/\s+/g,' ');
 if(!answer||answer.length>100){toast('กรุณาพิมพ์คำตอบ 1–100 ตัวอักษร','error');return;}
 if(Number(roomState.attempts?.[myId]||0)!==1||roomState.whoCustomPending?.[myId]){
  toast('โหมดนี้ส่งคำตอบได้เพียงครั้งเดียว','error');return;
 }
 if(!await confirmBox('ส่งคำตอบให้เพื่อนตรวจ?', 'ส่ง “'+answer+'” ได้เพียงครั้งเดียว · คนตั้งคำจะเป็นผู้ตัดสิน', 'ส่งคำตอบ'))return;
 const button=$('guessBtn');button.disabled=true;
 try{
  const result=await getRef().transaction(r=>{
   if(!r||r.gameMode!=='whoami_custom'||!['playing','final_guess'].includes(r.status)||
    !r.players?.[myId]||Number(r.attempts?.[myId]||0)!==1||r.whoCustomPending?.[myId]||
    r.whoCustomReviews?.[myId]||(r.whoCustomGuesses?.[myId]||[]).length>0||
    (r.status==='final_guess'&&serverNow()>=Number(r.finalDeadline||0)))return;
   const writerId=whoCustomWriterFor(r,myId);
   if(!writerId||writerId===myId)return;
   const round=r.status==='final_guess'?(Number(r.totalRounds)||1):(Number(r.currentRound)||1);
   r.whoCustomPending||={};
   r.whoCustomPending[myId]={writerId,answer,round,submittedAt:serverNow()};
   r.whoCustomGuesses||={};r.whoCustomGuesses[myId]=[{answer,status:'pending',round}];
   r.attempts[myId]=0;
   if(r.status==='playing')removeWhoAnsweredPlayer(r,myId);
   whoCustomCompleteIfReady(r);
   r.lastActivityAt=TIMESTAMP();return r;
  },undefined,false);
  if(!result.committed){toast('หมดเวลาหรือคุณเคยส่งคำตอบแล้ว','error');return;}
  const saved=result.snapshot?.val();
  if(saved?.whoCustomPending?.[myId]?.writerId!==whoCustomWriterFor(saved,myId)){
   toast('บันทึกคำตอบแล้ว แต่ตรวจสอบการส่งไปยังคนตั้งโจทย์ไม่ได้ กรุณารีเฟรชหน้าห้อง','error');return;
  }
  $('guessInput').value='';
  toast('ส่งคำตอบแล้ว · รอคนที่ตั้งคำให้คุณตรวจถูกหรือผิด','success');
 }catch(e){error(e);}finally{button.disabled=false;}
}
async function whoCustomAuto(){
 if(autoBusy||!roomId||leaving||roomState?.gameMode!=='whoami_custom'||roomState.status!=='whoami_prepare')return;
 if(serverNow()<Number(roomState.whoCustomDeadline||0)&&!whoCustomEveryoneConfirmed(roomState))return;
 autoBusy=true;
 try{
  await getRef().transaction(r=>{
   if(!r||r.gameMode!=='whoami_custom'||r.status!=='whoami_prepare')return;
   if(serverNow()<Number(r.whoCustomDeadline||0)&&!whoCustomEveryoneConfirmed(r))return;
   if(whoCustomBegin(r))return r;
  },undefined,false);
 }catch(e){error(e);}finally{autoBusy=false;}
}
setInterval(()=>{
 if(roomState?.gameMode==='whoami_custom'&&roomState.status==='whoami_prepare'){
  whoCustomClock(roomState);whoCustomAuto();
 }
},1000);
