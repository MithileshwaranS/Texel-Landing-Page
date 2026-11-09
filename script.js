// Sample costing, using the same formula as backend/utils/costingMath.js.
const r3 = (x) => Number(x.toFixed(3));
const money = (n) => n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const SAMPLE = {
  width: 58,
  warp: { reed: 96, hanks: 0.00756, dye: 120 },
  weft: { pick: 72, hanks: 0.01134, price: 310, dye: 110 },
  weaving: 14, washing: 8, mending: 10, transport: 7,
  profit: 0.15, gst: 0.05,
};

function cost(warpPrice) {
  const s = SAMPLE;
  const weight = (set, hanks) => (s.width * set * 1.45) / 840 * hanks;
  const warpWeight = weight(s.warp.reed, s.warp.hanks);
  const weftWeight = weight(s.weft.pick, s.weft.hanks);
  const warpRate = warpPrice + s.warp.dye;
  const weftRate = s.weft.price + s.weft.dye;
  const warpCost = r3(warpRate * warpWeight);
  const weftCost = r3(weftRate * weftWeight);
  const profit = r3((warpCost + weftCost + s.weaving + s.washing + s.mending) * s.profit);
  const subtotal = r3(warpCost + weftCost + s.weaving + s.washing + s.mending + s.transport + profit);
  const gst = r3(subtotal * s.gst);
  return { warpWeight, weftWeight, warpRate, weftRate, warpCost, weftCost, profit, gst, total: r3(subtotal + gst) };
}

const $ = (id) => document.getElementById(id);
const slider = $("yarn");
const list = $("version-list");
const note = $("version-note");
const recalc = $("recalc");
const extras = SAMPLE.weaving + SAMPLE.washing + SAMPLE.mending + SAMPLE.transport;
const versions = [{ yarn: 420, total: cost(420).total }];

function renderVersions() {
  list.innerHTML = versions
    .slice(0, 3)
    .map((v, i) => {
      const n = versions.length - i;
      const label = i === 0 ? `Version ${n}, current` : `Version ${n}, kept`;
      return `<li><span>${label} (60s at ₹${v.yarn})</span><b>₹${money(v.total)}</b></li>`;
    })
    .join("");
}

function render() {
  const price = Number(slider.value);
  const c = cost(price);
  $("yarn-out").textContent = `₹${price} / kg`;
  $("w-weight").textContent = c.warpWeight.toFixed(3);
  $("f-weight").textContent = c.weftWeight.toFixed(3);
  $("w-rate").textContent = c.warpRate;
  $("f-rate").textContent = c.weftRate;
  $("w-cost").textContent = money(c.warpCost);
  $("f-cost").textContent = money(c.weftCost);
  $("extras").textContent = money(extras);
  $("profit").textContent = money(c.profit);
  $("gst").textContent = money(c.gst);
  $("total").textContent = money(c.total);

  const saved = versions[0];
  const changed = price !== saved.yarn;
  recalc.disabled = !changed;
  if (changed) {
    const diff = c.total - saved.total;
    const dir = diff > 0 ? "up" : "down";
    note.textContent = `Today's price is ₹${money(Math.abs(diff))} ${dir}. Your saved quote hasn't changed.`;
  } else {
    note.textContent = versions.length > 1
      ? "Recalculated as a new version. The earlier quote stays on record."
      : "Your saved quote does not change when a yarn price does.";
  }
}

slider.addEventListener("input", render);
recalc.addEventListener("click", () => {
  const yarn = Number(slider.value);
  versions.unshift({ yarn, total: cost(yarn).total });
  renderVersions();
  render();
});
renderVersions();
render();

// Woven graphics: plain weave, navy warp over lime weft.
const NS = "http://www.w3.org/2000/svg";
const NAVY = "#1B3855";
const LIME = "#D4E02B";

function rect(parent, x, y, w, h, fill, extra = {}) {
  const el = document.createElementNS(NS, "rect");
  Object.entries({ x, y, width: w, height: h, fill, ...extra }).forEach(([k, v]) => el.setAttribute(k, v));
  parent.appendChild(el);
  return el;
}

// Stable pseudo-random, so the edge of the cloth doesn't jump on resize.
const noise = (a, b) => {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

function svgFor(host, width, height) {
  host.innerHTML = "";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("width", width);
  svg.setAttribute("height", height);
  host.appendChild(svg);
  return svg;
}

function drawCrossing(g, c, r, x, y, size) {
  const inset = Math.max(1.5, size * 0.1);
  if ((c + r) % 2 === 0) {
    rect(g, x, y + inset, size, size - inset * 2, LIME);
    rect(g, x + inset, y, size - inset * 2, size, NAVY, { rx: 2 });
  } else {
    rect(g, x + inset, y, size - inset * 2, size, NAVY);
    rect(g, x, y + inset, size, size - inset * 2, LIME, { rx: 2 });
  }
}

// Hero band: cloth on the left resolves into spreadsheet cells on the right.
function heroBand() {
  const host = $("hero-band");
  const W = host.clientWidth;
  const H = host.clientHeight;
  const size = H / 5;
  const cols = Math.ceil(W / size);
  const svg = svgFor(host, W, H);
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < 5; r++) {
      const g = document.createElementNS(NS, "g");
      g.setAttribute("class", "cell");
      g.style.setProperty("--d", Math.round((c / cols) * 700));
      const x = c * size;
      const y = r * size;
      const t = c / cols + (noise(c, r) - 0.5) * 0.26;
      if (t < 0.56) {
        drawCrossing(g, c, r, x, y, size);
      } else {
        const filled = noise(r + 3, c) > 0.86;
        rect(g, x + 0.5, y + 0.5, size - 1, size - 1, filled ? LIME : "#fff", { stroke: "rgba(27,56,85,.14)" });
      }
      svg.appendChild(g);
    }
  }
}

// Coming soon band: warp runs left to right, the cloth is woven up to a
// straight fell, and past it the warp threads wait for weft.
function loomBand() {
  const host = $("loom-band");
  const W = host.clientWidth;
  const H = host.clientHeight;
  const rows = 8;
  const size = H / rows;
  const cols = Math.ceil(W / size);
  const fell = Math.round(cols * 0.56);
  const svg = svgFor(host, W, H);
  for (let r = 0; r < rows; r++) {
    rect(svg, fell * size, r * size + size * 0.3, W - fell * size, size * 0.4, NAVY);
    for (let c = 0; c < fell; c++) {
      const x = c * size;
      const y = r * size;
      const inset = Math.max(1.5, size * 0.1);
      if ((c + r) % 2 === 0) {
        rect(svg, x + inset, y, size - inset * 2, size, LIME);
        rect(svg, x, y + inset, size, size - inset * 2, NAVY, { rx: 2 });
      } else {
        rect(svg, x, y + inset, size, size - inset * 2, NAVY);
        rect(svg, x + inset, y, size - inset * 2, size, LIME, { rx: 2 });
      }
    }
  }
}

// Small swatch in the features list.
function swatches() {
  document.querySelectorAll("[data-weave]").forEach((host) => {
    const W = host.clientWidth;
    const H = host.clientHeight;
    const size = 16;
    const svg = svgFor(host, W, H);
    for (let c = 0; c < Math.ceil(W / size); c++) {
      for (let r = 0; r < Math.ceil(H / size); r++) drawCrossing(svg, c, r, c * size, r * size, size);
    }
  });
}

function drawAll() {
  heroBand();
  loomBand();
  swatches();
}

let timer;
let lastWidth = window.innerWidth;
window.addEventListener("resize", () => {
  if (window.innerWidth === lastWidth) return;
  lastWidth = window.innerWidth;
  clearTimeout(timer);
  timer = setTimeout(drawAll, 150);
});
drawAll();
