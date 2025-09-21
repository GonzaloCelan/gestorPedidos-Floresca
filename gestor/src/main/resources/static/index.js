// ↑ Al comienzo de tu index.js (entry principal)
if ('serviceWorker' in navigator && !window.__swRegistered) {
  window.__swRegistered = true; // guard simple
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      console.log('SW OK:', reg.scope);

      // (opcional) auto-actualización
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return; refreshing = true; window.location.reload();
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
  
  // Listener para que el SW pueda recibir el “SKIP_WAITING”
    navigator.serviceWorker.addEventListener('message', (event) => {
      // (no usamos nada acá, el SW procesa CLEAR_CACHES si querés)
    });
  }





/* ================== CONFIG ================== */
const API_BASE = 'http://localhost:8080';
const POST_PEDIDO = '/api/gestor';
const PUT_ESTADO  = (id, wire) => `/api/gestor/${encodeURIComponent(id)}/${encodeURIComponent(wire)}`;

/* Estados */
const UI_NEXT      = { 'Pendiente':'En proceso','En proceso':'Entregado','Entregado':'Cancelado','Cancelado':'Cancelado' };
const WIRE_FROM_UI = { 'Pendiente':'PENDIENTE','En proceso':'EN_PROCESO','Entregado':'ENTREGADO','Cancelado':'CANCELADO' };
const UI_FROM_WIRE = { PENDIENTE:'Pendiente', EN_PROCESO:'En proceso', ENTREGADO:'Entregado', CANCELADO:'Cancelado' };

/* Estado en memoria */
let pedidos = [];
let logs = [];
let logsFiltrados = [];
let materiales = [];
let materialesFiltrados = [];
let lastAddedId = null;

/* ===== Paginación HISTORIAL ===== */
const LOGS_PAGE_SIZE = 20;
let logsPage = 0;
let logsLast = false;
let isLogsLoading = false;

/* ===== NUEVO: control de carga de Materiales ===== */
let materialesLoaded = false;

/* ===== Utilidades ===== */
function parseISODateFlexible(v){
  if(!v) return null;
  if(v instanceof Date) return isNaN(v) ? null : v;
  if(typeof v === 'number') return new Date(v);
  const s = String(v).trim();
  const m1 = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if(m1){ const d=+m1[1], m=+m1[2], y=+m1[3]; const dt=new Date(y,m-1,d); return isNaN(dt)?null:dt; }
  const m2 = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if(m2){ const y=+m2[1], m=+m2[2], d=+m2[3]; const dt=new Date(y,m-1,d); return isNaN(dt)?null:dt; }
  const dt = new Date(s); return isNaN(dt)?null:dt;
}
const fmtFecha = iso => { const d=parseISODateFlexible(iso); if(!d) return '—'; const dd=String(d.getDate()).padStart(2,'0'), mm=String(d.getMonth()+1).padStart(2,'0'); return `${dd}/${mm}/${d.getFullYear()}`; };
const moneyAR = n => new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS'}).format(Number(n)||0);
const getNumber = (...cands)=>{ for(const c of cands){ const n = Number(c); if(!isNaN(n)) return n; } return 0; };
const pick = (...cands)=>{ for(const c of cands){ if(c!==undefined && c!==null) return c; } return undefined; };
const chipClass = s => ({ 'Pendiente':'state state--pendiente','En proceso':'state state--proceso','Entregado':'state state--listo','Cancelado':'state state--cancelado' }[s] || 'state');

/* Normalizador para búsquedas (quita acentos, pasa a min) */
function _norm(v){
  return String(v ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/* ================== API ================== */
async function apiCrearPedido(payload){
  const res = await fetch(`${API_BASE}${POST_PEDIDO}`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) });
  if(!res.ok){ const t = await res.text().catch(()=> ''); throw new Error(`POST ${POST_PEDIDO} -> ${res.status} ${t}`); }
  const data = await res.json().catch(()=>({})); const id = data.idEntrega;
  if(!id) throw new Error('El backend no devolvió idEntrega.');
  return { idEntrega:id, data };
}
async function apiActualizarEstado(idEntrega, nuevoUI){
  const wire = WIRE_FROM_UI[nuevoUI] || 'PENDIENTE';
  const res  = await fetch(`${API_BASE}${PUT_ESTADO(idEntrega, wire)}`, { method:'PUT' });
  if(!res.ok){ const t = await res.text().catch(()=> ''); throw new Error(`PUT estado -> ${res.status} ${t}`); }
  return true;
}
async function apiGetPedidos(){
  const res = await fetch(`${API_BASE}/api/gestor/pedidos`);
  if(!res.ok) throw new Error(`GET /api/gestor/pedidos -> ${res.status}`);
  return res.json();
}
async function apiGetLogs(){
  const res = await fetch(`${API_BASE}/api/gestor/logs`);
  if(!res.ok) throw new Error(`GET /api/gestor/logs -> ${res.status}`);
  return res.json();
}
async function apiCrearMaterial(payload){
  const res = await fetch(`${API_BASE}/api/gestor/material`, {
    method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)
  });
  if(!res.ok) throw new Error(`POST /api/gestor/material -> ${res.status}`);
  return res.json();
}
async function apiGetMateriales(){
  const res = await fetch(`${API_BASE}/api/gestor/material`);
  if(!res.ok) throw new Error(`GET /api/gestor/material -> ${res.status}`);
  return res.json();
}

/* ===== API paginada logs con fallback ===== */
async function apiGetLogsPage(page=0, size=LOGS_PAGE_SIZE, sort='fechaEntrega,desc'){
  const url = `${API_BASE}/api/gestor/logs/page?page=${page}&size=${size}&sort=${encodeURIComponent(sort)}`;
  try{
    const res = await fetch(url);
    if(!res.ok) throw new Error('no-page');
    return await res.json(); // {content, number, size, last, ...}
  }catch(_){
    // Fallback: endpoint actual y rebanado front
    const full = await apiGetLogs().catch(()=>[]);
    const total = Array.isArray(full) ? full.length : 0;
    const start = page * size;
    const slice = Array.isArray(full) ? full.slice(start, start+size) : [];
    return {
      content: slice,
      number: page,
      size,
      totalElements: total,
      totalPages: Math.ceil(total/size) || 1,
      first: page===0,
      last: start + slice.length >= total
    };
  }
}

/* ================== FILTROS MATERIALES ================== */
function applyMatFilters(){
  const q = (document.getElementById('matSearch')?.value || '').trim().toLowerCase();
  const ym = document.getElementById('matMes')?.value || '';
  let desde=null, hasta=null;
  if(ym){
    const [y,m] = ym.split('-').map(Number);
    desde = new Date(y, m-1, 1);
    hasta = new Date(y, m, 1);
  }
  materialesFiltrados = (materiales||[]).filter(r=>{
    const hit = !q || [r.material, r.proveedor].some(v => String(v||'').toLowerCase().includes(q));
    const f = parseISODateFlexible(pick(r.fecha, r.fechaCompra, r.createdAt, r.created_at));
    const okMes = (!desde || (f && f >= desde && f < hasta));
    return hit && okMes;
  });
  renderMateriales(materialesFiltrados);
}

/* ================== RENDER MATERIALES ================== */
let matSort = { key:'fecha', dir:'desc' };

function renderMateriales(list){
  const tbody = document.getElementById('tbodyMateriales');
  const rows = Array.isArray(list) ? [...list] : [];

  rows.sort((a,b)=>{
    const {key, dir} = matSort;
    let va, vb;
    if(key==='fecha'){
      va = parseISODateFlexible(pick(a.fecha, a.fechaCompra, a.createdAt, a.created_at))?.getTime() ?? 0;
      vb = parseISODateFlexible(pick(b.fecha, b.fechaCompra, b.createdAt, b.created_at))?.getTime() ?? 0;
    } else if(key==='cantidad'){
      va = getNumber(a.cantidad, a.cant, a.qty); vb = getNumber(b.cantidad, b.cant, b.qty);
    } else if(key==='precio'){
      va = getNumber(a.precioUnitario, a.precioUnit, a.precio_unit, a.precio, a.unit_price);
      vb = getNumber(b.precioUnitario, b.precioUnit, b.precio_unit, b.precio, b.unit_price);
    } else if(key==='total'){
      va = getNumber(a.precioTotal, a.total, getNumber(a.precioUnitario, a.precioUnit, a.precio)*getNumber(a.cantidad));
      vb = getNumber(b.precioTotal, b.total, getNumber(b.precioUnitario, b.precioUnit, b.precio)*getNumber(b.cantidad));
    } else {
      va = String(a[key] ?? a.material ?? '').toLowerCase();
      vb = String(b[key] ?? b.material ?? '').toLowerCase();
    }
    const r = va>vb ? 1 : va<vb ? -1 : 0;
    return dir==='asc' ? r : -r;
  });

  if(!rows.length){
    tbody.innerHTML = `<tr><td colspan="10">Sin compras aún</td></tr>`;
  }else{
    tbody.innerHTML = rows.map((m,i)=>{
      const f = parseISODateFlexible(pick(m.fecha, m.fechaCompra, m.createdAt, m.created_at));
      const fechaTxt = f ? fmtFecha(f.toISOString()) : '—';
      const cant  = getNumber(m.cantidad, m.cant, m.qty, 0);
      const pUnit = getNumber(m.precioUnitario, m.precioUnit, m.precio_unit, m.precio, m.unit_price, 0);
      const total = getNumber(m.precioTotal, m.total, pUnit * cant);
      const rowClass = (lastAddedId && String(m.id ?? m.idMaterial) === String(lastAddedId)) ? 'row--new' : '';
      return `<tr class="${rowClass}">
        <td>${i+1}</td>
        <td>${fechaTxt}</td>
        <td>${m.material || m.nombre || '—'}</td>
        <td>${cant}</td>
        <td>${moneyAR(pUnit)}</td>
        <td>${moneyAR(total)}</td>
        <td>${m.proveedor||'—'}</td>
      </tr>`;
    }).join('');
  }

  const totalAll = (materiales||[]).reduce((a,m)=> a + getNumber(m.precioTotal, m.total, getNumber(m.precioUnitario, m.precioUnit, m.precio)*getNumber(m.cantidad)), 0);
  document.getElementById('matTotalGeneral').textContent  = moneyAR(totalAll);

  const totalFiltrado = rows.reduce((a,m)=> a + getNumber(m.precioTotal, m.total, getNumber(m.precioUnitario, m.precioUnit, m.precio)*getNumber(m.cantidad)), 0);
  document.getElementById('matTotalFiltrado').textContent = moneyAR(totalFiltrado);

  refrescarDatalistsMateriales(materiales);
}

/* Autocompletados */
function refrescarDatalistsMateriales(rows){
  const mats = new Set(), provs = new Set();
  rows.forEach(r=>{
    const m = (r.material ?? r.nombre ?? '').toString().trim();
    const p = (r.proveedor ?? '').toString().trim();
    if(m) mats.add(m);
    if(p) provs.add(p);
  });
  const dlM = document.getElementById('dl-materiales');
  const dlP = document.getElementById('dl-proveedores');
  if(dlM) dlM.innerHTML = Array.from(mats).sort().map(v=>`<option value="${v}">`).join('');
  if(dlP) dlP.innerHTML = Array.from(provs).sort().map(v=>`<option value="${v}">`).join('');
}

/* Orden por encabezado (Materiales) */
(function setupMatSorting(){
  const ths = document.querySelectorAll('#tabla-materiales thead th.sortable');
  ths.forEach(th=>{
    th.addEventListener('click', ()=>{
      const key = th.dataset.key;
      const dir = (matSort.key===key && matSort.dir==='asc') ? 'desc' : 'asc';
      matSort = { key, dir };
      ths.forEach(t=>t.classList.remove('asc','desc'));
      th.classList.add(dir);
      renderMateriales(materialesFiltrados.length ? materialesFiltrados : materiales);
    });
  });
})();

/* Form Material */
(function setupMatForm(){
  const $c = document.getElementById('matCantidad');
  const $p = document.getElementById('matPrecioUnit');
  const $t = document.getElementById('matTotal');
  const $btnClear = document.getElementById('matCancelar');
  const $form = document.getElementById('formMaterial');

  const recalc = ()=>{
    const total = (parseFloat($c?.value)||0) * (parseFloat($p?.value)||0);
    if($t) $t.value = moneyAR(total);
  };
  ['input','change'].forEach(ev=>{
    $c && $c.addEventListener(ev, recalc);
    $p && $p.addEventListener(ev, recalc);
  });
  recalc();

  $btnClear?.addEventListener('click', ()=>{
    $form?.reset();
    recalc();
  });

  $form?.addEventListener('submit', async (e)=>{
    e.preventDefault();

    const fecha = document.getElementById('matFecha').value;
    const material = document.getElementById('matNombre').value.trim();
    const cantidad = parseFloat(document.getElementById('matCantidad').value) || 0;
    const precioUnitario = parseFloat(document.getElementById('matPrecioUnit').value) || 0;
    const proveedor = document.getElementById('matProveedor').value.trim();
    const precioTotal = +(cantidad * precioUnitario).toFixed(2);

    if(!fecha || !material || cantidad<=0){ alert('Completá fecha, material y cantidad.'); return; }

    const dto = { fecha, material, cantidad, proveedor, precioUnitario, precioTotal };

    try{
      const saved = await apiCrearMaterial(dto);
      const fallbackId = 'mat-' + Date.now() + '-' + Math.floor(Math.random()*1e6);
      const fila = {
        id: saved.id ?? saved.idMaterial ?? fallbackId,
        fecha: saved.fecha ?? fecha,
        material: saved.material ?? material,
        cantidad: saved.cantidad ?? cantidad,
        precioUnitario: saved.precioUnitario ?? precioUnitario,
        precioTotal: saved.precioTotal ?? precioTotal,
        proveedor: saved.proveedor ?? proveedor
      };
      lastAddedId = String(fila.id);
      materiales.push(fila);
      applyMatFilters();
      $form.reset(); recalc();
      setTimeout(()=>{ lastAddedId = null; }, 600);
    }catch(err){
      console.error(err);
      alert('No se pudo guardar el material.');
    }
  });
})();

/* Filtros: eventos (Materiales) */
(function setupMatFilters(){
  const $q = document.getElementById('matSearch');
  const $m = document.getElementById('matMes');
  $q && $q.addEventListener('input', applyMatFilters);
  $m && $m.addEventListener('change', applyMatFilters);
})();

/* ================== PEDIDOS ================== */
function renderKPIs(list){
  const p = list.filter(x=>x.estado==='Pendiente').length;
  const e = list.filter(x=>x.estado==='En proceso').length;
  const d = list.filter(x=>x.estado==='Entregado').length;
  document.getElementById('kpiPendientes').textContent = p;
  document.getElementById('kpiProceso').textContent   = e;
  document.getElementById('kpiListos').textContent    = d;
}
function renderTabla(list){
  const tbody = document.getElementById('tbodyPedidos');
  const mostrar = list.filter(p => p.estado==='Pendiente' || p.estado==='En proceso');
  if(!mostrar.length){ tbody.innerHTML = `<tr><td colspan="6">Sin pedidos pendientes</td></tr>`; return; }
  tbody.innerHTML = mostrar.map(p => `
    <tr data-id="${p.idEntrega}">
      <td>${p.cliente}</td>
      <td>${p.producto}</td>
      <td>${p.cantidad}</td>
      <td>${fmtFecha(p.fechaEntrega)}</td>
      <td><button type="button" class="estado-btn ${chipClass(p.estado)}">${p.estado}</button></td>
      <td>${moneyAR(p.total)}</td>
    </tr>`).join('');
}

/* ================== HISTORIAL ================== */
/* Buscador por ID / Cliente / Producto (acentos) + atajos "id:" o "#" */
function aplicarFiltrosLogs(){
  const rawQ = (document.getElementById('logSearch')?.value || '').trim();
  const qNorm = _norm(rawQ);
  const ym   = document.getElementById('logMes')?.value || ''; // "YYYY-MM"

  // Búsqueda específica por ID (id:xxxx o #xxxx)
  let idNeedle = null;
  const idMatch = rawQ.match(/(?:^|\s)(?:id:|#)\s*([a-z0-9\-]+)/i);
  if (idMatch) idNeedle = idMatch[1].toLowerCase();

  let desde = null, hasta = null;
  if (ym){
    const [y,m] = ym.split('-').map(Number);
    desde = new Date(y, m-1, 1);
    hasta = new Date(y, m,   1); // exclusivo
  }

  logsFiltrados = (logs || []).filter(r=>{
    const idStr   = _norm(r.idEntrega ?? r.id ?? '');
    const client  = _norm(r.cliente);
    const prod    = _norm(r.producto);

    let hitTexto = true;
    if (rawQ){
      if (idNeedle){
        hitTexto = idStr.includes(idNeedle);
      }else{
        hitTexto = idStr.includes(qNorm) || client.includes(qNorm) || prod.includes(qNorm);
      }
    }

    const fechaRaw = pick(r.fecha, r.fechaEntrega, r.fecha_log, r.createdAt, r.created_at);
    const f = parseISODateFlexible(fechaRaw);
    const okMes = (!desde || (f && f >= desde && f < hasta));

    return hitTexto && okMes;
  });

  renderLogs(logsFiltrados);
}

function renderLogs(list){
  const tbody = document.getElementById('tbodyLogs');
  if(!Array.isArray(list) || !list.length){
    tbody.innerHTML = `<tr><td colspan="7">Sin registros</td></tr>`;
  }else{
    tbody.innerHTML = list.map((r,i)=>{
      const fechaRaw = pick(r.fecha, r.fechaEntrega, r.fecha_log, r.createdAt, r.created_at);
      const f = parseISODateFlexible(fechaRaw);
      const fechaTxt = f ? fmtFecha(f.toISOString()) : '—';
      const cant = pick(r.cantidad, r.cant, r.qty, '—');
      const total = getNumber(r.total, r.monto, r.importe);
      return `<tr>
        <td>${i+1}</td><td>${fechaTxt}</td><td>${r.cliente||'—'}</td>
        <td>${r.producto||'—'}</td><td>${cant}</td><td>${moneyAR(total)}</td>
        <td>${r.idEntrega ?? r.id ?? '—'}</td>
      </tr>`;
    }).join('');
  }
  const totalAll = (list||[]).reduce((a,x)=> a + getNumber(x.total, x.monto, x.importe), 0);
  document.getElementById('logTotalFiltrado').textContent = moneyAR(totalAll);
  const totalTodos = (logs||[]).reduce((a,x)=> a + getNumber(x.total, x.monto, x.importe), 0);
  document.getElementById('logTotalGeneral').textContent = moneyAR(totalTodos);
}

/* -------- Skeleton + LoadMore (logs) -------- */
function showLogsSkeleton(on){
  const tbody = document.getElementById('tbodyLogs');
  if(!tbody) return;
  if(!on){ tbody.querySelectorAll('.skel-row').forEach(tr=>tr.remove()); return; }
  const rows = 5, cols = 7;
  const frag = document.createDocumentFragment();
  for(let i=0;i<rows;i++){
    const tr = document.createElement('tr'); tr.className='skel-row';
    for(let c=0;c<cols;c++){
      const td=document.createElement('td'); td.innerHTML='<span class="skel"></span>';
      tr.appendChild(td);
    }
    frag.appendChild(tr);
  }
  tbody.appendChild(frag);
}
function toggleLogsLoadMore(show){
  const el = document.getElementById('logs-more-wrap');
  if(el) el.style.display = show ? 'flex' : 'none';
}

/* Traer una página de logs y acumular */
async function fetchLogsPage(page=0){
  if(isLogsLoading || logsLast) return;
  isLogsLoading = true;
  showLogsSkeleton(true);
  try{
    const data = await apiGetLogsPage(page, LOGS_PAGE_SIZE, 'fechaEntrega,desc');
    const nuevos = (data.content || []);
    logs = logs.concat(nuevos);
    aplicarFiltrosLogs();
    logsPage = (data.number ?? page) + 1;
    logsLast = !!data.last;
    toggleLogsLoadMore(!logsLast);
  }catch(e){
    console.error(e);
  }finally{
    isLogsLoading = false;
    showLogsSkeleton(false);
  }
}

/* Botón Cargar más (si existe en el DOM) */
document.addEventListener('click', (e)=>{
  if(e.target && e.target.id === 'logs-more'){
    fetchLogsPage(logsPage);
  }
});

/* ================== Interacción estado pedidos ================== */
function setupEstadoClicks(){
  const tbody = document.getElementById('tbodyPedidos');
  tbody.addEventListener('click', async (e)=>{
    const btn = e.target.closest('.estado-btn'); if(!btn) return;
    const tr = btn.closest('tr'); const idEntrega = tr?.dataset?.id;
    if(!idEntrega){ alert('Este pedido no tiene idEntrega.'); return; }
    const actualUI = btn.textContent.trim();
    const siguienteUI = UI_NEXT[actualUI] || 'Pendiente';
    btn.textContent = siguienteUI;
    btn.className = `estado-btn ${chipClass(siguienteUI)}`;
    try{
      await apiActualizarEstado(idEntrega, siguienteUI);
      const ix = pedidos.findIndex(p => String(p.idEntrega) === String(idEntrega));
      if(ix>=0) pedidos[ix].estado = siguienteUI;
      renderKPIs(pedidos);
      renderTabla(pedidos);
      document.getElementById('sonido-estado')?.play().catch(()=>{});
    }catch(err){
      btn.textContent = actualUI;
      btn.className = `estado-btn ${chipClass(actualUI)}`;
      alert('No pude actualizar el estado en el servidor.');
      console.error(err);
    }
  });
}

/* ================== VIEW TRANSITIONS (fade/slide) ================== */
const VIEW_ANIM_MS = 260;

// Inyecta CSS mínimo de animaciones si no existe
(function injectViewAnimCSS(){
  if (document.getElementById('view-anim-css')) return;
  const css = `
  .hidden{display:none}
  .is-visible{
    animation: viewIn ${VIEW_ANIM_MS}ms ease both;
  }
  .is-hiding{
    animation: viewOut ${VIEW_ANIM_MS}ms ease both;
  }
  @keyframes viewIn {
    from { opacity:.0; transform: translateY(6px); }
    to   { opacity:1;  transform: translateY(0); }
  }
  @keyframes viewOut {
    from { opacity:1;  transform: translateY(0); }
    to   { opacity:.0; transform: translateY(-6px); }
  }`;
  const tag = document.createElement('style');
  tag.id = 'view-anim-css';
  tag.textContent = css;
  document.head.appendChild(tag);
})();

function _getViewEls(){
  return [
    document.getElementById('view-dashboard'),
    document.getElementById('view-pedido'),
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
  if (cur) {
    cur.classList.add('is-visible');
    return;
  }
  const dash = document.getElementById('view-dashboard');
  if (dash) {
    dash.classList.remove('hidden');
    dash.classList.add('is-visible');
  }
}

/* ===== NUEVO: carga perezosa de materiales ===== */
async function loadMaterialesOnce(force=false){
  if(materialesLoaded && !force) return;
  try{
    const data = await apiGetMateriales();
    // Normalizamos mínimamente para que el render no falle si el backend varía keys
    materiales = (Array.isArray(data) ? data : []).map(m => ({
      id: m.id ?? m.idMaterial ?? m.id_material ?? m._id ?? null,
      fecha: pick(m.fecha, m.fechaCompra, m.createdAt, m.created_at),
      material: m.material ?? m.nombre ?? '',
      cantidad: getNumber(m.cantidad, m.cant, m.qty),
      precioUnitario: getNumber(m.precioUnitario, m.precioUnit, m.precio_unit, m.precio, m.unit_price),
      precioTotal: getNumber(m.precioTotal, m.total),
      proveedor: m.proveedor ?? ''
    }));
    materialesLoaded = true;
  }catch(err){
    console.error('No se pudieron cargar los materiales', err);
    materiales = [];
    materialesLoaded = true; // evitamos loop; igual se puede forzar con force=true
  }
  applyMatFilters();
}

function switchViewAnimated(view){
  const toEl = document.getElementById(`view-${view}`);
  if(!toEl) return;

  // Ya visible
  if (toEl.classList.contains('is-visible') && !toEl.classList.contains('hidden')) {
    if(view==='log') aplicarFiltrosLogs();
    if(view==='materiales'){ 
      // NUEVO: aseguro datos antes de filtrar
      if(!materialesLoaded) { loadMaterialesOnce().catch(()=>{}); }
      else applyMatFilters();
    }
    return;
  }

  const current = _currentVisible();

  // Ocultar actual
  if (current && current !== toEl) {
    current.classList.add('is-hiding');
    setTimeout(() => {
      current.classList.remove('is-hiding','is-visible');
      current.classList.add('hidden');
    }, VIEW_ANIM_MS);
  }

  // Mostrar destino
  toEl.classList.remove('hidden');
  void toEl.offsetWidth; // reflow
  toEl.classList.add('is-visible');

  if(view==='log') aplicarFiltrosLogs();
  if(view==='materiales'){
    // NUEVO: primer carga al entrar
    loadMaterialesOnce().catch(()=>{});
  }
}

/* ================== NAV ================== */
function showView(view){
  switchViewAnimated(view);
}
function setupNav(){
  _ensureInitialVisible();
  document.querySelectorAll('.nav a').forEach(a=>{
    a.addEventListener('click', e=>{
      e.preventDefault();
      document.querySelectorAll('.nav a').forEach(n=>n.classList.remove('active'));
      a.classList.add('active');
      const v = a.dataset.view || 'dashboard';
      switchViewAnimated(v);
    });
  });
}

/* ================== FORM PEDIDO ================== */
function setupForm(){
  const $cantidad=document.getElementById('cantidad');
  const $valorUnit=document.getElementById('valorUnit');
  const $total=document.getElementById('total');
  const $fecha=document.getElementById('fechaEntrega');
  const $form=document.getElementById('formPedido');
  const $btnCancelar=document.getElementById('btnCancelar');

  const calcTotal=()=>{ const t=(parseFloat($cantidad?.value)||0)*(parseFloat($valorUnit?.value)||0); if($total) $total.value=moneyAR(t); return t; };
  ['input','change'].forEach(ev=>{ $cantidad?.addEventListener(ev,calcTotal); $valorUnit?.addEventListener(ev,calcTotal); });
  calcTotal();

  $btnCancelar?.addEventListener('click', ()=>{ $form?.reset(); calcTotal(); document.querySelector('.nav a[data-view="dashboard"]')?.click(); });

  $form?.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const nuevo = {
      cliente:document.getElementById('cliente').value.trim(),
      producto:document.getElementById('producto').value.trim(),
      cantidad:parseInt($cantidad.value,10)||0,
      fechaEntrega:$fecha.value,
      total:(parseFloat($cantidad.value)||0)*(parseFloat($valorUnit.value)||0),
      estado:'PENDIENTE'
    };
    if(!nuevo.cliente || !nuevo.producto || !nuevo.fechaEntrega || nuevo.cantidad<=0){
      alert('Completá todos los campos correctamente.'); return;
    }
    try{
      const { idEntrega, data } = await apiCrearPedido(nuevo);
      const ui = {
        idEntrega,
        cliente:data?.cliente ?? nuevo.cliente,
        producto:data?.producto ?? nuevo.producto,
        cantidad:data?.cantidad ?? nuevo.cantidad,
        fechaEntrega:data?.fechaEntrega ?? nuevo.fechaEntrega,
        estado: UI_FROM_WIRE[data?.estado] ?? 'Pendiente',
        total:data?.total ?? nuevo.total
      };
      pedidos.push(ui);
      renderKPIs(pedidos);
      renderTabla(pedidos);
      document.getElementById('sonido-crear')?.play().catch(()=>{});
      $form.reset(); calcTotal();
      document.querySelector('.nav a[data-view="dashboard"]')?.click();
    }catch(err){
      alert(`No pude guardar el pedido.\n${err.message}`);
      console.error(err);
    }
  });
}

/* ================== Audio priming ================== */
function primeAudioOnce(){
  const crear = document.getElementById('sonido-crear');
  const estado = document.getElementById('sonido-estado');
  const handler = () => {
    [crear, estado].forEach(el => {
      if(!el) return;
      el.play().then(()=>{ el.pause(); el.currentTime = 0; }).catch(()=>{});
    });
    document.removeEventListener('click', handler);
  };
  document.addEventListener('click', handler, { once: true });
}

/* ================== INIT ================== */
(async ()=>{
  primeAudioOnce();
  setupNav();
  setupForm();
  setupEstadoClicks();

  // Tareas (post-its) - cargar desde LS
  (function loadTasks(){
    try{
      const raw = localStorage.getItem('floresca_tasks_v1');
      const arr = raw ? JSON.parse(raw) : [];
      const list = document.getElementById("tareaLista");
      if(!list) return;
      list.innerHTML = '';
      arr.forEach(texto=>{
        const div = document.createElement("div");
        div.className = "tarea tarea--new";
        const r = (Math.random()*3 - 1.5).toFixed(2);
        div.style.setProperty('--rot', `${r}deg`);
        div.innerHTML = `<span title="${texto}">${texto}</span>
          <div class="acciones"><button aria-label="Eliminar tarea" title="Eliminar">×</button></div>`;
        list.appendChild(div);
      });
    }catch(e){ console.error('Error cargando tareas', e); }
  })();

  // Pedidos
  try{
    const data = await apiGetPedidos();
    pedidos = (Array.isArray(data) ? data : []).map(p => ({
      idEntrega: p.idEntrega, cliente: p.cliente, producto: p.producto,
      cantidad: p.cantidad, fechaEntrega: p.fechaEntrega, total: p.total,
      estado: UI_FROM_WIRE[p.estado] ?? p.estado ?? 'Pendiente'
    }));
    renderKPIs(pedidos);
    renderTabla(pedidos);
  }catch(err){
    console.error(err);
    document.getElementById('tbodyPedidos').innerHTML = `<tr><td colspan="6">No se pudieron cargar los pedidos</td></tr>`;
  }

  // NUEVO: precargar materiales en background (no bloquea la UI)
  loadMaterialesOnce().catch(()=>{});

  // Logs: paginación 20 en 20
  try{
    logs = []; logsPage = 0; logsLast = false;
    const tb = document.getElementById('tbodyLogs'); if (tb) tb.innerHTML = '';
    await fetchLogsPage(0);
  }catch(err){
    console.error(err);
    document.getElementById('tbodyLogs').innerHTML = `<tr><td colspan="7">No se pudieron cargar los logs</td></tr>`;
  }

  // Botón Actualizar = reset y cargar desde 0
  document.getElementById('logRefresh')?.addEventListener('click', async ()=>{
    try{
      logs = []; logsPage = 0; logsLast = false;
      const tb = document.getElementById('tbodyLogs'); if (tb) tb.innerHTML = '';
      await fetchLogsPage(0);
    }catch(e){ console.error(e); }
  });
})();

/* ===== Listeners de búsqueda/mes en Historial ===== */
(function setupLogFilters(){
  const $q  = document.getElementById('logSearch');
  const $m  = document.getElementById('logMes');

  $q && $q.addEventListener('input', aplicarFiltrosLogs);
  $q && $q.addEventListener('keydown', (e)=>{
    if(e.key === 'Enter'){ e.preventDefault(); aplicarFiltrosLogs(); }
  });
  $m && $m.addEventListener('change', aplicarFiltrosLogs);
})();

/* ===== TAREAS (post-its): agregar/eliminar + persistencia ===== */
const LS_TASKS_KEY = 'floresca_tasks_v1';
function crearNodoNota(texto){
  const div = document.createElement("div");
  div.className = "tarea tarea--new";
  const r = (Math.random()*3 - 1.5).toFixed(2);
  div.style.setProperty('--rot', `${r}deg`);
  div.innerHTML = `
    <span title="${texto}">${texto}</span>
    <div class="acciones"><button aria-label="Eliminar">×</button></div>
  `;
  return div;
}
function saveTasks(){
  const list = document.getElementById("tareaLista");
  if(!list) return;
  const textos = [...list.querySelectorAll('.tarea span')].map(s=>s.textContent);
  localStorage.setItem(LS_TASKS_KEY, JSON.stringify(textos));
}
function agregarTarea(){
  const input = document.getElementById("tareaInput");
  const texto = input?.value.trim();
  if(!texto) return;
  const lista = document.getElementById("tareaLista");
  if(!lista) return;
  lista.appendChild(crearNodoNota(texto));
  input.value = "";
  saveTasks();
}
document.getElementById('btnAgregarTarea')?.addEventListener('click', agregarTarea);
document.addEventListener('keydown', (e)=>{
  if(e.key === 'Enter' && document.activeElement?.id === 'tareaInput'){
    e.preventDefault(); agregarTarea();
  }
});
document.addEventListener('click', (e)=>{
  const del = e.target.closest('.tarea .acciones button');
  if(!del) return;
  del.closest('.tarea')?.remove();
  saveTasks();
});
