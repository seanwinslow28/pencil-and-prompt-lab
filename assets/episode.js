// Pencil & Prompt Lab episode page. Reads data.json (letters only, safe to show
// before anyone guesses) and, on Reveal, reveal.json (models, verdicts, everything
// else). Record modes (?record=...) draw a fixed frame for the recorder.
(() => {
  const q = new URLSearchParams(location.search);
  const REC = q.get("record");
  const root = document.getElementById("root");
  const el = (t, a = {}, kids = []) => {
    const e = document.createElement(t);
    for (const [k, v] of Object.entries(a)) {
      if (k === "text") e.textContent = v;
      else e.setAttribute(k, v);
    }
    for (const c of kids) if (c) e.append(c);
    return e;
  };
  const fit = (stage, frame) => {
    const set = () => { frame.style.transform = `scale(${stage.clientWidth / 1000})`; };
    new ResizeObserver(set).observe(stage); set();
  };
  // Takes run sandboxed: scripts yes, same-origin no.
  const mount = (stage, src) => {
    stage.textContent = "";
    const f = el("iframe", { sandbox: "allow-scripts", title: "take", src });
    stage.append(f); fit(stage, f);
  };
  const lazyMount = (stage, src) => {
    const io = new IntersectionObserver((es) => {
      if (es.some((x) => x.isIntersecting)) { io.disconnect(); mount(stage, src); }
    }, { rootMargin: "200px" });
    io.observe(stage);
  };
  const loadText = async (pre, src) => { pre.textContent = await (await fetch(src)).text(); };
  const getJSON = async (p) => (await fetch(p)).json();
  const rankWord = (n) => ["1st", "2nd", "3rd"][n - 1];

  function takeCard(t, opts = {}) {
    const card = el("article", { class: "take", id: opts.id || "" });
    const head = el("div", { class: "take-head" });
    head.append(el("span", { class: "letter", text: opts.label || t.letter }));
    const tools = el("div", { class: "tools" });
    let body;
    if (t.kind === "html") {
      body = el("div", { class: "stage" });
      const rp = el("button", { type: "button", text: "Replay" });
      rp.onclick = () => mount(body, t.src);
      tools.append(rp);
      if (opts.eager) mount(body, t.src); else lazyMount(body, t.src);
    } else {
      body = el("pre", { class: "txt", tabindex: "0" });
      loadText(body, t.src);
    }
    tools.append(el("a", { href: t.src, target: "_blank", rel: "noopener", text: "Open" }));
    head.append(tools);
    card.append(head, body);
    for (const n of t.notes || []) card.append(el("p", { class: "note", text: n }));
    return card;
  }

  // ---------- normal page ----------
  async function page() {
    const d = await getJSON("data.json");
    document.getElementById("meta").textContent = `${d.type_label} · ${d.date}`;
    const pageEl = el("main", { class: "page wrap", style: "padding:0" });
    pageEl.append(
      el("h1", { text: `${d.title} · ${d.subject}` }),
      el("p", { class: "lede", text: d.intro }),
      el("p", { class: "bar" }, [el("b", { text: "The bar" }), d.bar]),
    );
    const guess = el("div", { class: "prose hideonreveal" });
    guess.append(el("p", { class: "muted", text: d.guess_line }));
    const btnTop = el("button", { class: "btn", type: "button", text: "Reveal the models" });
    guess.append(btnTop);
    pageEl.append(guess);

    const cards = {};
    for (const b of d.briefs) {
      const sec = el("section", { class: "brief", id: b.id });
      const h = el("div", { class: "brief-head" });
      h.append(el("h2", { text: `${b.n}. ${b.name}` }), el("p", { text: b.line }));
      sec.append(h, el("p", { class: "fp", text: `Sealed brief fingerprint: sha256 ${b.sha256}` }));
      const grid = el("div", { class: "takes" });
      for (const t of b.takes) {
        const c = takeCard(t, { id: `${b.id}-${t.letter}` });
        const v = el("div", { class: "verdict" });
        c.append(v);
        cards[`${b.id}-${t.letter}`] = c;
        grid.append(c);
      }
      sec.append(grid);
      sec.append(el("div", { class: "revealonly prose", id: `${b.id}-steady`, style: "flex-direction:column" }));
      pageEl.append(sec);
    }
    const after = el("div", { id: "after", class: "wrap", style: "padding:0" });
    const btnEnd = el("button", { class: "btn hideonreveal", type: "button", text: "Reveal the models" });
    pageEl.append(btnEnd, after);
    root.append(pageEl);

    let done = false;
    const reveal = async () => {
      if (done) return; done = true;
      btnTop.disabled = btnEnd.disabled = true;
      const r = await getJSON("reveal.json");
      fillReveal(d, r, cards, after);
      document.body.classList.add("revealed");
      try { history.replaceState(null, "", "#revealed"); } catch (e) {}
    };
    btnTop.onclick = reveal; btnEnd.onclick = reveal;
    if (location.hash === "#revealed") reveal();
  }

  function fillReveal(d, r, cards, after) {
    for (const b of d.briefs) {
      const vb = r.briefs[b.id];
      for (const t of b.takes) {
        const x = vb.takes[t.letter];
        const v = cards[`${b.id}-${t.letter}`].querySelector(".verdict");
        const row = el("div", { class: "vrow" });
        row.append(el("span", { class: "model", text: x.model }),
          el("span", { class: `chip ${x.pass}`, text: x.pass }),
          el("span", { class: "chip", text: rankWord(x.rank) }));
        v.append(row, el("p", { class: "why", text: x.why }));
        if (x.steady) v.append(el("p", { class: "steady", text: x.steady }));
        for (const n of x.notes || []) v.append(el("p", { class: "note", text: n, style: "margin:0 -12px" }));
        const more = el("details", { class: "more" });
        more.append(el("summary", { text: `Attempts #2 and #3 by ${x.model}` }));
        const g = el("div", { class: "more-grid" });
        more.addEventListener("toggle", () => {
          if (!more.open || g.childElementCount) return;
          for (const m of x.more) g.append(takeCard(m, { label: `Attempt #${m.n}` }));
        });
        more.append(g);
        cards[`${b.id}-${t.letter}`].append(more);
      }
    }
    // Verdict table
    const vt = verdictTable(d, r);
    const p1 = el("section", { class: "panel" });
    p1.append(el("h2", { text: "The verdicts" }), el("p", { class: "muted", text: r.verdict_line }), el("div", { class: "tablewrap" }, [vt]));
    // Role-play finding
    const rp = r.roleplay;
    const p2 = el("section", { class: "panel" });
    p2.append(el("h2", { text: rp.heading }), el("p", { class: "prose", text: rp.body }),
      el("p", { class: "muted small", text: rp.source }), el("pre", { class: "excerpt", tabindex: "0", text: rp.excerpt }),
      el("p", { class: "note", text: rp.redaction, style: "border-radius:6px" }));
    // Footnote
    const fn = r.footnote;
    const p3 = el("section", { class: "panel" });
    const fstage = el("div", { class: "stage footstage" });
    p3.append(el("h2", { text: fn.heading }), el("p", { class: "prose", text: fn.body }), fstage,
      el("p", {}, [el("a", { href: fn.src, target: "_blank", rel: "noopener", text: "Open the footnote film on its own" })]));
    lazyMount(fstage, fn.src);
    // Method
    const m = r.method;
    const p4 = el("section", { class: "panel" });
    const ul = el("ul");
    for (const li of m.points) ul.append(el("li", { text: li }));
    const fps = el("table", { class: "fps" });
    fps.append(el("tr", {}, [el("th", { text: "Brief" }), el("th", { text: "What it asks for" }), el("th", { text: "SHA-256 of the exact message sent" })]));
    for (const f of m.fingerprints) fps.append(el("tr", {}, [el("td", { text: f.name }), el("td", { text: f.line }), el("td", {}, [el("code", { text: f.sha256 })])]));
    const red = el("ul");
    for (const x of m.redactions) red.append(el("li", { text: x }));
    p4.append(el("h2", { text: "Method" }), el("div", { class: "prose" }, [el("p", { text: m.intro }), ul]),
      el("h3", { text: "Fingerprints" }), el("p", { class: "muted small", text: m.fingerprint_line }), el("div", { class: "tablewrap" }, [fps]),
      el("h3", { text: "Redactions" }), el("div", { class: "prose" }, [el("p", { text: m.redaction_line }), red]));
    after.append(p1, p2, p3, p4);
  }

  function verdictTable(d, r, big) {
    const models = r.models;
    const t = el("table", { class: "vt" });
    t.append(el("tr", {}, [el("th", { text: "Brief" }), ...models.map((x) => el("th", { text: x }))]));
    for (const b of d.briefs) {
      const byModel = {};
      for (const [L, x] of Object.entries(r.briefs[b.id].takes)) byModel[x.model] = x;
      t.append(el("tr", {}, [el("td", { text: b.name }), ...models.map((mm) => {
        const x = byModel[mm];
        return el("td", {}, [el("span", { class: `chip ${x.pass}`, text: x.pass }), el("span", { class: "chip", text: rankWord(x.rank) })]);
      })]));
    }
    return t;
  }

  // ---------- record modes ----------
  async function record() {
    document.body.classList.add("rec");
    const d = await getJSON("data.json");
    const frame = el("div", { class: "recframe" });
    root.append(frame);
    if (REC === "verdicts") {
      const r = await getJSON("reveal.json");
      const w = el("div", { class: "recverdicts" });
      w.append(el("div", { class: "rechead" }, [el("span", { class: "q", text: `${d.title}: the verdicts` }), el("span", { class: "b", text: "Judged blind" })]),
        verdictTable(d, r), el("p", { class: "recfoot", text: `The bar: “${d.bar}”` }));
      frame.append(w);
      return ready();
    }
    if (REC === "page") {
      const b = d.briefs.find((x) => x.id === q.get("brief"));
      const t = b.takes.find((x) => x.letter === q.get("letter"));
      const w = el("div", { class: "recpage" });
      const pre = el("pre", { class: "txt" });
      w.append(el("div", { class: "rechead" }, [el("span", { class: "q", text: t.letter }), el("span", { class: "b", text: `${d.title} · ${b.name}` })]), pre);
      frame.append(w);
      await loadText(pre, t.src);
      return ready();
    }
    const b = d.briefs.find((x) => x.id === REC);
    frame.append(el("div", { class: "rechead" }, [el("span", { class: "q", text: d.record_question }), el("span", { class: "b", text: `${b.n} / ${d.briefs.length} · ${b.name}` })]));
    const grid = el("div", { class: "rectakes" });
    const starts = [];
    for (const t of b.takes) {
      const c = el("div", { class: "rectake" });
      c.append(el("span", { class: "letter", text: t.letter }));
      if (t.kind === "html") {
        const st = el("div", { class: "stage" });
        c.append(st);
        starts.push(() => mount(st, t.src));
      } else {
        const pre = el("pre", { class: "txt" });
        c.append(pre);
        await loadText(pre, t.src);
      }
      grid.append(c);
    }
    frame.append(grid);
    if (b.kind === "text") frame.append(el("p", { class: "recfoot", text: d.record_text_line }));
    // Size text columns to the space left in the frame.
    for (const pre of grid.querySelectorAll("pre.txt")) pre.style.height = `${innerHeight - pre.getBoundingClientRect().top - 60}px`;
    window.__start = () => { for (const s of starts) s(); return performance.now(); };
    return ready();
  }
  async function ready() {
    try { await document.fonts.ready; } catch (e) {}
    window.__ready = true;
  }

  (REC ? record() : page()).catch((e) => { root.append(el("p", { class: "note", text: "Could not load this episode: " + e.message })); });
})();
