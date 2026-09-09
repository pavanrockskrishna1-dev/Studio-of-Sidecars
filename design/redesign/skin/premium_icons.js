(function(){
  try{
    if(!document.getElementById('pi-sprite')){
      var h=document.createElement('span');
      h.innerHTML='<svg xmlns="http://www.w3.org/2000/svg" id="pi-sprite" style="display:none" aria-hidden="true"><symbol id="pi-coffee" viewBox="0 0 24 24"><path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v7a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5Z"/><path d="M8 2v2"/><path d="M12 2v2"/></symbol><symbol id="pi-camera" viewBox="0 0 24 24"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></symbol><symbol id="pi-phone" viewBox="0 0 24 24"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/></symbol><symbol id="pi-cube" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></symbol><symbol id="pi-film" viewBox="0 0 24 24"><path d="M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3Z"/><path d="m6.2 5.3 3.1 3.9"/><path d="m12.4 3.4 3.1 4"/><path d="M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/></symbol><symbol id="pi-archive" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="5" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/></symbol><symbol id="pi-palette" viewBox="0 0 24 24"><circle cx="13.5" cy="6.5" r="1"/><circle cx="17.5" cy="10.5" r="1"/><circle cx="8.5" cy="7.5" r="1"/><circle cx="6.5" cy="12.5" r="1"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.6-.7 1.6-1.6 0-.4-.1-.8-.4-1-.3-.3-.4-.7-.4-1.1a1.6 1.6 0 0 1 1.6-1.6H17c3 0 5.4-2.4 5.4-5.4C22.4 6.2 17.9 2 12 2z"/></symbol><symbol id="pi-bike" viewBox="0 0 24 24"><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/></symbol><symbol id="pi-sofa" viewBox="0 0 24 24"><rect x="3" y="10" width="18" height="6.5" rx="3"/><path d="M7 16.5V21M17 16.5V21M6 10V6.5A2.5 2.5 0 0 1 8.5 4h7A2.5 2.5 0 0 1 18 6.5V10"/></symbol><symbol id="pi-bulb" viewBox="0 0 24 24"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.4 1 2.3h6c0-.9.4-1.8 1-2.3A7 7 0 0 0 12 2z"/></symbol><symbol id="pi-sun" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></symbol><symbol id="pi-sunset" viewBox="0 0 24 24"><path d="M12 10V2"/><path d="m4.9 10.9 1.4 1.4"/><path d="M2 18h2"/><path d="M20 18h2"/><path d="m17.7 12.3 1.4-1.4"/><path d="M22 22H2"/><path d="m16 6-4 4-4-4"/><path d="M16 18a4 4 0 0 0-8 0"/></symbol><symbol id="pi-upload" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/></symbol><symbol id="pi-lock" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></symbol><symbol id="pi-star" viewBox="0 0 24 24"><path d="M12 2.5l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.7l-5.8 3 1.1-6.5L2.6 9.3l6.5-.9z"/></symbol><symbol id="pi-up" viewBox="0 0 24 24"><path d="M7 17 17 7"/><path d="M7 7h10v10"/></symbol><symbol id="pi-dl" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/></symbol><symbol id="pi-check" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></symbol><symbol id="pi-play" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></symbol></svg>';
      var s=h.firstChild;
      (document.head||document.documentElement).appendChild(s);
    }
  }catch(e){}
})();

/* =========================================================================
   STUDIO OF SIDECARS · CINEMATIC FINISH · icon & presentation pass
   Replaces the remaining cartoon emoji with a single monochrome stroke
   system and applies tiny presentation refinements. Layout & engine intact.
   ========================================================================= */
(function(){
'use strict';

/* curated 24px stroke icons (viewBox 0 0 24 24) */
function svg(name,size){
  return '<svg class="pi pi-'+name+'" viewBox="0 0 24 24" width="'+size+'" height="'+size+'" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><use href="#pi-'+name+'"/></svg>';
}
function esc(s){ return s.replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }

var VT_MAP={
  'classic':'camera','instagram commercial':'phone','blender python':'cube',
  'creator studio':'film','asset library':'archive','brand studio':'palette'
};

function run(){
  var q=function(s){return Array.prototype.slice.call(document.querySelectorAll(s));};
  /* brand mark */
  var logo=document.querySelector('#soLogo');
  if(logo) logo.innerHTML=svg('coffee',21);

  /* version rows (V1-V6) */
  q('#sideNav .vrow').forEach(function(row){
    var ic=row.querySelector('.vt'); if(!ic) return;
    var b=row.querySelector('.vn b');
    var key=(b?b.textContent:'').toLowerCase().trim();
    var icon=VT_MAP[key]||'archive';
    ic.innerHTML=svg(icon,14);
  });

  /* asset tiles in the left library */
  q('#sideNav .tile').forEach(function(t){
    var ic=t.querySelector(':scope > .tt-ic'); if(!ic) return;
    var b=t.querySelector(':scope > b');
    var key=(b?b.textContent:'').toLowerCase().trim();
    var icon=(key.indexOf('coffee')>=0)?'coffee':(key.indexOf('bike')>=0)?'bike':
             (key.indexOf('furniture')>=0)?'sofa':(key.indexOf('light')>=0)?'bulb':'archive';
    ic.innerHTML=svg(icon,16);
  });

  /* inspector look tiles (softbox / café window) */
  q('.inspector .tile').forEach(function(t){
    var ic=t.querySelector('.tt-ic'); if(!ic) return;
    var b=t.querySelector('b');
    var key=(b?b.textContent:'').toLowerCase().trim();
    var icon=(key.indexOf('softbox')>=0)?'sun':(key.indexOf('café')>=0||key.indexOf('cafe')>=0)?'sunset':'sun';
    ic.innerHTML=svg(icon,17);
  });

  /* project thumbs -> editorial monograms */
  q('.proj-th').forEach(function(th){
    var row=th.closest('.proj-row');
    var b=row?row.querySelector('.pi b'):null;
    var letter=(b&&b.textContent.trim())?b.textContent.trim().charAt(0).toUpperCase():'·';
    th.innerHTML='<i class="mono">'+esc(letter)+'</i>';
  });

  /* favourite tags -> gold star glyph */
  q('.tag').forEach(function(tag){
    var raw=tag.textContent.replace(/\uFE0F/g,'');
    if(raw.indexOf('★')===0){
      var rest=esc(raw.slice(1).trim());
      tag.innerHTML=svg('star',11)+'<span>'+rest+'</span>';
    }
  });

  /* empty-stage dropzone */
  var dz=document.querySelector('.dz-ic');
  if(dz && /[\u{1F000}-\u{1FAFF}\u2600-\u27BF\u2B00-\u2BFF]/u.test(dz.textContent)) dz.innerHTML=svg('coffee',24);

  /* private workspace lock */
  var lk=document.querySelector('.side-foot .lock');
  if(lk && /[\u{1F000}-\u{1FAFF}\u2600-\u27BF\u2B00-\u2BFF]/u.test(lk.textContent)) lk.innerHTML=svg('lock',13);

  /* export arrow + block export button */
  var exp=document.getElementById('tbExport');
  if(exp && exp.textContent.indexOf('↗')>=0) exp.innerHTML='Export&nbsp;'+svg('up',12);
  var doExp=document.getElementById('btnDoExport');
  if(doExp && /[\u2B00-\u2BFF⬇]/.test(doExp.textContent)) doExp.innerHTML=svg('dl',15)+'Export render pack';

  /* selected row check */
  q('.vrow.on .tick').forEach(function(t){ if(t.textContent.indexOf('✓')>=0) t.innerHTML=svg('check',10); });

  /* small chrome nicety: an unframed, airier scroll feel */
  document.documentElement.classList.add('cin');
}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',run);
else run();
})();
