// Elementos de la vista detalle
const viewDetalle = document.getElementById("view-pedido-detalle");
const btnVolverPedidos = document.getElementById("btnVolverPedidos");
const ventaItemsBody = document.getElementById("pedidoItemsBody");
const ventaSubtotalText = document.getElementById("pedidoSubtotalText");
const ventaTotalText = document.getElementById("pedidoTotalText");

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
  const btn = e.target.closest(".js-ver-detalle-pedido");
  if (!btn) return;

  const pedidoId = btn.dataset.id;
  if (!pedidoId) return;

  try {
    // 🔹 Fetch único al detalle
    const resDetalle = await fetch(`${API_BASE}/pedido/detalle/${pedidoId}`);
    if (!resDetalle.ok) throw new Error("Error al cargar detalle del pedido");

    const detalle = await resDetalle.json();

    // Pintar metadatos
    metaCliente.textContent = detalle?.cliente || "—";
    metaFecha.textContent = detalle?.fechaEntrega
      ? new Date(detalle.fechaEntrega).toLocaleDateString("es-AR")
      : "—";

    // Pintar tabla de productos
    ventaItemsBody.innerHTML = "";
    let subtotal = 0;
    detalle.items.forEach(it => {
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
    ventaTotalText.textContent = money(subtotal);

    showView("pedido-detalle");
    try { history.pushState({ v: "pedido-detalle" }, "", "#pedido-detalle"); } catch {}
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
