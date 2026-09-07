// ==========================================
// donation.js
// ==========================================
// Renders a "Buy Me a Coffee"-style button per configured wallet
// (GCash / Maya). Clicking it pops open the QR code in a modal so
// the student can scan it with their own app. No account numbers
// or names are shown — just the button and the QR.

const loadingEl = document.getElementById("donation-loading");
const cardsEl = document.getElementById("donation-cards");
const noneEl = document.getElementById("donation-none");

const WALLET_LABELS = {
  gcash: "GCash",
  maya: "Maya",
};

async function loadDonationInfo() {
  let info = null;

  try {
    const res = await fetch("/api/donation-info");
    info = await res.json();
  } catch (err) {
    info = null;
  }

  loadingEl.hidden = true;

  const wallets = ["gcash", "maya"].filter((key) => info && info[key]);

  if (wallets.length === 0) {
    noneEl.hidden = false;
    return;
  }

  wallets.forEach((key) => {
    cardsEl.appendChild(buildDonationButton(key, info[key]));
  });
  cardsEl.hidden = false;
}

function buildDonationButton(walletKey, wallet) {
  const btn = document.createElement("button");
  btn.className = `coffee-btn ${walletKey}`;
  btn.innerHTML = `☕ Buy Me a Coffee — ${WALLET_LABELS[walletKey]}`;
  btn.addEventListener("click", () => openQrModal(walletKey, wallet));
  return btn;
}

function openQrModal(walletKey, wallet) {
  const overlay = document.createElement("div");
  overlay.className = "qr-modal-overlay";

  overlay.innerHTML = `
    <div class="qr-modal">
      <button class="qr-modal-close" aria-label="Close">✕</button>
      <p class="qr-modal-title">${WALLET_LABELS[walletKey]}</p>
      <img class="qr-modal-image" src="${wallet.qr}" alt="${WALLET_LABELS[walletKey]} QR code" />
      <p class="qr-modal-hint">Scan with your ${WALLET_LABELS[walletKey]} app</p>
    </div>
  `;

  document.body.appendChild(overlay);

  const closeModal = () => overlay.remove();
  overlay.querySelector(".qr-modal-close").addEventListener("click", closeModal);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal();
  });
}

document.addEventListener("DOMContentLoaded", loadDonationInfo);