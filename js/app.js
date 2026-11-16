/* ============================================================
   Relatório Financeiro Agregado — TP 51/2021
   Dados 100% agregados (dados/dados.json). Sem dados pessoais.

   Filtros: período completo, por ano (2022–2026) e por período
   avaliatório trimestral (1º P.A = jan–mar/2022).
   ============================================================ */
"use strict";

const fmt0 = new Intl.NumberFormat("pt-BR", {style:"currency", currency:"BRL", maximumFractionDigits:0});
const fmt2 = new Intl.NumberFormat("pt-BR", {style:"currency", currency:"BRL", minimumFractionDigits:2, maximumFractionDigits:2});
const fmtNum = new Intl.NumberFormat("pt-BR");
const MESES = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];

const PALETA = ["#1f3864","#2f6f8f","#2f9e8f","#4f9d69","#e0a33e","#de6a3a","#7c5cbf","#c0392b","#0f766e","#5b6b8c","#8a6d3b","#3b6ea5"];
const CORES_GRUPO = {Pessoal:"#1f3864", Custeio:"#2f6f8f", Investimento:"#4f9d69"};
const CORES_ATIV = {
  "Pessoal (folha e encargos)":"#1f3864",
  "Executora — administração (área meio)":"#e0a33e",
  "Área Meio (administração)":"#de6a3a",
  "Não informada":"#94a3b8",
  "Demais atividades":"#b0b8c4"
};
const CORES_SEG = {
  "Folha e encargos":"#1f3864",
  "Benefícios trabalhistas":"#2f6f8f",
  "Executora — administração (área meio)":"#e0a33e",
  "Não classificado (revisão)":"#de6a3a"
};
const EXCLUIR_ATIV = new Set(["Pessoal (folha e encargos)","Executora — administração (área meio)",
                              "Área Meio (administração)","Não informada","Demais atividades"]);

let DATA = null;
let SLICE = null;
let FILTRO = "todos";
let ABA = "visao";
let FULL_LIST = [];
let FULL_IDX = new Map();
const FULL = new Map();

const brl  = v => fmt0.format(v);
const brl2 = v => fmt2.format(v);
const pct  = v => (v*100).toFixed(1).replace(".",",") + "%";
const compact = v => Math.abs(v) >= 1e6 ? (v/1e6).toFixed(1).replace(".",",") + " mi"
                    : Math.abs(v) >= 1e3 ? (v/1e3).toFixed(0) + " mil" : String(Math.round(v));
const esc  = s => String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const mesLabel = k => MESES[+k.slice(5,7)-1] + "/" + k.slice(0,4);
const soma = arr => arr.reduce((s,x) => s + (x.v ?? x), 0);

/* ---------------------------------------------------------------- tooltip */
const tip = document.getElementById("tip");
function bindTips(root = document){
  root.querySelectorAll("[data-tip]").forEach(el => {
    el.onmouseenter = () => {
      tip.textContent = el.getAttribute("data-tip");
      tip.classList.add("show");
    };
    el.onmousemove = e => {
      tip.style.left = e.clientX + "px";
      tip.style.top  = e.clientY + "px";
    };
    el.onmouseleave = () => tip.classList.remove("show");
  });
}

/* ---------------------------------------------------------------- barras */
function barras(items, total, opts = {}){
  if (!items.length) return '<div class="bar-row">Sem dados</div>';
  const max = Math.max(...items.map(p => Math.abs(p.v)), 1);
  const cor = opts.cor || (i => PALETA[i % PALETA.length]);
  return '<div class="bars">' + items.map((p,i) => {
    const w = Math.max(0, Math.abs(p.v)) / max * 100;
    const share = total ? " · " + pct(p.v/total) : "";
    const n = p.n_lanc ? `${fmtNum.format(p.n_lanc)} lanç.` : (opts.rotuloN || "agrupado");
    const c = p.cor || cor(i, p);
    return `<div class="bar-row" data-tip="${esc(p.n)}\n${brl2(p.v)}${share ? "  (" + pct(p.v/total) + ")" : ""}\n${n}">
      <span class="name">${esc(p.n)}</span>
      <span class="track"><span class="fill" style="width:${w.toFixed(1)}%;background:${c}"></span></span>
      <span class="num">${brl(p.v)}${share}</span>
    </div>`;
  }).join("") + "</div>";
}

/* ---------------------------------------------------------------- rosca */
function donut(items, opts = {}){
  const pairs = items.filter(p => p.v > 0);
  const total = soma(pairs);
  if (!total) return "";
  const R = 58, C = 2 * Math.PI * R;
  let off = 0, s = '<svg viewBox="0 0 160 160" role="img" aria-label="Composição">';
  pairs.forEach((p,i) => {
    const frac = p.v / total;
    const c = (opts.cores && opts.cores[p.n]) || p.cor || PALETA[i % PALETA.length];
    s += `<circle cx="80" cy="80" r="${R}" fill="none" stroke="${c}" stroke-width="24"
      stroke-dasharray="${(frac*C).toFixed(2)} ${(C-frac*C).toFixed(2)}"
      stroke-dashoffset="${(-off*C).toFixed(2)}" transform="rotate(-90 80 80)"
      data-tip="${esc(p.n)}\n${brl2(p.v)}  (${pct(frac)})"><title>${esc(p.n)}</title></circle>`;
    off += frac;
  });
  const centro = opts.centro || compact(total);
  const rotulo = opts.rotulo || "total";
  s += `<text x="80" y="75" text-anchor="middle" font-size="10.5" style="fill:var(--muted)">${esc(rotulo)}</text>
        <text x="80" y="94" text-anchor="middle" font-size="14" font-weight="800" style="fill:var(--ink)">${centro}</text></svg>`;
  let leg = '<div class="donut-legend">';
  pairs.forEach((p,i) => {
    const c = (opts.cores && opts.cores[p.n]) || p.cor || PALETA[i % PALETA.length];
    leg += `<div><i style="background:${c}"></i>${esc(p.n)}<b>${pct(p.v/total)}</b></div>`;
  });
  return `<div class="donut-wrap">${s}${leg}</div>`;
}

/* ---------------------------------------------------------------- linha mensal */
function linhaMes(meses){
  const W = 920, H = 320, P = {t:18, r:14, b:46, l:70};
  const max = Math.max(...meses.map(m => m.desp), 1);
  const topo = max * 1.12, iw = W - P.l - P.r, ih = H - P.t - P.b, bw = iw / meses.length;
  const y = v => P.t + ih - (v / topo) * ih;
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Evolução mensal">`;
  [0, topo/2, topo].forEach((t,i) => {
    s += `<line x1="${P.l}" x2="${W-P.r}" y1="${y(t)}" y2="${y(t)}" style="stroke:var(--line-2)"/>`;
    s += `<text x="${P.l-8}" y="${y(t)+4}" text-anchor="end" font-size="11" style="fill:var(--muted)">${i===0?"0":compact(t)}</text>`;
  });
  const step = Math.max(1, Math.ceil(meses.length / 9));
  const mm = meses.map((m,i) => i < 2 ? null : (meses[i-2].desp + meses[i-1].desp + m.desp) / 3);
  meses.forEach((m,i) => {
    const x = P.l + i*bw + bw*0.16, w = bw*0.68;
    s += `<rect x="${x}" y="${y(m.desp)}" width="${w}" height="${Math.max(0, P.t+ih-y(m.desp))}" rx="2.5"
      fill="#2f6f8f" class="bar-mes" data-k="${m.k}" style="cursor:pointer"
      data-tip="${m.label}\nDespesas: ${brl2(m.desp)}\nReceitas: ${brl2(m.rec)}\nSaldo: ${brl2(m.saldo)}\n${fmtNum.format(m.n)} lançamentos"><title>${m.label}: ${brl2(m.desp)}</title></rect>`;
    if (i % step === 0 || i === meses.length-1)
      s += `<text x="${P.l+i*bw+bw/2}" y="${H-22}" text-anchor="middle" font-size="10.5" style="fill:var(--muted)">${m.label}</text>`;
  });
  let d = "";
  mm.forEach((v,i) => { if (v !== null) d += (d?" L":"M") + (P.l+i*bw+bw/2) + " " + y(v); });
  s += `<path d="${d}" fill="none" style="stroke:var(--ambar)" stroke-width="2.6" stroke-linecap="round"/>`;
  s += `<line x1="${P.l}" x2="${W-P.r}" y1="${P.t+ih}" y2="${P.t+ih}" style="stroke:var(--line)"/></svg>`;
  return s;
}

/* ---------------------------------------------------------------- barras por ano (acumulado) */
function barrasAnos(ytd, destaque){
  const max = Math.max(...ytd.map(y => y.v), 1);
  return '<div class="bars">' + ytd.map(y => {
    const w = Math.max(0, y.v) / max * 100;
    const bg = y.ano === destaque ? "var(--ambar)" : "var(--azul)";
    return `<div class="bar-row" data-tip="${y.ano}\n${brl2(y.v)}\nacumulado jan–set">
      <span class="name">${y.ano}${y.ano === destaque ? " ◀" : ""}</span>
      <span class="track"><span class="fill" style="width:${w.toFixed(1)}%;background:${bg}"></span></span>
      <span class="num">${brl(y.v)}</span>
    </div>`;
  }).join("") + "</div>";
}

/* ---------------------------------------------------------------- heatmap */
function heat(meses, sel){
  const anos = [...new Set(meses.map(m => m.k.slice(0,4)))].sort();
  const mp = new Map(meses.map(m => [m.k, m]));
  const max = Math.max(...meses.map(m => m.desp), 1);
  let s = '<div class="h"></div>';
  MESES.forEach(m => s += `<div class="h">${m}</div>`);
  anos.forEach(a => {
    s += `<div class="yc">${a}</div>`;
    for (let i = 1; i <= 12; i++){
      const key = `${a}-${String(i).padStart(2,"0")}`;
      const m = mp.get(key);
      if (!m) { s += '<div class="c empty">·</div>'; continue; }
      const t = Math.pow(m.desp / max, .75);
      const bg = `rgba(31,56,100,${(0.10 + t*0.85).toFixed(2)})`;
      const fg = t > .55 ? "#fff" : "#0b1220";
      const isSel = sel && (sel.keys ? sel.keys.has(key) : sel.ano === +a);
      s += `<div class="c${isSel ? " is-sel" : ""}" style="background:${bg};color:${fg}" data-k="${key}"
        data-tip="${mesLabel(key)}\nDespesas: ${brl2(m.desp)}\n${fmtNum.format(m.n)} lançamentos">${compact(m.desp)}</div>`;
    }
  });
  return s;
}

/* ---------------------------------------------------------------- tabela de variação */
function clsVar(x){ return x === null ? "" : x >= 0 ? "pos" : "neg"; }

function tabelaVariacao(rows){
  const head = `<tr><th>Mês</th><th>Despesas</th><th>Receitas</th><th>Saldo</th><th>Δ mês anterior</th><th>Δ %</th><th>Δ mesmo mês ano anterior</th></tr>`;
  const trs = rows.map(m => {
    const i = FULL_IDX.get(m.k);
    const prev = i > 0 ? FULL_LIST[i-1] : null;
    const yoyKey = `${+m.k.slice(0,4) - 1}${m.k.slice(4)}`;
    const yoy = FULL_IDX.has(yoyKey) ? FULL_LIST[FULL_IDX.get(yoyKey)] : null;
    const dMoM = prev ? m.desp - prev.desp : null;
    const pMoM = prev && prev.desp ? (m.desp - prev.desp) / prev.desp : null;
    const dYoY = yoy ? m.desp - yoy.desp : null;
    return `<tr data-k="${m.k}" style="cursor:pointer">
      <td>${m.label}</td>
      <td class="num">${brl2(m.desp)}</td>
      <td class="num">${brl2(m.rec)}</td>
      <td class="num ${m.saldo >= 0 ? "pos" : "neg"}">${brl2(m.saldo)}</td>
      <td class="num ${clsVar(dMoM)}">${dMoM === null ? "—" : brl2(dMoM)}</td>
      <td class="${clsVar(pMoM)}">${pMoM === null ? "—" : (pMoM*100).toFixed(1).replace(".",",") + "%"}</td>
      <td class="num ${clsVar(dYoY)}">${dYoY === null ? "—" : brl2(dYoY)}</td>
    </tr>`;
  }).join("");
  return {head, rows: trs};
}

/* ---------------------------------------------------------------- detalhe do mês */
function mostraMes(k){
  const m = FULL.get(k);
  if (!m) return;
  const i = FULL_IDX.get(k);
  const prev = i > 0 ? FULL_LIST[i-1] : null;
  const yoyKey = `${+k.slice(0,4) - 1}${k.slice(4)}`;
  const yoy = FULL_IDX.has(yoyKey) ? FULL_LIST[FULL_IDX.get(yoyKey)] : null;
  const pMoM = prev && prev.desp ? (m.desp - prev.desp) / prev.desp : null;
  const pYoY = yoy && yoy.desp ? (m.desp - yoy.desp) / yoy.desp : null;
  const cards = [
    ["Despesas", brl2(m.desp), "no mês"],
    ["Receitas", brl2(m.rec), "no mês"],
    ["Saldo", brl2(m.saldo), "receitas − despesas"],
    ["Lançamentos", fmtNum.format(m.n), "no mês"],
    ["vs. mês anterior", pMoM === null ? "—" : (pMoM*100).toFixed(1).replace(".",",") + "%", prev ? prev.label : ""],
    ["vs. mesmo mês do ano anterior", pYoY === null ? "—" : (pYoY*100).toFixed(1).replace(".",",") + "%", yoy ? yoy.label : ""],
  ];
  document.getElementById("mesTitulo").textContent = m.label;
  document.getElementById("mesDetalhe").innerHTML = cards.map(([l,v,h]) =>
    `<div class="kpi"><div class="lbl">${l}</div><div class="val">${v}</div><div class="hint">${h}</div></div>`
  ).join("");
  document.getElementById("cardMes").hidden = false;
  if (ABA !== "visao") ativaAba("visao", true);
  document.getElementById("cardMes").scrollIntoView({behavior:"smooth", block:"center"});
}

/* ---------------------------------------------------------------- filtros */
function anoDestaque(){
  if (FILTRO.startsWith("ano-")) return +FILTRO.slice(4);
  if (FILTRO.startsWith("pa-")) return 2022 + Math.floor((+FILTRO.slice(3) - 1) / 4);
  return null;
}

function selecaoHeat(){
  if (FILTRO === "todos") return null;
  if (FILTRO.startsWith("ano-")) return {ano: +FILTRO.slice(4)};
  return {keys: new Set(SLICE.meses.map(m => m.k))};
}

function atualizaResumo(){
  const s = SLICE;
  const faixa = s.periodoIni === s.periodoFim ? s.periodoIni : `${s.periodoIni} a ${s.periodoFim}`;
  document.getElementById("resumoFiltro").innerHTML =
    `<b>${esc(s.label)}</b> · ${faixa} · ${fmtNum.format(s.lancamentos)} lançamentos · <b>${brl2(s.totalDespesas)}</b> em despesas`;
}

function renderFiltros(){
  const anosHtml = DATA.anos.map(a => {
    const ativo = FILTRO === `ano-${a.ano}`;
    return `<button class="chip chip-ano ${ativo ? "is-active" : ""}" data-filtro="ano-${a.ano}"
      data-tip="${a.ano}\n${brl2(a.total)}\n${fmtNum.format(a.lancamentos)} lançamentos">
      <span class="chip-ano-num">${a.ano}</span>
    </button>`;
  }).join("");
  document.getElementById("chipsAnos").innerHTML = anosHtml;

  const pasHtml = DATA.pas.map(p => {
    const ativo = FILTRO === `pa-${p.pa}`;
    const vazio = p.total === 0;
    return `<button class="chip chip-pa ${ativo ? "is-active" : ""} ${vazio ? "is-empty" : ""}" data-filtro="pa-${p.pa}"
      data-tip="${p.label} (${p.faixa})\n${vazio ? "sem lançamentos" : brl2(p.total)}\n${fmtNum.format(p.lancamentos)} lançamentos">
      <span class="chip-pa-n">${p.pa}º PA</span>
    </button>`;
  }).join("");
  document.getElementById("chipsPas").innerHTML = pasHtml;

  document.querySelectorAll("[data-filtro]").forEach(el => {
    el.addEventListener("click", () => setFiltro(el.dataset.filtro));
  });
  bindTips();
}

function setFiltro(key){
  if (!DATA || !DATA.filtros[key]) return;
  FILTRO = key;
  SLICE = DATA.filtros[key];
  document.querySelectorAll("[data-filtro]").forEach(el => {
    el.classList.toggle("is-active", el.dataset.filtro === key);
  });
  atualizaResumo();
  renderTudo();
}

/* ---------------------------------------------------------------- estado vazio */
function vazioHtml(){
  return `<div class="vazio">
    <div class="vazio-icone">🗓️</div>
    <h2>Sem lançamentos neste período</h2>
    <p>O <b>${esc(SLICE.label)}</b> (${SLICE.periodoIni} a ${SLICE.periodoFim}) não tem despesas registradas.</p>
    <p class="vazio-dica">Escolha outro ano ou período avaliatório na barra de filtros acima.</p>
  </div>`;
}

/* ---------------------------------------------------------------- render: visão geral */
function renderVisao(){
  const s = SLICE;
  const meses = s.meses;
  const mesesComGasto = meses.filter(x => x.desp > 0).length || 1;
  const mediaMes = s.totalDespesas / mesesComGasto;
  const kpis = [
    ["Despesas no período", brl2(s.totalDespesas), esc(s.label)],
    ["Receitas / ingressos", brl2(s.totalReceitas), "no período"],
    ["Saldo do período", brl2(s.saldo), "receitas menos despesas"],
    ["Média mensal de despesa", brl2(mediaMes), `${mesesComGasto} meses com gasto`],
    ["Fornecedores", fmtNum.format(s.fornecedores), "contagem, sem identificação"],
  ];
  document.getElementById("kpis").innerHTML = kpis.map(([l,v,h]) =>
    `<div class="kpi"><div class="lbl">${l}</div><div class="val">${v}</div><div class="hint">${h}</div></div>`).join("");

  const pico = [...meses].sort((a,b) => b.desp - a.desp)[0] || {label:"—", desp:0};
  const pessoal = s.grupos.find(g => g.n === "Pessoal") || {v:0};
  const fim = s.atividades.filter(a => !EXCLUIR_ATIV.has(a.n));
  const topFim = fim[0] || {n:"—", v:0};
  const topSeg = s.segmentos.find(x => x.n !== "Folha e encargos") || {n:"—", v:0};
  document.getElementById("destaques").innerHTML =
    `<b>Destaques do período</b><br>
     • <b>Pessoal</b> concentra ${pct(pessoal.v/s.totalDespesas)} das despesas (${brl(pessoal.v)}).<br>
     • Maior frente de atividade-fim: <b>${esc(topFim.n)}</b> (${brl(topFim.v)}).<br>
     • Maior segmento de fornecedor (fora a folha): <b>${esc(topSeg.n)}</b> (${brl(topSeg.v)}).<br>
     • Mês de maior gasto: <b>${pico.label}</b> (${brl2(pico.desp)}).`;

  document.getElementById("chartMes").innerHTML = linhaMes(meses);
  document.getElementById("donutGrupo").innerHTML = donut(s.grupos, {cores:CORES_GRUPO, rotulo:"total"});
  document.getElementById("barsCat").innerHTML = barras(s.categorias, s.totalDespesas);
  document.getElementById("barsSub").innerHTML = barras(s.subcategorias, s.totalDespesas);

  document.getElementById("calloutExec").innerHTML =
    `<b>Regra da executora:</b> os gastos pagos à executora que <b>não</b> são salários, encargos ou benefícios trabalhistas
     (aluguel, contabilidade, TI, limpeza etc.) aparecem como <b>“Executora — administração (área meio)”</b>.
     A folha dela permanece no bloco <b>Pessoal (folha e encargos)</b> — nunca em área meio.`;

  document.querySelectorAll(".bar-mes").forEach(el => {
    el.addEventListener("click", () => mostraMes(el.getAttribute("data-k")));
  });
}

/* ---------------------------------------------------------------- render: atividades */
function renderAtividades(){
  const s = SLICE;
  document.getElementById("barsAtiv").innerHTML =
    barras(s.atividades, s.totalDespesas, {cor:(i,p) => CORES_ATIV[p.n] || PALETA[i % PALETA.length]});

  const fim = s.atividades.filter(a => !EXCLUIR_ATIV.has(a.n));
  const totalFim = soma(fim);
  document.getElementById("barsAtivFim").innerHTML =
    `<p class="cap">Total aplicado diretamente em frentes do projeto: <b>${brl(totalFim)}</b></p>` +
    barras(fim, totalFim, {cor:(i,p) => PALETA[(i+2) % PALETA.length]});

  const pessoal = s.atividades.find(a => a.n === "Pessoal (folha e encargos)") || {v:0};
  const admExec = s.atividades.find(a => a.n === "Executora — administração (área meio)") || {v:0};
  const adm = s.atividades.find(a => a.n === "Área Meio (administração)") || {v:0};
  const naoInf = s.atividades.find(a => a.n === "Não informada") || {v:0};
  const tot = s.totalDespesas;
  document.getElementById("calloutAtiv").innerHTML =
    `<b>Composição do gasto:</b>
     Pessoal ${pct(pessoal.v/tot)} (${brl(pessoal.v)}) ·
     Atividades-fim ${pct(totalFim/tot)} (${brl(totalFim)}) ·
     Área meio ${pct((admExec.v+adm.v)/tot)} (${brl(admExec.v+adm.v)}) ·
     Não informada ${pct(naoInf.v/tot)} (${brl(naoInf.v)}).<br>
     <span class="muted">“Área Meio” reúne custos administrativos; “Executora — administração” são os custos
     de estrutura pagos à executora (fora a folha).</span>`;
}

/* ---------------------------------------------------------------- render: fornecedores */
function renderFornecedores(){
  const s = SLICE;
  document.getElementById("barsSeg").innerHTML =
    barras(s.segmentos, s.totalDespesas, {cor:(i,p) => CORES_SEG[p.n] || PALETA[i % PALETA.length]});

  const top6 = s.segmentos.slice(0,6);
  const resto = s.segmentos.slice(6);
  const donutSeg = top6.map(x => ({...x}));
  if (resto.length) donutSeg.push({n:"Demais segmentos", v:soma(resto)});
  document.getElementById("donutSeg").innerHTML = donut(donutSeg, {cores:CORES_SEG, rotulo:"total"});

  document.getElementById("notaSeg").innerHTML =
    `Os fornecedores são identificados apenas pelo <b>segmento de atuação</b> (o que fazem), nunca pelo nome,
     CPF ou CNPJ. Salários e encargos são sempre somados em <b>“Folha e encargos”</b>, sem abrir por pessoa.
     Segmentos com menos de ${DATA.meta.minLanc} lançamentos e valor baixo são agrupados em “Demais segmentos”.`;
}

/* ---------------------------------------------------------------- render: tendências */
function renderTendencias(){
  const s = SLICE;
  document.getElementById("barsYtd").innerHTML = barrasAnos(DATA.ytd, anoDestaque());
  document.getElementById("capYtd").textContent =
    `Acumulado de janeiro a ${MESES[DATA.meta.corteYtd-1]} — mesmo recorte em todos os anos (2026 é ano em andamento até setembro).`;

  document.getElementById("heat").innerHTML = heat(FULL_LIST, selecaoHeat());
  const tab = tabelaVariacao(s.meses);
  document.getElementById("tabVar").querySelector("thead").innerHTML = tab.head;
  document.getElementById("tabVar").querySelector("tbody").innerHTML = tab.rows;

  document.querySelectorAll("#heat .c[data-k], #tabVar tbody tr[data-k]").forEach(el => {
    el.addEventListener("click", () => mostraMes(el.getAttribute("data-k")));
  });
}

/* ---------------------------------------------------------------- render: detalhamento */
function renderDetalhe(){
  const s = SLICE;
  document.getElementById("barsDet").innerHTML =
    barras(s.detalhamento, s.totalDespesas, {
      cor:(i,p) => p.n === "Não classificado" ? "#de6a3a" : PALETA[i % PALETA.length]
    });

  const q = s.qualidade;
  const cards = [
    ["Estornos", fmtNum.format(q.estornos), "lançamentos já líquidos"],
    ["Efeito dos estornos", brl2(q.estornos_valor), "valor líquido"],
    ["Possíveis duplicatas", fmtNum.format(q.possiveis_duplicatas), "marcadas, não removidas"],
    ["Não classificados", fmtNum.format(q.nao_classificados), `${brl(q.nao_classificados_valor)} em revisão`],
  ];
  document.getElementById("qualidade").innerHTML = cards.map(([l,v,h]) =>
    `<div class="kpi"><div class="lbl">${l}</div><div class="val">${v}</div><div class="hint">${h}</div></div>`).join("");
  document.getElementById("notaQualidade").textContent =
    "Estornos e possíveis duplicatas foram mantidos nos totais para conciliar com os relatórios oficiais; " +
    "apenas sinalizados aqui. O item “Não classificado” é a parcela que ainda precisa de revisão manual.";

  document.getElementById("metodo").innerHTML = `
    <p class="cap">Base: relatórios financeiros oficiais do Termo de Parceria (Diário de Entradas e Saídas),
    consolidados por período avaliatório. <b>${fmtNum.format(DATA.meta.lancamentos)} lançamentos</b> entre
    <b>${DATA.meta.periodoIni}</b> e <b>${DATA.meta.periodoFim}</b>.</p>
    <ul class="lista">
      <li><b>Somente totais agregados.</b> Não há lançamento individual, nome de pessoa, CPF, CNPJ, documento ou histórico.</li>
      <li><b>Fornecedores:</b> identificados pelo segmento de atuação. Salários e encargos sempre agrupados em “Folha e encargos”.</li>
      <li><b>Executora:</b> custos administrativos pagos a ela (fora folha) aparecem como “Executora — administração (área meio)”.</li>
      <li><b>Filtros:</b> por ano de execução (2022–2026) ou por período avaliatório trimestral (1º P.A = jan–mar/2022; 19º P.A = jul–set/2026).</li>
      <li><b>Supressão:</b> subcategorias/atividades com menos de ${DATA.meta.minLanc} lançamentos e valor baixo são agrupadas em “Demais”.</li>
      <li><b>Regime:</b> data de pagamento (caixa). Não há comparação com competência.</li>
      <li><b>Atualização:</b> manual, a partir da base tratada local.</li>
    </ul>`;
}

/* ---------------------------------------------------------------- render geral */
function mostraPainel(){
  if (!SLICE) return;
  const vazio = SLICE.lancamentos === 0;
  document.querySelectorAll(".panel").forEach(p => {
    p.hidden = vazio || p.id !== "p-" + ABA;
  });
}

function renderTudo(){
  const vazio = !SLICE.lancamentos;
  document.getElementById("vazioGeral").hidden = !vazio;
  if (vazio){
    document.getElementById("vazioGeral").innerHTML = vazioHtml();
    mostraPainel();
    return;
  }
  renderVisao();
  renderAtividades();
  renderFornecedores();
  renderTendencias();
  renderDetalhe();
  mostraPainel();
  bindTips();
}

/* ---------------------------------------------------------------- abas */
function ativaAba(nome, silencioso){
  const alvo = document.querySelector(`.tab[data-tab="${nome}"]`);
  if (!alvo) return;
  ABA = nome;
  document.querySelectorAll(".tab").forEach(t => {
    const on = t.dataset.tab === nome;
    t.classList.toggle("is-active", on);
    t.setAttribute("aria-selected", on ? "true" : "false");
    t.tabIndex = on ? 0 : -1;
  });
  mostraPainel();
  try { if (location.hash !== "#" + nome) history.replaceState(null, "", "#" + nome); } catch (e) { /* file:// */ }
  if (!silencioso) window.scrollTo({top:0, behavior:"smooth"});
}

function initAbas(){
  const tabs = [...document.querySelectorAll(".tab")];
  tabs.forEach(t => {
    t.addEventListener("click", () => ativaAba(t.dataset.tab));
    t.addEventListener("keydown", e => {
      const i = tabs.indexOf(t);
      if (e.key === "ArrowRight" || e.key === "ArrowLeft"){
        e.preventDefault();
        const j = (i + (e.key === "ArrowRight" ? 1 : tabs.length-1)) % tabs.length;
        tabs[j].focus(); ativaAba(tabs[j].dataset.tab);
      }
    });
  });
  const inicial = (location.hash || "").replace("#","");
  if (document.querySelector(`.tab[data-tab="${inicial}"]`)) ativaAba(inicial, true);
  window.addEventListener("hashchange", () => {
    const h = (location.hash || "").replace("#","");
    if (document.querySelector(`.tab[data-tab="${h}"]`)) ativaAba(h, true);
  });
}

/* ---------------------------------------------------------------- tema */
function initTema(){
  let salvo = null;
  try { salvo = localStorage.getItem("tp51-tema"); } catch (e) { /* modo privado */ }
  const prefere = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const tema = salvo || (prefere ? "dark" : "light");
  document.documentElement.dataset.theme = tema;
  const btn = document.getElementById("theme");
  const icone = () => btn.textContent = document.documentElement.dataset.theme === "dark" ? "☀️" : "🌙";
  icone();
  btn.addEventListener("click", () => {
    const novo = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = novo;
    try { localStorage.setItem("tp51-tema", novo); } catch (e) { /* ignora */ }
    icone();
  });
}

/* ---------------------------------------------------------------- inicialização */
async function main(){
  initAbas();
  initTema();
  document.getElementById("limparFiltro").addEventListener("click", () => setFiltro("todos"));

  let dados;
  try {
    const resp = await fetch("dados/dados.json", {cache:"no-store"});
    if (!resp.ok) throw new Error("HTTP " + resp.status);
    dados = await resp.json();
  } catch (err) {
    document.querySelector("main").innerHTML =
      `<div class="card"><h2>Não foi possível carregar os dados</h2>
       <p class="cap">O navegador bloqueou a leitura de <code>dados/dados.json</code> (provável abertura por <code>file://</code>).</p>
       <p class="nota">Para visualizar localmente, rode na pasta do site:
       <code>python -m http.server 8000</code> e abra <code>http://localhost:8000</code>.
       No GitHub Pages a página funciona normalmente.</p></div>`;
    return;
  }

  DATA = dados;
  FULL_LIST = DATA.filtros.todos.meses;
  FULL_IDX = new Map(FULL_LIST.map((m,i) => [m.k, i]));
  FULL_LIST.forEach(m => FULL.set(m.k, m));
  SLICE = DATA.filtros.todos;

  const m = DATA.meta;
  document.getElementById("sub").textContent =
    `${m.periodoIni} a ${m.periodoFim} · ${fmtNum.format(m.lancamentos)} lançamentos · painel público de transparência`;
  document.getElementById("foot").innerHTML =
    `<b>Fonte:</b> relatórios financeiros oficiais do Termo de Parceria nº 51/2021 (Diário de Entradas e Saídas), consolidados até ${m.periodoFim}.<span class="sep">·</span>
     <b>Proteção de dados:</b> somente totais agregados; sem nomes, CPF, CNPJ, documentos ou histórico.<span class="sep">·</span>
     <b>Atualizado em:</b> ${m.atualizado}.`;

  renderFiltros();
  atualizaResumo();
  renderTudo();
}

main();
