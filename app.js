/* Leo's Wild Five — local, dependency-free cinematic invitation. */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const clamp = (v,a=0,b=1) => Math.min(b,Math.max(a,v));
const lerp = (a,b,t) => a+(b-a)*t;
const ease = t => {t=clamp(t);return t*t*(3-2*t)};
const reduced = matchMedia('(prefers-reduced-motion: reduce)');

reduced.addEventListener('change',()=>location.reload());

const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');observer.unobserve(e.target)}}),{threshold:.12});
$$('.reveal').forEach(el=>observer.observe(el));
if(!reduced.matches)for(let i=0;i<15;i++){const dot=document.createElement('i');dot.className='mote';dot.style.cssText=`left:${(i*37)%100}%;top:${(i*23)%100}%;animation-delay:${-i*.6}s;animation-duration:${6+(i%4)}s`;$('.motes').append(dot)}

const storage={get(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}},set(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true}catch{return false}},remove(key){try{localStorage.removeItem(key)}catch{}}};
let found=new Set(storage.get('invilinks-leo-creatures',[]).filter(v=>['toucan','butterfly','elephant'].includes(v)));
let toastTimer;
function toast(message){$('.toast').textContent=message;$('.toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('.toast').classList.remove('show'),3600)}
function updateJournal(){
  $('#found-count').textContent=`${found.size}/3`;
  $('.journal-toggle').setAttribute('aria-label',`Open explorer journal, ${found.size} of 3 creatures found`);
  $$('[data-stamp]').forEach(el=>el.classList.toggle('collected',found.has(el.dataset.stamp)));
  $$('[data-animal]').forEach(el=>{el.classList.toggle('found',found.has(el.dataset.animal));el.setAttribute('aria-pressed',found.has(el.dataset.animal))});
  $('.journal-message').textContent=found.size===3?'All three stamps collected. Official jungle explorer!':`${found.size} of 3 stamps collected. Follow the clues and keep exploring.`;
}
$$('[data-animal]').forEach(el=>el.addEventListener('click',()=>{const animal=el.dataset.animal;if(found.has(animal)){toast(`You’ve already found the ${animal}. Keep exploring!`);return}found.add(animal);storage.set('invilinks-leo-creatures',[...found]);updateJournal();toast(found.size===3?'All 3 found! Your explorer journal is complete.':`${animal.charAt(0).toUpperCase()+animal.slice(1)} spotted! ${found.size}/3 stamps collected.`)}));
$$('[data-open-journal]').forEach(el=>el.addEventListener('click',()=>$('#journal').showModal()));
$('#reset-journal').addEventListener('click',()=>{found.clear();storage.remove('invilinks-leo-creatures');updateJournal();toast('A fresh expedition. Find all three creatures again.')});
$('#credits-open').addEventListener('click',()=>$('#credits').showModal());
$('#venue-info').addEventListener('click',()=>$('#venue-dialog').showModal());
$$('.dialog-close').forEach(button=>button.addEventListener('click',()=>button.closest('dialog').close()));
$$('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close()}}));
updateJournal();

const eventDate=new Date('2027-06-20T14:00:00+08:00');
function countdown(){const ms=Math.max(0,eventDate-Date.now());$('#days').textContent=String(Math.floor(ms/86400000)).padStart(3,'0');$('#hours').textContent=String(Math.floor(ms/3600000)%24).padStart(2,'0');$('#minutes').textContent=String(Math.floor(ms/60000)%60).padStart(2,'0')}
countdown();setInterval(countdown,60000);
const form=$('#rsvp-form');
function updateAttendance(){const absent=form.elements.attendance.value==='no';$('.guest-counts').hidden=absent;form.elements.children.disabled=absent;form.elements.adults.disabled=absent;}
$$('[name=attendance]').forEach(el=>el.addEventListener('change',updateAttendance));
function restoreRsvp(){const reply=storage.get('invilinks-leo-rsvp',null);if(!reply||typeof reply.name!=='string')return;form.elements.name.value=reply.name;form.elements.attendance.value=reply.attendance==='no'?'no':'yes';form.elements.children.value=String(reply.children??1);form.elements.adults.value=String(reply.adults??1);form.elements.notes.value=reply.notes??'';$('#form-status').textContent='Your sample reply is saved on this device. No reply has been sent to an event host.';$('#reset-rsvp').hidden=false;updateAttendance()}
form.addEventListener('submit',e=>{e.preventDefault();if(!form.reportValidity())return;const data=new FormData(form),name=data.get('name').trim();if(!name){form.elements.name.setCustomValidity('Please enter your name.');form.elements.name.reportValidity();return}const attending=data.get('attendance')==='yes',reply={name,attendance:attending?'yes':'no',children:attending?Number(data.get('children')):0,adults:attending?Number(data.get('adults')):0,notes:data.get('notes').trim()};const saved=storage.set('invilinks-leo-rsvp',reply);$('#form-status').textContent=saved?`Thanks, ${name}! Your ${attending?'attending':'declined'} sample RSVP is saved on this device only. No reply was sent to an event host.`:'Your browser could not save this sample reply. Nothing was sent. Please enable local storage to try again.';$('#reset-rsvp').hidden=!saved;});
form.elements.name.addEventListener('input',()=>form.elements.name.setCustomValidity(''));
$('#reset-rsvp').addEventListener('click',()=>{storage.remove('invilinks-leo-rsvp');form.reset();updateAttendance();$('#form-status').textContent='Your sample reply has been cleared from this device.';$('#reset-rsvp').hidden=true});
restoreRsvp();updateAttendance();

// Real licensed music, kept alive across every scene. Playback starts with a
// deliberate tap and is never restarted by scrolling or scene navigation.
const music=$('#jungle-music'),musicButton=$('#music-toggle');
let musicIntent=false,musicTouched=false,musicRevision=0,musicRamp=0;
function musicState(){
  const playing=!music.paused&&!music.ended;
  musicButton.setAttribute('aria-pressed',String(playing));
  musicButton.setAttribute('aria-label',playing?'Mute jungle music':'Play jungle music');
  $('.sound-state').textContent=playing?'ON':'OFF';
}
function rampMusic(to,ms,onDone){
  cancelAnimationFrame(musicRamp);const from=music.volume,start=performance.now();
  function step(now){const p=Math.max(0,Math.min(1,(now-start)/ms));music.volume=Math.max(0,Math.min(1,from+(to-from)*p));
    if(p<1)musicRamp=requestAnimationFrame(step);else{musicRamp=0;onDone?.()}}
  musicRamp=requestAnimationFrame(step);
}
async function setMusic(on){
  musicIntent=on;const revision=++musicRevision;cancelAnimationFrame(musicRamp);
  if(!on){rampMusic(0,240,()=>{if(!musicIntent)music.pause()});return}
  try{music.volume=0;await music.play();if(revision!==musicRevision)return;rampMusic(.3,1000);musicState()}
  catch(error){if(revision!==musicRevision)return;musicIntent=false;musicState();toast('Tap the music button to start the jungle soundtrack.');}
}
for(const event of ['playing','pause','ended'])music.addEventListener(event,musicState);
let musicFailed=false;music.addEventListener('error',()=>{musicFailed=true;musicIntent=false;musicState();toast('The soundtrack could not load. Tap the music button to retry.')});
musicButton.addEventListener('click',()=>{musicTouched=true;if(musicFailed){music.load();musicFailed=false}setMusic(!musicIntent)});
$('.enter-button').addEventListener('click',()=>{if(!musicTouched){musicTouched=true;setMusic(true)}});
let resumeMusic=false;
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){resumeMusic=musicIntent&&!music.paused;cancelAnimationFrame(musicRamp);music.pause()}
  else if(resumeMusic&&musicIntent){resumeMusic=false;setMusic(true)}
});
musicState();
