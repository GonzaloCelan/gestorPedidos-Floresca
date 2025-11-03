// /js/nuevo_pedido.js
(() => {
  const $  = (s, r=document) => r.querySelector(s);
  const sonidoCrear = document.getElementById("sonido-crear");
  
  function money(n) {
    return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(Number(n) || 0);
  }
  function toNum(v) {
    if (typeof v === "number") return v;
    if (!v) return 0;
    const s = String(v).trim().replace(/\./g,'').replace(',', '.');
    const n = parseFloat(s);
    return isFinite(n) ? n : 0;
  }

  const view = document.getElementById("view-pedido-nuevo");
  const els = {
    cliente: $('#npCliente', view),
    fecha:   $('#npFecha', view),
    add:     $('#npAddItem', view),
    tbody:   $('#npItemsBody', view),
    tpl:     $('#npRowTpl', view),
    subtotalText: $('#npSubtotalText', view),
    totalText:    $('#npTotalText', view),
    msg:          $('#npMsg', view),
    guardar:      $('#npGuardar', view),
    cancelar:     $('#npCancelar', view),
    volver:       $('#npVolver', view)
  };

  function clearMsg(){ els.msg.classList.add('hidden'); els.msg.textContent = ''; }
  function showMsg(text, ok=true){
    els.msg.textContent = text;
    els.msg.classList.remove('hidden');
    els.msg.className = 'mt-3 text-sm ' + (ok ? 'text-emerald-700' : 'text-red-600');
  }

  function rowSubtotal(tr){
    const qty   = toNum(tr.querySelector('[data-role="qty"]')?.value);
    const price = toNum(tr.querySelector('[data-role="price"]')?.value);
    const sub = Math.max(0, qty) * Math.max(0, price);
    tr.querySelector('[data-role="subtotal"]').textContent = money(sub);
    return sub;
  }

  function recalcAll(){
    let total = 0;
    els.tbody.querySelectorAll('tr').forEach(tr => { total += rowSubtotal(tr); });
    els.subtotalText.textContent = money(total);
    els.totalText.textContent    = money(total);
  }

  function bindRow(tr){
    const onChange = () => recalcAll();
    tr.querySelectorAll('input[data-role="qty"], input[data-role="price"]').forEach(inp => {
      inp.addEventListener('input', onChange);
      inp.addEventListener('blur', onChange);
    });
    tr.querySelector('[data-action="del-row"]')?.addEventListener('click', () => {
      const rows = els.tbody.querySelectorAll('tr');
      if (rows.length <= 1){
        tr.querySelector('[data-role="name"]').value  = '';
        tr.querySelector('[data-role="qty"]').value   = '1';
        tr.querySelector('[data-role="price"]').value = '0';
        rowSubtotal(tr);
      } else {
        tr.remove();
      }
      recalcAll();
    });
  }

  function addRow(preset){
    const tr = els.tpl.cloneNode(true);
    tr.id = '';
    tr.classList.remove('hidden');
    if (preset){
      tr.querySelector('[data-role="name"]').value  = preset.name ?? '';
      tr.querySelector('[data-role="qty"]').value   = preset.qty  ?? 1;
      tr.querySelector('[data-role="price"]').value = preset.price?? 0;
    }
    els.tbody.appendChild(tr);
    bindRow(tr);
    rowSubtotal(tr);
    return tr;
  }

  function valid(){
    const clientOk = (els.cliente.value || '').trim().length >= 2;
    const fechaOk  = !!els.fecha.value;
    let itemsOk = false;
    els.tbody.querySelectorAll('tr').forEach(tr => {
      const name  = (tr.querySelector('[data-role="name"]')?.value || '').trim();
      const qty   = toNum(tr.querySelector('[data-role="qty"]')?.value);
      const price = toNum(tr.querySelector('[data-role="price"]')?.value);
      if (name && qty > 0 && price >= 0) itemsOk = true;
    });
    if (!clientOk) { showMsg('Completá el nombre del cliente.', false); return false; }
    if (!fechaOk)  { showMsg('Elegí la fecha de entrega.', false);     return false; }
    if (!itemsOk)  { showMsg('Agregá al menos un ítem válido.', false); return false; }
    clearMsg();
    return true;
  }

  function payload(){
    let total = 0;
    const items = [];
    els.tbody.querySelectorAll('tr').forEach(tr => {
      const name  = (tr.querySelector('[data-role="name"]')?.value || '').trim();
      const qty   = toNum(tr.querySelector('[data-role="qty"]')?.value);
      const price = toNum(tr.querySelector('[data-role="price"]')?.value);
      if (name && qty > 0 && price >= 0){
        const sub = qty * price;
        total += sub;
        // Backend espera estos nombres (según tu payload ejemplo)
        items.push({ producto:name, cantidad:qty, precioUnitario:price, subTotal:sub });
      }
    });
    return {
      cliente: (els.cliente.value || '').trim(),
      fechaEntrega: els.fecha.value,     // yyyy-mm-dd
      estado: "PENDIENTE",
      tipoVenta: "Pedido",
      items,
      total
    };
  }

  function reset(){
    clearMsg();
    els.cliente.value = '';
    els.fecha.value   = '';
    els.tbody.innerHTML = '';
    addRow(); // una fila en blanco
    recalcAll();
  }

  // Bind UI
  els.add?.addEventListener('click', () => { addRow(); recalcAll(); });

  els.guardar?.addEventListener('click', async () => {
    if (!valid()) return;
    const data = payload();
    console.log("Payload enviado:", JSON.stringify(data, null, 2));

    try {
      const res = await fetch('/api/v1/pedido', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (res.ok) {
        sonidoCrear?.play();

        // ✅ recargamos la lista desde el backend
        if (typeof fetchPedidos === "function") {
          await fetchPedidos();
        }

        // ✅ volvemos al dashboard
        showView("dashboard");
        try { history.pushState({ v: "dashboard" }, "", "#dashboard"); } catch {}
      } else {
        const errorText = await res.text();
        console.error("Error al crear pedido:", errorText);
        showMsg("Error al crear pedido: " + errorText, false);
      }
    } catch (err) {
      console.error("Error de red o fetch:", err);
      showMsg("Error al conectar con el servidor.", false);
    }
  });

  els.cancelar?.addEventListener('click', () => {
    showView('dashboard');
    try { history.pushState({v:'dashboard'}, "", '#dashboard'); } catch {}
  });
  els.volver?.addEventListener('click', () => {
    showView('dashboard');
    try { history.pushState({v:'dashboard'}, "", '#dashboard'); } catch {}
  });

  // Exponer módulo
  window.NuevoPedido = { reset, recalcAll };
})();
