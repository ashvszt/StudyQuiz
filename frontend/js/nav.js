// ==========================================
// nav.js
// ==========================================
// Adds a hamburger menu toggle for the navbar on small screens.
// Works automatically on any page that has a .navbar-links element —
// no HTML changes needed. Does nothing on pages with no navbar.

document.addEventListener("DOMContentLoaded", () => {
  const links = document.querySelector(".navbar-links");
  if (!links) return;

  const container = links.closest(".container");
  if (!container) return;

  const toggleBtn = document.createElement("button");
  toggleBtn.className = "navbar-toggle-btn";
  toggleBtn.type = "button";
  toggleBtn.setAttribute("aria-label", "Toggle menu");
  toggleBtn.innerHTML = "☰";

  container.insertBefore(toggleBtn, links);

  toggleBtn.addEventListener("click", () => {
    links.classList.toggle("open");
    toggleBtn.innerHTML = links.classList.contains("open") ? "✕" : "☰";
  });

  links.querySelectorAll("a").forEach((a) => {
    a.addEventListener("click", () => {
      links.classList.remove("open");
      toggleBtn.innerHTML = "☰";
    });
  });
});