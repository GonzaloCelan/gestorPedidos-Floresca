(() => {
  const API_BASE = "/api/v1";

  const btnAgregarVenta = document.getElementById("btnAgregarVenta");
  const btnGuardar = document.getElementById("nvGuardar");
  const btnCancelar = document.getElementById("nvCancelar");
  const msg = document.getElementById("nvMsg");

  // Navegar a nueva venta
  btnAgregarVenta?.addEventListener("click", e => {
    e.preventDefault();
    showView("venta-nueva");
    try { history.pushState({ v: "venta-nueva" }, "", "#venta-nueva"); } catch {}
  });

  // Helpers de items y totales
  const btnAddItem = document.getElementById("nvAddItem");
  const body = document.getElementById("nvItemsBody");
  const tpl = document.getElementById("nvRowTpl");
  const subtotalText = document.getElementById("nvSubtotalText");
  const totalText = document.getElementById("nvTotalText");

  function actualizarTotales() {
    let subtotal = 0;
    body.querySelectorAll("tr").forEach(tr => {
      const qty = Number(tr.querySelector("[data-role='qty']")?.value || 0);
      const price = Number(tr.querySelector("[data-role='price']")?.value || 0);
      const sub = qty * price;
      subtotal += sub;
      const cell = tr.querySelector("[data-role='subtotal']");
      if (cell) cell.textContent = `$ ${sub.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`;
    });
    subtotalText.textContent = `$ ${subtotal.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`;
    totalText.textContent = subtotalText.textContent; // total = subtotal
  }

  btnAddItem?.addEventListener("click", () => {
    if (!tpl || !body) return;
    const clone = tpl.cloneNode(true);
    clone.id = "";
    clone.classList.remove("hidden");
    body.appendChild(clone);
    actualizarTotales();
  });

  body?.addEventListener("click", e => {
    const btn = e.target.closest("[data-action='del-row']");
    if (btn) {
      btn.closest("tr")?.remove();
      actualizarTotales();
    }
  });

  body?.addEventListener("input", e => {
    if (e.target.matches("[data-role='qty'], [data-role='price']")) {
      actualizarTotales();
    }
  });
  
  function resetNuevaVenta() {
    document.getElementById("nvCliente").value = "";
    document.getElementById("nvFecha").value = "";
    document.getElementById("nvTipo").value = "pedido"; // valor por defecto
    document.getElementById("nvItemsBody").innerHTML = "";
    document.getElementById("nvSubtotalText").textContent = "$ 0,00";
    document.getElementById("nvTotalText").textContent = "$ 0,00";
    document.getElementById("nvMsg").classList.add("hidden");
  }

  // Guardar venta → POST /api/v1/pedido con tipoVenta y items mapeados
  btnGuardar?.addEventListener("click", async () => {
    const cliente = document.getElementById("nvCliente")?.value.trim();
    const fechaEntrega = document.getElementById("nvFecha")?.value; // YYYY-MM-DD
    const tipoVenta = document.getElementById("nvTipo")?.value;

    // Construir items como espera el backend
    const items = [];
    body?.querySelectorAll("tr").forEach(tr => {
      const producto = tr.querySelector("[data-role='name']")?.value.trim();
      const cantidad = Number(tr.querySelector("[data-role='qty']")?.value || 0);
      const precioUnitario = Number(tr.querySelector("[data-role='price']")?.value || 0);
      const subTotal = cantidad * precioUnitario;

      if (producto && cantidad > 0) {
        items.push({ producto, cantidad, precioUnitario, subTotal });
      }
    });

    if (!cliente || !fechaEntrega || !tipoVenta || items.length === 0) {
      msg.textContent = "Completa cliente, fecha, tipo y al menos un ítem antes de guardar.";
      msg.classList.remove("hidden");
      msg.classList.add("text-red-600");
      return;
    }

    const payload = {
      cliente,
      fechaEntrega,
      estado: "ENTREGADO", // venta ya entregada
      tipoVenta,           // ← corregido: tipoVenta
      items                // ← corregido: producto, cantidad, precioUnitario, subTotal
    };

    console.log("Payload venta:", payload);

    try {
      const res = await fetch(`${API_BASE}/pedido`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const ct = res.headers.get("Content-Type") || "";
      const serverData = ct.includes("application/json")
        ? await res.json().catch(() => null)
        : await res.text().catch(() => null);

      if (!res.ok) {
        console.error("POST /pedido fallo:", res.status, serverData);
        msg.textContent = `Error al guardar la venta (HTTP ${res.status}). ${typeof serverData === "string" ? serverData : (serverData?.message || "Ver consola")}`;
        msg.classList.remove("hidden", "text-green-600");
        msg.classList.add("text-red-600");
        return;
      }

      msg.textContent = "Venta guardada correctamente ✅";
      msg.classList.remove("hidden", "text-red-600");
      msg.classList.add("text-green-600");
	  resetNuevaVenta(); // 👉 limpiar formulario
      setTimeout(() => {
        showView("historial");
        try { history.pushState({ v: "historial" }, "", "#historial"); } catch {}
      }, 500);
    } catch (err) {
      console.error("Error de red en POST /pedido:", err);
      msg.textContent = "Error de red al guardar la venta ❌. Revisá que el servidor esté arriba y la ruta sea correcta.";
      msg.classList.remove("hidden", "text-green-600");
      msg.classList.add("text-red-600");
    }
  });

  // Cancelar → volver a ventas
  btnCancelar?.addEventListener("click", e => {
    e.preventDefault();
    showView("historial");
    try { history.pushState({ v: "historial" }, "", "#historial"); } catch {}
  });
})();

