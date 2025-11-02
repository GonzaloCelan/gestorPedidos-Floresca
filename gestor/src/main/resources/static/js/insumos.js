
// ================== INIT ==================
function initInsumos() {
	
	const API_BASE = "/api/v1";

	const tbodyMat = document.getElementById("mat-tbody");
	const tplMat = document.getElementById("row-material-template");
	const emptyMat = document.getElementById("mat-empty");

	// KPIs
	const kpiMensual = document.getElementById("kpi-invertido-mensual");
	const kpiMensualLabel = document.querySelector(".kpi-card-materiales p");
	const kpiUltimaMonto = document.getElementById("kpi-ultima-monto");
	const kpiUltimaMeta = document.querySelector("[data-kpi-meta='ultima']");

	// Formulario
	const formMat = document.getElementById("form-material");
	const btnGuardar = document.querySelector("[data-action='save-material']");

	// Filtros
	const filSearch = document.getElementById("mat-search");
	const filMonth = document.getElementById("mat-month");

	let insumos = [];

	function money(n) {
	  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(Number(n) || 0);
	}

	// LocalDate "YYYY-MM-DD" a Date UTC (evita desfaces por zona horaria)
	function parseFechaISO(fechaStr) {
	  const [y, m, d] = String(fechaStr).split("-").map(Number);
	  return new Date(Date.UTC(y, (m || 1) - 1, d || 1));
	}

	function nombreMes(m0) {
	  return ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"][m0];
	}

	// ================== FETCH ==================
	async function fetchInsumos() {
	  const res = await fetch(`${API_BASE}/insumos`);
	  insumos = await res.json();

	  // Ordenar por fecha descendente
	  insumos.sort((a, b) => parseFechaISO(b.fecha) - parseFechaISO(a.fecha));

	  // Por defecto: fijar el mes actual en el filtro
	  const now = new Date();
	  filMonth.value = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

	  renderInsumos();
	}

	// ================== RENDER ==================
	function renderInsumos() {
	  // Limpia todas las filas de datos (incluye la demo), preserva template y fila vacía
	  tbodyMat.querySelectorAll("tr:not(#row-material-template):not(#mat-empty)").forEach(tr => tr.remove());

	  const filtradas = getInsumosFiltrados();

	  if (filtradas.length === 0) {
	    emptyMat.classList.remove("hidden");
	  } else {
	    emptyMat.classList.add("hidden");
	    filtradas.forEach(ins => {
	      const tr = tplMat.cloneNode(true);
	      tr.id = "";
	      tr.classList.remove("hidden");
	      tr.dataset.id = ins.id;

	      const f = parseFechaISO(ins.fecha);
	      tr.querySelector("[data-cell='fecha']").textContent = f.toLocaleDateString("es-AR");
	      tr.querySelector("[data-cell='material']").textContent = ins.material;
	      tr.querySelector("[data-cell='cantidad']").textContent = Number(ins.cantidad);
	      tr.querySelector("[data-cell='precioUnit']").textContent = money(ins.precioUnitario);
	      tr.querySelector("[data-cell='total']").textContent = money(ins.precioTotal);
	      tr.querySelector("[data-cell='proveedor']").textContent = ins.proveedor || "—";
	      tr.querySelector("[data-action='delete-material']").dataset.id = ins.id;

	      tbodyMat.appendChild(tr);
	    });
	  }

	  updateKPIs(filtradas);
	}

	function getInsumosFiltrados() {
	  let arr = [...insumos];

	  // Filtro por texto
	  const q = filSearch.value.trim().toLowerCase();
	  if (q) {
	    arr = arr.filter(i =>
	      (i.material && i.material.toLowerCase().includes(q)) ||
	      (i.proveedor && i.proveedor.toLowerCase().includes(q))
	    );
	  }

	  // Filtro por mes (YYYY-MM)
	  if (filMonth.value) {
	    const [y, m] = filMonth.value.split("-").map(Number);
	    arr = arr.filter(i => {
	      const f = parseFechaISO(i.fecha);
	      return f.getUTCFullYear() === y && (f.getUTCMonth() + 1) === m;
	    });
	  }

	  // Ordenar por fecha descendente dentro del conjunto visible
	  arr.sort((a, b) => parseFechaISO(b.fecha) - parseFechaISO(a.fecha));

	  return arr;
	}

	// ================== KPIs ==================
	function updateKPIs(arr) {
	  let yRef, mRef0;
	  if (filMonth.value) {
	    const [y, m] = filMonth.value.split("-").map(Number);
	    yRef = y; mRef0 = m - 1;
	  } else {
	    const now = new Date();
	    yRef = now.getUTCFullYear(); mRef0 = now.getUTCMonth();
	  }

	  // Label KPI: Gasto del mes Octubre 2025
	  kpiMensualLabel.textContent = `Gasto del mes ${nombreMes(mRef0)} ${yRef}`;

	  const insumosMes = arr.filter(i => {
	    const f = parseFechaISO(i.fecha);
	    return f.getUTCFullYear() === yRef && f.getUTCMonth() === mRef0;
	  });

	  const totalMes = insumosMes.reduce((acc, i) => acc + Number(i.precioTotal), 0);
	  kpiMensual.textContent = money(totalMes);

	  if (arr.length > 0) {
	    const ultima = arr.reduce((a, b) => parseFechaISO(a.fecha) > parseFechaISO(b.fecha) ? a : b);
	    kpiUltimaMonto.textContent = money(ultima.precioTotal);
	    const f = parseFechaISO(ultima.fecha);
	    kpiUltimaMeta.textContent = `${f.toLocaleDateString("es-AR")} - ${ultima.material}`;
	  } else {
	    kpiUltimaMonto.textContent = "—";
	    kpiUltimaMeta.textContent = "";
	  }
	}

	// ================== GUARDAR ==================
	btnGuardar.addEventListener("click", async () => {
	  const cantidad = Number(document.getElementById("mat-cantidad").value);
	  const precioUnitario = Number(document.getElementById("mat-precio").value);
	  const data = {
	    fecha: document.getElementById("mat-fecha").value, // YYYY-MM-DD
	    material: document.getElementById("mat-nombre").value,
	    cantidad,
	    proveedor: document.getElementById("mat-proveedor").value,
	    precioUnitario,
	    precioTotal: cantidad * precioUnitario
	  };

	  const res = await fetch(`${API_BASE}/insumo`, {
	    method: "POST",
	    headers: { "Content-Type": "application/json" },
	    body: JSON.stringify(data)
	  });

	  if (res.ok) {
	    await fetchInsumos(); // recarga datos y repinta
	    formMat.reset();
	    // Mantener filtro del mes actual después del reset
	    const now = new Date();
	    filMonth.value = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
	    renderInsumos();
	    Swal?.fire("Guardado", "El insumo fue registrado.", "success");
	  } else {
	    Swal?.fire("Error", "No se pudo guardar el insumo.", "error");
	  }
	});

	// ================== ELIMINAR (SweetAlert2) ==================
	tbodyMat.addEventListener("click", async e => {
	  const btn = e.target.closest("[data-action='delete-material']");
	  if (!btn) return;
	  const id = btn.dataset.id;

	  const confirm = Swal
	    ? await Swal.fire({
	        title: "¿Eliminar insumo?",
	        text: "Esta acción no se puede deshacer",
	        icon: "warning",
	        showCancelButton: true,
	        confirmButtonColor: "#d33",
	        cancelButtonColor: "#3085d6",
	        confirmButtonText: "Sí, eliminar",
	        cancelButtonText: "Cancelar"
	      })
	    : { isConfirmed: confirm("¿Eliminar insumo?") };

	  if (!confirm.isConfirmed) return;

	  const res = await fetch(`${API_BASE}/insumo/${id}`, { method: "DELETE" });
	  if (res.ok) {
	    // Vuelve a traer del backend para asegurar consistencia y refresca todo
	    await fetchInsumos();
	    Swal?.fire("Eliminado", "El insumo fue eliminado.", "success");
	  } else {
	    Swal?.fire("Error", "No se pudo eliminar el insumo.", "error");
	  }
	});

	// ================== FILTROS ==================
	// type=month funciona mejor con "change"; el buscador con "input"
	filSearch.addEventListener("input", renderInsumos);
	filMonth.addEventListener("change", renderInsumos);

	
  fetchInsumos();
}
window.initInsumos = initInsumos;