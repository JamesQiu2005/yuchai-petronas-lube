/* ============================================================
   Markdown 内容渲染引擎
   读取 content/*.md → 解析 frontmatter → marked 渲染 →
   重新套用站点设计系统（规格表、产品高亮、温度/载荷等宽、
   自动侧栏导航、进场动效）。纯前端、无 CDN 依赖。
   约定：产品型号用反引号包裹，如 `G.BESLUX CROWN 系列`。
   ============================================================ */
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (window.marked && window.marked.setOptions) {
    window.marked.setOptions({ gfm: true, breaks: false, headerIds: false, mangle: false });
  }

  /* ---------- frontmatter（YAML 子集） ---------- */
  function parseFrontmatter(text) {
    text = text.replace(/^﻿/, "").replace(/\r\n/g, "\n");
    var meta = {}, body = text;
    var m = /^---\n([\s\S]*?)\n---\n?/.exec(text);
    if (m) {
      body = text.slice(m[0].length);
      var lines = m[1].split("\n");
      var key = null;
      for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        if (/^\s*$/.test(line)) continue;
        var arr = /^\s*-\s+(.*)$/.exec(line);
        if (arr && key) { (meta[key] = meta[key] || []).push(unquote(arr[1])); continue; }
        var kv = /^([A-Za-z0-9_]+):\s?(.*)$/.exec(line);
        if (kv) {
          key = kv[1];
          var val = kv[2];
          if (val === "" ) { meta[key] = []; }        // 后续 - 列表
          else if (/^\[.*\]$/.test(val)) {              // 内联数组
            meta[key] = val.slice(1, -1).split(",").map(function (s) { return unquote(s.trim()); }).filter(Boolean);
          } else { meta[key] = unquote(val); }
        }
      }
    }
    return { meta: meta, body: body };
  }
  function unquote(s) {
    s = String(s).trim();
    if ((s[0] === '"' && s.slice(-1) === '"') || (s[0] === "'" && s.slice(-1) === "'")) s = s.slice(1, -1);
    return s;
  }
  function inline(md) { return window.marked ? window.marked.parseInline(String(md || "")) : escapeHtml(md || ""); }
  function block(md) { return window.marked ? window.marked.parse(String(md || "")) : escapeHtml(md || ""); }
  function escapeHtml(s) { return String(s).replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }); }
  function slugify(s) {
    return String(s).trim().toLowerCase()
      .replace(/[（(].*?[)）]/g, "")
      .replace(/[^a-z0-9一-龥]+/g, "-")
      .replace(/^-+|-+$/g, "") || "sec";
  }

  /* ---------- 设计系统重上样式 ---------- */
  var NUMCELL = /^[\s]*[-−<>≥≤]?\s?\d[\d\s~\-−.,、()（）N℃°]*$/;

  // 提取标题末尾的 {#id} 标记 → 赋 id
  function assignHeadingIds(root) {
    root.querySelectorAll("h1,h2,h3,h4,h5,h6").forEach(function (h) {
      var m = /\s*\{#([\w\-一-龥]+)\}\s*$/.exec(h.textContent);
      if (m) { h.id = m[1]; h.textContent = h.textContent.replace(/\s*\{#[\w\-一-龥]+\}\s*$/, ""); }
    });
  }

  function stylizeContent(root) {
    assignHeadingIds(root);
    // 产品型号：<code> → 产品药丸
    root.querySelectorAll("code").forEach(function (c) {
      var span = document.createElement("span");
      span.className = "prod";
      span.textContent = c.textContent;
      c.parentNode.replaceChild(span, c);
    });
    // 规格表
    root.querySelectorAll("table").forEach(function (t) {
      t.classList.add("spec");
      if (!t.parentNode.classList.contains("table-wrap")) {
        var wrap = document.createElement("div");
        wrap.className = "table-wrap reveal";
        t.parentNode.insertBefore(wrap, t);
        wrap.appendChild(t);
      }
      // 表头列名 → 识别工况列 / 首列
      var heads = [].map.call(t.querySelectorAll("thead th"), function (th) { return th.textContent.trim(); });
      var condCols = [];
      heads.forEach(function (h, idx) { if (/工况|条件|挑战/.test(h)) condCols.push(idx); });
      t.querySelectorAll("tbody tr").forEach(function (tr) {
        var tds = tr.children;
        if (!tds.length) return;
        if (tds[0]) tds[0].classList.add("dev");
        for (var i = 0; i < tds.length; i++) {
          var td = tds[i];
          if (condCols.indexOf(i) >= 0) td.classList.add("cond");
          if (!td.querySelector(".prod") && NUMCELL.test(td.textContent) && /\d/.test(td.textContent)) td.classList.add("numcell");
        }
      });
    });
  }

  /* ---------- 侧栏导航（由 h2 自动生成） ---------- */
  function buildDocSections(container) {
    var kids = [].slice.call(container.childNodes);
    var sections = [], cur = null, n = 0;
    kids.forEach(function (node) {
      if (node.nodeType === 1 && node.tagName === "H2") {
        n++;
        cur = document.createElement("article");
        cur.className = "doc-section reveal";
        cur.id = node.id || slugify(node.textContent) || ("sec-" + n);
        var no = String(n).padStart(2, "0");
        var h2 = document.createElement("h2");
        h2.innerHTML = '<span class="no">' + no + "</span>" + node.innerHTML;
        cur.appendChild(h2);
        container.replaceChild(cur, node);
        sections.push({ id: cur.id, title: node.textContent, no: no });
      } else if (cur && node.nodeType === 1) {
        cur.appendChild(node);
      }
    });
    return sections;
  }

  function buildSideRail(sections) {
    var rail = document.createElement("aside");
    rail.className = "side-rail";
    var html = '<div class="rail-title">目 录 导 航</div><ol>';
    sections.forEach(function (s) {
      html += '<li><a href="#' + s.id + '"><span class="no">' + s.no + "</span>" + escapeHtml(s.title) + "</a></li>";
    });
    rail.innerHTML = html + "</ol>";
    return rail;
  }

  function setupScrollspy(rail, sections) {
    var links = [].slice.call(rail.querySelectorAll("a[href^='#']"));
    var targets = sections.map(function (s) { return document.getElementById(s.id); }).filter(Boolean);
    function spy() {
      var pos = window.scrollY + 140, current = targets[0];
      targets.forEach(function (sec) { if (sec.offsetTop <= pos) current = sec; });
      links.forEach(function (a) { a.classList.toggle("current", current && a.getAttribute("href") === "#" + current.id); });
    }
    window.addEventListener("scroll", spy, { passive: true });
    spy();
  }

  /* 渲染后滚动到锚点（内容为 JS 动态注入，需手动定位） */
  function scrollToHash() {
    if (!location.hash) return;
    var id; try { id = decodeURIComponent(location.hash.slice(1)); } catch (e) { id = location.hash.slice(1); }
    var el = document.getElementById(id);
    if (el) setTimeout(function () { el.scrollIntoView({ block: "start" }); }, 80);
  }

  /* ---------- 进场动效 ---------- */
  function setupReveal(scope) {
    var els = (scope || document).querySelectorAll(".reveal");
    if ("IntersectionObserver" in window && !reduced) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
      }, { threshold: 0.1, rootMargin: "0px 0px -40px 0px" });
      els.forEach(function (el) { io.observe(el); });
    } else { els.forEach(function (el) { el.classList.add("in"); }); }
  }

  /* ---------- 页头 ---------- */
  function buildHero(meta, base, crumbTrail) {
    var chips = (meta.chips || []).map(function (c) { return '<span class="chip">' + inline(c) + "</span>"; }).join("");
    var crumbs = crumbTrail.map(function (c) {
      return c.href ? '<a href="' + c.href + '">' + escapeHtml(c.text) + "</a>" : "<span>" + escapeHtml(c.text) + "</span>";
    }).join('<span class="sep">/</span>');
    return '' +
      '<section class="page-hero"><div class="hero-grid" aria-hidden="true"></div>' +
      '<div class="page-hero-inner">' +
      '<nav class="crumbs" aria-label="面包屑">' + crumbs + "</nav>" +
      "<h1>" + escapeHtml(meta.title || "") + "</h1>" +
      (meta.lede ? '<p class="lede">' + inline(meta.lede) + "</p>" : "") +
      (chips ? '<div class="meta-chips">' + chips + "</div>" : "") +
      "</div></section>";
  }

  /* ---------- 各版式渲染 ---------- */
  function renderSolution(root, meta, body, base) {
    var trail = [
      { text: "首页", href: base + "index.html" },
      { text: "行业解决方案", href: base + "solutions/steel.html" },
      { text: meta.crumb || meta.title }
    ];
    var content = document.createElement("div");
    content.innerHTML = block(body);
    stylizeContent(content);
    var sections = buildDocSections(content);

    var section = document.createElement("section");
    section.className = "section";
    var wrap = document.createElement("div");
    wrap.className = "container handbook";
    var rail = buildSideRail(sections);
    var col = document.createElement("div");
    col.appendChild(content);
    var cta = document.createElement("div");
    cta.className = "reveal";
    cta.style.marginTop = "8px";
    cta.innerHTML = '<a class="btn btn-red" href="' + base + 'about.html#contact">获取选型方案</a>';
    col.appendChild(cta);
    wrap.appendChild(rail); wrap.appendChild(col);
    section.appendChild(wrap);

    root.innerHTML = buildHero(meta, base, trail);
    root.appendChild(section);
    sizeTranges(root);
    setupReveal(root);
    setupScrollspy(rail, sections);
    scrollToHash();
  }

  function renderDoc(root, meta, body, base, crumbTrail) {
    var content = document.createElement("section");
    content.className = "section";
    var c = document.createElement("div");
    c.className = "container prose reveal";
    c.innerHTML = block(body);
    stylizeContent(c);
    content.appendChild(c);
    root.innerHTML = buildHero(meta, base, crumbTrail);
    root.appendChild(content);
    setupReveal(root);
    scrollToHash();
  }

  /* 温度/载荷条：可选，由 markdown 中的 <span data-lo data-hi> 触发（当前自动样式已足够） */
  function sizeTranges(root) {
    root.querySelectorAll(".trange .bar i").forEach(function (bar) {
      var lo = parseFloat(bar.getAttribute("data-lo")), hi = parseFloat(bar.getAttribute("data-hi"));
      var MIN = -40, MAX = 300;
      var l = Math.max(0, (lo - MIN) / (MAX - MIN) * 100), r = Math.min(100, (hi - MIN) / (MAX - MIN) * 100);
      bar.style.left = l + "%"; bar.style.width = Math.max(4, r - l) + "%";
    });
  }

  /* ---------- 首页：填充文字槽 + 渲染正文 ---------- */
  function renderHome(root, meta, body) {
    setSlot("home-title", meta.title, true);
    setSlot("home-sub", meta.subtitle, true);
    var host = document.getElementById("home-content");
    if (host) {
      host.innerHTML = block(body);
      stylizeContent(host);
      groupCards(host);
      setupReveal(host);
    }
  }
  // 把连续的 h3（+其后段落）打包成卡片网格
  function groupCards(host) {
    var kids = [].slice.call(host.children), i = 0;
    while (i < kids.length) {
      if (kids[i].tagName === "H3") {
        var grid = document.createElement("div");
        grid.className = "adv-grid";
        host.insertBefore(grid, kids[i]);
        while (i < kids.length && kids[i].tagName === "H3") {
          var card = document.createElement("div");
          card.className = "card reveal";
          card.appendChild(kids[i]);
          var j = i + 1;
          while (j < kids.length && kids[j].tagName !== "H3" && kids[j].tagName !== "H2") { card.appendChild(kids[j]); j++; }
          grid.appendChild(card);
          i = j;
        }
      } else i++;
    }
  }
  function setSlot(id, md, isInline) {
    var el = document.getElementById(id);
    if (el && md != null) el.innerHTML = isInline ? inline(md) : block(md);
  }

  /* ---------- 客户案例：列表 + 详情 ---------- */
  function caseCard(item, base) {
    var metrics = (item.metrics || []).map(function (m) {
      var p = String(m).split("|"); return '<div class="m"><div class="v">' + escapeHtml(p[0] || "") + '</div><div class="k">' + escapeHtml(p[1] || "") + "</div></div>";
    }).join("");
    return '<a class="card case-card reveal" href="' + base + 'case.html?slug=' + encodeURIComponent(item.slug) + '">' +
      '<div class="case-top"><span class="case-tag">' + escapeHtml(item.tag || item.industry || "客户案例") + "</span>" +
      "<h3>" + escapeHtml(item.title || "") + "</h3>" +
      '<div class="who">' + escapeHtml(item.client || "") + "</div></div>" +
      '<div class="case-body">' +
      (item.summary ? '<div class="kv"><span class="k">痛点：</span><span class="v">' + escapeHtml(item.summary) + "</span></div>" : "") +
      (metrics ? '<div class="case-metrics">' + metrics + "</div>" : "") +
      "</div></a>";
  }

  function fillHomeCases(base) {
    var host = document.getElementById("home-cases");
    if (!host) return;
    fetch(base + "content/cases/manifest.json").then(function (r) { return r.json(); }).then(function (list) {
      list = (list || []).slice().sort(function (a, b) { return String(b.date || "").localeCompare(String(a.date || "")); }).slice(0, 3);
      host.innerHTML = list.map(function (it) { return caseCard(it, base); }).join("");
      setupReveal(host);
    }).catch(function () {});
  }

  function renderCasesIndex(root, base) {
    var hero = buildHero({
      title: "客户案例",
      lede: "每个案例都遵循同一套汇报框架：项目背景 → 解决方案 → 实施效果（数据对比）→ 客户反馈 → 总结与展望。以下为示例案例，结构即为标准汇报模板，正式案例数据经客户确认后持续更新。",
      chips: ["统一汇报框架", "前后数据对比", "示例内容 · 持续更新"]
    }, base, [{ text: "首页", href: base + "index.html" }, { text: "客户案例" }]);
    root.innerHTML = hero +
      '<section class="section"><div class="container">' +
      '<div class="grid c3" id="cases-index"></div>' +
      '<div class="reveal" style="text-align:center;margin-top:40px"><a class="btn btn-red" href="' + base + 'about.html#contact">提交您的工况，开启验证</a></div>' +
      "</div></section>";
    fetch(base + "content/cases/manifest.json").then(function (r) { return r.json(); }).then(function (list) {
      list = (list || []).slice().sort(function (a, b) { return String(b.date || "").localeCompare(String(a.date || "")); });
      var host = document.getElementById("cases-index");
      host.innerHTML = list.map(function (it) { return caseCard(it, base); }).join("") || '<p style="color:var(--gray)">暂无案例。</p>';
      setupReveal(host);
    }).catch(function () {
      document.getElementById("cases-index").innerHTML = '<p style="color:var(--gray)">案例加载失败。</p>';
    });
  }

  function renderCaseDetail(root, base) {
    var slug = new URLSearchParams(location.search).get("slug");
    if (!slug) { location.replace(base + "cases.html"); return; }
    fetch(base + "content/cases/" + slug + ".md").then(function (r) {
      if (!r.ok) throw new Error("404"); return r.text();
    }).then(function (text) {
      var pf = parseFrontmatter(text), meta = pf.meta;
      var trail = [
        { text: "首页", href: base + "index.html" },
        { text: "客户案例", href: base + "cases.html" },
        { text: meta.title || "案例" }
      ];
      var head = "";
      if (meta.client || meta.industry || meta.date) {
        head = '<div class="case-detail-head"><h3>' + escapeHtml(meta.title || "") + "</h3>" +
          (meta.client ? '<span class="meta">客户：<b>' + escapeHtml(meta.client) + "</b></span>" : "") +
          (meta.industry ? '<span class="meta">行业：<b>' + escapeHtml(meta.industry) + "</b></span>" : "") +
          (meta.date ? '<span class="meta">日期：<b>' + escapeHtml(meta.date) + "</b></span>" : "") + "</div>";
      }
      var content = document.createElement("div");
      content.innerHTML = block(pf.body);
      stylizeContent(content);
      var wrap = document.createElement("section");
      wrap.className = "section";
      var container = document.createElement("div");
      container.className = "container";
      var article = document.createElement("article");
      article.className = "case-detail reveal";
      article.innerHTML = head;
      var bodyDiv = document.createElement("div");
      bodyDiv.className = "case-detail-body prose";
      while (content.firstChild) bodyDiv.appendChild(content.firstChild);
      article.appendChild(bodyDiv);
      container.appendChild(article);
      var backP = document.createElement("div");
      backP.className = "reveal";
      backP.style.textAlign = "center";
      backP.innerHTML = '<a class="btn btn-teal" href="' + base + 'cases.html">← 返回全部案例</a>';
      container.appendChild(backP);
      wrap.appendChild(container);
      document.title = (meta.title || "客户案例") + " · 玉柴马石油";
      root.innerHTML = buildHero(meta, base, trail);
      root.appendChild(wrap);
      setupReveal(root);
      scrollToHash();
    }).catch(function () {
      root.innerHTML = '<section class="section"><div class="container"><p style="color:var(--gray)">案例未找到。<a href="' + base + 'cases.html">返回案例列表</a></p></div></section>';
    });
  }

  /* ---------- 调度 ---------- */
  function boot() {
    var root = document.getElementById("page-root");
    var base = (root && root.getAttribute("data-base")) || "";
    var layout = root && root.getAttribute("data-layout");

    if (root && layout === "cases-index") { renderCasesIndex(root, base); return; }
    if (root && layout === "case") { renderCaseDetail(root, base); return; }

    if (!root || !root.getAttribute("data-content")) {
      // 首页：#page-root 可能不存在，直接找槽位
      var homec = document.getElementById("home-content");
      if (homec) {
        var hbase = homec.getAttribute("data-base") || "";
        var hp = homec.getAttribute("data-content");
        if (hp) fetch(hp).then(function (r) { return r.text(); }).then(function (t) {
          var pf = parseFrontmatter(t); renderHome(document, pf.meta, pf.body);
        });
        fillHomeCases(hbase);
      }
      return;
    }

    var path = root.getAttribute("data-content");
    fetch(path).then(function (r) { return r.text(); }).then(function (text) {
      var pf = parseFrontmatter(text), meta = pf.meta;
      if (meta.title) document.title = meta.title + " · 玉柴马石油";
      if (layout === "solution") renderSolution(root, meta, pf.body, base);
      else {
        var trail = [{ text: "首页", href: base + "index.html" }, { text: meta.title || "" }];
        renderDoc(root, meta, pf.body, base, trail);
      }
    }).catch(function () {
      root.innerHTML = '<section class="section"><div class="container"><p style="color:var(--gray)">内容加载失败，请稍后重试。</p></div></section>';
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
