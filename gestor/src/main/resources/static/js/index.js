// ===================== SERVICE WORKER =====================
if ('serviceWorker' in navigator && !window.__swRegistered) {
  window.__swRegistered = true;
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      console.log('SW OK:', reg.scope);

      // auto-actualización
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });
      if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      reg.addEventListener('updatefound', () => {
        const sw = reg.installing;
        sw?.addEventListener('statechange', () => {
          if (sw.state === 'installed' && navigator.serviceWorker.controller) {
            reg.waiting?.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });
    } catch (e) {
      console.error('SW register failed', e);
    }
  });

  navigator.serviceWorker.addEventListener('message', (_event) => {
    // hook opcional
  });
}

// ===================== CONFIG (globales sanas) =====================
// NO uses "const" acá: si ya lo define pedidos.js, chocan.
// Asignamos a window para no crear otro binding global.
window.API_BASE = window.API_BASE ?? window.location.origin;

// “Shims” para que nunca explote si algo aún no existe
window.aplicarFiltrosLogs   ||= function(){};
window.applyMatFilters      ||= function(){};
window.loadMaterialesOnce   ||= async function(){};
if (typeof window.materialesLoaded === 'undefined') window.materialesLoaded = false;

// ===================== UTILS (adjuntar solo si faltan) =====================
window.parseISODateFlexible ||= function(v){
  if(!v) return null;
  if(v instanceof Date) return isNaN(v) ? null : v;
  if(typeof v === 'number') return new Date(v);
  const s = String(v).trim();
  const m1 = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if(m1){ const d=+m1[1], m=+m1[2], y=+m1[3]; const dt=new Date(y,m-1,d); return isNaN(dt)?null:dt; }
  const m2 = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if(m2){ const y=+m2[1], m=+m2[2], d=+m2[3]; const dt=new Date(y,m-1,d); return isNaN(dt)?null:dt; }
  const dt = new Date(s); return isNaN(dt)?null:dt;
};
window.fmtFecha ||= function(iso){
  const d = window.parseISODateFlexible(iso);
  if(!d) return '—';
  const dd = String(d.getDate()).padStart(2,'0');
  const mm = String(d.getMonth()+1).padStart(2,'0');
  return `${dd}/${mm}/${d.getFullYear()}`;
};
window.moneyAR ||= (n)=> new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS'}).format(Number(n)||0);
window.getNumber ||= (...c)=>{ for(const v of c){ const n=Number(v); if(!isNaN(n)) return n; } return 0; };
window.pick      ||= (...c)=>{ for(const v of c){ if(v!==undefined && v!==null) return v; } return undefined; };
window._norm     ||= (v)=> String(v ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');



// ===================== VIEW TRANSITIONS / NAV =====================
const VIEW_ANIM_MS = 260;

(function injectViewAnimCSS(){
  const old = document.getElementById('view-anim-css');
  if (old) old.remove();
  const css = `
  .hidden{display:none}
  .is-visible{ animation: viewIn ${VIEW_ANIM_MS}ms ease both; }
  .is-hiding{  animation: viewOut ${VIEW_ANIM_MS}ms ease both; }
  @keyframes viewIn { from { opacity: 0 } to { opacity: 1 } }
  @keyframes viewOut{ from { opacity: 1 } to { opacity: 0 } }
  html{ scrollbar-gutter: stable both-edges; }
  body.modal-open{ overflow: hidden; }
  `;
  const tag = document.createElement('style');
  tag.id = 'view-anim-css';
  tag.textContent = css;
  document.head.appendChild(tag);
})();

function _getViewEls(){
  return [
    document.getElementById('view-dashboard'),
    document.getElementById('view-log'),
    document.getElementById('view-materiales')
  ].filter(Boolean);
}
function _currentVisible(){
  const els = _getViewEls();
  return els.find(el => el.classList.contains('is-visible')) ||
         els.find(el => !el.classList.contains('hidden'));
}
function _ensureInitialVisible() {
  const cur = _currentVisible();
  if (cur) { cur.classList.add('is-visible'); return; }
  const dash = document.getElementById('view-dashboard');
  if (dash) { dash.classList.remove('hidden'); dash.classList.add('is-visible'); }
}

function switchViewAnimated(view){
  const toEl = document.getElementById(`view-${view}`);
  if(!toEl) return;

  // Si ya estoy en esta vista
  if (toEl.classList.contains('is-visible') && !toEl.classList.contains('hidden')) {
    if (view === 'log' && typeof aplicarFiltrosLogs === 'function') {
      aplicarFiltrosLogs();
    }
    if (view === 'materiales') {
      const loaded = !!window.materialesLoaded;
      if (!loaded && typeof loadMaterialesOnce === 'function') {
        loadMaterialesOnce().catch(()=>{});
      } else if (typeof applyMatFilters === 'function') {
        applyMatFilters();
      }
    }
    return;
  }

  const current = _currentVisible();
  if (current && current !== toEl) {
    current.classList.add('is-hiding');
    setTimeout(() => {
      current.classList.remove('is-hiding','is-visible');
      current.classList.add('hidden');
    }, VIEW_ANIM_MS);
  }

  toEl.classList.remove('hidden');
  void toEl.offsetWidth;
  toEl.classList.add('is-visible');
  setActiveNav(view);

  if (view === 'log' && typeof aplicarFiltrosLogs === 'function') aplicarFiltrosLogs();
  if (view === 'materiales' && typeof loadMaterialesOnce === 'function') loadMaterialesOnce().catch(()=>{});
}

function setActiveNav(view){
  document.querySelectorAll('.nav a').forEach(a=>{
    const isActive = (a.dataset.view || 'dashboard') === view;
    a.classList.toggle('active', isActive);
    a.setAttribute('aria-current', isActive ? 'page' : 'false');
  });
}
function showView(view){ switchViewAnimated(view); }
function setupNav(){
  _ensureInitialVisible();

  const startEl =
    document.querySelector('.view-root.is-visible[id]') ||
    document.querySelector('.view-root:not(.hidden)[id]');
  const startView = startEl ? startEl.id.replace('view-','') : 'dashboard';
  setActiveNav(startView);

  document.querySelectorAll('.nav a').forEach(a=>{
    a.addEventListener('click', e=>{
      e.preventDefault();
      const v = a.dataset.view || 'dashboard';
      switchViewAnimated(v);
    });
  });
}


// ===================== INIT =====================
(async ()=>{
  setupNav();

  
  // Refresh ventas
  document.getElementById('logRefresh')?.addEventListener('click', async ()=>{
    try{
      logs = []; logsPage = 0; logsLast = false;
      const tb = document.getElementById('tbodyHistorial'); if (tb) tb.innerHTML = '';
      await fetchLogsPage(0);
    }catch(e){ console.error(e); }
  });
})();
