/* A single pinned viewport. Native scrolling advances one continuous timeline.
   Scene changes are optical blends in place; page edges never slide past it. */
(() => {
  const q=s=>document.querySelector(s);
  const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
  const mix=(a,b,t)=>a+(b-a)*t;
  const ease=t=>{t=clamp(t);return t*t*(3-2*t)};
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reduced)return;

  const definitions=[
    ['.journey','top','The entrance','intro'],
    ['.details','details','Base camp','paper'],
    ['.crew','expedition','Jungle crew','crew'],
    ['.itinerary','plan','The party plan','paper'],
    ['.canopy-transition','canopy','Through the canopy','canopy'],
    ['.rsvp','rsvp','Count us in','paper'],
    ['.closing','closing','See you there','ending']
  ];
  const main=q('main'),experience=document.createElement('div'),stage=document.createElement('div');
  experience.className='story-experience';stage.className='story-stage';experience.append(stage);
  const scenes=definitions.map(([selector,id,label,kind],i)=>{
    const content=q(selector),el=document.createElement('div');
    content.removeAttribute('id');el.id=id;el.className=`story-scene story-scene-${kind}`;
    el.dataset.chapter=label;el.setAttribute('role','region');el.setAttribute('aria-label',label);
    let sheet=null;
    if(kind==='paper'){
      sheet=document.createElement('div');sheet.className='story-paper';sheet.append(content);el.append(sheet);
    }else if(kind==='ending'){
      sheet=document.createElement('div');sheet.className='story-ending';sheet.append(content,q('footer'));el.append(sheet);
    }else el.append(content);
    el.inert=i!==0;el.setAttribute('aria-hidden',String(i!==0));stage.append(el);
    return {el,content,sheet,id,label,kind,readStart:0,readEnd:0,overflow:0,hold:0,duration:0};
  });
  const veil=document.createElement('div');veil.className='story-transition-leaves';veil.setAttribute('aria-hidden','true');
  veil.innerHTML='<div class="story-leaf-left"><svg><use href="#palm"/></svg><svg><use href="#leaf"/></svg></div><div class="story-leaf-right"><svg><use href="#palm"/></svg><svg><use href="#leaf"/></svg></div>';
  stage.append(veil);main.append(experience);document.body.classList.add('has-story');
  const nav=document.createElement('nav');nav.className='story-nav';nav.setAttribute('aria-label','Invitation scenes');
  nav.innerHTML='<button type="button" class="story-prev" aria-label="Previous scene">←</button><span class="story-location"><b>01 / 07</b><small>The entrance</small></span><button type="button" class="story-next" aria-label="Next scene">→</button>';
  document.body.append(nav);

  let height=0,total=0,transition=0,target=0,shown=0,active=0,frame=0,lastTime=0,ready=false,passScale=1;
  const top=()=>experience.getBoundingClientRect().top+window.scrollY;
  const localScroll=()=>clamp(window.scrollY-top(),0,total);
  function locate(y){
    let i=0;while(i<scenes.length-1&&y>=scenes[i+1].readStart)i++;
    const current=scenes[i];
    if(i<scenes.length-1&&y>current.readEnd)return {i,next:i+1,t:clamp((y-current.readEnd)/transition)};
    return {i,next:-1,t:0};
  }
  function measure(preserve=false){
    const old=ready?locate(target):null;
    const oldFraction=old?clamp((target-scenes[old.i].readStart)/scenes[old.i].duration):0;
    height=stage.clientHeight;transition=height*.92;
    passScale=Math.min(1,height*.78/q('.explorer-pass').offsetHeight);
    let cursor=0;
    for(let i=0;i<scenes.length;i++){
      const s=scenes[i];s.readStart=cursor+(i?transition:0);
      s.hold=height*.45;s.overflow=0;
      if(s.sheet){
        s.sheet.style.minHeight=`${height-96}px`;
        const inset=s.kind==='ending'?0:Math.min(52,height*.055);
        s.overflow=Math.max(0,s.sheet.scrollHeight+inset+125-height);
        s.duration=s.hold+s.overflow+height*.4;
      }else s.duration=height*(s.kind==='intro'?2.8:s.kind==='crew'?1.05:.65);
      s.readEnd=s.readStart+s.duration;cursor=s.readEnd;
      s.el.dataset.readStart=s.readStart.toFixed(2);s.el.dataset.readEnd=s.readEnd.toFixed(2);
      s.el.dataset.overflow=s.overflow.toFixed(2);
    }
    total=cursor;experience.style.height=`${total+height}px`;
    if(preserve&&old){
      target=shown=old.next>=0?scenes[old.i].readEnd+old.t*transition:scenes[old.i].readStart+scenes[old.i].duration*oldFraction;
      window.scrollTo({top:top()+target,behavior:'instant'});
    }else target=shown=localScroll();
    ready=true;render(shown);
  }
  function sceneContent(s,y){
    const local=clamp(y-s.readStart,0,s.duration),p=local/s.duration;
    if(s.sheet){
      const pan=clamp(local-s.hold,0,s.overflow);
      s.sheet.style.transform=`translate3d(0,${-pan.toFixed(3)}px,0)`;
      s.el.dataset.pan=pan.toFixed(2);
    }
    if(s.kind==='intro'){
      const open=ease(p/.55),titleOut=ease((p-.12)/.25),ticket=ease((p-.32)/.43);
      q('.jungle-stage').style.setProperty('--progress',p);
      q('.journey-percent').textContent=String(Math.round(p*100)).padStart(2,'0')+'%';
      q('.stage-photo').style.transform=`scale(${mix(1,1.45,p)}) translateY(${p*2}%)`;
      q('.leaves-left').style.transform=`translateX(${-open*64}%) rotate(${-open*12}deg)`;
      q('.leaves-right').style.transform=`translateX(${open*64}%) rotate(${open*12}deg)`;
      q('.hero-type').style.transform=`scale(${1+titleOut*.4}) translateY(${-titleOut*5}%)`;
      q('.hero-type').style.opacity=1-titleOut;
      q('.hero-type').style.pointerEvents=titleOut>.8?'none':'auto';q('.hero-type').inert=titleOut>.8;
      q('.hero-stamp').style.opacity=1-titleOut;
      q('.explorer-pass').style.transform=`translateY(${mix(height*1.25,0,ticket)}px) rotate(${mix(9,-2,ticket)}deg) scale(${passScale})`;
      q('.explorer-pass').style.opacity=clamp(ticket*3);
      q('.explorer-pass').style.visibility=ticket<.01?'hidden':'visible';
      q('.creature-bird').style.opacity=clamp(1-titleOut*1.2);
      q('.creature-bird').style.pointerEvents=titleOut>.8?'none':'auto';q('.creature-bird').inert=titleOut>.8;
    }else if(s.kind==='crew'){
      q('.crew-bg').style.transform=`scale(${1+p*.16}) translateX(${-p*2}%)`;
      q('.crew-title').style.transform=`translateY(${-p*25}px)`;
      q('.field-note').style.transform=`translateY(${-p*35}px)`;
      q('.crew-word').style.transform=`translateX(${-p*12}%)`;
    }else if(s.kind==='canopy'){
      q('.canopy-inner>img').style.transform=`scale(${1+p*.24})`;
      q('.canopy-inner>p').style.transform=`scale(${1+p*.06})`;
      q('.canopy-inner>p').style.opacity=1;
      q('.tl1').style.transform=`translateX(${-p*70}px) rotate(${45-p*9}deg)`;
      q('.tl2').style.transform=`translateX(${p*70}px) rotate(${-145+p*9}deg)`;
    }
  }
  function render(y){
    const state=locate(y),e=ease(state.t),dominant=state.next>=0&&state.t>.5?state.next:state.i;
    for(let i=0;i<scenes.length;i++){
      const s=scenes[i],out=i===state.i,incoming=i===state.next,visible=out||incoming;
      s.el.style.visibility=visible?'visible':'hidden';
      if(!visible){s.el.style.opacity=0;s.el.style.pointerEvents='none';s.el.inert=true;s.el.setAttribute('aria-hidden','true');continue}
      sceneContent(s,incoming?s.readStart:y);
      // Outgoing content stays pinned at its final reading position. Incoming
      // content is already in place, and blends over it with a camera zoom.
      const opacity=incoming?e:(state.next<0?1:1-ease((state.t-.4)/.6));
      const scale=incoming?mix(1.065,1,e):(state.next<0?1:mix(1,1.035,e));
      s.el.style.opacity=opacity;s.el.style.transform=`scale(${scale})`;
      s.el.style.filter=state.next<0?'none':`blur(${(incoming?(1-e):e)*2.5}px)`;
      s.el.style.zIndex=incoming?'3':'2';s.el.style.pointerEvents=i===dominant?'auto':'none';
      s.el.inert=i!==dominant;s.el.setAttribute('aria-hidden',String(i!==dominant));
    }
    const curtain=state.next<0?0:Math.sin(Math.PI*state.t);
    veil.style.opacity=curtain*.72;
    veil.firstElementChild.style.transform=`translateX(${-105+curtain*70}%) rotate(${-curtain*8}deg)`;
    veil.lastElementChild.style.transform=`translateX(${105-curtain*70}%) rotate(${curtain*8}deg)`;
    const focusedScene=document.activeElement.closest('.story-scene');
    if(dominant!==active&&focusedScene&&focusedScene!==scenes[dominant].el)document.activeElement.blur();
    active=dominant;
    q('.story-location b').textContent=`${String(active+1).padStart(2,'0')} / 07`;
    q('.story-location small').textContent=scenes[active].label;
    q('.story-prev').disabled=active===0;q('.story-next').disabled=active===scenes.length-1;
    experience.dataset.activeScene=String(active);experience.dataset.transition=state.t.toFixed(4);experience.dataset.renderScroll=y.toFixed(2);
  }
  function tick(now){
    const dt=Math.max(1,now-lastTime);lastTime=now;
    shown=dt>250?target:mix(shown,target,1-Math.exp(-dt/85));
    if(Math.abs(shown-target)<.15)shown=target;
    render(shown);
    if(shown!==target)frame=requestAnimationFrame(tick);else{frame=0;lastTime=0}
  }
  function queue(){target=localScroll();if(!frame){lastTime=performance.now();frame=requestAnimationFrame(tick)}}
  function go(index,local=0){
    const s=scenes[clamp(index,0,scenes.length-1)];
    window.scrollTo({top:Math.ceil(top()+s.readStart+local),behavior:'smooth'});
  }
  q('.story-prev').addEventListener('click',()=>go(active-1));
  q('.story-next').addEventListener('click',()=>go(active+1));
  document.addEventListener('click',event=>{
    const a=event.target.closest('a[href^="#"]');if(!a)return;
    const id=a.getAttribute('href').slice(1),index=scenes.findIndex(s=>s.id===id);
    if(id==='jungle-pass'){event.preventDefault();go(0,scenes[0].duration*.79);return}
    if(index>=0){event.preventDefault();history.replaceState(null,'',`#${id}`);go(index)}
  });
  // Keep keyboard focus and the mobile keyboard usable on long live sheets.
  let keyboardFocus=false;
  document.addEventListener('keydown',event=>{if(event.key==='Tab')keyboardFocus=true});
  document.addEventListener('pointerdown',()=>{keyboardFocus=false},{passive:true});
  stage.addEventListener('focusin',event=>{
    if(!keyboardFocus&&!event.target.matches('input,textarea,select'))return;
    const s=scenes.find(s=>s.el.contains(event.target));if(!s?.sheet)return;
    const rect=event.target.getBoundingClientRect();
    if(rect.top>=55&&rect.bottom<=height-135)return;
    const relative=rect.top-s.sheet.getBoundingClientRect().top;
    const pan=clamp(relative-height*.36,0,s.overflow);
    window.scrollTo({top:top()+s.readStart+s.hold+pan,behavior:'smooth'});
  });
  addEventListener('scroll',queue,{passive:true});
  let resizeTimer;addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>measure(true),120)});
  measure();
  let contentResize;const sheetObserver=new ResizeObserver(()=>{clearTimeout(contentResize);contentResize=setTimeout(()=>measure(true),40)});
  scenes.filter(s=>s.sheet).forEach(s=>sheetObserver.observe(s.sheet));
  document.fonts.ready.then(()=>measure(true));
  for(const image of stage.querySelectorAll('img')){
    image.loading='eager';if(!image.complete)image.addEventListener('load',()=>measure(true),{once:true});
  }
  addEventListener('load',()=>{
    measure();const i=scenes.findIndex(s=>s.id===location.hash.slice(1));
    if(i>=0){window.scrollTo({top:Math.ceil(top()+scenes[i].readStart),behavior:'instant'});target=shown=localScroll();render(shown)}
  },{once:true});
})();
