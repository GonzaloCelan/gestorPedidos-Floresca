/* ====================== VENTAS (Historial) ====================== */
/* Archivo “a prueba de choques”: todo va en window.Ventas */
(function () {
  // NO abortamos el archivo si ya existe: igual bindeamos el modal y eventos.
  const yaIniciado = !!window.Ventas?.__inited;
  const APIB = window.API_BASE || window.location.origin;

  // Usa utilidades existentes, sin redeclararlas
  const money =
    window.moneyAR ||
    (n =>
      new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
      }).format(Number(n) || 0));

  const fmt =
    window.fmtFecha ||
    (iso => {
      if (!iso) return '—';
      const d = new Date(iso);
      if (isNaN(d)) return '—';
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      return `${dd}/${mm}/${d.getFullYear()}`;
    });

  const parse =
    window.parseISODateFlexible ||
    (v => {
      if (!v) return null;
      const d = new Date(v);
      return isNaN(d) ? null : d;
    });

  let ventas = []; // [{idPedido, cliente, fecha, total, tipo}]

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

  // ==== NUEVO: eliminar venta
  async function apiDeleteVenta(id) {
    const r = await fetch(`${APIB}/api/v1/ventas/${encodeURIComponent(id)}`, { method: 'DELETE' });
    return r;
  }

  // ---------- Normalizador ----------
  const normVenta = v => ({
    idPedido: String(v.id_pedido ?? v.idPedido ?? v.pedidoId ?? v.pedidoID ?? ''), // usado como {id} en DELETE
    cliente: v.cliente ?? v.nombreCliente ?? '—',
    fecha: v.fecha_entrega ?? v.fechaEntrega ?? v.fecha ?? null,
    total: Number(v.total) || 0,
    tipo: v.tipo_venta ?? v.tipoVenta ?? v.tipo ?? '—',
  });

  // ---------- Render tabla (6 columnas exactas) ----------
  function renderTabla(list) {
    const tb = document.getElementById('tbodyHistorial');
    if (!tb) return;

    if (!Array.isArray(list) || !list.length) {
      tb.innerHTML = '<tr class="row-empty"><td colspan="6">Sin registros en el historial</td></tr>';
      return;
    }

    tb.innerHTML = list
      .map((v) => {
        const id = v.idPedido ?? '';
        return `
          <tr data-id="${id}">
            
            

            <!-- Columna 12: Fecha -->
            <td>${fmt(v.fecha)}</td>

            <!-- Columna 2: Cliente -->
            <td>${v.cliente ?? '—'}</td>

            <!-- Columna 3: Detalle -->
            <td>
              <button type="button" class="btn-detalle" data-kind="venta" data-id="${id}">
                Ver detalle
              </button>
            </td>

            <!-- Columna 4: Tipo -->
            <td>${v.tipo ?? '—'}</td>

            <!-- Columna 5: Total -->
            <td>${money(v.total)}</td>
			
			<!-- Columna 6 (# → botón eliminar) -->
			<td style="text-align:center">
			              <button type="button" class="btn-icon btn-danger btn-del-venta" title="Eliminar" data-id="${id}">
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
      tr.dataset.id === String(idPedido)
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
        precio: Number(it.precioUnit ?? it.precioUnitario) || 0,
        sub: it.subtotal ?? it.subTotal,
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
      // Si aún no están en DOM, reintenta al próximo frame
      requestAnimationFrame(setupVentaModal);
      return;
    }

    const open = () => {
      modal.classList.remove('hidden');
      modal.removeAttribute('aria-hidden');
      document.body.style.overflow = 'hidden'; // bloquea scroll fondo
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

    // Bind directo si el botón existe ya
    const openBtn = document.getElementById('btnAgregarVenta');
    if (openBtn) openBtn.onclick = e => { e.preventDefault(); open(); };

    // Delegación por si el botón se monta después o hay re-render
    const openDelegated = e => {
      const btn = e.target.closest('#btnAgregarVenta');
      if (btn) { e.preventDefault(); open(); }
    };
    document.addEventListener('click', openDelegated);

    cancelar && (cancelar.onclick = e => { e.preventDefault(); close(); });
    cerrar   && (cerrar.onclick   = e => { e.preventDefault(); close(); });

    // Cerrar por click en el fondo
    modal.addEventListener('click', e => { if (e.target === modal) close(); });

    // Cerrar por ESC
    const escHandler = e => { if (e.key === 'Escape' && !modal.classList.contains('hidden')) close(); };
    document.addEventListener('keydown', escHandler);

    // ==== NUEVO: cálculo con CANTIDAD ====
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

    // Botón “+ Producto”
    if (addBtn) {
      addBtn.onclick = e => { e.preventDefault(); addRow(); };
    } else {
      // fallback por delegación si ese botón cambia
      document.addEventListener('click', e => {
        const plus = e.target.closest('#addItemVentaBtn');
        if (plus) { e.preventDefault(); addRow(); }
      });
    }

    // Submit
    form.onsubmit = async e => {
      e.preventDefault();
      const cliente      = document.getElementById('ventaCliente')?.value?.trim();
      const fechaEntrega = document.getElementById('ventaFecha')?.value;
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

        // al guardar, quedate en el historial y mantené el filtro del mes seleccionado
        if (typeof window.switchViewAnimated === 'function') window.switchViewAnimated('log');
        // re-render con filtro vigente
        renderTabla(filtrarPorMes(ventas));
        renderKPIs(ventas);
      } catch (err) {
        console.error(err);
        alert('No se pudo guardar la venta.');
      }
    };

    // Exponer open/close y marcar modal bindeado
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
      ventas = arr.map(normVenta).filter(v => v.idPedido);

      // asegurar mes actual en input y render con filtro
      setMesActualSiVacio();
      renderTabla(filtrarPorMes(ventas));  // <-- TABLA SOLO DEL MES SELECCIONADO
      renderKPIs(ventas);                   // KPIs: total general + mensual segun #logMes
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

    // ==== NUEVO: eliminar venta (delegación)
    document.addEventListener('click', async e => {
      const del = e.target.closest('.btn-del-venta');
      if (!del) return;
      e.preventDefault();
      const id = del.dataset.id;
      if (!id) return;

      if (!confirm(`¿Eliminar la venta #${id}? Esta acción no se puede deshacer.`)) return;

      del.disabled = true;
      try {
        const res = await apiDeleteVenta(id);
        if (res.ok) {
          // quitar de memoria
          ventas = ventas.filter(v => v.idPedido !== String(id));
          // quitar fila del DOM
          del.closest('tr')?.remove();
          // re-render KPIs (y, por consistencia, refrescar tabla del mes)
          renderTabla(filtrarPorMes(ventas));
          renderKPIs(ventas);
          // opcional: si usás algún toast(), llamalo acá
          // toast?.('Venta eliminada.');
        } else if (res.status === 404) {
          alert('La venta no existe (404).');
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

    // Cambio de mes: filtra tabla y recalcula KPIs
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
    __inited: yaIniciado || false, // se pondrá en true tras primera carga
    cargar: cargarVentasYRender,
    aplicarFiltros: () => {
      // por si te llaman desde index.js al cambiar de vista
      setMesActualSiVacio();
      renderTabla(filtrarPorMes(ventas));
      renderKPIs(ventas);
    },
  });

  // hace visible el panel y carga datos
  (function init() {
    // aseguro layout del split (detalle a la derecha)
    const split = document.querySelector('#view-log .dashboard-split');
    if (split) {
      split.style.display = 'grid';
      split.style.gridTemplateColumns = 'var(--log-list-width) var(--detail-log-width)';
      split.style.gap = '20px';
      split.style.alignItems = 'start';
    }

    // bindear SIEMPRE el modal; protegido por flag interno
    setupVentaModal();

    // eventos generales del historial (una sola vez)
    bind();

    // por defecto, setear el mes actual en el input si está vacío
    setMesActualSiVacio();

    // sólo la primera vez hacemos fetch + render
    if (!yaIniciado) {
      cargarVentasYRender().finally(() => {
        window.Ventas.__inited = true;
      });
    } else {
      // si ya había datos, aplicar filtro con el mes actual/seleccionado
      window.Ventas.aplicarFiltros();
    }
  })();

  // Integra con index.js (cuando cambias a “Historial”)
  window.aplicarFiltrosLogs = () => window.Ventas.aplicarFiltros();
})();
