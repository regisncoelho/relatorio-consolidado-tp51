/* ============================================================
   Relatório Financeiro Agregado — TP 51/2021
   Dados 100% agregados (dados/dados.json). Sem dados pessoais.
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

const brl  = v => fmt0.format(v);
const brl2 = v => fmt2.format(v);
const pct  = v => (v*100).toFixed(1).replace(".",",") + "%";
const compact = v => Math.abs(v) >= 1e6 ? (v/1e6).toFixed(1).replace(".",",") + " mi"
                    : Math.abs(v) >= 1e3 ? (v/1e3).toFixed(0) + " mil" : String(Math.round(v));
const esc  = s => String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
const mesLabel = k => MESES[+k.slice(5,7)-1] + "/" + k.slice(0,4);
const soma = arr => arr.reduce((s,x) => s + (x.v ?? x), 0);

let DATA = null;
const porMes = new Map();

/* ---------------------------------------------------------------- tooltip */
const tip = document.getElementById("tip");
function bindTips(root = document){
  root.querySelectorAll("[data-tip]").forEach(el => {
    el.addEventListener("mouseenter", e => {
      tip.textContent = el.getAttribute("data-tip");
      tip.classList.add("show");
    });
    el.addEventListener("mousemove", e => {
      tip.style.left = e.clientX + "px";
      tip.style.top  = e.clientY + "px";
    });
    el.addEventListener("mouseleave", () => tip.classList.remove("show"));
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
    const n = p.n_lanc ? `${fmtNum.format(p.n_lanc)} lanç.` : "agrupado";
    const clicavel = opts.onClick ? " clickable" : "";
    const attrs = opts.onClick ? ` data-idx="${i}"` : "";
    const c = p.cor || cor(i, p);
    return `<div class="bar-row${clicavel}"${attrs} data-tip="${esc(p.n)}\n${brl2(p.v)}${share ? "  (" + pct(p.v/total) + ")" : ""}\n${n}">
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
  const step = Math.ceil(meses.length / 9);
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

/* ---------------------------------------------------------------- heatmap */
function heat(meses){
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
      s += `<div class="c" style="background:${bg};color:${fg}" data-k="${key}"
        data-tip="${mesLabel(key)}\nDespesas: ${brl2(m.desp)}\n${fmtNum.format(m.n)} lançamentos">${compact(m.desp)}</div>`;
    }
  });
  return s;
}

/* ---------------------------------------------------------------- tabela de variação */
function tabelaVariacao(meses){
  const idx = new Map(meses.map((m,i) => [m.k, i]));
  const head = `<tr><th>Mês</th><th>Despesas</th><th>Receitas</th><th>Saldo</th><th>Δ mês anterior</th><th>Δ %</th><th>Δ mesmo mês ano anterior</th></tr>`;
  const rows = meses.map(m => {
    const i = idx.get(m.k);
    const prev = i > 0 ? meses[i-1] : null;
    const yoyKey = `${+m.k.slice(0,4) - 1}${m.k.slice(4)}`;
    const yoy = idx.has(yoyKey) ? meses[idx.get(yoyKey)] : null;
    const dMoM = prev ? m.desp - prev.desp : null;
    const pMoM = prev && prev.desp ? (m.desp - prev.desp) / prev.desp : null;
    const dYoY = yoy ? m.desp - yoy.desp : null;
    const cls = x => x === null ? "" : x >= 0 ? "pos" : "neg";
    return `<tr data-k="${m.k}" style="cursor:pointer">
      <td>${m.label}</td>
      <td class="num">${brl2(m.desp)}</td>
      <td class="num">${brl2(m.rec)}</td>
      <td class="num ${m.saldo >= 0 ? "pos" : "neg"}">${brl2(m.saldo)}</td>
      <td class="num ${cls(dMoM)}">${dMoM === null ? "—" : brl2(dMoM)}</td>
      <td class="${cls(pMoM)}">${pMoM === null ? "—" : (pMoM*100).toFixed(1).replace(".",",") + "%"}</td>
      <td class="num ${cls(dYoY)}">${dYoY === null ? "—" : brl2(dYoY)}</td>
    </tr>`;
  }).join("");
  return {head, rows};
}

/* ---------------------------------------------------------------- detalhe do mês */
function mostraMes(k){
  const m = porMes.get(k);
  if (!m) return;
  const idx = DATA.meses.findIndex(x => x.k === k);
  const prev = idx > 0 ? DATA.meses[idx-1] : null;
  const yoyKey = `${+k.slice(0,4) - 1}${k.slice(4)}`;
  const yoy = porMes.get(yoyKey);
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
  // se o clique veio de outra aba, volta para a Visão geral
  if (document.querySelector('[data-tab="visao"]').getAttribute("aria-selected") !== "true") {
    ativaAba("visao", true);
  }
  document.getElementById("cardMes").scrollIntoView({behavior:"smooth", block:"center"});
}

/* ---------------------------------------------------------------- render: visão geral */
function renderVisao(){
  const m = DATA.meta;
  const meses = DATA.meses;
  const mediaMes = m.totalDespesas / meses.filter(x => x.desp > 0).length;
  const kpis = [
    ["Despesas no período", brl2(m.totalDespesas), "todos os gastos pagos"],
    ["Receitas / ingressos", brl2(m.totalReceitas), "repasses, rendimentos e receitas próprias"],
    ["Saldo do período", brl2(m.saldo), "receitas menos despesas"],
    ["Média mensal de despesa", brl2(mediaMes), `${meses.filter(x=>x.desp>0).length} meses com gasto`],
    ["Fornecedores", fmtNum.format(m.fornecedores), "contagem, sem identificação"],
  ];
  document.getElementById("kpis").innerHTML = kpis.map(([l,v,h]) =>
    `<div class="kpi"><div class="lbl">${l}</div><div class="val">${v}</div><div class="hint">${h}</div></div>`).join("");

  const pico = [...meses].sort((a,b) => b.desp - a.desp)[0];
  const pessoal = DATA.grupos.find(g => g.n === "Pessoal");
  const consult = DATA.segmentos.find(s => s.n === "Consultoria técnica");
  const regular = DATA.atividades.find(a => a.n === "Regularização fundiária do PERD");
  document.getElementById("destaques").innerHTML =
    `<b>Destaques</b><br>
     • <b>Pessoal</b> concentra ${pct(pessoal.v/m.totalDespesas)} das despesas (${brl(pessoal.v)}).<br>
     • Maior frente de atividade: <b>${regular ? regular.n : "—"}</b> (${brl(regular ? regular.v : 0)}).<br>
     • Maior segmento de fornecedor: <b>Consultoria técnica</b> (${brl(consult ? consult.v : 0)}), atrás apenas da folha.<br>
     • Mês de maior gasto: <b>${pico.label}</b> (${brl2(pico.desp)}).`;

  document.getElementById("chartMes").innerHTML = linhaMes(meses);
  document.getElementById("donutGrupo").innerHTML = donut(DATA.grupos, {cores:CORES_GRUPO, rotulo:"total"});
  document.getElementById("barsCat").innerHTML = barras(DATA.categorias, m.totalDespesas);
  document.getElementById("barsSub").innerHTML = barras(DATA.subcategorias, m.totalDespesas);

  document.getElementById("calloutExec").innerHTML =
    `<b>Regra da executora:</b> os gastos pagos à executora que <b>não</b> são salários, encargos ou benefícios trabalhistas
     (aluguel, contabilidade, TI, limpeza etc.) aparecem como <b>“Executora — administração (área meio)”</b>.
     A folha dela permanece no bloco <b>Pessoal (folha e encargos)</b> — nunca em área meio.`;

  document.querySelectorAll(".bar-mes, .heat .c[data-k]").forEach(el => {
    el.addEventListener("click", () => mostraMes(el.getAttribute("data-k")));
  });
}

/* ---------------------------------------------------------------- render: atividades */
function renderAtividades(){
  const m = DATA.meta;
  const ativ = DATA.atividades;
  const corAtiv = (i,p) => CORES_ATIV[p.n] || PALETA[i % PALETA.length];
  document.getElementById("barsAtiv").innerHTML =
    barras(ativ, m.totalDespesas, {cor:corAtiv});

  const excluir = new Set(["Pessoal (folha e encargos)","Executora — administração (área meio)",
                           "Área Meio (administração)","Não informada","Demais atividades"]);
  const fim = ativ.filter(a => !excluir.has(a.n));
  const totalFim = soma(fim);
  document.getElementById("barsAtivFim").innerHTML =
    `<p class="cap">Total aplicado diretamente em frentes do projeto: <b>${brl(totalFim)}</b></p>` +
    barras(fim, totalFim, {cor:(i,p) => PALETA[(i+2) % PALETA.length]});

  const pessoal = ativ.find(a => a.n === "Pessoal (folha e encargos)") || {v:0};
  const admExec = ativ.find(a => a.n === "Executora — administração (área meio)") || {v:0};
  const adm = ativ.find(a => a.n === "Área Meio (administração)") || {v:0};
  const naoInf = ativ.find(a => a.n === "Não informada") || {v:0};
  const tot = m.totalDespesas;
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
  const m = DATA.meta;
  const seg = DATA.segmentos;
  document.getElementById("barsSeg").innerHTML =
    barras(seg, m.totalDespesas, {cor:(i,p) => CORES_SEG[p.n] || PALETA[i % PALETA.length]});

  const top6 = seg.slice(0,6);
  const resto = seg.slice(6);
  const donutSeg = top6.map(s => ({...s}));
  if (resto.length) donutSeg.push({n:"Demais segmentos", v:soma(resto)});
  document.getElementById("donutSeg").innerHTML =
    donut(donutSeg, {cores:CORES_SEG, rotulo:"total"});

  document.getElementById("barsForma").innerHTML =
    barras(DATA.formas.filter(f => f.v > 0), m.totalDespesas, {cor:i => PALETA[(i+3) % PALETA.length]});

  const negativas = DATA.formas.filter(f => f.v < 0);
  const notaForma = negativas.length
    ? `<p class="nota">Estornos já líquidos: ${negativas.map(f => `${esc(f.n)} ${brl2(f.v)}`).join(" · ")} (não aparecem na barra).</p>`
    : "";
  document.getElementById("barsForma").insertAdjacentHTML("afterend", notaForma);

  document.getElementById("notaSeg").innerHTML =
    `Os fornecedores são identificados apenas pelo <b>segmento de atuação</b> (o que fazem), nunca pelo nome,
     CPF ou CNPJ. Salários e encargos são sempre somados em <b>“Folha e encargos”</b>, sem abrir por pessoa.
     Segmentos com menos de ${m.minLanc} lançamentos e valor baixo são agrupados em “Demais segmentos”.`;
}

/* ---------------------------------------------------------------- render: tendências */
function renderTendencias(){
  const m = DATA.meta;
  const ytd = DATA.ytd;
  document.getElementById("barsYtd").innerHTML =
    barras(ytd.map(y => ({n:String(y.ano), v:y.v})), 0, {cor:i => "#1f3864"});
  document.getElementById("capYtd").textContent =
    `Acumulado de janeiro a ${MESES[m.corteYtd-1]} — mesmo recorte em todos os anos (2026 é ano em andamento até setembro).`;

  document.getElementById("heat").innerHTML = heat(DATA.meses);
  const tab = tabelaVariacao(DATA.meses);
  document.getElementById("tabVar").querySelector("thead").innerHTML = tab.head;
  document.getElementById("tabVar").querySelector("tbody").innerHTML = tab.rows;

  document.querySelectorAll("#heat .c[data-k], #tabVar tbody tr[data-k]").forEach(el => {
    el.addEventListener("click", () => mostraMes(el.getAttribute("data-k")));
  });
}

/* ---------------------------------------------------------------- render: detalhamento */
function renderDetalhe(){
  const m = DATA.meta;
  document.getElementById("barsDet").innerHTML =
    barras(DATA.detalhamento, m.totalDespesas, {
      cor:(i,p) => p.n === "Não classificado" ? "#de6a3a" : PALETA[i % PALETA.length]
    });

  const q = DATA.qualidade;
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
    consolidados por período avaliatório. <b>${fmtNum.format(m.lancamentos)} lançamentos</b> entre
    <b>${m.periodoIni}</b> e <b>${m.periodoFim}</b>.</p>
    <ul class="lista">
      <li><b>Somente totais agregados.</b> Não há lançamento individual, nome de pessoa, CPF, CNPJ, documento ou histórico.</li>
      <li><b>Fornecedores:</b> identificados pelo segmento de atuação. Salários e encargos sempre agrupados em “Folha e encargos”.</li>
      <li><b>Executora:</b> custos administrativos pagos a ela (fora folha) aparecem como “Executora — administração (área meio)”.</li>
      <li><b>Supressão:</b> subcategorias/atividades com menos de ${m.minLanc} lançamentos e valor baixo são agrupadas em “Demais”.</li>
      <li><b>Regime:</b> data de pagamento (caixa). Não há comparação com competência.</li>
      <li><b>Atualização:</b> manual, a partir da base tratada local.</li>
    </ul>`;
}

/* ---------------------------------------------------------------- abas */
function ativaAba(nome, silencioso){
  const alvo = document.querySelector(`.tab[data-tab="${nome}"]`);
  if (!alvo) return;
  document.querySelectorAll(".tab").forEach(t => {
    const on = t.dataset.tab === nome;
    t.classList.toggle("is-active", on);
    t.setAttribute("aria-selected", on ? "true" : "false");
    t.tabIndex = on ? 0 : -1;
  });
  document.querySelectorAll(".panel").forEach(p => { p.hidden = p.id !== "p-" + nome; });
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
  DATA.meses.forEach(m => porMes.set(m.k, m));

  const m = DATA.meta;
  document.getElementById("sub").textContent =
    `${m.periodoIni} a ${m.periodoFim} · ${fmtNum.format(m.lancamentos)} lançamentos · painel público de transparência`;
  document.getElementById("foot").innerHTML =
    `<b>Fonte:</b> relatórios financeiros oficiais do Termo de Parceria nº 51/2021 (Diário de Entradas e Saídas), consolidados até ${m.periodoFim}.<span class="sep">·</span>
     <b>Proteção de dados:</b> somente totais agregados; sem nomes, CPF, CNPJ, documentos ou histórico.<span class="sep">·</span>
     <b>Atualizado em:</b> ${m.atualizado}.`;

  renderVisao();
  renderAtividades();
  renderFornecedores();
  renderTendencias();
  renderDetalhe();
  bindTips();
}

main();
