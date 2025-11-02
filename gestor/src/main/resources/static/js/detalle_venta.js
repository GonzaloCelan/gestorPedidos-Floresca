// Elementos de la vista detalle
const viewDetalle = document.getElementById("view-venta-detalle");
const btnVolverPedidos = document.getElementById("btnVolverPedidos");
const ventaItemsBody = document.getElementById("ventaItemsBody");
const ventaSubtotalText = document.getElementById("ventaSubtotalText");
const ventaTotalText = document.getElementById("ventaTotalText");

// Metadatos
const metaCliente = viewDetalle.querySelector("[data-meta='cliente']");
const metaFecha   = viewDetalle.querySelector("[data-meta='fecha']");

const API_BASE = "/api/v1";

function money(valor) {
  return `$ ${Number(valor).toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

tbodyPedidos.addEventListener("click", async e => {
  const btn = e.target.closest(".js-ver-detalle-venta");
  if (!btn) return;

  const pedidoId = btn.dataset.id; // <-- idPedido real
  if (!pedidoId) return;

  try {
    const res = await fetch(`${API_BASE}/pedido/producto/${pedidoId}`);
    if (!res.ok) throw new Error("Respuesta no OK: " + res.status);

    const items = await res.json(); // array de productos
    const pedido = items.find(p => String(p.idPedido) === String(pedidoId));

    metaCliente.textContent = pedido?.cliente || "—";
    metaFecha.textContent   = pedido ? new Date(pedido.fechaEntrega).toLocaleDateString("es-AR") : "—";

    ventaItemsBody.innerHTML = "";
    let subtotal = 0;
    items.forEach(it => {
      subtotal += it.subTotal;
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="px-5 py-2">${it.producto}</td>
        <td class="text-center px-3 py-2">${it.cantidad}</td>
        <td class="text-right px-3 py-2">${money(it.precioUnitario)}</td>
        <td class="text-right px-5 py-2">${money(it.subTotal)}</td>
      `;
      ventaItemsBody.appendChild(tr);
    });

    ventaSubtotalText.textContent = money(subtotal);
    ventaTotalText.textContent    = money(subtotal);

    showView("venta-detalle");
    try { history.pushState({ v: "venta-detalle" }, "", "#venta-detalle"); } catch {}
  } catch (err) {
    console.error("Error cargando detalle:", err);
    Swal.fire("Error", "No se pudo cargar el detalle del pedido", "error");
  }
});


// === Volver a pedidos ===
btnVolverPedidos?.addEventListener("click", () => {
  showView("dashboard");
  try { history.pushState({ v: "dashboard" }, "", "#dashboard"); } catch {}
});

