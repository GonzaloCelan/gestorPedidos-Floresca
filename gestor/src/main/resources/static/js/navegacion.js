(() => {
  if (window.__navBoot) return; 
  window.__navBoot = true;

  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

  // Vistas soportadas
  const VIEWS = new Set(["dashboard","materiales","historial","venta-detalle","pedido-nuevo"]);

  function getViewEl(name){
    const id = name.startsWith("view-") ? name : `view-${name}`;
    return document.getElementById(id);
  }

  // 👉 Función principal de navegación
  function showView(name){
    $$('section[data-view]').forEach(v => {
      v.style.display = "none";
      v.classList.remove("hidden");
      v.removeAttribute("hidden");
    });
    const el = getViewEl(name);
    if (el){
      el.style.display = "";
      el.classList.remove("hidden");
      el.removeAttribute("hidden");
    }
    $$('#sidebar .nav-link').forEach(a => a.classList.remove('nav-active'));
    const key = String(name).replace(/^view-/, '');
    const nav = $(`#sidebar .nav-link[data-nav="${key}"]`);
    if (nav) nav.classList.add('nav-active');

    // 👉 Inicialización de cada módulo
    switch (key) {
      case "dashboard": // pedidos
        window.initPedidos?.();
        break;
      case "materiales": // insumos
        window.initInsumos?.();
        break;
      case "historial": // ventas
        window.initVentas?.();
        break;
    }
  }
  window.showView = showView;

  // Eventos de navegación
  document.addEventListener('click', (e) => {
    const a = e.target.closest('#sidebar .nav-link');
    if (!a) return;
    const t = a.dataset.nav;
    if (!t || !VIEWS.has(t)) return;
    e.preventDefault();
    showView(t);
    try { history.pushState({v:t}, "", `#${t}`); } catch {}
  });

  window.addEventListener('popstate', () => {
    const v = (location.hash || "").replace(/^#/, "");
    if (VIEWS.has(v)) showView(v);
  });

  // 👉 Vista inicial (esperar DOM listo)
  document.addEventListener("DOMContentLoaded", () => {
    const initial = (location.hash || "").replace(/^#/, "");
    showView(VIEWS.has(initial) ? initial : 'dashboard');
  });
})();

