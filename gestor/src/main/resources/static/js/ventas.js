// Init
function initVentas() {
  const API_BASE = "/api/v1";

  const tbody = document.getElementById("ventasTbody");
  const lblTotalPedidos = document.getElementById("TotalPedidos-ventas");
  const filMes = document.getElementById("filMes-ventas");
  const filAnio = document.getElementById("filAnio-ventas");
  const filTipo = document.getElementById("filTipo-ventas");

  // KPIs
  const lblGananciaMensual = document.querySelector(".kpi-card:nth-child(1) p");
  const kpiGananciaMensual = document.querySelector(".kpi-card:nth-child(1) h2");
  const kpiGananciaTotal = document.querySelector(".kpi-card:nth-child(2) h2");
  const kpiBalanceMonto = document.getElementById("kpi-balance-monto");
  const kpiBalance = document.getElementById("kpi-balance");

  let ventas = [];

  async function fetchVentas() {
    const res = await fetch(`${API_BASE}/ventas`);
    ventas = await res.json();

    // Ganancia total acumulada (fija, no depende de filtros)
    const totalGeneral = ventas.reduce((acc, v) => acc + Number(v.total), 0);
    kpiGananciaTotal.textContent = `$ ${totalGeneral.toLocaleString("es-AR")}`;

    fillAnios();
    renderVentas(); // pinta todos por defecto
  }

  function parseFecha(fechaStr) {
    const [y, m, d] = fechaStr.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d));
  }

  function nombreMes(m0) {
    return ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"][m0];
  }

  function getVentasFiltradas() {
    return ventas.filter(v => {
      const f = parseFecha(v.fechaEntrega);
      const mesSel = filMes.value ? filMes.value.split("-").map(Number) : null;
      const anioSel = filAnio.value ? Number(filAnio.value) : null;
      const tipoSel = filTipo.value;

      let ok = true;
      if (mesSel) {
        const [ySel, mSel] = mesSel;
        ok = ok && f.getUTCFullYear() === ySel && (f.getUTCMonth() + 1) === mSel;
      }
      if (anioSel) {
        ok = ok && f.getUTCFullYear() === anioSel;
      }
      if (tipoSel) {
        ok = ok && v.tipoVenta === tipoSel;
      }
      return ok;
    });
  }

  function renderVentas() {
    tbody.querySelectorAll("tr:not(#ventas-empty)").forEach(tr => tr.remove());

    const filtradas = getVentasFiltradas();

    if (filtradas.length === 0) {
      document.getElementById("ventas-empty").classList.remove("hidden");
    } else {
      document.getElementById("ventas-empty").classList.add("hidden");

      filtradas.forEach(v => {
        const fecha = parseFecha(v.fechaEntrega);
        const tr = document.createElement("tr");
        tr.className = "hover:bg-slate-50/40";
        tr.dataset.id = v.idVenta;

        tr.innerHTML = `
          <td class="px-5 py-3 whitespace-nowrap">${fecha.toLocaleDateString("es-AR")}</td>
          <td class="px-5 py-3 whitespace-nowrap">${v.cliente}</td>
          <td class="px-5 py-3">
            <span class="inline-flex rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold px-2 py-0.5">
              ${v.tipoVenta}
            </span>
          </td>
          <td class="px-5 py-3">
            <button class="js-ver-detalle-venta inline-flex items-center gap-1 text-emerald-700 font-semibold hover:text-emerald-900 hover:underline transition"
                    data-id="${v.idPedido}">
              Ver detalle
            </button>
          </td>
          <td class="px-5 py-3 text-right tabular-nums">$ ${Number(v.total).toLocaleString("es-AR")}</td>
          <td class="px-5 py-3">
            <button class="btn-delete inline-grid place-items-center w-9 h-9 rounded-xl border border-slate-300 bg-white hover:bg-slate-50"
                    title="Eliminar" data-id="${v.idVenta}">
              🗑
            </button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    }

    lblTotalPedidos.textContent = filtradas.length;
    updateKPIs(filtradas);
  }

  function updateKPIs(filtradas) {
    let yRef, mRef0;
    if (filMes.value) {
      const [y, m] = filMes.value.split("-").map(Number);
      yRef = y;
      mRef0 = m - 1;
    } else {
      const now = new Date();
      yRef = now.getUTCFullYear();
      mRef0 = now.getUTCMonth();
    }

    lblGananciaMensual.textContent = `Ganancia mensual de ${nombreMes(mRef0)} ${yRef}`;

    const ventasMes = filtradas.filter(v => {
      const f = parseFecha(v.fechaEntrega);
      return f.getUTCFullYear() === yRef && f.getUTCMonth() === mRef0;
    });
    const totalMes = ventasMes.reduce((acc, v) => acc + Number(v.total), 0);
    kpiGananciaMensual.textContent = `$ ${totalMes.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`;

    const mesParam = `${yRef}-${String(mRef0 + 1).padStart(2, "0")}`;
    fetch(`${API_BASE}/ventas/balance/${mesParam}`)
      .then(r => r.json())
      .then(data => {
        const balance = Number(data.balance ?? data);
        const porcentaje = Number(data.porcentaje ?? 0);

        // Texto con signo y dos decimales
        const balanceStr = balance.toLocaleString("es-AR", { minimumFractionDigits: 2 });
        kpiBalanceMonto.textContent = `${balance < 0 ? "- " : "+ "}$ ${balanceStr.replace("-", "")}`;

		// Colorear monto
		kpiBalance.classList.remove("balance-positivo", "balance-negativo");

        // Colorear monto
        if (balance >= 0) {
          kpiBalance.classList.add("balance-positivo");
       } else {
          kpiBalance.classList.add("balance-negativo");
       }

      });
  }


  function fillAnios() {
    const anios = [...new Set(ventas.map(v => parseFecha(v.fechaEntrega).getUTCFullYear()))].sort((a,b) => a - b);
    filAnio.innerHTML = `<option value="">Todos</option>` + anios.map(a => `<option value="${a}">${a}</option>`).join("");
  }


  
  // Eventos
  [filMes, filAnio, filTipo].forEach(el => el.addEventListener("change", renderVentas));

  tbody.addEventListener("click", async e => {
    // Eliminar
    const del = e.target.closest(".btn-delete");
    if (del) {
      const id = del.dataset.id;

      const confirm = await Swal.fire({
        title: "¿Eliminar venta?",
        text: "Esta acción no se puede deshacer",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
        confirmButtonText: "Sí, eliminar",
        cancelButtonText: "Cancelar"
      });

      if (!confirm.isConfirmed) return;

      try {
        const res = await fetch(`${API_BASE}/ventas/${id}`, { method: "DELETE" });
        if (res.ok) {
          ventas = ventas.filter(v => v.idVenta != id);
          renderVentas();
          Swal.fire("Eliminado", "La venta fue eliminada correctamente.", "success");
        } else {
          Swal.fire("Error", "No se pudo eliminar la venta.", "error");
        }
      } catch (err) {
        console.error(err);
        Swal.fire("Error", "Hubo un problema de red al eliminar.", "error");
      }
      return;
    }

    // Ver detalle
    const verVenta = e.target.closest(".js-ver-detalle-venta");
    if (verVenta) {
      const pedidoId = verVenta.dataset.id;
      if (!pedidoId) return;

      showView("detalle-venta"); // 👈 siempre la vista correcta
      try { history.pushState({ v: "detalle-venta" }, "", "#detalle-venta"); } catch {}

      cargarYRenderDetalle(pedidoId); // 👈 misma función que usás en pedidos
    }
  });

  fetchVentas();
}

window.initVentas = initVentas;



