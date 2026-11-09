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

// Copy email, for visitors without a mail app. Falls back where the
// clipboard API is unavailable.
const copyEmail = $("copy-email");
let copyTimer;
copyEmail.addEventListener("click", async () => {
  const email = copyEmail.dataset.email;
  let copied = false;
  try {
    await navigator.clipboard.writeText(email);
    copied = true;
  } catch {
    const field = document.createElement("textarea");
    field.value = email;
    field.style.position = "fixed";
    field.style.opacity = "0";
    document.body.appendChild(field);
    field.select();
    copied = document.execCommand("copy");
    field.remove();
  }
  copyEmail.textContent = copied ? "Copied" : "Couldn't copy";
  clearTimeout(copyTimer);
  copyTimer = setTimeout(() => { copyEmail.textContent = "Copy email"; }, 2000);
});

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

// Design generation sample: same repeat and weight logic as the design sheets.
const INK = { Navy: NAVY, Ivory: "#F6F5EF", Lime: LIME };
const DESIGN = {
  width: 58,
  constant: 1.45,
  warp: { set: 96, hanks: 0.00756, bands: [["Navy", 40], ["Ivory", 12], ["Lime", 6], ["Ivory", 12]] },
  weft: { set: 72, hanks: 0.01134, bands: [["Navy", 32], ["Ivory", 10], ["Lime", 6], ["Ivory", 10]] },
};
const orderLength = $("order-length");
const canvas = $("check");
const qty = (n) => n.toLocaleString("en-IN", { minimumFractionDigits: 3, maximumFractionDigits: 3 });

// How the order fills the width: full repeats, then a partial one.
function breakup(side) {
  const target = DESIGN.width * side.set;
  const sum = side.bands.reduce((a, [, t]) => a + t, 0);
  const counts = new Map();
  if (!sum) return { target, sum, repeat: 0, left: 0, counts };
  const repeat = Math.floor(target / sum);
  const left = target - repeat * sum;
  let remaining = left;
  side.bands.forEach(([name, t]) => {
    const take = Math.min(t, remaining);
    remaining -= take;
    counts.set(name, (counts.get(name) || 0) + t * repeat + take);
  });
  return { target, sum, repeat, left, counts };
}

function renderSide(key) {
  const side = DESIGN[key];
  const { target, sum, repeat, left, counts } = breakup(side);
  const metres = Math.max(0, Number(orderLength.value) || 0);
  const perMetre = Number(((DESIGN.width * side.set * DESIGN.constant) / 840 * side.hanks).toFixed(3));
  $(`${key}-total`).textContent = target.toLocaleString("en-IN");
  if (!sum) {
    $(`${key}-repeat`).textContent = "Enter at least one thread count.";
    $(`${key}-breakup`).innerHTML = "";
    return 0;
  }
  const times = `${repeat.toLocaleString("en-IN")} full ${repeat === 1 ? "repeat" : "repeats"} of ${sum} threads`;
  $(`${key}-repeat`).textContent = left ? `${times}, then ${left} more to finish the width.` : `${times}, ending exactly at the selvedge.`;
  const rows = [...counts]
    .map(([name, n]) => {
      const kg = perMetre * (n / target);
      return `<tr><th scope="row"><span class="swatch-cell"><i style="background:${INK[name]}"></i>${name}</span></th><td class="n">${n.toLocaleString("en-IN")}</td><td class="n">${kg.toFixed(3)}</td><td class="n">${qty(kg * metres)}</td></tr>`;
    })
    .join("");
  $(`${key}-breakup`).innerHTML = `${rows}<tr class="sum"><th scope="row">Total</th><td class="n">${target.toLocaleString("en-IN")}</td><td class="n">${perMetre.toFixed(3)}</td><td class="n">${qty(perMetre * metres)}</td></tr>`;
  return perMetre * metres;
}

function drawCheck() {
  const expand = (bands) => bands.flatMap(([name, t]) => Array(Math.min(t, 400)).fill(INK[name]));
  const warp = expand(DESIGN.warp.bands);
  const weft = expand(DESIGN.weft.bands);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const ctx = canvas.getContext("2d");
  if (!warp.length || !weft.length) return;
  const thread = 2 * dpr;
  const cols = Math.ceil(canvas.width / thread);
  const rows = Math.ceil(canvas.height / thread);
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      ctx.fillStyle = (c + r) % 2 === 0 ? warp[c % warp.length] : weft[r % weft.length];
      ctx.fillRect(c * thread, r * thread, thread, thread);
    }
  }
}

function renderDesign() {
  const kg = renderSide("warp") + renderSide("weft");
  $("order-total").textContent = qty(kg);
  drawCheck();
}

["warp", "weft"].forEach((key) => {
  const bands = DESIGN[key].bands;
  const list = $(`${key}-order`);
  bands.forEach(([name, t], i) => {
    const li = document.createElement("li");
    li.innerHTML = `<span class="chip" style="background:${INK[name]}"></span><span>${name}</span>`;
    const input = document.createElement("input");
    input.type = "number";
    input.min = "0";
    input.max = "400";
    input.inputMode = "numeric";
    input.value = t;
    input.setAttribute("aria-label", `${key} stripe ${i + 1}, ${name}, thread count`);
    input.addEventListener("input", () => {
      bands[i][1] = Math.min(400, Math.max(0, parseInt(input.value, 10) || 0));
      renderDesign();
    });
    li.appendChild(input);
    list.appendChild(li);
  });
});
orderLength.addEventListener("input", renderDesign);

function drawAll() {
  heroBand();
  loomBand();
  drawCheck();
}

let timer;
let lastWidth = window.innerWidth;
window.addEventListener("resize", () => {
  if (window.innerWidth === lastWidth) return;
  lastWidth = window.innerWidth;
  clearTimeout(timer);
  timer = setTimeout(drawAll, 150);
});
renderDesign();
drawAll();
