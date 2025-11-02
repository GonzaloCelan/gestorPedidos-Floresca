

function initPedidos() {
	
	
	const API_BASE = "/api/v1";

	const tbodyPedidos = document.getElementById("tbodyPedidos");
	const tplPedido = document.getElementById("row-pedido-template");
	const lblTotalPedidos = document.getElementById("lblTotalPedidos");
	const filMes = document.getElementById("filMes-pedido");
	const filEstado = document.getElementById("filEstado-pedido") ;
	const btnAgregarPedido = document.getElementById("btnAgregarPedido");

	const sonidoCrear = document.getElementById("sonido-crear");
	const sonidoEstado = document.getElementById("sonido-estado");

	let pedidos = [];

	function money(n) {
	  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(Number(n) || 0);
	}
	function parseFechaISO(fechaStr) {
	  const [y, m, d] = fechaStr.split("-").map(Number);
	  return new Date(Date.UTC(y, (m || 1) - 1, d || 1));
	}

	// === FETCH ===
	async function fetchPedidos() {
	  const res = await fetch(`${API_BASE}/pedidos`);
	  pedidos = await res.json();
	  pedidos.sort((a, b) => parseFechaISO(b.fechaEntrega) - parseFechaISO(a.fechaEntrega));
	  renderPedidos();
	}

	// === BADGES ===
	function estadoToBadge(estado, id) {
	  const e = String(estado || "").toUpperCase();
	  const cls =
	    e === "PENDIENTE"   ? "border-amber-200 text-amber-700 bg-amber-50" :
	    e === "EN PROCESO"  ? "border-blue-200 text-blue-700 bg-blue-50"   :
	    e === "ENTREGADO"   ? "border-emerald-200 text-emerald-700 bg-emerald-50" :
	                          "border-slate-200 text-slate-700 bg-slate-50";

	  return `<span data-action="toggle-estado" data-id="${id}" 
	           class="cursor-pointer inline-flex items-center px-2.5 py-1 rounded-full text-[12px] font-bold border ${cls}">
	           ${e}
	         </span>`;
	}

	// === FILTROS ===
	function getPedidosFiltrados() {
	  let arr = [...pedidos];

	  const estVal = (filEstado?.value || "").trim().toUpperCase();
	  if (estVal) arr = arr.filter(p => String(p.estado).toUpperCase() === estVal);

	  if (filMes.value) {
	    const [y, m] = filMes.value.split("-").map(Number);
	    arr = arr.filter(p => {
	      const f = parseFechaISO(p.fechaEntrega);
	      return f.getUTCFullYear() === y && (f.getUTCMonth() + 1) === m;
	    });
	  }

	  return arr;
	}

	// === RENDER ===
	function renderPedidos() {
	  const tbody = document.getElementById("tbodyPedidos");
	  tbody.innerHTML = ""; // limpiar todo

	  const filtrados = getPedidosFiltrados();

	  if (filtrados.length === 0) {
	    const empty = document.createElement("div");
	    empty.className = "text-center text-slate-500 py-10";
	    empty.textContent = "No hay pedidos cargados para el período seleccionado.";
	    tbody.appendChild(empty);
	  } else {
	    filtrados.forEach(p => {
	      const row = document.createElement("div");
	      row.className = `
	        grid grid-cols-[1.1fr_1.3fr_1.2fr_1fr_.9fr_110px]
	        items-center gap-10 bg-slate-200 rounded-2xl px-4 py-3
	        div-item
	       
	      `;

	      row.innerHTML = `
	        <div>${parseFechaISO(p.fechaEntrega).toLocaleDateString("es-AR")}</div>
	        <div>${p.cliente}</div>
	        <div>
	          <button class="js-ver-detalle inline-flex items-center gap-1 text-emerald-700 font-semibold hover:text-emerald-900 hover:underline transition" data-id="${p.idPedido}">
	            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
	              <path d="M15 12H3m12 0l-4-4m4 4l-4 4"/>
	            </svg>
	            Ver detalle
	          </button>
	        </div>
	        <div>${estadoToBadge(p.estado, p.idPedido)}</div>
	        <div class="text-right pr-4 border-r border-slate-400">${money(p.total ?? 0)}</div>
	        <div class="flex items-center justify-center gap-2">
			<button 
			      class="js-editar-pedido inline-grid place-items-center w-9 h-9 rounded-xl border border-slate-300 bg-white hover:bg-slate-50" 
			      data-id="${p.idPedido}" 
			      title="Editar">
			      <svg class="w-4 h-4 text-emerald-700" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
			        <path d="M12 20h9" />
			        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
			      </svg>
			    </button>
	          <button data-action="delete-pedido" data-id="${p.idPedido}" class="inline-grid place-items-center w-9 h-9 rounded-xl border border-slate-300 bg-white hover:bg-slate-50" title="Eliminar">🗑</button>
	        </div>
	      `;

	      tbody.appendChild(row);
	    });
	  }

	  lblTotalPedidos.textContent = filtrados.length;
	}


	function siguienteEstado(actual) {
	  const e = String(actual || "").toUpperCase();
	  if (e === "PENDIENTE") return "EN PROCESO";
	  if (e === "EN PROCESO") return "ENTREGADO";
	  return null; // ENTREGADO ya no cambia
	}

	tbodyPedidos.addEventListener("click", async e => {
	  const badge = e.target.closest("[data-action='toggle-estado']");
	  if (!badge) return;

	  const pedidoId = badge.dataset.id;
	  const pedido = pedidos.find(p => String(p.idPedido) === String(pedidoId));
	  if (!pedido) return;

	  const nuevo = siguienteEstado(pedido.estado);
	  if (!nuevo) return; // ya está en ENTREGADO

	  sonidoEstado?.play();

	  // Convertir estado a formato esperado por backend
	  const estadoURL = nuevo.toLowerCase().replace(" ", "_"); // ej: "EN PROCESO" → "en_proceso"

	  const res = await fetch(`${API_BASE}/pedido/${pedidoId}/${estadoURL}`, {
	    method: "PUT"
	  });

	  if (res.ok) {
	    pedido.estado = nuevo;
	    renderPedidos(); // actualiza y aplica filtro
	  } else {
	    console.error("Error al actualizar estado:", res.status);
	    Swal.fire("Error", "No se pudo actualizar el estado del pedido", "error");
	  }
	});
	
	// === EDITAR ===
	tbodyPedidos.addEventListener("click", (e) => {
	  const btnEditar = e.target.closest(".js-editar-pedido");
	  if (!btnEditar) return;

	  const pedidoId = btnEditar.dataset.id;

	  // 1) Mostrar la vista de edición
	  showView("pedido-editar");

	  // 2) Guardar el id actual en una variable global
	  window.pedidoEditId = pedidoId;

	  // 3) Llamar a la función que carga los datos
	  cargarPedidoEditar(pedidoId);
	});

	// === DELETE ===
	tbodyPedidos.addEventListener("click", async e => {
	  const btn = e.target.closest("[data-action='delete-pedido']");
	  if (!btn) return;

	  const pedidoId = btn.dataset.id; // ← este es el idPedido real

	  const confirm = await Swal.fire({
	    title: "¿Eliminar pedido?",
	    text: "Esta acción no se puede deshacer",
	    icon: "warning",
	    showCancelButton: true,
	    confirmButtonColor: "#d33",
	    cancelButtonColor: "#3085d6",
	    confirmButtonText: "Sí, eliminar",
	    cancelButtonText: "Cancelar"
	  });
	  if (!confirm.isConfirmed) return;

	  const res = await fetch(`${API_BASE}/pedido/${pedidoId}`, { method: "DELETE" });
	  if (res.ok) {
	    pedidos = pedidos.filter(p => String(p.idPedido) !== String(pedidoId)); // ← corregido
	    renderPedidos();
	    Swal.fire("Eliminado", "El pedido fue eliminado.", "success");
	  } else {
	    Swal.fire("Error", "No se pudo eliminar el pedido", "error");
	  }
	});
	
	async function cargarPedidoEditar(id) {
	  const res = await fetch(`/api/v1/pedido/producto/${id}`);
	  const data = await res.json();

	  document.getElementById("epCliente").value = data.cliente;
	  document.getElementById("epFecha").value = data.fechaEntrega;

	  const epItemsBody = document.getElementById("epItemsBody");
	  epItemsBody.innerHTML = "";
	  const tpl = document.getElementById("epRowTpl");

	  (data.items || []).forEach(item => {
	    const tr = tpl.cloneNode(true);
	    tr.id = "";
	    tr.classList.remove("hidden");

	    tr.querySelector('[data-role="name"]').value = item.nombre;
	    tr.querySelector('[data-role="qty"]').value = item.cantidad;
	    tr.querySelector('[data-role="price"]').value = item.precio;
	    tr.querySelector('[data-role="subtotal"]').textContent =
	      `$ ${(item.cantidad * item.precio).toLocaleString("es-AR", { minimumFractionDigits: 2 })}`;

	    epItemsBody.appendChild(tr);
	  });

	  window.pedidoEditId = id; // guardás el id para el PUT
	}

	// === FILTROS ===
	filMes.addEventListener("change", renderPedidos);
	filEstado.addEventListener("change", renderPedidos);

	// === NUEVO PEDIDO ===
	btnAgregarPedido?.addEventListener("click", e => {
	  e.preventDefault();
	  if (window.NuevoPedido) window.NuevoPedido.reset();
	  showView("pedido-nuevo");
	  try { history.pushState({ v: "pedido-nuevo" }, "", "#pedido-nuevo"); } catch {}
	});
	
  fetchPedidos(); // o lo que uses para arrancar
}
window.initPedidos = initPedidos; // lo exponés al global

