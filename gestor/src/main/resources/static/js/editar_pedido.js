function initEditarPedido() {
  const API_BASE = "/api/v1";

  const epCliente = document.getElementById("epCliente");
  const epFecha = document.getElementById("epFecha");
  const epItemsBody = document.getElementById("epItemsBody");
  const epSubtotalText = document.getElementById("epSubtotalText");
  const epTotalText = document.getElementById("epTotalText");
  const epGuardar = document.getElementById("epGuardar");
  const epCancelar = document.getElementById("epCancelar");

  let pedidoActualId = null;

  // 👉 Cargar pedido en la vista de edición
  async function cargarPedidoEditar(id) {
    pedidoActualId = id;
    showView("pedido-editar");
    try { history.pushState({ v: "pedido-editar" }, "", "#pedido-editar"); } catch {}

    const res = await fetch(`${API_BASE}/pedido/producto/${id}`);
    const data = await res.json();

    // Pintar datos
    epCliente.value = data.cliente;
    epFecha.value = data.fechaEntrega;

    epItemsBody.innerHTML = "";
    data.items.forEach(item => {
      const tr = document.getElementById("epRowTpl").cloneNode(true);
      tr.id = "";
      tr.classList.remove("hidden");

      tr.querySelector('[data-role="name"]').value = item.nombre;
      tr.querySelector('[data-role="qty"]').value = item.cantidad;
      tr.querySelector('[data-role="price"]').value = item.precio;
      tr.querySelector('[data-role="subtotal"]').textContent =
        `$ ${ (item.cantidad * item.precio).toLocaleString("es-AR", { minimumFractionDigits: 2 }) }`;

      epItemsBody.appendChild(tr);
    });

    recalcularTotales();
  }

  // 👉 Recalcular totales
  function recalcularTotales() {
    let subtotal = 0;
    epItemsBody.querySelectorAll("tr").forEach(tr => {
      const qty = Number(tr.querySelector('[data-role="qty"]').value);
      const price = Number(tr.querySelector('[data-role="price"]').value);
      const sub = qty * price;
      subtotal += sub;
      tr.querySelector('[data-role="subtotal"]').textContent =
        `$ ${sub.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`;
    });
    epSubtotalText.textContent = `$ ${subtotal.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`;
    epTotalText.textContent = epSubtotalText.textContent;
  }

  // 👉 Guardar cambios
  epGuardar.addEventListener("click", async () => {
    if (!pedidoActualId) return;

    const payload = {
      cliente: epCliente.value, // aunque sea readonly, lo mandamos
      fechaEntrega: epFecha.value,
      items: []
    };

    epItemsBody.querySelectorAll("tr").forEach(tr => {
      payload.items.push({
        nombre: tr.querySelector('[data-role="name"]').value,
        cantidad: Number(tr.querySelector('[data-role="qty"]').value),
        precio: Number(tr.querySelector('[data-role="price"]').value)
      });
    });

    try {
      const res = await fetch(`${API_BASE}/pedido/${pedidoActualId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        Swal.fire("Guardado", "El pedido fue actualizado correctamente.", "success");
        showView("pedidos"); // volver a la lista
      } else {
        Swal.fire("Error", "No se pudo actualizar el pedido.", "error");
      }
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Hubo un problema de red al guardar.", "error");
    }
  });

  // 👉 Cancelar
  epCancelar.addEventListener("click", () => {
    showView("pedidos");
  });

  // 👉 Delegar recalculo en inputs
  epItemsBody.addEventListener("input", e => {
    if (e.target.matches('[data-role="qty"], [data-role="price"]')) {
      recalcularTotales();
    }
  });

  // Exponer función global para abrir edición
  window.cargarPedidoEditar = cargarPedidoEditar;
}
