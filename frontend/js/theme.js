// ==========================================
// theme.js
// ==========================================
// Adds a "Settings" menu (with a dark mode toggle) into the navbar
// on pages that have one. On pages without a navbar (quiz.html,
// result.html), falls back to a small floating settings button.

const THEME_STORAGE_KEY = "studyquiz_theme";

function getSavedTheme() {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) || "light";
  } catch (err) {
    return "light";
  }
}

function saveTheme(theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (err) {
    // Non-fatal — theme just won't persist across visits.
  }
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  const toggleSwitch = document.getElementById("theme-switch");
  if (toggleSwitch) toggleSwitch.classList.toggle("on", theme === "dark");
}

function buildSettingsDropdown() {
  const dropdown = document.createElement("div");
  dropdown.className = "settings-dropdown";
  dropdown.hidden = true;
  dropdown.innerHTML = `
    <div class="settings-row">
      <span class="settings-row-label">🌙 Dark Mode</span>
      <button id="theme-switch" class="theme-switch" type="button" aria-label="Toggle dark mode"></button>
    </div>
  `;
  return dropdown;
}

function wireDropdown(triggerBtn, dropdown) {
  triggerBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdown.hidden = !dropdown.hidden;
  });

  document.addEventListener("click", (e) => {
    if (!dropdown.hidden && !dropdown.contains(e.target) && e.target !== triggerBtn) {
      dropdown.hidden = true;
    }
  });

  const themeSwitch = dropdown.querySelector("#theme-switch");
  themeSwitch.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";
    applyTheme(next);
    saveTheme(next);
  });
}

function buildNavbarSettings(navbarLinks) {
  const wrapper = document.createElement("div");
  wrapper.className = "settings-menu";

  const trigger = document.createElement("button");
  trigger.className = "settings-trigger-btn";
  trigger.type = "button";
  trigger.setAttribute("aria-label", "Settings");
  trigger.textContent = "☼";

  const dropdown = buildSettingsDropdown();

  wrapper.appendChild(trigger);
  wrapper.appendChild(dropdown);
  navbarLinks.appendChild(wrapper);

  wireDropdown(trigger, dropdown);
}

function buildFallbackSettings() {
  const trigger = document.createElement("button");
  trigger.id = "settings-fallback-btn";
  trigger.type = "button";
  trigger.setAttribute("aria-label", "Settings");
  trigger.textContent = "≡";

  const dropdown = buildSettingsDropdown();

  document.body.appendChild(trigger);
  document.body.appendChild(dropdown);

  wireDropdown(trigger, dropdown);
}

document.addEventListener("DOMContentLoaded", () => {
  applyTheme(getSavedTheme());

  const navbarLinks = document.querySelector(".navbar-links");
  if (navbarLinks) {
    buildNavbarSettings(navbarLinks);
  } else {
    buildFallbackSettings();
  }

  // Re-apply so the switch reflects the saved theme once it exists.
  applyTheme(getSavedTheme());
});