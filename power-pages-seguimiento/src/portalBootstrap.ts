// Power Pages ejecuta el JavaScript compilado de este archivo en su página raíz.
(() => {
  function mountSeguimiento() {
    if (document.getElementById("root")) return;
    const host = document.querySelector("#mainContent");
    if (!host) return;
    const root = document.createElement("div");
    root.id = "root";
    host.replaceChildren(root);
    // Armoniza la navegación existente usando utilidades Tailwind.
    const banner = document.querySelector<HTMLElement>("body > .navbar");
    if (banner) banner.style.display = "none";
    const bannerContainer = banner?.querySelector(".container");
    bannerContainer?.classList.add("w-full", "max-w-none", "flex", "items-center", "justify-between", "gap-4", "p-0");
    const brand = banner?.querySelector(".navbar-brand a");
    brand?.classList.add("inline-flex", "items-center", "gap-2", "no-underline");
    const brandTitle = banner?.querySelector(".siteTitle");
    if (brandTitle) {
      brandTitle.textContent = "Transporte Barranquilla";
      brandTitle.classList.add("text-xl", "font-bold", "text-ink", "m-0", "leading-6");
    }
    banner?.querySelectorAll(".nav-link").forEach((link) => link.classList.add("text-ink", "text-sm", "font-semibold"));
    document.querySelectorAll<HTMLElement>("body > footer, #footer").forEach((footer) => { footer.style.display = "none"; });
    const stylesheet = document.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.href = "/seguimiento-app.css?v=20260912-refusal3";
    document.head.appendChild(stylesheet);
    const script = document.createElement("script");
    script.type = "module";
    script.src = "/seguimiento-app.js?v=20260912-refusal3";
    script.onerror = () => { root.textContent = "No se pudo cargar Seguimiento. Comprueba la publicación del archivo seguimiento-app.js."; };
    document.head.appendChild(script);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mountSeguimiento, { once: true });
  else mountSeguimiento();
})();
