
(() => {
  const API_BASE = window.API_BASE ?? window.location.origin;
  const ENDPOINTS = {
    LIST   : '/api/v1/materiales',
    CREATE : '/api/v1/materiales',
    DELETE : (id) => `/api/v1/materiales/${encodeURIComponent(id)}`
  };

  // Nodos
  const $tbody         = document.getElementById('tbodyMateriales');
  const $form          = document.getElementById('formMaterial');
  const $inFecha       = document.getElementById('matFecha');
  const $inNombre      = document.getElementById('matNombre');      // -> material
  const $inCantidad    = document.getElementById('matCantidad');    // -> cantidad
  const $inPrecioUnit  = document.getElementById('matPrecioUnit');  // -> precioUnitario
  const $inTotal       = document.getElementById('matTotal');       // visual
  const $inProveedor   = document.getElementById('matProveedor');   // -> proveedor
  const $inMes         = document.getElementById('matMes');
  const $inSearch      = document.getElementById('matSearch');

  const $kpiMensual    = document.getElementById('matTotalFiltrado');
  const $kpiTotal      = document.getElementById('matTotalGeneral');

  const $dlMateriales  = document.getElementById('dl-materiales');
  const $dlProvs       = document.getElementById('dl-proveedores');

  // State
  /** @type {Array<{id?:number, fecha:string, material:string, cantidad:number, proveedor?:string, precioUnitario:number, precioTotal:number}>} */
  let MATERIALS_ALL = [];

  // Helpers
  const moneyAR = (n) => new Intl.NumberFormat('es-AR', { style:'currency', currency:'ARS', maximumFractionDigits:2 }).format(Number(n||0));
  const asNumber = (v) => {
    if (typeof v === 'number') return v;
    if (!v) return 0;
    return Number(String(v).replace(/[^\d.,-]/g,'').replace(/\./g,'').replace(',', '.')) || 0;
  };
  const fmtFecha = (iso) => {
    const s = String(iso).split('T')[0];
    const [y,m,d] = s.split('-');
    return `${d}/${m}/${y}`;
  };
  const monthKey = (iso) => String(iso).split('T')[0].slice(0,7); // YYYY-MM
  const todayISO = () => {
    const t = new Date();
    const y = t.getFullYear();
    const m = String(t.getMonth()+1).padStart(2,'0');
    const d = String(t.getDate()).padStart(2,'0');
    return `${y}-${m}-${d}`;
  };
  const setMesActual = () => {
    const t = new Date();
    const y = t.getFullYear();
    const m = String(t.getMonth()+1).padStart(2,'0');
    $inMes.value = `${y}-${m}`;
  };
  const uniqueSorted = (arr) => [...new Set(arr.filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'));

  // Datalists
  const populateDatalists = (items) => {
    $dlMateriales.innerHTML = uniqueSorted(items.map(x => x.material)).map(v => `<option value="${v}"></option>`).join('');
    $dlProvs.innerHTML      = uniqueSorted(items.map(x => x.proveedor)).map(v => `<option value="${v}"></option>`).join('');
  };

  // API
  const apiGetAll = async () => {
    const res = await fetch(`${API_BASE}${ENDPOINTS.LIST}`, { headers:{ 'Accept':'application/json' }});
    if (!res.ok) throw new Error(`GET materiales: ${res.status}`);
    return res.json();
  };

  const apiCreate = async (payload) => {
    const res = await fetch(`${API_BASE}${ENDPOINTS.CREATE}`, {
      method:'POST',
      headers:{ 'Content-Type':'application/json', 'Accept':'application/json' },
      body: JSON.stringify(payload)
    });
    const text = await res.text().catch(()=> '');
    if (!res.ok) {
      console.error('POST /materiales payload', payload);
      console.error('Respuesta', text);
      throw new Error(text || `POST materiales: ${res.status}`);
    }
    try { return JSON.parse(text); } catch { return {}; }
  };

  const apiDelete = async (id) => {
    const res = await fetch(`${API_BASE}${ENDPOINTS.DELETE(id)}`, {
      method:'DELETE',
      headers:{ 'Accept':'application/json' }
    });
    if (!res.ok) throw new Error(`DELETE materiales: ${res.status}`);
    return true;
  };

  // Totales / render
  const calcTotals = (items) => items.reduce((acc, it) => acc + asNumber(it.precioTotal), 0);

  const renderTable = (items) => {
    if (!items.length) {
      $tbody.innerHTML = `<tr class="row-empty"><td colspan="7">Sin materiales cargados</td></tr>`;
      return;
    }
    const sorted = [...items].sort((a,b) => {
      const d = new Date(b.fecha).getTime() - new Date(a.fecha).getTime();
      if (d !== 0) return d;
      return (b.id??0) - (a.id??0);
    });

    // Columnas: Fecha | Material | Cantidad | Precio Unit. | Total | Proveedor | Acciones (eliminar)
    $tbody.innerHTML = sorted.map((it) => `
      <tr data-id="${it.id ?? ''}">
        <td>${fmtFecha(it.fecha)}</td>
        <td title="${it.material||''}">${it.material||'—'}</td>
        <td style="text-align:left">${asNumber(it.cantidad).toLocaleString('es-AR')}</td>
        <td style="text-align:left">${moneyAR(it.precioUnitario)}</td>
        <td style="text-align:left">${moneyAR(it.precioTotal)}</td>
        <td title="${it.proveedor||''}">${it.proveedor||'—'}</td>
        <td class="col-actions" style="text-align:center">
          ${
            it.id
              ? `<button class="btn-icon danger" data-action="del" title="Eliminar" aria-label="Eliminar material ${it.material}">
                   <span class="material-symbols-rounded">delete</span>
                 </button>`
              : '—'
          }
        </td>
      </tr>
    `).join('');
  };

  const refreshKPIs = (filtered) => {
    const mensual = calcTotals(filtered);
    const total   = calcTotals(MATERIALS_ALL);
    $kpiMensual.textContent = moneyAR(mensual);
    $kpiTotal.textContent   = moneyAR(total);
  };

  // Filtros
  const getFiltered = () => {
    const month = $inMes.value || '';
    const q = ($inSearch?.value || '').trim().toLowerCase();
    let list = MATERIALS_ALL;
    if (month) list = list.filter(x => monthKey(x.fecha) === month);
    if (q) list = list.filter(x =>
      String(x.material||'').toLowerCase().includes(q) ||
      String(x.proveedor||'').toLowerCase().includes(q)
    );
    return list;
  };

  const applyFiltersAndRender = () => {
    const filtered = getFiltered();
    renderTable(filtered);
    refreshKPIs(filtered);
  };

  // Form: autocalcular total
  const recalcTotal = () => {
    const cant = asNumber($inCantidad.value);
    const unit = asNumber($inPrecioUnit.value);
    $inTotal.value = moneyAR(cant * unit);
  };
  ['input','change'].forEach(ev => {
    $inCantidad.addEventListener(ev, recalcTotal);
    $inPrecioUnit.addEventListener(ev, recalcTotal);
  });

  // Validaciones contra tu DTO
  const validateDTO = () => {
    const hoy = todayISO();
    if (!$inFecha.value) throw new Error('Completá la fecha.');
    if ($inFecha.value < hoy) throw new Error('La fecha debe ser hoy o futura.');
    if (!$inNombre.value.trim()) throw new Error('Completá el material.');
    const cant = asNumber($inCantidad.value);
    if (cant < 1) throw new Error('La cantidad mínima es 1.');
    const unit = asNumber($inPrecioUnit.value);
    if (unit < 0) throw new Error('El precio unitario no puede ser negativo.');
  };

  // Submit -> POST -> reload
  $form.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      validateDTO();

      const cantidad = asNumber($inCantidad.value);
      const precioUnitario = asNumber($inPrecioUnit.value);
      const payload = {
        fecha: $inFecha.value,                     // LocalDate (YYYY-MM-DD)
        material: $inNombre.value.trim(),
        cantidad,
        proveedor: $inProveedor.value.trim() || null,
        precioUnitario,
        precioTotal: cantidad * precioUnitario
      };

      await apiCreate(payload);

      // limpiar campos rápidos
      $inNombre.value = '';
      $inCantidad.value = '1';
      $inPrecioUnit.value = '';
      recalcTotal();
      $inNombre.focus();

      const data = await apiGetAll();
      MATERIALS_ALL = Array.isArray(data) ? data : (data?.content || []);
      populateDatalists(MATERIALS_ALL);
      applyFiltersAndRender();
    } catch (err) {
      console.error(err);
      alert(err.message || 'No se pudo guardar el material.');
    }
  });

  // Eliminar (delegado en tbody)
  $tbody.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action="del"]');
    if (!btn) return;

    const $tr = btn.closest('tr');
    const id = $tr?.dataset.id;
    if (!id) {
      alert('No se puede eliminar este registro (falta ID).');
      return;
    }
    const nombre = $tr.querySelector('td:nth-child(2)')?.textContent?.trim() || 'este material';
    const { isConfirmed } = await Swal.fire({
		    title: '¿Eliminar este material?',
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

    try {
      await apiDelete(id);
      // quitar del estado local y refrescar
      MATERIALS_ALL = MATERIALS_ALL.filter(x => String(x.id) !== String(id));
      applyFiltersAndRender();
    } catch (err) {
      console.error(err);
      alert('No se pudo eliminar el material.');
    }
  });

  // Eventos de filtro
  $inMes.addEventListener('change', applyFiltersAndRender);
  if ($inSearch) {
    let t; $inSearch.addEventListener('input', () => { clearTimeout(t); t = setTimeout(applyFiltersAndRender, 180); });
  }

  // Init
  const init = async () => {
    setMesActual();
    $inFecha.value = todayISO(); // evita fallo por @FutureOrPresent
    recalcTotal();

    try {
      const data = await apiGetAll();
      MATERIALS_ALL = Array.isArray(data) ? data : (data?.content || []);
    } catch {
      MATERIALS_ALL = [];
    }
    populateDatalists(MATERIALS_ALL);
    applyFiltersAndRender(); // mes actual por defecto
  };

  if (document.getElementById('view-materiales')) init();
})();

