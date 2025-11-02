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
  const btn = e.target.closest(".js-ver-detalle");
  if (!btn) return;

  const pedidoId = btn.dataset.id;
  if (!pedidoId) return;

  try {
    // 🔹 Fetch de productos
    const resItems = await fetch(`${API_BASE}/pedido/producto/${pedidoId}`);
    if (!resItems.ok) throw new Error("Error al cargar productos");

    const items = await resItems.json();

    // 🔹 Fetch de metadatos del pedido
    const resDatos = await fetch(`${API_BASE}/pedido/datos/${pedidoId}`);
    if (!resDatos.ok) throw new Error("Error al cargar datos del pedido");

    const datos = await resDatos.json();

    // Pintar metadatos
    metaCliente.textContent = datos?.cliente || "—";
    metaFecha.textContent = datos?.fechaEntrega
      ? new Date(datos.fechaEntrega).toLocaleDateString("es-AR")
      : "—";

    // Pintar tabla de productos
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
    ventaTotalText.textContent = money(subtotal);

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
