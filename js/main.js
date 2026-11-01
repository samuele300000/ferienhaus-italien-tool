// =============================================================
// main.js
//
// Wires the HTML form to calculations.js and renders the results.
// Also handles tab switching and saving your inputs in the
// browser's localStorage, so reloading the page doesn't wipe
// what you typed.
// =============================================================

const STORAGE_KEY = "ferienhaus-tool-inputs-v1";

// Every input element we read, keyed by the field name used in
// calculations.js. `type` tells us how to read/write its value.
const FIELD_DEFS = [
  { id: "wealthCHF", type: "number" },
  { id: "incomeCHF", type: "number" },
  { id: "budgetCHF", type: "number" },
  { id: "vacationSpendEUR", type: "number" },
  { id: "exchangeRate", type: "number" },
  { id: "existingRentalProperties", type: "number" },
  { id: "listPrice", type: "number" },
  { id: "comune", type: "text" },
  { id: "sizeM2", type: "number" },
  { id: "rooms", type: "number" },
  { id: "renovation", type: "number" },
  { id: "registroPct", type: "number" },
  { id: "notaryPct", type: "number" },
  { id: "agencyPct", type: "number" },
  { id: "cashAuto", type: "checkbox" },
  { id: "cashManual", type: "number" },
  { id: "mortgageAmount", type: "number" },
  { id: "mortgageRate", type: "number" },
  { id: "mortgageYears", type: "number" },
  { id: "loanAmount", type: "number" },
  { id: "loanYears", type: "number" },
  { id: "utilitiesBaseline", type: "number" },
  { id: "insurance", type: "number" },
  { id: "maintenancePct", type: "number" },
  { id: "managementGardenPool", type: "number" },
  { id: "imuRate", type: "number" },
  { id: "tari", type: "number" },
  { id: "commercialista", type: "number" },
  { id: "nightsRented", type: "number" },
  { id: "pricePerNight", type: "number" },
  { id: "platformFeePct", type: "number" },
  { id: "serviceFeePct", type: "number" },
  { id: "cedolareSeccaPct", type: "number" },
  { id: "marketReturnRate", type: "number" },
  { id: "includeRentalIncome", type: "checkbox" },
];

function readInputs() {
  const inputs = {};
  for (const field of FIELD_DEFS) {
    const el = document.getElementById(field.id);
    if (field.type === "checkbox") {
      inputs[field.id] = el.checked;
    } else if (field.type === "number") {
      inputs[field.id] = parseFloat(el.value) || 0;
    } else {
      inputs[field.id] = el.value;
    }
  }
  return inputs;
}

function restoreInputs() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  let saved;
  try {
    saved = JSON.parse(raw);
  } catch (e) {
    return;
  }
  for (const field of FIELD_DEFS) {
    if (!(field.id in saved)) continue;
    const el = document.getElementById(field.id);
    if (field.type === "checkbox") {
      el.checked = saved[field.id];
    } else {
      el.value = saved[field.id];
    }
  }
}

function saveInputs(inputs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(inputs));
}

function formatEUR(amount) {
  return new Intl.NumberFormat("de-CH", { maximumFractionDigits: 0 }).format(Math.round(amount)) + " EUR";
}

function formatCHF(amount) {
  return new Intl.NumberFormat("de-CH", { maximumFractionDigits: 0 }).format(Math.round(amount)) + " CHF";
}

function renderCostList(listEl, totalEl, result) {
  listEl.innerHTML = "";
  for (const item of result.items) {
    const li = document.createElement("li");
    const label = document.createElement("span");
    label.textContent = item.label;
    const amount = document.createElement("span");
    amount.textContent = formatEUR(item.amount);
    li.appendChild(label);
    li.appendChild(amount);
    listEl.appendChild(li);
  }
  totalEl.textContent = formatEUR(result.total);
}

function render() {
  const inputs = readInputs();
  saveInputs(inputs);

  const result = computeAffordability(inputs);

  renderCostList(
    document.getElementById("fixedCostsList"),
    document.getElementById("fixedCostsTotal"),
    result.fixed
  );
  renderCostList(
    document.getElementById("variableCostsList"),
    document.getElementById("variableCostsTotal"),
    result.variable
  );
  renderCostList(
    document.getElementById("capitalCostsList"),
    document.getElementById("capitalCostsTotal"),
    result.capital
  );

  document.getElementById("grandTotalEUR").textContent = formatEUR(result.grandTotalEUR);
  document.getElementById("rentalOffsetEUR").textContent = formatEUR(result.rentalOffsetEUR);
  document.getElementById("netAnnualCostEUR").textContent = formatEUR(result.netAnnualCostEUR);
  document.getElementById("netMonthlyCostEUR").textContent = formatEUR(result.netMonthlyCostEUR);
  document.getElementById("netAnnualCostCHF").textContent = formatCHF(result.netAnnualCostCHF);
  document.getElementById("budgetDisplayCHF").textContent = formatCHF(inputs.budgetCHF);

  const badge = document.getElementById("verdictBadge");
  badge.textContent = result.verdict.label;
  badge.className = "verdict-badge " + result.verdict.level;
}

function setupTabs() {
  const buttons = document.querySelectorAll(".tab-button");
  const panels = document.querySelectorAll(".tab-panel");

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      buttons.forEach((b) => {
        b.classList.remove("active");
        b.setAttribute("aria-selected", "false");
      });
      panels.forEach((p) => p.setAttribute("hidden", ""));

      button.classList.add("active");
      button.setAttribute("aria-selected", "true");
      document.getElementById(button.dataset.tab).removeAttribute("hidden");
    });
  });
}

function setupInputListeners() {
  for (const field of FIELD_DEFS) {
    const el = document.getElementById(field.id);
    const eventName = field.type === "checkbox" ? "change" : "input";
    el.addEventListener(eventName, render);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  restoreInputs();
  setupTabs();
  setupInputListeners();
  render();
});
