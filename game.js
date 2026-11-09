(() => {
  'use strict';
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const mini = document.getElementById('miniMap');
  const mx = mini.getContext('2d');
  const $ = id => document.getElementById(id);
  const W = 1000, H = 560, CENTER = H / 2;
  const colors = ['#42eaf3', '#f7d54b', '#ff83ba', '#ff6058'];
  const characters = [
    {name:'ISAGI YOICHI', weapon:'METAVISION · DIRECT SHOT', title:'METAVISION', desc:'Read every space. Find the perfect angle for a direct shot.', speed:74,kick:78,control:80,number:'11'},
    {name:'BACHIRA MEGURU', weapon:'MONSTER DRIBBLE', title:'MONSTER DRIBBLE', desc:'Break their rhythm. Slip past defenders with a monster’s footwork.', speed:82,kick:72,control:91,number:'8'},
    {name:'NAGI SEISHIRO', weapon:'BLACK HOLE TRAP', title:'BLACK HOLE TRAP', desc:'Kill the ball dead. Turn any pass into your next opportunity.', speed:68,kick:87,control:96,number:'7'},
    {name:'CHIGIRI HYOMA', weapon:'44-PANTHER SNIPE', title:'44-PANTHER SNIPE', desc:'Hit top speed and burn a path down the flank.', speed:96,kick:76,control:75,number:'4'}
  ];
  const missions = [
    {title:'ROOM Z', opponent:'TEAM X', next:"TEAM X · BAROU'S DOMAIN", objective:'Score 1 goal to clear the room.', target:1, start:0, enemy:0, mode:'THE TAG GAME'},
    {title:'TEAM X', opponent:'TEAM X', next:'TEAM Y · READ THE PITCH', objective:'Break through. Score 2 goals.', target:2,start:0,enemy:0,mode:'KING OF THE FIELD'},
    {title:'TEAM Y', opponent:'TEAM Y', next:'TEAM W · WANIMA TWINS', objective:'Read the lanes. Score 2 goals.',target:2,start:0,enemy:0,mode:'READ THE PITCH'},
    {title:'TEAM W', opponent:'TEAM W', next:'TEAM V · THREE-GOAL COMEBACK', objective:'Unlock Chigiri. Win the match.',target:2,start:0,enemy:1,mode:'UNLEASH THE PANTHER'},
    {title:'TEAM V', opponent:'TEAM V', next:'SECOND SELECTION · 3V3 GRID', objective:'A 3–0 deficit. Score 5 to awaken.',target:5,start:3,enemy:0,mode:'BOSS MATCH · 3–0'},
    {title:'SECOND SELECTION', opponent:'RIVALS', next:'CAMPAIGN COMPLETE', objective:'Beat Rin’s trio. Score 3 goals.',target:3,start:0,enemy:0,mode:'RIVALRY · 3V3'}
  ];
  const state = {started:false,paused:false, mission:0, selected:0, ego:0, flow:0, flowUsed:false, score:0, against:0, time:90*60, player:null, teammates:[], enemies:[], ball:{x:310,y:CENTER,vx:0,vy:0,r:8,owner:'player'}, keys:{}, joy:{x:0,y:0,active:false}, aim:{x:1,y:0}, last:0, accum:0, weaponCharge:1, tactic:false, sprint:0, goalPause:0, sound:true, matchEnded:false, lastLog:0};
  function unit(team,x,y,idx,name){return {team,x,y,vx:0,vy:0,r:15,idx,name,stun:0,trail:[],phase:Math.random()*7,action:0};}
  function initializeMatch(){
    const m=missions[state.mission]; state.score=m.start; state.against=m.enemy; state.time=90*60; state.matchEnded=false; state.paused=false; state.ego=Math.max(state.ego,0);state.flow=0;state.flowUsed=false;state.tactic=false;state.weaponCharge=1;state.sprint=0;state.goalPause=0;
    state.player=unit('home',295,CENTER,0,characters[state.selected].name);state.player.r=16;
    state.teammates=[unit('home',210,205,1,'BACHIRA'),unit('home',220,365,2,'NAGI'),unit('home',110,CENTER,3,'CHIGIRI')];
    state.enemies=[unit('away',670,210,0,'BAROU'),unit('away',720,CENTER,1,'RIVAL'),unit('away',670,350,2,'DEFENDER')];
    state.ball={x:state.player.x+18,y:state.player.y,vx:0,vy:0,r:8,owner:'player'};
    $('score').innerHTML=`${state.score} <i>—</i> ${state.against}`; $('clock').textContent='90:00'; $('phaseLabel').textContent=`${m.title} · ${state.mission===0?'ROOM Z':'FIRST SELECTION'}`;
    $('modeText').textContent=m.mode; $('objectiveText').textContent=m.objective; $('nextMatch').textContent=m.next; $('possession').textContent='● YOUR POSSESSION';
    log(`Mission loaded: ${m.title}. Make your weapon the difference.`); renderUI();
  }
  function log(text){const box=$('logItems'),p=document.createElement('p');p.innerHTML=`<i>·</i> ${text}`;box.prepend(p);while(box.children.length>4)box.lastElementChild.remove()}
  function toast(text){const t=$('toast');t.textContent=text;t.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.remove('show'),1800)}
  function getPlayer(){return state.player}
  function renderUI(){
    const c=characters[state.selected];$('playerName').textContent=c.name;$('weaponName').textContent=c.weapon;$('weaponTitle').textContent=c.title;$('weaponDescription').textContent=c.desc;
    $('statSpeed').textContent=c.speed;$('statKick').textContent=c.kick;$('statControl').textContent=c.control;$('playerAvatar').querySelector('span').textContent=c.number;
    $('playerAvatar').style.background=`linear-gradient(145deg,${colors[state.selected]} 0 49%,#16324a 50%)`;
    document.querySelectorAll('.character-chip').forEach((el,i)=>el.classList.toggle('selected',i===state.selected));
    $('egoPercent').textContent=`${Math.round(state.ego)}%`;$('egoFill').style.width=`${state.ego}%`;
    $('flowReady').classList.toggle('ready',state.ego>=100);$('flowButton').classList.toggle('ready',state.ego>=100);$('flowButton').textContent=state.flow>0?`FLOW ${Math.ceil(state.flow)}s`:'ACTIVATE FLOW';
    $('egoHint').textContent=state.flow>0?'Flow active · own this moment.':state.ego>=100?'Your ego is ready. Take control.':'Play selfish. Make it count.';
    $('cooldownFill').style.width=`${Math.round(state.weaponCharge*100)}%`;
    $('weaponButton').style.opacity=state.weaponCharge>=1?'1':'.55';
  }
  function resize(){const r=canvas.getBoundingClientRect();const dpr=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.max(1,Math.floor(r.width*dpr));canvas.height=Math.max(1,Math.floor(r.height*dpr));ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0)}
  window.addEventListener('resize',resize);resize();
  function clamp(v,a,b){return Math.max(a,Math.min(b,v))}function norm(x,y){const l=Math.hypot(x,y)||1;return{x:x/l,y:y/l}}function distance(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
  function addEgo(n,reason){state.ego=clamp(state.ego+n,0,100);if(reason)log(reason);renderUI()}
  function choosePlayer(i){if(i<0||i>3||i===state.selected)return;state.selected=i;renderUI();if(state.started){toast(`${characters[i].name} · ${characters[i].weapon}`);log(`${characters[i].name.split(' ')[0]} steps into the play.`)}}
  function activateFlow(){if(!state.started)return;if(state.ego<100){toast('Build your ego to 100% first.');return}if(state.flow>0)return;state.ego=0;state.flow=15;state.flowUsed=true;document.body.classList.add('flowing');$('flowAnnounce').classList.add('active');setTimeout(()=>$('flowAnnounce').classList.remove('active'),2000);log('FLOW STATE! The whole field slows down.');toast('FLOW STATE — 15 seconds of total ego.');renderUI()}
  function actionWeapon(){if(!state.started||state.goalPause>0||state.weaponCharge<1)return;const p=state.player, c=state.selected;state.weaponCharge=0;state.tactic=false;
    if(c===0){state.tactic=true;state.weaponCharge=.12;addEgo(8,'Metavision mapped the field. Hot zones revealed.');toast('METAVISION · HOT ZONES REVEALED');setTimeout(()=>{state.tactic=false},3200)}
    if(c===1){const dir=state.aim;const foe=state.enemies.slice().sort((a,b)=>distance(a,p)-distance(b,p))[0];if(foe&&distance(foe,p)<145){foe.stun=1.6;const away=norm(foe.x-p.x,foe.y-p.y);foe.x+=away.x*46;foe.y+=away.y*46}p.vx+=dir.x*250;p.vy+=dir.y*250;state.sprint=1.1;addEgo(17,'Bachira’s monster dribbles through the line!');toast('MONSTER DRIBBLE · NUTMEG!')}
    if(c===2){if(state.ball.owner==='free'&&distance(state.ball,p)<220){state.ball.owner='player';state.ball.vx=state.ball.vy=0;addEgo(15,'Nagi killed the ball dead. Perfect control.');toast('BLACK HOLE TRAP · BALL CONTROLLED')}else if(state.ball.owner==='enemy'&&distance(state.ball,p)<150){const enemy=state.enemies.find(e=>e.idx===0)||state.enemies[0];if(enemy){enemy.stun=1.4;state.ball.owner='player';addEgo(12,'Nagi traps the loose ball out of the challenge.');toast('BLACK HOLE TRAP · POSSESSION WON')}}else{addEgo(8,'Nagi is ready for the next ball.');toast('BLACK HOLE TRAP · CONTROL READY')}}
    if(c===3){state.sprint=3.3;addEgo(12,'Chigiri hits top speed down the flank!');toast('44-PANTHER SNIPE · TOP SPEED!')}
    state.weaponCharge=0;renderUI();
  }
  function pass(){if(!state.started||state.ball.owner!=='player')return;const p=state.player;let candidates=state.teammates.filter(t=>t.x>p.x-35).sort((a,b)=>distance(a,p)-distance(b,p));if(!candidates.length)candidates=state.teammates.slice().sort((a,b)=>distance(a,p)-distance(b,p));const mate=candidates[0];if(!mate)return;const d=norm(mate.x-p.x,mate.y-p.y);state.ball.owner='free';state.ball.x=p.x+d.x*22;state.ball.y=p.y+d.y*22;state.ball.vx=d.x*510;state.ball.vy=d.y*510;state.passTarget=mate;state.ego=Math.max(0,state.ego-3);log(`${characters[state.selected].name.split(' ')[0]} plays a pass to ${mate.name}.`);renderUI()}
  function shoot(){if(!state.started||state.goalPause>0)return;const p=state.player;if(state.ball.owner!=='player'){if(state.ball.owner==='free'&&distance(state.ball,p)<34){state.ball.owner='player';state.ball.vx=state.ball.vy=0}else{return}}
    let d=state.aim; if(state.selected===0&&state.tactic){const goal={x:960,y:CENTER};d=norm(goal.x-p.x,goal.y-p.y);addEgo(10,'Metavision Direct Shot!');}
    const dir=norm(d.x*.72+Math.max(0,(940-p.x)/940)*.8,d.y*.72+(CENTER-p.y)/800);const power=(480+characters[state.selected].kick*2.35)*(state.flow>0?1.12:1);state.ball.owner='free';state.ball.x=p.x+dir.x*22;state.ball.y=p.y+dir.y*22;state.ball.vx=dir.x*power;state.ball.vy=dir.y*power;state.shootGlow=.4;addEgo(state.selected===0?13:10,`${characters[state.selected].name.split(' ')[0]} unleashes a shot!`);if(state.selected===0&&state.tactic){state.ball.vx*=1.24;state.ball.vy*=1.24}state.tactic=false;
  }
  function playerMovement(dt){const p=state.player;let x=(state.keys.ArrowRight||state.keys.KeyD?1:0)-(state.keys.ArrowLeft||state.keys.KeyA?1:0)+state.joy.x;let y=(state.keys.ArrowDown||state.keys.KeyS?1:0)-(state.keys.ArrowUp||state.keys.KeyW?1:0)+state.joy.y;const l=Math.hypot(x,y);if(l>1){x/=l;y/=l}if(l>.1)state.aim=norm(x,y);const sprint=state.keys.ShiftLeft||state.keys.ShiftRight;let speed=190*(characters[state.selected].speed/78);if(sprint)speed*=1.27;if(state.sprint>0)speed*=1.58;if(state.flow>0)speed*=1.3;p.vx=x*speed;p.vy=y*speed;p.x=clamp(p.x+p.vx*dt,35,940);p.y=clamp(p.y+p.vy*dt,38,522);p.action=l>.12?1:0;}
  function moveAI(dt){const ball=state.ball,p=state.player;
    state.teammates.forEach((m,i)=>{const targetX=state.ball.owner==='enemy'?Math.max(290,ball.x-110):Math.min(850,Math.max(p.x+80,ball.x+100));const targetY=CENTER+(i===0?-102:95);const dx=targetX-m.x,dy=targetY-m.y,l=Math.hypot(dx,dy);m.vx=l>20?dx/l*105:0;m.vy=l>20?dy/l*105:0;m.x=clamp(m.x+m.vx*dt,35,935);m.y=clamp(m.y+m.vy*dt,40,520);});
    state.enemies.forEach((e,i)=>{if(e.stun>0){e.stun-=dt;e.vx*=.9;e.vy*=.9;e.x+=e.vx*dt;e.y+=e.vy*dt;return}let tx,ty;if(ball.owner==='enemy'){tx=state.player.x+(i-1)*60;ty=state.player.y+(i-1)*85}else if(ball.owner==='player'){const anchor=state.player;tx=Math.max(anchor.x+35,Math.min(800,ball.x-35-i*26));ty=CENTER+(i-1)*72}else{tx=ball.x+(i===0?0:(i-1)*65);ty=ball.y+(i===0?0:(i-1)*45)}const dx=tx-e.x,dy=ty-e.y,d=Math.hypot(dx,dy)||1;const sp=ball.owner==='enemy'?112:115;e.vx=dx/d*sp;e.vy=dy/d*sp;e.x=clamp(e.x+e.vx*dt,50,940);e.y=clamp(e.y+e.vy*dt,40,520);});
  }
  function ballPhysics(dt){const b=state.ball,p=state.player;if(b.owner==='player'){const d=state.aim;b.x=p.x+d.x*19;b.y=p.y+d.y*13;b.vx=p.vx;b.vy=p.vy;state.possession='home';}
    else if(b.owner==='enemy'){const carrier=state.enemies.find(e=>e.hasBall)||state.enemies[0];if(!carrier)return;b.x=carrier.x-16;b.y=carrier.y;b.vx=carrier.vx;b.vy=carrier.vy;state.enemyCarrier=carrier;state.possession='away';}
    else{b.x+=b.vx*dt;b.y+=b.vy*dt;const damp=Math.pow(.984,dt*60);b.vx*=damp;b.vy*=damp;if(Math.abs(b.vx)<8)b.vx=0;if(Math.abs(b.vy)<8)b.vy=0;
      if(b.y<35||b.y>525){b.y=clamp(b.y,35,525);b.vy*=-.7}
      if(b.x>946&&Math.abs(b.y-CENTER)<73){goal(true);return}if(b.x<54&&Math.abs(b.y-CENTER)<73){goal(false);return}
      if(b.x<32||b.x>968){b.x=clamp(b.x,32,968);b.vx*=-.72}
      if(b.vx===0&&b.vy===0){const nearP=distance(b,p);if(nearP<23){b.owner='player';state.ego=clamp(state.ego+3,0,100);log('Isagi reads the loose ball first. +3 EGO');renderUI();return}const closeTeam=state.teammates.find(m=>distance(m,b)<20);if(closeTeam){b.owner='player';return}const nearE=state.enemies.find(e=>distance(e,b)<21);if(nearE){b.owner='enemy';nearE.hasBall=true;state.ego=Math.max(0,state.ego-4);renderUI();log(`${nearE.name} claims the loose ball.`);return}}
      // possession challenge and smart pick-up on a moving ball
      if(b.vx!==0&&b.vx<100&&distance(b,p)<18){b.owner='player';b.vx=b.vy=0;return}
    }
    if(b.owner==='player'){const foe=state.enemies.find(e=>e.stun<=0&&distance(e,p)<24);if(foe&&Math.random()<dt*.8){b.owner='free';b.x=p.x;b.y=p.y;b.vx=-55;b.vy=(Math.random()-.5)*140;state.ego=Math.max(0,state.ego-5);log('A defender disrupts the dribble. Take it back!');renderUI()}}
    if(b.owner==='enemy'){const carrier=state.enemyCarrier||state.enemies[0];if(distance(carrier,p)<22){b.owner='player';state.enemies.forEach(e=>e.hasBall=false);state.ego=clamp(state.ego+14,0,100);log('INTERCEPTED! You read the passing lane. +14 EGO');renderUI()}}
    $('possession').textContent=state.possession==='home'?'● YOUR POSSESSION':'● RIVALS IN POSSESSION';
  }
  function enemyPlay(dt){if(state.ball.owner!=='enemy')return;const carrier=state.enemyCarrier||state.enemies[0];if(carrier.x<240&&Math.random()<dt*.42){const target=state.player;const d=norm(30-carrier.x,CENTER-carrier.y);state.ball.owner='free';state.ball.x=carrier.x;state.ball.y=carrier.y;state.ball.vx=d.x*390;state.ball.vy=d.y*390;state.enemies.forEach(e=>e.hasBall=false);log(`${carrier.name} fires a shot! Intercept it!`);}}
  function goal(home){if(state.goalPause>0)return;state.goalPause=2.2;state.ball.owner='free';state.ball.vx=state.ball.vy=0;if(home){state.score++;state.ego=clamp(state.ego+28,0,100);$('goalCaption').textContent=state.selected===0?'METAVISION. DIRECT SHOT. PERFECT.':'THE FIELD BENDS TO YOUR WILL';$('goalFlash').classList.add('show');log(`GOAL! Team Z scores. +28 EGO.`);toast('GOAL! THE EGOIST STRIKES.')}else{state.against++;$('goalCaption').textContent='THE RIVALS FOUND THEIR OPENING';$('goalFlash').querySelector('span').textContent='CONCEDED';$('goalFlash').classList.add('show');log('Goal conceded. Reclaim the field.');toast('GOAL CONCEDED · RESET YOUR FORM')}
    $('score').innerHTML=`${state.score} <i>—</i> ${state.against}`;renderUI();setTimeout(()=>$('goalFlash').classList.remove('show'),1250);setTimeout(()=>{$('goalFlash').querySelector('span').textContent='GOAL'},1500);
  }
  function afterGoal(){if(state.goalPause>0){state.goalPause-=state.delta;if(state.goalPause<=0){const m=missions[state.mission];if(state.score>=m.target){completeMission();return}state.player.x=295;state.player.y=CENTER;state.ball.owner='player';state.ball.x=315;state.ball.y=CENTER;state.ball.vx=state.ball.vy=0;state.enemies.forEach((e,i)=>{e.x=670+i*15;e.y=CENTER+(i-1)*72;e.hasBall=false});state.teammates.forEach((t,i)=>{t.x=210;t.y=CENTER+(i-1)*90})}}}
  function completeMission(){state.matchEnded=true;state.started=false;state.paused=true;document.querySelectorAll('.mission').forEach((b,i)=>{if(i<=state.mission+1)b.classList.add('unlocked')});const m=missions[state.mission];$('centerMessage').classList.remove('hidden');$('centerMessage').querySelector('.message-kicker').textContent=`${m.title} CLEARED`;$('centerMessage').querySelector('h1').innerHTML='NEXT<br><em>SELECTION.</em>';$('centerMessage').querySelector('p').textContent='Your ego evolves. A new rival is waiting.';$('startButton').innerHTML='PLAY NEXT MATCH <span>↗</span>';if(state.mission===5){$('centerMessage').querySelector('h1').innerHTML='EGO<br><em>AWAKENED.</em>';$('centerMessage').querySelector('p').textContent='You conquered the Second Selection. The journey continues.';$('startButton').innerHTML='PLAY AGAIN <span>↗</span>'}log('MISSION CLEAR. The next selection awaits.');}
  function update(dt){if(!state.started||state.paused)return;state.delta=dt;if(state.flow>0){state.flow=Math.max(0,state.flow-dt);if(state.flow===0)document.body.classList.remove('flowing')}if(state.weaponCharge<1)state.weaponCharge=Math.min(1,state.weaponCharge+dt*.3);if(state.sprint>0)state.sprint=Math.max(0,state.sprint-dt);state.time=Math.max(0,state.time-dt*60);if(state.time<=0){if(state.score>state.against){completeMission();return}else{state.time=90*60;toast('EXTRA TIME · FIND YOUR GOAL!');log('Extra time. One goal decides it.')}}
    playerMovement(dt);moveAI(dt);ballPhysics(dt);enemyPlay(dt);afterGoal();state.accum+=dt;if(state.accum>.6){state.accum=0;renderUI();const sec=Math.ceil(state.time/60);$('clock').textContent=`${Math.floor(sec/60).toString().padStart(2,'0')}:${(sec%60).toString().padStart(2,'0')}`}
  }
  function fieldPath(){ctx.beginPath();ctx.roundRect(35,34,930,492,2)}
  function drawField(){ctx.clearRect(0,0,W,H);const bg=ctx.createLinearGradient(0,0,W,H);bg.addColorStop(0,'#1a3940');bg.addColorStop(.52,'#133b3c');bg.addColorStop(1,'#17383c');ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
    // mow stripes
    for(let i=0;i<10;i++){ctx.fillStyle=i%2?'#ffffff05':'#001a1c0c';ctx.fillRect(36+i*93,35,93,490)}
    // pitch outline and details
    ctx.strokeStyle='#c2eee433';ctx.lineWidth=2;fieldPath();ctx.stroke();ctx.beginPath();ctx.moveTo(500,35);ctx.lineTo(500,525);ctx.stroke();ctx.beginPath();ctx.arc(500,CENTER,73,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#caeee855';ctx.beginPath();ctx.arc(500,CENTER,3,0,Math.PI*2);ctx.fill();
    // penalty boxes
    ctx.strokeRect(35,166,135,228);ctx.strokeRect(35,220,54,120);ctx.strokeRect(830,166,135,228);ctx.strokeRect(911,220,54,120);ctx.beginPath();ctx.arc(140,CENTER,3,0,7);ctx.fill();ctx.beginPath();ctx.arc(860,CENTER,3,0,7);ctx.fill();ctx.beginPath();ctx.arc(140,CENTER,72,-.86,.86);ctx.stroke();ctx.beginPath();ctx.arc(860,CENTER,72,Math.PI-.86,Math.PI+.86);ctx.stroke();
    // goals and net
    ctx.fillStyle='#b8edf02a';ctx.fillRect(964,220,24,120);ctx.strokeStyle='#d5feff96';ctx.lineWidth=2;ctx.strokeRect(964,220,24,120);ctx.fillStyle='#ed6b4936';ctx.fillRect(12,220,24,120);ctx.strokeStyle='#ff997779';ctx.strokeRect(12,220,24,120);ctx.lineWidth=1;
    // subtle edge vignette
    const vg=ctx.createRadialGradient(500,280,250,500,280,660);vg.addColorStop(0,'transparent');vg.addColorStop(1,'#06131e72');ctx.fillStyle=vg;ctx.fillRect(0,0,W,H);
  }
  function drawPlayer(u,isHuman=false){const pulse=Math.sin(performance.now()/210+u.phase);u.trail.push({x:u.x,y:u.y});if(u.trail.length>6)u.trail.shift();if((isHuman&&state.sprint>0)||state.flow>0){ctx.save();for(let i=0;i<u.trail.length;i++){const t=u.trail[i];ctx.globalAlpha=(i/u.trail.length)*.13;ctx.fillStyle=isHuman?colors[state.selected]:'#ffae55';ctx.beginPath();ctx.ellipse(t.x-5,t.y,11,7,0,0,Math.PI*2);ctx.fill()}ctx.restore()}
    ctx.save();ctx.translate(u.x,u.y);const home=u.team==='home';const color=isHuman?colors[state.selected]:(home?(u.idx===1?'#f7d54b':u.idx===2?'#ff83ba':'#ff6058'):'#f47b4e');
    if(isHuman){ctx.globalAlpha=.22+.06*pulse;ctx.fillStyle=state.flow>0?'#ffc249':color;ctx.beginPath();ctx.arc(0,0,27+pulse*2,0,7);ctx.fill();ctx.globalAlpha=1}
    // ground shadow
    ctx.fillStyle='#06111796';ctx.beginPath();ctx.ellipse(2,9,15,7,0,0,7);ctx.fill();
    // direction highlight + shoulders
    ctx.fillStyle=home?'#e4faff':'#ffe6d8';ctx.beginPath();ctx.ellipse(0,-2,12,14,0,0,7);ctx.fill();ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(-11,-9);ctx.lineTo(-7,-15);ctx.lineTo(7,-15);ctx.lineTo(12,-7);ctx.lineTo(9,7);ctx.lineTo(0,12);ctx.lineTo(-9,7);ctx.closePath();ctx.fill();
    ctx.strokeStyle=home?'#d7fbff':'#fff0e8';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(-8,-8);ctx.lineTo(-12,-14);ctx.moveTo(8,-8);ctx.lineTo(12,-14);ctx.stroke();ctx.fillStyle='#10212a';ctx.beginPath();ctx.arc(0,-2,5,0,7);ctx.fill();ctx.fillStyle='#effcff';ctx.beginPath();ctx.arc(1,-3,1.3,0,7);ctx.fill();
    if(isHuman){ctx.strokeStyle='#f4ffff';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(0,0,19+pulse,0,7);ctx.stroke();ctx.fillStyle='#f4ffff';ctx.font='800 9px "Barlow Condensed"';ctx.textAlign='center';ctx.fillText('YOU',0,-24);}
    else{ctx.fillStyle='#f3fbff';ctx.font='700 8px "DM Sans"';ctx.textAlign='center';ctx.fillText(u.name.split(' ')[0],0,-23)}
    if(u.stun>0){ctx.fillStyle='#ffe572';ctx.font='bold 14px sans-serif';ctx.fillText('✦',0,-29)}ctx.restore();
  }
  function drawBall(){const b=state.ball;ctx.save();ctx.fillStyle='#06101475';ctx.beginPath();ctx.ellipse(b.x+3,b.y+7,10,5,0,0,7);ctx.fill();ctx.fillStyle='#f7fbf4';ctx.strokeStyle='#a5d9d4';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(b.x,b.y,8,0,7);ctx.fill();ctx.stroke();ctx.fillStyle='#263a3a';ctx.beginPath();ctx.moveTo(b.x-2,b.y-4);ctx.lineTo(b.x+3,b.y-5);ctx.lineTo(b.x+5,b.y);ctx.lineTo(b.x+1,b.y+3);ctx.lineTo(b.x-3,b.y+1);ctx.closePath();ctx.fill();ctx.beginPath();ctx.arc(b.x-4,b.y+4,1.4,0,7);ctx.fill();if(state.ball.owner==='player'){ctx.strokeStyle=colors[state.selected]+'bb';ctx.beginPath();ctx.arc(b.x,b.y,12+Math.sin(performance.now()/90)*1.5,0,7);ctx.stroke()}ctx.restore()}
  function drawTactic(){if(!state.tactic)return;ctx.save();ctx.fillStyle='#a5efff12';ctx.strokeStyle='#89f5ff55';ctx.lineWidth=1;for(let x=180;x<900;x+=80)for(let y=90;y<500;y+=70){ctx.fillRect(x,y,72,62);ctx.strokeRect(x,y,72,62)}ctx.fillStyle='#ffcc4a55';ctx.beginPath();ctx.arc(780,CENTER,46,0,7);ctx.fill();ctx.strokeStyle='#fff4a8';ctx.lineWidth=2;ctx.beginPath();ctx.arc(780,CENTER,17,0,7);ctx.stroke();ctx.fillStyle='#fff2a1';ctx.font='700 11px "Space Mono"';ctx.fillText('DIRECT SHOT HOT ZONE',698,CENTER-55);ctx.restore()}
  function draw(){drawField();drawTactic();const all=[...state.teammates,...state.enemies,state.player].sort((a,b)=>a.y-b.y);all.forEach(u=>drawPlayer(u,u===state.player));drawBall();drawMini();requestAnimationFrame(draw)}
  function drawMini(){const w=240,h=150;mx.clearRect(0,0,w,h);mx.fillStyle='#102d32';mx.fillRect(0,0,w,h);mx.strokeStyle='#b7d8d044';mx.lineWidth=1;mx.strokeRect(4,4,w-8,h-8);mx.beginPath();mx.moveTo(w/2,4);mx.lineTo(w/2,h-4);mx.stroke();mx.beginPath();mx.arc(w/2,h/2,18,0,7);mx.stroke();mx.strokeRect(4,39,26,72);mx.strokeRect(w-30,39,26,72);function dot(u,c,r){mx.fillStyle=c;mx.beginPath();mx.arc(4+u.x/W*(w-8),4+u.y/H*(h-8),r,0,7);mx.fill()}state.teammates.forEach(t=>dot(t,t.idx===1?'#f6d850':t.idx===2?'#ff83ba':'#ff6058',3));state.enemies.forEach(e=>dot(e,'#f47b4e',3));dot(state.player,colors[state.selected],4);dot(state.ball,'#fff',2.5)}
  requestAnimationFrame(draw);
  function frame(t){if(!state.last)state.last=t;const dt=Math.min(.04,(t-state.last)/1000);state.last=t;update(dt);requestAnimationFrame(frame)}requestAnimationFrame(frame);
  function begin(){if(state.matchEnded){state.mission=Math.min(5,state.mission+1);state.selected=state.mission===3?3:state.selected===0?1:state.selected;state.matchEnded=false}else if(state.started){return}else if(state.paused){state.paused=false;state.started=true;$('centerMessage').classList.add('hidden');return}state.started=true;state.paused=false;$('centerMessage').classList.add('hidden');$('centerMessage').querySelector('.message-kicker').textContent='THE PITCH IS YOURS';$('centerMessage').querySelector('h1').innerHTML='AWAKEN<br><em>YOUR EGO.</em>';$('centerMessage').querySelector('p').textContent='Make your weapon the difference.';$('startButton').innerHTML='ENTER THE PITCH <span>↗</span>';initializeMatch()}
  $('startButton').addEventListener('click',begin);$('flowButton').addEventListener('click',activateFlow);$('weaponButton').addEventListener('click',actionWeapon);$('swapButton').addEventListener('click',()=>choosePlayer((state.selected+1)%4));$('soundButton').addEventListener('click',e=>{state.sound=!state.sound;e.currentTarget.textContent=state.sound?'♫':'♪';toast(state.sound?'Sound on':'Sound off')});
  document.querySelectorAll('.character-chip').forEach(el=>el.addEventListener('click',()=>choosePlayer(+el.dataset.player)));
  document.querySelectorAll('.mission').forEach(el=>el.addEventListener('click',()=>{const i=+el.dataset.mission;if(i>state.mission+1&&!el.classList.contains('unlocked')){toast('Clear the previous selection to unlock this match.');return}state.mission=i;document.querySelectorAll('.mission').forEach(x=>x.classList.toggle('active',x===el));state.started=false;state.paused=false;state.matchEnded=false;$('centerMessage').classList.remove('hidden');$('centerMessage').querySelector('.message-kicker').textContent=`${missions[i].title} · SELECTED`;$('centerMessage').querySelector('h1').innerHTML='AWAKEN<br><em>YOUR EGO.</em>';$('centerMessage').querySelector('p').textContent=missions[i].objective;$('startButton').innerHTML='ENTER THE PITCH <span>↗</span>';initializeMatch()}));
  window.addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();state.keys[e.code]=true;if(e.repeat)return;if(e.code==='Space')shoot();if(e.code==='KeyQ')pass();if(e.code==='KeyE')actionWeapon();if(e.code==='KeyF')activateFlow();if(e.code==='Tab'){e.preventDefault();choosePlayer((state.selected+1)%4)}if(e.code.startsWith('Digit')){const i=+e.code.slice(5)-1;if(i>=0&&i<4)choosePlayer(i)}if(e.code==='Enter'&&!state.started)begin()});window.addEventListener('keyup',e=>state.keys[e.code]=false);window.addEventListener('blur',()=>{state.keys={};state.joy.x=state.joy.y=0});
  document.querySelectorAll('.touch-action').forEach(el=>{el.addEventListener('pointerdown',e=>{e.preventDefault();if(el.dataset.action==='shoot')shoot();if(el.dataset.action==='pass')pass();if(el.dataset.action==='weapon')actionWeapon();if(el.dataset.action==='flow')activateFlow()})});
  const zone=$('stickZone'),knob=$('stickKnob');let pointer=null;function joyMove(e){if(pointer!==e.pointerId)return;const r=zone.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,dx=e.clientX-cx,dy=e.clientY-cy,max=r.width*.34,len=Math.hypot(dx,dy),scale=len>max?max/len:1;state.joy.x=dx*scale/max;state.joy.y=dy*scale/max;knob.style.transform=`translate(calc(-50% + ${dx*scale}px),calc(-50% + ${dy*scale}px))`}
  zone.addEventListener('pointerdown',e=>{e.preventDefault();pointer=e.pointerId;zone.setPointerCapture(pointer);state.joy.active=true;joyMove(e)});zone.addEventListener('pointermove',joyMove);function joyEnd(){pointer=null;state.joy.x=state.joy.y=0;state.joy.active=false;knob.style.transform='translate(-50%,-50%)'}zone.addEventListener('pointerup',joyEnd);zone.addEventListener('pointercancel',joyEnd);
  // Allow dragging anywhere on the pitch with a second thumb; all controls stay inside the safe area.
  $('pitchFrame').addEventListener('pointerdown',e=>{if(e.target.closest('.mobile-controls')||e.target.closest('button'))return;if(matchMedia('(pointer:coarse)').matches){const r=canvas.getBoundingClientRect();const x=e.clientX-r.left,y=e.clientY-r.top;state.aim=norm(1,(H/2-y/r.height*H)/250)}});
  initializeMatch();
})();
