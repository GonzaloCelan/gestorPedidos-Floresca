/* ====================== VENTAS (Historial) ====================== */
/* Archivo “a prueba de choques”: todo va en window.Ventas */
(function () {
  // NO abortamos el archivo si ya existe: igual bindeamos el modal y eventos.
  const yaIniciado = !!window.Ventas?.__inited;
  const APIB = window.API_BASE || window.location.origin;

  // === UTIL: fecha local (yyyy-mm-dd) sin UTC ===
  function hoyLocalYMD(){
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0,10);
  }

  // Usa utilidades existentes, sin redeclararlas
  const money =
    window.moneyAR ||
    (n =>
      new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
      }).format(Number(n) || 0));

  // --- Parser robusto: trata 'yyyy-mm-dd' como fecha LOCAL ---
  const parse =
    window.parseISODateFlexible ||
    (v => {
      if (!v) return null;
      if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
        const [y,m,d] = v.split('-').map(Number);
        return new Date(y, m - 1, d); // local midnight (no UTC)
      }
      const d = new Date(v);
      return isNaN(d) ? null : d;
    });

  // Formateo dd/mm/yyyy usando el parser anterior
  const fmt =
    window.fmtFecha ||
    (val => {
      const d = parse(val);
      if (!d) return '—';
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      return `${dd}/${mm}/${d.getFullYear()}`;
    });

  let ventas = []; // [{idVenta, idPedido, cliente, fecha, total, tipo}]

  // ---------- Helpers de mes / filtro ----------
  function setMesActualSiVacio() {
    const inp = document.getElementById('logMes');
    if (!inp) return;
    if (!inp.value) {
      const now = new Date();
      inp.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }
  }

  function getMesSeleccionado() {
    const inp = document.getElementById('logMes');
    if (!inp) return null;
    if (!inp.value) setMesActualSiVacio();
    const [yy, mm] = String(inp.value || '').split('-').map(Number);
    if (!yy || !mm) return null;
    return { yy, mm };
  }

  function filtrarPorMes(list) {
    const sel = getMesSeleccionado();
    if (!sel) return list || [];
    const { yy, mm } = sel;
    return (Array.isArray(list) ? list : []).filter(v => {
      const d = parse(v.fecha);
      return d && d.getFullYear() === yy && (d.getMonth() + 1) === mm;
    });
  }

  // ---------- API ----------
  async function apiGetVentas() {
    try {
      const r = await fetch(`${APIB}/api/v1/ventas`);
      if (!r.ok) throw 0;
      return await r.json();
    } catch {
      const r2 = await fetch(`${APIB}/api/v1/ventas/page`);
      if (!r2.ok) throw new Error('No se pudo cargar ventas');
      return await r2.json();
    }
  }

  async function apiCrearPedido(payload) {
    if (typeof window.apiCrearPedido === 'function')
      return window.apiCrearPedido(payload);
    const r = await fetch(`${APIB}/api/v1/pedidos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!r.ok) throw new Error(`POST /pedidos -> ${r.status}`);
    return r.json().catch(() => ({}));
  }

  async function apiGetPedidoItems(id) {
    if (typeof window.apiGetPedidoProductos === 'function')
      return window.apiGetPedidoProductos(id);
    const r = await fetch(`${APIB}/api/v1/pedidos/producto/${encodeURIComponent(id)}`);
    if (r.status === 404) return [];
    if (!r.ok) throw new Error(`GET productos/${id} -> ${r.status}`);
    return r.json();
  }

  // ==== DELETE venta (con fallback opcional por pedido) ====
  async function apiDeleteVentaPorIdVenta(idVenta) {
    return fetch(`${APIB}/api/v1/ventas/${encodeURIComponent(idVenta)}`, { method: 'DELETE' });
  }
  async function apiBuscarIdVentaPorPedido(idPedido) {
    const r = await fetch(`${APIB}/api/v1/ventas/by-pedido/${encodeURIComponent(idPedido)}`);
    if (!r.ok) return null;
    const data = await r.json().catch(() => null);
    return data?.id ?? data?.idVenta ?? null;
  }

  // ---------- Normalizador ----------
  const normVenta = v => ({
    idVenta : String(v.id ?? v.id_venta ?? v.ventaId ?? v.idVenta ?? ''),   // 👈 ID real de venta
    idPedido: String(v.id_pedido ?? v.idPedido ?? v.pedidoId ?? v.pedidoID ?? ''), // pedido asociado
    cliente: v.cliente ?? v.nombreCliente ?? '—',
    fecha  : v.fecha_entrega ?? v.fechaEntrega ?? v.fecha ?? null, // aceptar 'yyyy-mm-dd'
    total  : Number(v.total) || 0,
    tipo   : v.tipo_venta ?? v.tipoVenta ?? v.tipo ?? '—',
  });

  // ---------- Render tabla (6 columnas) ----------
  function renderTabla(list) {
    const tb = document.getElementById('tbodyHistorial');
    if (!tb) return;

    if (!Array.isArray(list) || !list.length) {
      tb.innerHTML = '<tr class="row-empty"><td colspan="6">Sin registros en el historial</td></tr>';
      return;
    }

    tb.innerHTML = list
      .map(v => {
        const idVenta  = v.idVenta || '';
        const idPedido = v.idPedido || '';
        return `
          <tr data-id-venta="${idVenta}" data-id-pedido="${idPedido}">
            <!-- Fecha -->
            <td>${fmt(v.fecha)}</td>

            <!-- Cliente -->
            <td>${v.cliente ?? '—'}</td>

            <!-- Detalle -->
            <td>
              <button type="button" class="btn-detalle" data-kind="venta" data-id="${idPedido}">
                Ver detalle
              </button>
            </td>

            <!-- Tipo -->
            <td>${v.tipo ?? '—'}</td>

            <!-- Total -->
            <td>${money(v.total)}</td>
			
            <td style="text-align:center">
              <button type="button"
                      class="btn-icon btn-danger btn-del-venta"
                      title="Eliminar"
                      data-id-venta="${idVenta}"
                      data-id-pedido="${idPedido}">
                <span class="material-symbols-rounded">delete</span>
              </button>
            </td>
          </tr>
        `;
      })
      .join('');
  }

  // ---------- KPIs ----------
  function renderKPIs(list) {
    const elG = document.getElementById('logTotalGeneral');
    const elM = document.getElementById('logTotalFiltrado');
    const inp = document.getElementById('logMes');

    const totG = (Array.isArray(list) ? list : []).reduce((a, v) => a + (Number(v.total) || 0), 0);

    const now = new Date();
    const [yy, mm] = (inp?.value || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
      .split('-')
      .map(Number);

    const totM = (Array.isArray(list) ? list : []).reduce((a, v) => {
      const d = parse(v.fecha);
      return !d || d.getFullYear() !== yy || d.getMonth() + 1 !== mm ? a : a + (Number(v.total) || 0);
    }, 0);

    if (elG) elG.textContent = money(totG);
    if (elM) elM.textContent = money(totM);
  }

  // ---------- Detalle ----------
  async function openDetalleVenta(idPedido) {
    const meta = document.getElementById('detalleMetaLog');
    const body = document.getElementById('detalleBodyLog');
    const total = document.getElementById('detalleTotalLog');
    if (!body || !total) return;

    // marcar fila activa (visual)
    const rows = document.querySelectorAll('#tbodyHistorial tr');
    rows.forEach(tr =>
      (tr.dataset.idPedido || tr.getAttribute('data-id-pedido')) === String(idPedido)
        ? tr.classList.add('is-active')
        : tr.classList.remove('is-active')
    );

    const v = ventas.find(x => x.idPedido === String(idPedido));
    if (meta) {
      meta.textContent = v
        ? `Cliente: ${v.cliente} · Entrega: ${fmt(v.fecha)} · Tipo: ${v.tipo}`
        : 'Detalle de la venta';
    }

    body.innerHTML = '<tr><td colspan="4">Cargando...</td></tr>';
    total.textContent = money(0);

    try {
      const items = (await apiGetPedidoItems(idPedido)).map(it => ({
        producto: it.producto ?? it.productoNombre ?? it.nombre ?? '—',
        cantidad: Number(it.cantidad) || 0,
        precio  : Number(it.precioUnit ?? it.precioUnitario) || 0,
        sub     : it.subtotal ?? it.subTotal,
      }));

      if (!items.length) {
        body.innerHTML = '<tr><td colspan="4">Sin items</td></tr>';
        return;
      }

      let t = 0;
      body.innerHTML = items
        .map(it => {
          const q = it.cantidad;
          const pu = it.precio;
          const st = it.sub == null || isNaN(Number(it.sub)) ? q * pu : Number(it.sub);
          t += st;
          return `
            <tr>
              <td>${it.producto}</td>
              <td style="text-align:right">${q}</td>
              <td style="text-align:right">${money(pu)}</td>
              <td style="text-align:right">${money(st)}</td>
            </tr>
          `;
        })
        .join('');

      total.textContent = money(t);
    } catch (err) {
      console.error(err);
      body.innerHTML = '<tr><td colspan="4">No se pudo cargar el detalle</td></tr>';
    }
  }

  // ---------- Modal Agregar Venta (con “Cantidad”) ----------
  function setupVentaModal() {
    if (window.Ventas?.__boundVentaModal) return; // evita doble bind del modal

    const modal   = document.getElementById('modalVenta');
    const form    = document.getElementById('formVenta');
    const addBtn  = document.getElementById('addItemVentaBtn');
    const list    = document.getElementById('itemsContainerVenta');
    const cancelar= document.getElementById('ventaCancelar');
    const cerrar  = document.getElementById('ventaCerrar');
    const totalEl = document.getElementById('totalVenta');

    if (!modal || !form || !list || !totalEl) {
      requestAnimationFrame(setupVentaModal);
      return;
    }

    // Al abrir el modal, setear fecha LOCAL = hoy (y opcional max=hoy)
    const prepararFecha = () => {
      const fechaInp = document.getElementById('ventaFecha') || document.querySelector('input[name="fechaEntrega"]');
      if (fechaInp) {
        const hoy = hoyLocalYMD();
        if (!fechaInp.value) fechaInp.value = hoy;
        // Si no querés permitir futuras, dejá esto activo:
        // fechaInp.max = hoy;
      }
    };

    const open = () => {
      modal.classList.remove('hidden');
      modal.removeAttribute('aria-hidden');
      document.body.style.overflow = 'hidden';
      prepararFecha();
      const firstInput = modal.querySelector('input, select, button');
      setTimeout(() => firstInput?.focus(), 0);
    };
    const close = () => {
      modal.classList.add('hidden');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      try {
        form.reset();
        list.innerHTML = '';
        totalEl.textContent = money(0);
      } catch {}
    };

    const openBtn = document.getElementById('btnAgregarVenta');
    if (openBtn) openBtn.onclick = e => { e.preventDefault(); open(); };

    const openDelegated = e => {
      const btn = e.target.closest('#btnAgregarVenta');
      if (btn) { e.preventDefault(); open(); }
    };
    document.addEventListener('click', openDelegated);

    cancelar && (cancelar.onclick = e => { e.preventDefault(); close(); });
    cerrar   && (cerrar.onclick   = e => { e.preventDefault(); close(); });

    modal.addEventListener('click', e => { if (e.target === modal) close(); });
    const escHandler = e => { if (e.key === 'Escape' && !modal.classList.contains('hidden')) close(); };
    document.addEventListener('keydown', escHandler);

    const recalcTotal = () => {
      let t = 0;
      list.querySelectorAll('.pedido-items__row').forEach(r => {
        const qty = Math.max(1, Number(r.querySelector('[data-field="cantidad"]')?.value || 0));
        const pu  = Number(String(r.querySelector('[data-field="valorUnitario"]')?.value || '')
                    .replace(/\./g, '').replace(/,/g, '.')) || 0;
        const st  = qty * pu;
        const $tl = r.querySelector('[data-field="totalLinea"]');
        if ($tl) $tl.value = money(st);
        t += st;
      });
      totalEl.textContent = money(t);
    };

    const addRow = (pref = {}) => {
      const row = document.createElement('div');
      row.className = 'pedido-items__row';
      row.setAttribute('data-item', '');
      row.innerHTML = `
        <input class="input" data-field="producto" placeholder="Ej: Ramo artesanal" value="${pref.producto ?? ''}">
        <input class="input ta-right" data-field="cantidad" type="number" min="1" step="1" value="${pref.cantidad ?? 1}">
        <input class="input ta-right" data-field="valorUnitario" inputmode="decimal" placeholder="0" value="${pref.precioUnitario ?? 0}">
        <input class="input ta-right" data-field="totalLinea" value="${money((pref.cantidad ?? 1) * (pref.precioUnitario ?? 0))}" readonly>
        <button type="button" class="btn-icon btn-danger" data-action="remove" title="Quitar">✕</button>
      `;

      const $qty = row.querySelector('[data-field="cantidad"]');
      const $vu  = row.querySelector('[data-field="valorUnitario"]');

      const recalc = () => recalcTotal();
      $qty.addEventListener('input', recalc);
      $vu.addEventListener('input', recalc);

      row.querySelector('[data-action="remove"]').addEventListener('click', () => {
        row.remove();
        recalcTotal();
      });

      list.appendChild(row);
      recalcTotal();
    };

    if (addBtn) {
      addBtn.onclick = e => { e.preventDefault(); addRow(); };
    } else {
      document.addEventListener('click', e => {
        const plus = e.target.closest('#addItemVentaBtn');
        if (plus) { e.preventDefault(); addRow(); }
      });
    }

    form.onsubmit = async e => {
      e.preventDefault();
      const cliente      = document.getElementById('ventaCliente')?.value?.trim();
      const fechaEntrega = (document.getElementById('ventaFecha') || document.querySelector('input[name="fechaEntrega"]'))?.value || hoyLocalYMD();
      const tipoVenta    = document.getElementById('ventaTipo')?.value || 'PEDIDO';

      const rows = [...list.querySelectorAll('[data-item]')];
      const items = rows
        .map(r => {
          const prod = r.querySelector('[data-field="producto"]').value.trim();
          const qty  = Math.max(1, Number(r.querySelector('[data-field="cantidad"]').value || 0));
          const pu   = Number(String(r.querySelector('[data-field="valorUnitario"]').value || '')
                        .replace(/\./g, '').replace(/,/g, '.')) || 0;
          return { producto: prod, cantidad: qty, precioUnitario: pu, subTotal: qty * pu };
        })
        .filter(it => it.producto && it.precioUnitario >= 0);

      if (!cliente || !fechaEntrega) { alert('Completá cliente y fecha.'); return; }
      if (!items.length) { alert('Agregá al menos un producto.'); return; }

      // fechaEntrega: string yyyy-mm-dd (sin UTC). El backend debe mapear a LocalDate.
      const payload = { cliente, fechaEntrega, estado: 'ENTREGADO', tipoVenta, items };

      try {
        await (typeof apiCrearPedido === 'function'
          ? apiCrearPedido(payload)
          : fetch(`${APIB}/api/v1/pedidos`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            }).then(r => {
              if (!r.ok) throw new Error(r.status);
              return r.json().catch(() => ({}));
            }));
        close();
        await (window.Ventas?.cargar?.() || Promise.resolve());

        if (typeof window.switchViewAnimated === 'function') window.switchViewAnimated('log');
        renderTabla(filtrarPorMes(ventas));
        renderKPIs(ventas);
      } catch (err) {
        console.error(err);
        alert('No se pudo guardar la venta.');
      }
    };

    window.Ventas = Object.assign({}, window.Ventas, {
      openVentaModal: open,
      closeVentaModal: close,
      __boundVentaModal: true,
    });
  }

  // ---------- Carga + render ----------
  async function cargarVentasYRender() {
    try {
      const data = await apiGetVentas();
      const arr = Array.isArray(data) ? data
               : Array.isArray(data?.content) ? data.content
               : [];
      ventas = arr.map(normVenta).filter(v => v.idPedido || v.idVenta);

      setMesActualSiVacio();
      renderTabla(filtrarPorMes(ventas));
      renderKPIs(ventas);
    } catch (err) {
      console.error(err);
      const tb = document.getElementById('tbodyHistorial');
      if (tb) tb.innerHTML = '<tr class="row-empty"><td colspan="6">No se pudo cargar el historial</td></tr>';
      const g = document.getElementById('logTotalGeneral');
      if (g) g.textContent = money(0);
      const m = document.getElementById('logTotalFiltrado');
      if (m) m.textContent = money(0);
    }
  }

  // ---------- Eventos ----------
  function bind() {
    if (window.Ventas?.__boundHistorialEvents) return; // evita doble bind

    // Ver detalle
    document.addEventListener('click', e => {
      const btn = e.target.closest('.btn-detalle[data-kind="venta"]');
      if (!btn) return;
      e.preventDefault();
      openDetalleVenta(btn.dataset.id);
    });

    // Eliminar venta
    document.addEventListener('click', async e => {
      const del = e.target.closest('.btn-del-venta');
      if (!del) return;
      e.preventDefault();

      const idVenta  = del.dataset.idVenta  || del.closest('tr')?.dataset.idVenta  || '';
      const idPedido = del.dataset.idPedido || del.closest('tr')?.dataset.idPedido || '';

      if (!idVenta && !idPedido) { alert('No se encontró el identificador de la venta.'); return; }
      const label = idVenta ? `#${idVenta}` : `(por pedido #${idPedido})`;
	  const { isConfirmed } = await Swal.fire({
	  	    title: '¿Eliminar esta venta?',
	  		html: '<div style="font-size:18px;color:#d9a441;margin-bottom:6px">⚠️</div><div>Esta acción no se puede deshacer.</div>',
	  	    text: 'Esta acción no se puede deshacer.',
	  	    icon: undefined,
	  	    showCancelButton: true,
	  	    confirmButtonText: 'Eliminar',
	  	    cancelButtonText: 'Cancelar',
	  	    reverseButtons: true,
	  	    focusCancel: true,
	  	    buttonsStyling: false,
	  		customClass: {
	  		    popup: 'floresca'
	  		  }// usamos nuestros estilos de CSS
	  	  });
	  	if (!isConfirmed) return;

      del.disabled = true;
      try {
        let res;
        if (idVenta) {
          res = await apiDeleteVentaPorIdVenta(idVenta);
        } else {
          const resolvedId = await apiBuscarIdVentaPorPedido(idPedido);
          if (!resolvedId) { alert('No se encontró el ID de venta para ese pedido.'); return; }
          res = await apiDeleteVentaPorIdVenta(resolvedId);
        }

        if (res.ok) {
          // quitar de memoria (prioriza idVenta; si no, idPedido)
          ventas = ventas.filter(v =>
            (idVenta  && v.idVenta  !== String(idVenta)) ||
            (!idVenta && v.idPedido !== String(idPedido))
          );
          del.closest('tr')?.remove();
          renderTabla(filtrarPorMes(ventas));
          renderKPIs(ventas);
        } else if (res.status === 404) {
          alert('La venta no existe (404). Verificá que estés enviando el ID de venta.');
        } else if (res.status === 409) {
          alert('No se puede eliminar: la venta tiene registros asociados.');
        } else {
          const msg = (await res.text()).slice(0, 300);
          alert('Error al eliminar: ' + (msg || res.status));
        }
      } catch (err) {
        alert('Error de red al eliminar: ' + err.message);
      } finally {
        del.disabled = false;
      }
    });

    // Cambio de mes
    document.getElementById('logMes')?.addEventListener('change', () => {
      renderTabla(filtrarPorMes(ventas));
      renderKPIs(ventas);
    });

    document.getElementById('logRefresh')?.addEventListener('click', () => {
      cargarVentasYRender().catch(() => {});
    });

    window.Ventas = Object.assign({}, window.Ventas, {
      __boundHistorialEvents: true,
    });
  }

  // ---------- Public + init ----------
  window.Ventas = Object.assign({}, window.Ventas, {
    __inited: yaIniciado || false,
    cargar: cargarVentasYRender,
    aplicarFiltros: () => {
      setMesActualSiVacio();
      renderTabla(filtrarPorMes(ventas));
      renderKPIs(ventas);
    },
  });

  (function init() {
    const split = document.querySelector('#view-log .dashboard-split');
    if (split) {
      split.style.display = 'grid';
      // Usamos variables para que la media query pueda cambiar tamaños
      split.style.gridTemplateColumns = 'var(--log-list-width) var(--detail-log-width)';
      split.style.gap = '20px';
      split.style.alignItems = 'start';
    }

    setupVentaModal();
    bind();
    setMesActualSiVacio();

    if (!yaIniciado) {
      cargarVentasYRender().finally(() => { window.Ventas.__inited = true; });
    } else {
      window.Ventas.aplicarFiltros();
    }
  })();

  // Integra con index.js (cuando cambias a “Historial”)
  window.aplicarFiltrosLogs = () => window.Ventas.aplicarFiltros();
})();

