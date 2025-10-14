/* ===================== pedidos.js (Dashboard) ===================== */
/* -------- CONFIG -------- */
const API_BASE = window.API_BASE ?? window.location.origin;
const ENDPOINTS = {
  LIST   : '/api/v1/pedidos',
  CREATE : '/api/v1/pedidos',
  STATE  : (id, wire) => `/api/v1/pedidos/${encodeURIComponent(id)}/${encodeURIComponent(wire)}`,
  DELETE : (id) => `/api/v1/pedidos/${encodeURIComponent(id)}`,
  DETAIL_PRODUCT : (id) => `/api/v1/pedidos/producto/${encodeURIComponent(id)}`,
  UPDATE : (id) => `/api/v1/pedidos/${encodeURIComponent(id)}`
};

// Estados UI ↔ wire y siguiente estado
const UI_NEXT      = { 'Pendiente':'En proceso', 'En proceso':'Entregado', 'Entregado':'Entregado' };
const WIRE_FROM_UI = { 'Pendiente':'PENDIENTE', 'En proceso':'EN_PROCESO', 'Entregado':'ENTREGADO' };
const UI_FROM_WIRE = { PENDIENTE:'Pendiente', EN_PROCESO:'En proceso', ENTREGADO:'Entregado' };

/* -------- STATE -------- */
let pedidos = [];
const orderItemsMap = Object.create(null); // cache simple (id -> items)
const LS_ITEMS_KEY  = 'floresca_order_items_v1';

/* -------- UTILS -------- */
const moneyAR = n => new Intl.NumberFormat('es-AR', { style:'currency', currency:'ARS' })
  .format(Number(n)||0);

function resolveId(obj){
  if(!obj || typeof obj !== 'object') return null;
  return obj.idPedido ?? obj.id_pedido ?? obj.idEntrega ?? obj.id ?? obj.pedidoId ?? obj.pedidoID ?? null;
}
const isRealId = id => /^\d+$/.test(String(id ?? '').trim());

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
const fmtFecha = iso => {
  const d = parseISODateFlexible(iso);
  if(!d) return '—';
  const dd = String(d.getDate()).padStart(2,'0');
  const mm = String(d.getMonth()+1).padStart(2,'0');
  return `${dd}/${mm}/${d.getFullYear()}`;
};
const getNumber = (...cands)=>{ for(const c of cands){ const n = Number(c); if(!isNaN(n)) return n; } return 0; };

/* -------- ITEMS (normalización + persistencia local) -------- */
const normalizeItems = (list)=> (Array.isArray(list)?list:[])
  .map(it => {
    const producto       = it.producto ?? it.productoNombre ?? it.nombre ?? it.descripcion ?? it.item ?? '—';
    const cantidad       = getNumber(it.cantidad, it.cant, it.qty, it.cantidadPedida);
    const precioUnitario = getNumber(it.precioUnit, it.precioUnitario, it.precio_unitario, it.precio, it.unit_price, it.valorUnitario);
    const subTotal       = getNumber(it.subtotal, it.subTotal, it.sub_total, it.importe, it.monto, cantidad * precioUnitario);
    return { producto, cantidad, precioUnitario, subTotal };
  })
  .filter(x => x.producto || x.cantidad || x.subTotal);

function saveOrderItems(){ try{ localStorage.setItem(LS_ITEMS_KEY, JSON.stringify(orderItemsMap)); }catch{} }
function loadOrderItems(){
  try{
    const raw = localStorage.getItem(LS_ITEMS_KEY);
    const obj = raw ? JSON.parse(raw) : {};
    if(obj && typeof obj === 'object'){
      for(const k of Object.keys(obj)) orderItemsMap[k] = Array.isArray(obj[k]) ? obj[k] : [];
    }
  }catch{}
}

/* ======== NEW: Prioridad de estados + ordenador ======== */
const PRIORIDAD_UI = { 'En proceso': 0, 'Pendiente': 1, 'Entregado': 2 };
function fechaClave(p){
  const d = parseISODateFlexible(p.updatedAt || p.fechaActualizacion || p.fechaEntrega || p.createdAt || p.creadoEn);
  return d ? d.getTime() : 0;
}
function ordenarPedidos(list){
  return [...list].sort((a,b)=>{
    const pa = PRIORIDAD_UI[a.estado] ?? 9;
    const pb = PRIORIDAD_UI[b.estado] ?? 9;
    if (pa !== pb) return pa - pb;

    // 1) Lo último tocado arriba (para que al pasar a EN PROCESO suba primero)
    const ta = Number(a.__touch)||0;
    const tb = Number(b.__touch)||0;
    if (ta !== tb) return tb - ta;

    // 2) Empate: orden por fecha de entrega (más próximo primero)
    const fa = fechaClave(a);
    const fb = fechaClave(b);
    return fa - fb;
  });
}
/* ======================================================= */

/* -------- API -------- */
async function apiGetPedidos(){
  const r = await fetch(`${API_BASE}${ENDPOINTS.LIST}`);
  if(!r.ok) throw new Error(`GET ${ENDPOINTS.LIST} -> ${r.status}`);
  return r.json();
}

async function apiCrearPedido(payload){
  const r = await fetch(`${API_BASE}${ENDPOINTS.CREATE}`, {
    method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)
  });
  if(!r.ok){
    const t = await r.text().catch(()=> '');
    throw new Error(`POST ${ENDPOINTS.CREATE} -> ${r.status} ${t}`);
  }
  const data = await r.json().catch(()=> ({}));

  // ID real del backend (no usamos temporales)
  let id =
      data.idPedido ?? data.id_pedido ??
      data.id ?? data.idEntrega ?? data.pedidoId ?? data.pedidoID ?? null;

  if(!id){
    const loc = r.headers.get('Location') || r.headers.get('location') || '';
    const m = String(loc).match(/\/(\d+)(?:$|[?#])/);
    if(m) id = m[1];
  }
  if(!id) throw new Error('El servidor no devolvió el id del pedido.');
  return { idEntrega:String(id), data };
}

async function apiActualizarEstado(idEntrega, estadoUI){
  const wire = WIRE_FROM_UI[estadoUI] || 'PENDIENTE';
  const r = await fetch(`${API_BASE}${ENDPOINTS.STATE(idEntrega, wire)}`, { method:'PUT' });
  if(!r.ok){
    const t = await r.text().catch(()=> '');
    throw new Error(`PUT ${ENDPOINTS.STATE(idEntrega, wire)} -> ${r.status} ${t}`);
  }
  return true;
}
async function apiEliminarPedido(idEntrega){
  const r = await fetch(`${API_BASE}${ENDPOINTS.DELETE(idEntrega)}`, { method:'DELETE' });
  if(!r.ok){
    const t = await r.text().catch(()=> '');
    throw new Error(`DELETE ${ENDPOINTS.DELETE(idEntrega)} -> ${r.status} ${t}`);
  }
  return true;
}
async function apiGetPedidoProductos(idEntrega){
  const r = await fetch(`${API_BASE}${ENDPOINTS.DETAIL_PRODUCT(idEntrega)}`);
  if (r.status === 404) return [];
  if (!r.ok){
    const t = await r.text().catch(()=> '');
    throw new Error(`GET ${ENDPOINTS.DETAIL_PRODUCT(idEntrega)} -> ${r.status} ${t}`);
  }
  return r.json(); // [{ producto, cantidad, precioUnit|precioUnitario, subtotal }]
}
async function apiActualizarPedido(idEntrega, payload){
  const r = await fetch(`${API_BASE}${ENDPOINTS.UPDATE(idEntrega)}`, {
    method:'PUT',
    headers:{ 'Content-Type':'application/json' },
    body: JSON.stringify(payload)
  });
  if(!r.ok){
    const t = await r.text().catch(()=> '');
    throw new Error(`PUT ${ENDPOINTS.UPDATE(idEntrega)} -> ${r.status} ${t}`);
  }
  return r.json().catch(()=> ({}));
}

/* -------- RENDER: KPIs + Tabla -------- */
function renderKPIs(list){
  const p = list.filter(x=>x.estado==='Pendiente').length;
  const e = list.filter(x=>x.estado==='En proceso').length;
  const d = list.filter(x=>x.estado==='Entregado').length;
  const $ = id => document.getElementById(id);
  $('kpiPendientes') && ( $('kpiPendientes').textContent = p );
  $('kpiProceso')    && ( $('kpiProceso').textContent    = e );
  $('kpiListos')     && ( $('kpiListos').textContent     = d );
}

const badgeHTML = (estadoUI) => {
  const cls =
    estadoUI==='Pendiente'  ? 'badge badge--pendiente' :
    estadoUI==='En proceso' ? 'badge badge--proceso'   : 'badge badge--entregado';
  return `<button type="button" class="estado-btn" title="Cambiar estado">
            <span class="${cls}">${estadoUI}</span>
          </button>`;
};

function renderTabla(list){
  const tbody = document.getElementById('tbodyPedidos');
  if(!tbody) return;

  // Solo pendientes y en proceso, y ORDENADOS (En proceso primero)
  /* === NEW: ordenar antes de pintar === */
  const mostrar = ordenarPedidos(
    list.filter(p => p.estado==='Pendiente' || p.estado==='En proceso')
  );

  if(!mostrar.length){
    tbody.innerHTML = `<tr class="row-empty"><td colspan="6">Sin pedidos pendientes</td></tr>`;
    // pequeño defer para gutter
    setTimeout(refreshPedidosHeaderGutter, 0);
    return;
  }

  tbody.innerHTML = mostrar.map(p=>{
    const id    = resolveId(p);
    const items = normalizeItems(orderItemsMap[id] || p.items || []);
    const total = getNumber(p.total) || (items.length ? items.reduce((a,it)=> a + (Number(it.subTotal)||0), 0) : 0);
    const prodCell = `<button type="button" class="btn-detalle" data-id="${id??''}">Ver detalle</button>`;

    const accionesHTML = id ? `
      <button type="button" class="btn-icon action-edit"   title="Editar pedido"   data-id="${id}"><span class="material-symbols-rounded">edit</span></button>
      <button type="button" class="btn-icon action-delete" title="Eliminar pedido" data-id="${id}"><span class="material-symbols-rounded">delete</span></button>
    ` : `<span style="opacity:.6" title="Sin id">—</span>`;

    return `
    <tr data-id="${id??''}" data-estado="${p.estado}"> <!-- NEW: data-estado útil para debug -->
      <td>${p.cliente ?? '—'}</td>
      <td>${prodCell}</td>
      <td>${fmtFecha(p.fechaEntrega)}</td>
      <td>${badgeHTML(p.estado)}</td>
      <td>${moneyAR(total)}</td>
      <td class="td-acciones">${accionesHTML}</td>
    </tr>`;
  }).join('');

  // Ajuste del gutter tras repintar
  setTimeout(refreshPedidosHeaderGutter, 0);
}

/* -------- PANEL DETALLE DERECHO (ticket look) -------- */
function ensureDetallePanelSkeleton(){
  const panel = document.getElementById('panelDetalle');
  if(!panel) return null;

  // conserva diseño/base actual
  panel.classList.add('detalle-card');

  panel.innerHTML = `
    <h4 class="card-title">Detalle del pedido</h4>
    <div id="detalleMeta" class="ticket-meta">Seleccioná un pedido para ver el detalle</div>

    <div class="tabla-scroll">
      <table class="tabla mini-detalle" aria-label="Productos del pedido" style="width:100%">
	  
	  	<colgroup>
	          <col class="col-producto">
	          <col class="col-subtotal">
	    </colgroup>
        <thead>
          <tr>
            <th>Producto</th>
            <th class="sr-only">Subtotal</th> <!-- oculto: mantiene 2ª columna para alinear -->
          </tr>
        </thead>
        <tbody id="detalleBodyPanel">
          <tr><td colspan="2">—</td></tr>
        </tbody>
      </table>
    </div>

    <div class="ticket-sep"></div>

    <div class="ticket-total">
      <span class="label">Total:</span>
      <span class="value" id="detalleTotalPanel">$ 0,00</span>
    </div>
  `;
  return panel;
}

async function openDetallePanel(idEntrega){
  const panel = ensureDetallePanelSkeleton();
  if(!panel) return;

  const pedido = pedidos.find(p => String(resolveId(p)) === String(idEntrega));
  panel.querySelector('#detalleMeta').textContent = pedido
    ? `Cliente: ${pedido.cliente ?? '—'} · Entrega: ${fmtFecha(pedido.fechaEntrega)}`
    : `Detalle del pedido`;

  const tbodyEl = panel.querySelector('#detalleBodyPanel');
  const totalEl = panel.querySelector('#detalleTotalPanel');

  tbodyEl.innerHTML = `<tr><td colspan="2">Cargando...</td></tr>`;
  totalEl.textContent = moneyAR(0);

  const paintRows = (rows) => {
    if(!rows.length){
      tbodyEl.innerHTML = `<tr><td colspan="2">Sin items</td></tr>`;
      totalEl.textContent = moneyAR(0);
      return;
    }
    let total = 0;
    tbodyEl.innerHTML = rows.map(it=>{
      const nombre = it.producto ?? it.nombre ?? it.descripcion ?? 'Producto';
      const q  = Number(it.cantidad ?? it.qty ?? it.unidades) || 0;
      const pu = Number(it.precioUnitario ?? it.unitario ?? it.precio ?? it.price) || 0;
      const raw = (it.subTotal === undefined || it.subTotal === null) ? null : Number(it.subTotal);
      const st  = (raw !== null && !isNaN(raw)) ? raw : (q * pu);
      total += st;

      return `
        <tr class="ticket-row">
          <td class="cell-product">
            <div class="name">${nombre}</div>
            <div class="unit">${moneyAR(pu)}</div>
            <div class="qty">${q}</div>
          </td>
          <td class="cell-sub" style="text-align:right">${moneyAR(st)}</td>
        </tr>
      `;
    }).join('');
    totalEl.textContent = moneyAR(total);
  };

  try{
    const serverItems = await apiGetPedidoProductos(idEntrega);
    const items = (serverItems || []).map(it => ({
      producto:       it.producto ?? it.productoNombre ?? it.nombre ?? it.descripcion ?? '—',
      cantidad:       Number(it.cantidad) || 0,
      precioUnitario: Number(it.precioUnit ?? it.precioUnitario ?? it.precio ?? 0) || 0,
      subTotal:       (it.subtotal ?? it.subTotal)
    }));

    // cache local
    orderItemsMap[idEntrega] = items;
    saveOrderItems();

    paintRows(items);
  }catch(e){
    console.error(e);
    const cacheItems = Array.isArray(orderItemsMap[idEntrega]) ? orderItemsMap[idEntrega] : [];
    if(cacheItems.length){
      paintRows(cacheItems);
    }else{
      tbodyEl.innerHTML = `<tr><td colspan="2">No se pudo cargar el detalle</td></tr>`;
      totalEl.textContent = moneyAR(0);
    }
  }

  panel.classList.remove('oculto','hidden');
}
/* -------- INTERACCIONES (delegación) -------- */
function bindInteractions(){
  if (document.__pedidosBound) return;
  document.__pedidosBound = true;

  document.addEventListener('click', async (e)=>{
    const detalleBtn = e.target.closest('.btn-detalle');
    const estadoBtn  = e.target.closest('.estado-btn');
    const editBtn    = e.target.closest('.action-edit');
    const delBtn     = e.target.closest('.action-delete');

    // Ver detalle
    if(detalleBtn){
      e.preventDefault();
      openDetallePanel(detalleBtn.dataset.id);
      return;
    }

    // Cambiar estado
    if(estadoBtn){
      e.preventDefault();
      const tr = estadoBtn.closest('tr');
      const id = tr?.dataset?.id; 
      if(!id) return;
      const txt = estadoBtn.textContent.trim();
      const actual = txt.includes('Pendiente') ? 'Pendiente' : txt.includes('En proceso') ? 'En proceso' : 'Entregado';
      const siguiente = UI_NEXT[actual] || 'Pendiente';

      // Optimista visual
      estadoBtn.innerHTML =
        siguiente==='Pendiente'  ? '<span class="badge badge--pendiente">Pendiente</span>' :
        siguiente==='En proceso' ? '<span class="badge badge--proceso">En proceso</span>' :
                                   '<span class="badge badge--entregado">Entregado</span>';

      try{
        await apiActualizarEstado(id, siguiente);
        const ix = pedidos.findIndex(p => String(resolveId(p)) === String(id));
        if(ix >= 0){
          pedidos[ix].estado = siguiente;
          // === NEW: marcar toque al pasar a EN PROCESO para que suba arriba ===
          if (siguiente === 'En proceso') pedidos[ix].__touch = Date.now();
          if (siguiente === 'Entregado')  pedidos[ix].__touch = Date.now(); // por si querés usarlo luego
        }
        // === NEW: reordenar/repintar SIEMPRE tras cambio de estado ===
        renderTabla(pedidos);
        renderKPIs(pedidos);
      }catch(err){
        // revertir
        estadoBtn.innerHTML =
          actual==='Pendiente'  ? '<span class="badge badge--pendiente">Pendiente</span>' :
          actual==='En proceso' ? '<span class="badge badge--proceso">En proceso</span>' :
                                  '<span class="badge badge--entregado">Entregado</span>';
        alert('No pude actualizar el estado en el servidor.');
        console.error(err);
      }
      return;
    }

    // Editar
    if(editBtn){
      e.preventDefault();
      const id = editBtn.dataset.id;
      abrirModalEditarPedido(id);
      return;
    }

    // Eliminar
    if(delBtn){
      e.preventDefault();
      const id = delBtn.dataset.id;
      if(!confirm('¿Eliminar este pedido?')) return;
      try{
        await apiEliminarPedido(id);
        pedidos = pedidos.filter(p => String(resolveId(p)) !== String(id));
        // Re-pintar completo para mantener orden/empty state correcto
        renderTabla(pedidos);
        renderKPIs(pedidos);
      }catch(err){
        alert('No se pudo eliminar el pedido.');
        console.error(err);
      }
      return;
    }
  });
}

/* -------- MODAL NUEVO PEDIDO -------- */
function openModalPedido(){
  const modal = document.getElementById('modalPedido');
  if(!modal) { console.warn('modalPedido no existe'); return; }
  document.body.classList.add('modal-open');
  modal.classList.remove('hidden');
}
function closeModalPedido(){
  const modal = document.getElementById('modalPedido');
  if(!modal) return;
  modal.classList.add('hidden');
  document.body.classList.remove('modal-open');
}

function setupNuevoPedido(){
  try{
    const btnNuevo  = document.getElementById('btnAgregarPedido');
    const modal     = document.getElementById('modalPedido');
    const form      = document.getElementById('formPedido');
    const addItem   = document.getElementById('addItemBtn');
    const itemsCont = document.getElementById('itemsContainer');
    const tpl       = document.getElementById('itemTemplate');

    if(!btnNuevo || !modal || !form){
      console.warn('Faltan nodos del modal de nuevo pedido');
      return;
    }

    btnNuevo.addEventListener('click', (e)=>{ e.preventDefault(); openModalPedido(); });

    modal.querySelectorAll('.modal-close, [data-dismiss="modal"], #btnCancelar')
      .forEach(b=> b.addEventListener('click', ()=>{
        try{ form.reset(); if(itemsCont) itemsCont.innerHTML=''; }catch{}
        closeModalPedido();
      }));

    if(addItem && itemsCont && tpl){
      const addRow = (pref={})=>{
        const frag = tpl.content.cloneNode(true);
        const row  = frag.querySelector('[data-item]');
        const $p   = row.querySelector('[data-field="producto"]');
        const $q   = row.querySelector('[data-field="cantidad"]');
        const $vu  = row.querySelector('[data-field="valorUnitario"]');
        const $tl  = row.querySelector('[data-field="totalLinea"]');
        const $rm  = row.querySelector('[data-action="remove"]');

        if(pref.producto) $p.value = pref.producto;
        if(pref.cantidad) $q.value = pref.cantidad;
        if(pref.precioUnitario) $vu.value = pref.precioUnitario;

        const recalc = ()=>{
          const q  = Number($q?.value)||0;
          const pu = Number(String($vu?.value||'').replace(/\./g,'').replace(/,/g,'.'))||0;
          if($tl) $tl.value = moneyAR(q*pu);
        };
        $q?.addEventListener('input', recalc);
        $vu?.addEventListener('input', recalc);
        $rm?.addEventListener('click', ()=> row.remove());

        itemsCont.appendChild(frag);
        recalc();
        $p?.focus();
      };
      addItem.addEventListener('click', (e)=>{ e.preventDefault(); addRow(); });
    }

    form.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const cliente      = form.cliente?.value?.trim();
      const fechaEntrega = form.fechaEntrega?.value;
      if(!cliente || !fechaEntrega){ alert('Completá cliente y fecha de entrega.'); return; }

      const rows = [...(document.querySelectorAll('#itemsContainer [data-item]') || [])];
      const items = rows.map(r=>{
        const prod = r.querySelector('[data-field="producto"]')?.value?.trim();
        const qty  = Number(r.querySelector('[data-field="cantidad"]')?.value)||0;
        const pu   = Number(String(r.querySelector('[data-field="valorUnitario"]')?.value||'').replace(/\./g,'').replace(/,/g,'.'))||0;
        return { producto: prod, cantidad: qty, precioUnitario: pu, subTotal: qty*pu };
      }).filter(it => it.producto && it.cantidad>0 && it.precioUnitario>0);

      if(!items.length){ alert('Agregá al menos un producto válido.'); return; }

      const payload = { cliente, fechaEntrega, estado:'PENDIENTE', tipoVenta:'Pedido', items };

      try{
        const { idEntrega, data } = await apiCrearPedido(payload);

        const serverItems = Array.isArray(data?.items) ? data.items
                          : (Array.isArray(data?.detalle) ? data.detalle
                          : (Array.isArray(data?.lineas) ? data.lineas
                          : (Array.isArray(data?.productos) ? data.productos
                          : (Array.isArray(data?.articulos) ? data.articulos
                          : (Array.isArray(data?.orderItems) ? data.orderItems : null)))));

        const norm = normalizeItems(serverItems || items);
        orderItemsMap[idEntrega] = norm; saveOrderItems();
        const total  = norm.reduce((a,it)=> a + (Number(it.subTotal)||0), 0);

        pedidos.push({
          idEntrega,
          cliente:      data?.cliente ?? cliente,
          producto:     'Detalle',
          fechaEntrega: data?.fechaEntrega ?? fechaEntrega,
          estado:       UI_FROM_WIRE[(data?.estado||'').toString().toUpperCase()] ?? 'Pendiente',
          total,
          items: norm,
          __touch: Date.now() /* NEW: marca inicial para consistencia */
        });

        renderKPIs(pedidos);
        renderTabla(pedidos);
        document.getElementById('sonido-crear')?.play?.().catch(()=>{});
        try{ form.reset(); if(itemsCont) itemsCont.innerHTML=''; }catch{}
        closeModalPedido();
        openDetallePanel(idEntrega);
      }catch(err){
        console.error(err);
        alert('No se pudo guardar el pedido.');
      }
    });

  }catch(err){
    console.error('setupNuevoPedido falló:', err);
  }
}

/* -------- MODAL EDITAR PEDIDO (generado por JS) -------- */
function ensureEditModalSkeleton(){
  let modal = document.getElementById('modalEditar');
  if(modal) return modal;

  modal = document.createElement('div');
  modal.id = 'modalEditar';
  modal.className = 'modal hidden';
  modal.innerHTML = `
    <div class="modal-dialog">
      <div class="modal-header">
        <h3>Editar pedido</h3>
        <button type="button" class="modal-close" aria-label="Cerrar">×</button>
      </div>
      <form id="formEditar">
        <div class="modal-body">
          <div class="form-row">
            <label>Cliente</label>
            <input name="cliente" type="text" required />
          </div>
          <div class="form-row">
            <label>Fecha de entrega</label>
            <input name="fechaEntrega" type="date" required />
          </div>
          <div class="form-row">
            <div class="flex-between">
              <label>Productos</label>
              <button type="button" id="editAddItemBtn" class="btn-sec">+ Agregar ítem</button>
            </div>
            <div id="editItemsContainer"></div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn-sec modal-close">Cancelar</button>
          <button type="submit" class="btn-prim">Guardar cambios</button>
        </div>
      </form>
      <template id="editItemTemplate">
        <div class="item-row" data-item>
          <input data-field="producto" type="text" placeholder="Producto" required />
          <input data-field="cantidad" type="number" min="1" step="1" placeholder="Cant." required />
          <input data-field="valorUnitario" type="number" min="0" step="0.01" placeholder="Unitario" required />
          <input data-field="totalLinea" type="text" readonly />
          <button type="button" data-action="remove" class="btn-mini">×</button>
        </div>
      </template>
    </div>
  `;
  document.body.appendChild(modal);
  return modal;
}
function openModalEditar(){ const m = ensureEditModalSkeleton(); m.classList.remove('hidden'); document.body.classList.add('modal-open'); }
function closeModalEditar(){ const m = ensureEditModalSkeleton(); m.classList.add('hidden'); document.body.classList.remove('modal-open'); }

/* -------- EDITAR: abre modal, precarga, guarda (PUT) -------- */
function abrirModalEditarPedido(idEntrega){
  const modal  = ensureEditModalSkeleton();
  const form   = modal.querySelector('#formEditar');
  const addBtn = modal.querySelector('#editAddItemBtn');
  const cont   = modal.querySelector('#editItemsContainer');
  const tpl    = modal.querySelector('#editItemTemplate');

  // cerrar
  modal.querySelectorAll('.modal-close').forEach(b=> b.onclick = closeModalEditar);

  // helpers para filas
  const recalcRow = (row)=>{
    const $q  = row.querySelector('[data-field="cantidad"]');
    const $vu = row.querySelector('[data-field="valorUnitario"]');
    const $tl = row.querySelector('[data-field="totalLinea"]');
    const q  = Number($q.value)||0;
    const pu = Number($vu.value)||0;
    $tl.value = moneyAR(q*pu);
  };
  const addRow = (pref={})=>{
    const frag = tpl.content.cloneNode(true);
    const row  = frag.querySelector('[data-item]');
    const $p   = row.querySelector('[data-field="producto"]');
    const $q   = row.querySelector('[data-field="cantidad"]');
    const $vu  = row.querySelector('[data-field="valorUnitario"]');
    const $tl  = row.querySelector('[data-field="totalLinea"]');
    const $rm  = row.querySelector('[data-action="remove"]');

    if(pref.producto)       $p.value  = pref.producto;
    if(pref.cantidad)       $q.value  = pref.cantidad;
    if(pref.precioUnitario) $vu.value = pref.precioUnitario;
    $tl.value = moneyAR((pref.cantidad||0) * (pref.precioUnitario||0));

    $q.addEventListener('input', ()=> recalcRow(row));
    $vu.addEventListener('input', ()=> recalcRow(row));
    $rm.addEventListener('click', ()=> row.remove());

    cont.appendChild(frag);
  };

  addBtn.onclick = ()=> addRow();

  // precarga
  (async ()=>{
    const p = pedidos.find(x => String(resolveId(x)) === String(idEntrega));
    if(p){
      form.cliente.value = p.cliente ?? '';
      const d = parseISODateFlexible(p.fechaEntrega);
      if(d){
        const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,'0'), dd = String(d.getDate()).padStart(2,'0');
        form.fechaEntrega.value = `${y}-${m}-${dd}`;
      }else{
        form.fechaEntrega.value = '';
      }
    }

    cont.innerHTML = '';
    try{
      const serverItems = await apiGetPedidoProductos(idEntrega);
      const items = (serverItems||[]).map(it=>({
        producto: it.producto ?? it.productoNombre ?? '—',
        cantidad: Number(it.cantidad)||0,
        precioUnitario: Number(it.precioUnit ?? it.precioUnitario)||0
      }));
      if(items.length){ items.forEach(addRow); } else { (orderItemsMap[idEntrega]||[]).forEach(addRow); }
    }catch{
      (orderItemsMap[idEntrega]||[]).forEach(addRow);
    }

    openModalEditar();
  })();

  // submit -> PUT
  form.onsubmit = async (e)=>{
    e.preventDefault();

    const cliente      = form.cliente.value.trim();
    const fechaEntrega = form.fechaEntrega.value; // yyyy-mm-dd
    if(!cliente || !fechaEntrega){ alert('Completá cliente y fecha.'); return; }

    const rows  = [...cont.querySelectorAll('[data-item]')];
    const items = rows.map(r=>{
      const prod = r.querySelector('[data-field="producto"]').value.trim();
      const qty  = Number(r.querySelector('[data-field="cantidad"]').value)||0;
      const pu   = Number(r.querySelector('[data-field="valorUnitario"]').value)||0;
      return { producto: prod, cantidad: qty, precioUnitario: pu, subTotal: qty*pu };
    }).filter(it => it.producto && it.cantidad>0 && it.precioUnitario>=0);

    if(!items.length){ alert('Agregá al menos un ítem válido.'); return; }

    const ped = pedidos.find(x => String(resolveId(x)) === String(idEntrega));
    const estadoWire = WIRE_FROM_UI[ped?.estado || 'Pendiente'] || 'PENDIENTE';

    const payload = {
      idPedido: Number(idEntrega),
      cliente,
      fechaEntrega,
      estado: estadoWire,
      tipoVenta: 'Pedido',
      items
    };

    try{
      await apiActualizarPedido(idEntrega, payload);

      orderItemsMap[idEntrega] = items; saveOrderItems();
      if(ped){
        ped.cliente = cliente;
        ped.fechaEntrega = fechaEntrega;
        ped.total = items.reduce((a,it)=> a + (Number(it.subTotal)||0), 0);
        ped.items = items;
        ped.__touch = Date.now(); /* NEW: reflejar edición reciente */
      }

      renderTabla(pedidos);
      renderKPIs(pedidos);
      closeModalEditar();
      openDetallePanel(idEntrega);
    }catch(err){
      console.error(err);
      alert('No se pudo actualizar el pedido.');
    }
  };
}

// ==== Ajuste del "gutter" del header según el scroll real ====
function refreshPedidosHeaderGutter(){
  const scroller = document.querySelector('#view-dashboard .pedidos-card .tabla-scroll');
  if (!scroller) return;

  // ¿hay overflow vertical?
  const hasV = scroller.scrollHeight > scroller.clientHeight;

  // ancho real del scrollbar (Windows/Chrome/Edge/etc)
  const sbw = scroller.offsetWidth - scroller.clientWidth;
  scroller.style.setProperty('--scrollbar-w', sbw + 'px');

  scroller.classList.toggle('has-vscroll', hasV);
}

/* -------- INIT -------- */
(async function initPedidos(){
  // Forzar el layout del detalle desde el arranque
  ensureDetallePanelSkeleton();

  // Priming de audio (solo crear)
  (function primeAudioOnce(){
    const crear = document.getElementById('sonido-crear');
    const handler = ()=>{ if(crear){ crear.play().then(()=>{ crear.pause(); crear.currentTime = 0; }).catch(()=>{}); } document.removeEventListener('click', handler); };
    document.addEventListener('click', handler, { once:true });
  })();

  loadOrderItems();

  try{
    const data = await apiGetPedidos();
    pedidos = (Array.isArray(data) ? data : []).map(p=>{
      const id = resolveId(p);

      let itemsRaw = Array.isArray(p.items) ? p.items
                 : (Array.isArray(p.detalle) ? p.detalle
                 : (Array.isArray(p.lineas) ? p.lineas
                 : (Array.isArray(p.productos) ? p.productos
                 : (Array.isArray(p.articulos) ? p.articulos
                 : (Array.isArray(p.orderItems) ? p.orderItems
                 : (orderItemsMap[id] || []))))));
      const items = normalizeItems(itemsRaw);
      if(items.length && id) orderItemsMap[id] = items;

      const total = getNumber(p.total) || (items.length ? items.reduce((a,it)=> a + (Number(it.subTotal)||0), 0) : 0);
      const estadoUI = UI_FROM_WIRE[(p.estado||'').toString().toUpperCase()] ?? (p.estado || 'Pendiente');

      return {
        idEntrega   : id,
        cliente     : p.cliente,
        producto    : items.length ? 'Detalle' : (p.producto ?? '—'),
        fechaEntrega: p.fechaEntrega,
        estado      : estadoUI,
        total,
        items,
        __touch     : parseISODateFlexible(p.updatedAt || p.fechaActualizacion)?.getTime() || 0 // NEW
      };
    });

    saveOrderItems();
    renderKPIs(pedidos);
    renderTabla(pedidos); // orden dentro de render
  }catch(e){
    console.error(e);
    const tb = document.getElementById('tbodyPedidos');
    if(tb) tb.innerHTML = `<tr><td colspan="6">No se pudieron cargar los pedidos</td></tr>`;
  }

  bindInteractions();
  setupNuevoPedido();
})();
