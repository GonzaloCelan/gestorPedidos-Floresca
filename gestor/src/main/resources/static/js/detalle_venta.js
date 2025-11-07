// === Función global para ver detalle de venta ===
async function verDetalleVenta(pedidoId) {
	
	const viewDetalle = document.getElementById("view-venta-detalle"); 
	const btnVolverVentas = document.getElementById("btnVolverVenta"); 
	const ventaItemsBody = document.getElementById("ventaItemsBody"); 
	const ventaSubtotalText = document.getElementById("ventaSubtotalText"); 
	const ventaTotalText = document.getElementById("ventaTotalText"); 
	 const metaCliente = viewDetalle.querySelector("[data-meta='cliente']"); 
	const metaFecha = viewDetalle.querySelector("[data-meta='fecha']");
	const metaTipoPedido = viewDetalle.querySelector("[data-meta='tipoPedido']");
	
	const API_BASE = "/api/v1"; 
	
	function money(valor) { return `$ ${Number(valor).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
  try {
    const resDetalle = await fetch(`${API_BASE}/pedido/detalle/${pedidoId}`);
    if (!resDetalle.ok) throw new Error("Respuesta no OK: " + resDetalle.status);

	const detalle = await resDetalle.json();

	    // Pintar metadatos
	    metaCliente.textContent = detalle?.cliente || "—";
	    metaFecha.textContent = detalle?.fechaEntrega
	      ? new Date(detalle.fechaEntrega).toLocaleDateString("es-AR")
	      : "—";
		metaTipoPedido.textContent = detalle?.tipoVenta || "—";

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

    showView("venta-detalle");
    try { history.pushState({ v: "venta-detalle" }, "", "#venta-detalle"); } catch {}
  } catch (err) {
    console.error("Error cargando detalle:", err);
    Swal.fire("Error", "No se pudo cargar el detalle del pedido", "error");
  }
  
   btnVolverVentas?.addEventListener("click", () => 
	{ showView("historial"); try { history.pushState({ v: "historial" }, "", "#historial"); } 
   catch {} });
}

// Exponerla al global
window.verDetalleVenta = verDetalleVenta;