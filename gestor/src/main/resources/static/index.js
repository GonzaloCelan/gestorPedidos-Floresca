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

// ===================== CONFIG =====================
const API_BASE = window.API_BASE ?? window.location.origin;
const POST_PEDIDO = '/api/v1/pedidos';
const PUT_ESTADO  = (id, wire) => `/api/v1/pedidos/${encodeURIComponent(id)}/${encodeURIComponent(wire)}`;

/* Estados: SOLO 3 */
const UI_NEXT      = { 'Pendiente':'En proceso', 'En proceso':'Entregado', 'Entregado':'Entregado' };
const WIRE_FROM_UI = { 'Pendiente':'PENDIENTE', 'En proceso':'EN_PROCESO', 'Entregado':'ENTREGADO' };
const UI_FROM_WIRE = { PENDIENTE:'Pendiente', EN_PROCESO:'En proceso', ENTREGADO:'Entregado' };

/* Estado en memoria */
let pedidos = [];
let logs = [];
let logsFiltrados = [];
let materiales = [];
let materialesFiltrados = [];
let lastAddedId = null;

/* Paginación HISTORIAL */
const LOGS_PAGE_SIZE = 20;
let logsPage = 0;
let logsLast = false;
let isLogsLoading = false;

/* Carga perezosa Materiales */
let materialesLoaded = false;

// ===================== UTILS =====================
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
const chipClass = s => ({ 'Pendiente':'state state--pendiente','En proceso':'state state--proceso','Entregado':'state state--listo' }[s] || 'state');
function _norm(v){
  return String(v ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/* ======= Badge de estado + botón transparente ======= */
function renderBadgeEstado(estadoUI){
  const s = String(estadoUI||'').toUpperCase().replace(/\s+/g,'_');
  if(s==='PENDIENTE' || estadoUI==='Pendiente')    return '<span class="badge badge--pendiente">Pendiente</span>';
  if(s==='EN_PROCESO' || estadoUI==='En proceso')  return '<span class="badge badge--proceso">En proceso</span>';
  if(s==='ENTREGADO'  || estadoUI==='Entregado')   return '<span class="badge badge--entregado">Entregado</span>';
  return `<span class="badge">${estadoUI||'—'}</span>`;
}
function stateBtnHTML(estadoUI){
  return `<button type="button" class="estado-btn ${chipClass(estadoUI)}">${renderBadgeEstado(estadoUI)}</button>`;
}

/* ======= Íconos SVG editar / eliminar ======= */
function renderIconosAcciones(id){
  const safeId = id ?? '';
  return `
    <div class="action">
      <button class="icon-btn btn-editar" title="Editar" data-id="${safeId}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M12 20h9"></path>
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path>
        </svg>
      </button>
      <button class="icon-btn btn-eliminar" title="Eliminar" data-id="${safeId}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M3 6h18"></path>
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
          <path d="M10 11v6"></path><path d="M14 11v6"></path>
          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>
        </svg>
      </button>
    </div>`;
}

// ===================== API =====================
async function apiCrearPedido(payload){
  const res = await fetch(`${API_BASE}${POST_PEDIDO}`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) });
  if(!res.ok){ const t = await res.text().catch(()=> ''); throw new Error(`POST ${POST_PEDIDO} -> ${res.status} ${t}`); }
  const data = await res.json().catch(()=>({})); const id = data.idEntrega ?? data.id;
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
  const res = await fetch(`${API_BASE}/api/v1/pedidos`);
  if(!res.ok) throw new Error(`GET /api/v1/pedidos -> ${res.status}`);
  return res.json();
}

/* Editar / Eliminar (como tenías) */
async function apiGetPedido(id){
  const r = await fetch(`${API_BASE}/api/v1/pedidos/${id}`);
  if(!r.ok) throw new Error(`GET /api/v1/pedidos/${id} -> ${r.status}`);
  return r.json();
}
async function apiUpdatePedido(id, dto){
  const r = await fetch(`${API_BASE}/api/v1/pedidos/${id}`, {
    method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(dto)
  });
  if(!r.ok) throw new Error(`PUT /api/v1/pedidos/${id} -> ${r.status}`);
  return r.json();
}
async function apiDeletePedido(id){
  const r = await fetch(`${API_BASE}/api/v1/pedidos/${id}`, { method:'DELETE' });
  if(!r.ok) throw new Error(`DELETE /api/v1/pedidos/${id} -> ${r.status}`);
  return true;
}

// endpoint paginado oficial
async function apiGetLogsPage(page=0, size=LOGS_PAGE_SIZE, sort='fechaEntrega,desc'){
  const url = `${API_BASE}/api/v1/logs/page?page=${page}&size=${size}&sort=${encodeURIComponent(sort)}`;
  const res = await fetch(url);
  if(!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
  return res.json(); // {content, number, size, totalPages, last, ...}
}
async function apiCrearMaterial(payload){
  const res = await fetch(`${API_BASE}/api/v1/materiales`, {
    method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)
  });
  if(!res.ok) throw new Error(`POST /api/v1/materiales -> ${res.status}`);
  return res.json();
}
async function apiGetMateriales(){
  const res = await fetch(`${API_BASE}/api/v1/materiales`);
  if(!res.ok) throw new Error(`GET /api/v1/materiales -> ${res.status}`);
  return res.json();
}

// ===================== FILTROS MATERIALES =====================
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

// ===================== RENDER MATERIALES =====================
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

// ===================== PEDIDOS =====================
function kpiCount(list, ui){ return list.filter(x=>x.estado===ui).length; }
function renderKPIs(list){
  document.getElementById('kpiPendientes').textContent = kpiCount(list,'Pendiente');
  document.getElementById('kpiProceso').textContent    = kpiCount(list,'En proceso');
  document.getElementById('kpiListos').textContent     = kpiCount(list,'Entregado');
}

/* === TABLA de pedidos (solo Pendiente / En proceso) === */
function renderTabla(list){
  const tbody = document.getElementById('tbodyPedidos');
  const mostrar = list.filter(p => p.estado==='Pendiente' || p.estado==='En proceso');
  if(!mostrar.length){ tbody.innerHTML = `<tr><td colspan="7">Sin pedidos pendientes</td></tr>`; return; }
  tbody.innerHTML = mostrar.map(p => `
    <tr data-id="${p.idEntrega ?? p.id}">
      <td>${p.cliente ?? '—'}</td>
      <td>${p.producto ?? '—'}</td>
      <td>${p.cantidad ?? '—'}</td>
      <td>${fmtFecha(p.fechaEntrega)}</td>
      <td>${stateBtnHTML(p.estado)}</td>
      <td>${moneyAR(p.total)}</td>
      <td class="actions-cell">${renderIconosAcciones(p.idEntrega ?? p.id)}</td>
    </tr>`).join('');
}

// ===================== HISTORIAL =====================
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
  const tbody = document.getElementById('tbodyHistorial');
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
        <td>${r.producto||'—'}</td><td style="text-align:right">${cant}</td>
        <td style="text-align:right">${moneyAR(total)}</td>
        <td style="text-align:right">${r.idEntrega ?? r.id ?? '—'}</td>
      </tr>`;
    }).join('');
  }
  const totalAll = (list||[]).reduce((a,x)=> a + getNumber(x.total, x.monto, x.importe), 0);
  document.getElementById('logTotalFiltrado').textContent = moneyAR(totalAll);
  const totalTodos = (logs||[]).reduce((a,x)=> a + getNumber(x.total, x.monto, x.importe), 0);
  document.getElementById('logTotalGeneral').textContent = moneyAR(totalTodos);
}

/* Skeleton + Load More */
function showLogsSkeleton(on){
  const tbody = document.getElementById('tbodyHistorial');
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

/* Traer una página y acumular */
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

/* Botón Cargar más */
document.addEventListener('click', (e)=>{
  if(e.target && e.target.id === 'logs-more'){
    fetchLogsPage(logsPage);
  }
});

// ===================== ESTADO PEDIDOS (click estado) =====================
function setupEstadoClicks(){
  const tbody = document.getElementById('tbodyPedidos');
  if(!tbody) return;

  tbody.addEventListener('click', async (e)=>{
    const btn = e.target.closest('.estado-btn');
    if(!btn) return;

    const tr = btn.closest('tr');
    const idEntrega = tr?.dataset?.id;
    if(!idEntrega){ alert('Este pedido no tiene idEntrega.'); return; }

    // estado actual a partir del chip
    const txt = btn.textContent.trim();
    const actualUI =
      txt.includes('Pendiente')  ? 'Pendiente'  :
      txt.includes('En proceso') ? 'En proceso' :
      txt.includes('Entregado')  ? 'Entregado'  : 'Pendiente';

    const siguienteUI = UI_NEXT[actualUI] || 'Pendiente';

    // Optimista: actualizar chip
    btn.className = `estado-btn ${chipClass(siguienteUI)}`;
    btn.innerHTML = renderBadgeEstado(siguienteUI);

    try{
      await apiActualizarEstado(idEntrega, siguienteUI);

      const ix = pedidos.findIndex(p => String(p.idEntrega) === String(idEntrega));
      if (ix >= 0) pedidos[ix].estado = siguienteUI;

      // KPIs siempre sobre el array completo (incluye entregados)
      renderKPIs(pedidos);

      // si quedó "Entregado", re-renderizamos la tabla para que desaparezca
      if (siguienteUI === 'Entregado') {
        renderTabla(pedidos);           // la tabla oculta "Entregado"
      }

      document.getElementById('sonido-estado')?.play().catch(()=>{});
    }catch(err){
      // rollback visual
      btn.className = `estado-btn ${chipClass(actualUI)}`;
      btn.innerHTML = renderBadgeEstado(actualUI);
      alert('No pude actualizar el estado en el servidor.');
      console.error(err);
    }
  });
}

// ===================== ACCIONES (Editar/Eliminar) =====================
document.addEventListener('click', (e) => {
  const editBtn = e.target.closest('.btn-editar');
  const delBtn  = e.target.closest('.btn-eliminar');
  if (editBtn) abrirModalEditar(editBtn.dataset.id);
  if (delBtn)  eliminarPedido(delBtn.dataset.id);
});

/* Modal refs */
const modalEditar = document.querySelector('#modalEditar');
const modalClose  = modalEditar?.querySelector('.modal-close');
const modalCancel = modalEditar?.querySelector('#editCancelar');

function mostrarModal(){ modalEditar?.classList.remove('hidden'); }
function ocultarModal(){ modalEditar?.classList.add('hidden'); }

modalClose?.addEventListener('click', ocultarModal);
modalCancel?.addEventListener('click', ocultarModal);

async function abrirModalEditar(id){
  try{
    // intentamos traer del backend (si no, caemos al array en memoria)
    let p;
    try{
      p = await apiGetPedido(id);
    }catch{
      p = pedidos.find(x => String(x.idEntrega) === String(id));
      if(!p) throw new Error('No se encontró el pedido.');
      p = {
        idEntrega: p.idEntrega,
        cliente: p.cliente,
        producto: p.producto,
        cantidad: p.cantidad,
        fechaEntrega: p.fechaEntrega,
        estado: WIRE_FROM_UI[p.estado] || 'PENDIENTE',
        total: p.total
      };
    }

    // precargar
    document.querySelector('#editId').value = p.idEntrega ?? p.id;
    document.querySelector('#editCliente').value = p.cliente ?? '';
    document.querySelector('#editProducto').value = p.producto ?? '';
    document.querySelector('#editCantidad').value = p.cantidad ?? 1;
    document.querySelector('#editFechaEntrega').value = (p.fechaEntrega ?? '').slice(0,10);
    document.querySelector('#editEstado').value = p.estado || 'PENDIENTE'; // WIRE
    document.querySelector('#editTotal').value = p.total ?? 0;

    mostrarModal();
  }catch(e){
    alert(e.message);
  }
}

document.querySelector('#formEditar')?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const id = document.querySelector('#editId').value;
  const dto = {
    cliente: document.querySelector('#editCliente').value.trim(),
    producto: document.querySelector('#editProducto').value.trim(),
    cantidad: Number(document.querySelector('#editCantidad').value),
    fechaEntrega: document.querySelector('#editFechaEntrega').value,
    estado: document.querySelector('#editEstado').value, // WIRE
    total: Number(document.querySelector('#editTotal').value)
  };

  try{
    const saved = await apiUpdatePedido(id, dto);
    // actualizar array local (convertimos a UI)
    const ix = pedidos.findIndex(p => String(p.idEntrega) === String(id));
    if(ix >= 0){
      pedidos[ix] = {
        idEntrega: id,
        cliente: saved.cliente ?? dto.cliente,
        producto: saved.producto ?? dto.producto,
        cantidad: saved.cantidad ?? dto.cantidad,
        fechaEntrega: saved.fechaEntrega ?? dto.fechaEntrega,
        estado: UI_FROM_WIRE[saved.estado] ?? UI_FROM_WIRE[dto.estado] ?? 'Pendiente',
        total: saved.total ?? dto.total
      };
    }
    ocultarModal();
    renderKPIs(pedidos);
    renderTabla(pedidos);
    document.querySelector('#sonido-estado')?.play?.();
  }catch(err){
    alert('No se pudo actualizar el pedido.');
    console.error(err);
  }
});

async function eliminarPedido(id){
  const realId = String(id ?? '').trim();
  if(!realId){ alert('No tengo ID del pedido.'); return; }
  if(!confirm('¿Eliminar este pedido? Esta acción no se puede deshacer.')) return;
  try{
    await apiDeletePedido(realId); // mismo endpoint de siempre
    pedidos = pedidos.filter(p => String(p.idEntrega ?? p.id) !== realId);
    renderKPIs(pedidos);
    renderTabla(pedidos);
    document.querySelector('#sonido-estado')?.play?.();
  }catch(err){
    alert('No se pudo eliminar el pedido.');
    console.error(err);
  }
}

// ===================== VIEW TRANSITIONS =====================
const VIEW_ANIM_MS = 260;

(function injectViewAnimCSS(){
  if (document.getElementById('view-anim-css')) return;
  const css = `
  .hidden{display:none}
  .is-visible{ animation: viewIn ${VIEW_ANIM_MS}ms ease both; }
  .is-hiding{  animation: viewOut ${VIEW_ANIM_MS}ms ease both; }
  @keyframes viewIn { from { opacity:.0; transform: translateY(6px); } to { opacity:1; transform: translateY(0); } }
  @keyframes viewOut{ from { opacity:1;  transform: translateY(0); }   to { opacity:.0; transform: translateY(-6px); } }
  `;
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
  if (cur) { cur.classList.add('is-visible'); return; }
  const dash = document.getElementById('view-dashboard');
  if (dash) { dash.classList.remove('hidden'); dash.classList.add('is-visible'); }
}

async function loadMaterialesOnce(force=false){
  if(materialesLoaded && !force) return;
  try{
    const data = await apiGetMateriales();
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
    materialesLoaded = true;
  }
  applyMatFilters();
}

function switchViewAnimated(view){
  const toEl = document.getElementById(`view-${view}`);
  if(!toEl) return;

  if (toEl.classList.contains('is-visible') && !toEl.classList.contains('hidden')) {
    if(view==='log') aplicarFiltrosLogs();
    if(view==='materiales'){ 
      if(!materialesLoaded) { loadMaterialesOnce().catch(()=>{}); }
      else applyMatFilters();
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

  if(view==='log') aplicarFiltrosLogs();
  if(view==='materiales'){ loadMaterialesOnce().catch(()=>{}); }
}

// ===================== NAV =====================
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

// ===================== FORM PEDIDO =====================
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

  $btnCancelar?.addEventListener('click', ()=>{
    $form?.reset(); calcTotal();
    document.querySelector('.nav a[data-view="dashboard"]')?.click();
  });

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

// ===================== AUDIO PRIMING =====================
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

// ===================== INIT =====================
(async ()=>{
  primeAudioOnce();
  setupNav();
  setupForm();
  setupEstadoClicks();

  // Carga recordatorios desde localStorage
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
      idEntrega: p.idEntrega ?? p.id,
      cliente: p.cliente,
      producto: p.producto,
      cantidad: p.cantidad,
      fechaEntrega: p.fechaEntrega,
      estado: UI_FROM_WIRE[p.estado] ?? p.estado ?? 'Pendiente',
      total: p.total
    }));
    renderKPIs(pedidos);
    renderTabla(pedidos);
  }catch(err){
    console.error(err);
    const tp = document.getElementById('tbodyPedidos');
    if (tp) tp.innerHTML = `<tr><td colspan="7">No se pudieron cargar los pedidos</td></tr>`;
  }

  // Precargar materiales en background
  loadMaterialesOnce().catch(()=>{});

  // Logs: paginación
  try{
    logs = []; logsPage = 0; logsLast = false;
    const tb = document.getElementById('tbodyHistorial'); if (tb) tb.innerHTML = '';
    await fetchLogsPage(0);
  }catch(err){
    console.error(err);
    const tb = document.getElementById('tbodyHistorial');
    if (tb) tb.innerHTML = `<tr><td colspan="7">No se pudieron cargar los logs</td></tr>`;
  }

  // Refresh logs
  document.getElementById('logRefresh')?.addEventListener('click', async ()=>{
    try{
      logs = []; logsPage = 0; logsLast = false;
      const tb = document.getElementById('tbodyHistorial'); if (tb) tb.innerHTML = '';
      await fetchLogsPage(0);
    }catch(e){ console.error(e); }
  });
})();

// ===================== HISTORIAL: BÚSQUEDA / MES =====================
(function setupLogFilters(){
  const $q  = document.getElementById('logSearch');
  const $m  = document.getElementById('logMes');

  $q && $q.addEventListener('input', aplicarFiltrosLogs);
  $q && $q.addEventListener('keydown', (e)=>{
    if(e.key === 'Enter'){ e.preventDefault(); aplicarFiltrosLogs(); }
  });
  $m && $m.addEventListener('change', aplicarFiltrosLogs);
})();

// ===================== TAREAS (post-its) =====================
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

