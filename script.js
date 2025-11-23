const currencyNames = {
  USD: "Долар США",
  EUR: "Євро",
  GBP: "Фунт стерлінгів",
  PLN: "Польський злотий",
  CHF: "Швейцарський франк",
  CNY: "Китайський юань",
};

const currencyCodes = {
  840: "USD",
  978: "EUR",
  826: "GBP",
  985: "PLN",
  756: "CHF",
  156: "CNY",
};

const refreshBtn = document.getElementById("refreshBtn");
const lastUpdateEl = document.getElementById("lastUpdate");
const cardsContainer = document.getElementById("cardsContainer");
const amountInput = document.getElementById("amountInput");
const fromCurrencySelect = document.getElementById("fromCurrency");
const toCurrencySelect = document.getElementById("toCurrency");
const resultBox = document.getElementById("resultBox");
const swapBtn = document.getElementById("swapBtn");

// CNY calculator elements
const cnyAmountInput = document.getElementById("cnyAmount");
const cnyWithFeeEl = document.getElementById("cnyWithFee");
const cnyInUsdEl = document.getElementById("cnyInUsd");
const cnyInUahEl = document.getElementById("cnyInUah");

let rates = {};

async function fetchRates() {
  try {
    refreshBtn.disabled = true;
    refreshBtn.textContent = "⟳ Оновлення...";

    const res = await fetch("https://api.monobank.ua/bank/currency");
    const data = await res.json();

    const map = {};
    data.forEach((item) => {
      if (item.currencyCodeB === 980 && currencyCodes[item.currencyCodeA]) {
        const code = currencyCodes[item.currencyCodeA];
        map[code] = {
          rateBuy: item.rateBuy || item.rateCross,
          rateSell: item.rateSell || item.rateCross,
          rateCross: item.rateCross,
        };
      }
    });

    rates = map;
    renderCards();
    initConverterOptions();
    updateResult();
    updateCnyCalc();

    const now = new Date();
    lastUpdateEl.textContent = now.toLocaleTimeString("uk-UA");
  } catch (e) {
    console.error(e);
    alert("Помилка завантаження курсів. Спробуйте ще раз пізніше.");
  } finally {
    refreshBtn.disabled = false;
    refreshBtn.textContent = "⟳ Оновити";
  }
}

function renderCards() {
  cardsContainer.innerHTML = "";

  Object.entries(rates).forEach(([code, data]) => {
    const card = document.createElement("article");
    card.className = "card";

    const name = currencyNames[code] || code;
    const spread = (data.rateSell - data.rateBuy).toFixed(2);
    const avg = data.rateCross
      ? data.rateCross.toFixed(2)
      : ((data.rateBuy + data.rateSell) / 2).toFixed(2);

    card.innerHTML = `
      <div class="card-header">
        <div class="card-left">
          <div class="card-code">${code}</div>
          <div class="card-texts">
            <h3>${code}</h3>
            <p>${name}</p>
          </div>
        </div>
        <div class="pill-rate">${avg} ₴</div>
      </div>
      <div class="card-row buy">
        <span class="label">Купівля</span>
        <span class="value">${data.rateBuy.toFixed(2)} ₴</span>
      </div>
      <div class="card-row sell">
        <span class="label">Продаж</span>
        <span class="value">${data.rateSell.toFixed(2)} ₴</span>
      </div>
      <div class="card-footer">
        <span>Спред: ${spread} ₴</span>
      </div>
    `;

    cardsContainer.appendChild(card);
  });
}

function initConverterOptions() {
  const currencies = ["UAH", ...Object.keys(rates)];

  fromCurrencySelect.innerHTML = "";
  toCurrencySelect.innerHTML = "";

  currencies.forEach((curr) => {
    const opt1 = document.createElement("option");
    opt1.value = curr;
    opt1.textContent = curr;
    fromCurrencySelect.appendChild(opt1);

    const opt2 = document.createElement("option");
    opt2.value = curr;
    opt2.textContent = curr;
    toCurrencySelect.appendChild(opt2);
  });

  if (!fromCurrencySelect.value) fromCurrencySelect.value = "USD";
  if (!toCurrencySelect.value) toCurrencySelect.value = "UAH";
}

function convertAmount(amount, from, to) {
  if (!rates || Object.keys(rates).length === 0) return 0;
  if (from === to) return amount;

  if (from === "UAH" && to !== "UAH") {
    if (!rates[to]) return 0;
    return amount / rates[to].rateBuy;
  } else if (from !== "UAH" && to === "UAH") {
    if (!rates[from]) return 0;
    return amount * rates[from].rateSell;
  } else if (from !== "UAH" && to !== "UAH") {
    if (!rates[from] || !rates[to]) return 0;
    const uahAmount = amount * rates[from].rateSell;
    return uahAmount / rates[to].rateBuy;
  }

  return amount;
}

function convert() {
  const amount = parseFloat(amountInput.value) || 0;
  const from = fromCurrencySelect.value;
  const to = toCurrencySelect.value;

  return convertAmount(amount, from, to);
}

function updateResult() {
  const value = convert();
  resultBox.textContent = value.toFixed(2);
}

function updateCnyCalc() {
  if (!cnyAmountInput || !cnyWithFeeEl || !cnyInUsdEl || !cnyInUahEl) return;

  const base = parseFloat(cnyAmountInput.value) || 0;

  if (!rates || !rates["USD"] || !rates["CNY"]) {
    cnyWithFeeEl.textContent = "—";
    cnyInUsdEl.textContent = "—";
    cnyInUahEl.textContent = "—";
    return;
  }

  const withFee = base * 1.03;
  const inUsd = convertAmount(withFee, "CNY", "USD");
  const inUah = convertAmount(inUsd, "USD", "UAH");

  cnyWithFeeEl.textContent = withFee.toFixed(2) + " CNY";
  cnyInUsdEl.textContent = inUsd.toFixed(2) + " USD";
  cnyInUahEl.textContent = inUah.toFixed(2) + " UAH";
}

refreshBtn.addEventListener("click", fetchRates);
amountInput.addEventListener("input", updateResult);
fromCurrencySelect.addEventListener("change", updateResult);
toCurrencySelect.addEventListener("change", updateResult);
swapBtn.addEventListener("click", () => {
  const from = fromCurrencySelect.value;
  fromCurrencySelect.value = toCurrencySelect.value;
  toCurrencySelect.value = from;
  updateResult();
});

if (cnyAmountInput) {
  cnyAmountInput.addEventListener("input", updateCnyCalc);
}

fetchRates();
setInterval(fetchRates, 300000);
