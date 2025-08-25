(function () {
  function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&");
  }

  function getTextNodes(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) {
      const parentEl = walker.currentNode.parentNode;
      if (!parentEl) continue;
      const tag = parentEl.tagName.toLowerCase();

      if (["script", "style", "code", "pre", "noscript", "meta", "title"].includes(tag)) continue;

      const style = window.getComputedStyle(parentEl);
      const ariaHidden = parentEl.getAttribute("aria-hidden") === "true";
      if (style.display === "none" || style.visibility === "hidden" || ariaHidden) continue;

      nodes.push(walker.currentNode);
    }
    return nodes;
  }

  function buildCombinedRegex(terms) {
    const patterns = terms.map(t => escapeRegex(t.term.trim()));
    return new RegExp(`(^|\\W)(${patterns.join("|")})(?=\\W|$)`, "gi");
  }

  function highlightMatches(nodes, regex, termMap) {
    const matchesByTerm = new Map();
    const termCounts = new Map();
    let matchId = 0;
    const exceptions = (window.hypeLessExceptions || []).map(e => e.toLowerCase());

    nodes.forEach(node => {
      let replaced = false;
      const newHTML = node.textContent.replace(regex, (match, prefix, word, offset, fullText) => {
        const term = word.toLowerCase();
        const contextWindow = fullText
          .slice(Math.max(0, offset - 30), offset + word.length + 30)
          .toLowerCase();

        if (exceptions.some(exc => contextWindow.includes(exc))) return match;

        const explanation = termMap.get(term) || "";
        const id = "hypeLessMatch" + matchId++;
        if (!matchesByTerm.has(term)) matchesByTerm.set(term, []);
        matchesByTerm.get(term).push({ id, explanation });
        termCounts.set(term, (termCounts.get(term) || 0) + 1);

        replaced = true;
        return `${prefix}<mark id="${id}" class="hypeless-highlight" data-expl="${explanation}">${word}</mark>`;
      });

      if (replaced && node.parentNode) {
        const wrapper = document.createElement("span");
        wrapper.innerHTML = newHTML;
        node.parentNode.replaceChild(wrapper, node);
      }
    });

    return { matchesByTerm, termCounts };
  }

  function buildSidebar(termCounts, matchesByTerm) {
    const sidebar = document.createElement("div");
    sidebar.id = "hypeless-sidebar";

    const itemsHTML = [...termCounts.entries()]
      .filter(([_, count]) => count > 0)
      .map(([term, count]) => {
        const explanation = matchesByTerm.get(term)?.[0]?.explanation || "";
        return `
          <div class="hypeless-item" data-term="${term}">
            <b>${term}</b> (${count})<br>
            <small>${explanation}</small>
          </div>
        `;
      })
      .join("");

    sidebar.innerHTML = `
      <div id="hypeless-header">
        <span>HypeLessLi v3</span>
        <div>
          <button id="hypeless-help">Info</button>
          <button id="hypeless-toggle">Hide</button>
        </div>
      </div>
      <div id="hypeless-content">${itemsHTML}</div>
      <div id="hypeless-help-popup">
        <b>HypeLessLi Help</b><br><br>
        - Highlights hype/buzz words in text.<br>
        - Hover a highlighted word to see explanation.<br>
        - Click a term in sidebar to jump to it.<br>
        - Resize sidebar by dragging its edge.<br>
        - Toggle with "Info" or the floating “HypeLessLi” button.<br>
      </div>
    `;
    document.body.appendChild(sidebar);

    // --- Add custom visible resizer handle ---
    const resizer = document.createElement("div");
    resizer.id = "hypeless-resizer";
    sidebar.appendChild(resizer);

    return sidebar;
  }

  function buildFloatButton() {
    const btn = document.createElement("button");
    btn.id = "hypeless-float-btn";
    btn.innerText = "HypeLessLi";
    document.body.appendChild(btn);
    return btn;
  }

  function buildTooltip() {
    const tooltip = document.createElement("div");
    tooltip.id = "hypeless-tooltip";
    document.body.appendChild(tooltip);
    return tooltip;
  }

  function setupInteractions(sidebar, floatBtn, matchesByTerm, tooltip) {
    const termPositions = new Map();
    for (const term of matchesByTerm.keys()) termPositions.set(term, 0);

    sidebar.addEventListener("click", e => {
      const item = e.target.closest(".hypeless-item");
      if (!item) return;
      const term = item.dataset.term;
      const termMatches = matchesByTerm.get(term) || [];
      if (termMatches.length === 0) return;

      let index = termPositions.get(term) % termMatches.length;
      const { id } = termMatches[index];
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("hypeless-focus");
        setTimeout(() => el.classList.remove("hypeless-focus"), 2000);
      }
      termPositions.set(term, (index + 1) % termMatches.length);
    });

    sidebar.addEventListener("mouseover", e => {
      const item = e.target.closest(".hypeless-item");
      if (!item) return;
      const term = item.dataset.term;
      (matchesByTerm.get(term) || []).forEach(m => {
        document.getElementById(m.id)?.classList.add("hypeless-preview");
      });
    });
    sidebar.addEventListener("mouseout", e => {
      const item = e.target.closest(".hypeless-item");
      if (!item) return;
      const term = item.dataset.term;
      (matchesByTerm.get(term) || []).forEach(m => {
        document.getElementById(m.id)?.classList.remove("hypeless-preview");
      });
    });

    const toggleSidebar = () => {
      sidebar.classList.toggle("collapsed");
      floatBtn.style.display = sidebar.classList.contains("collapsed") ? "block" : "none";
    };
    document.getElementById("hypeless-toggle").addEventListener("click", toggleSidebar);
    floatBtn.addEventListener("click", toggleSidebar);

    document.getElementById("hypeless-help").addEventListener("click", () => {
      const popup = document.getElementById("hypeless-help-popup");
      popup.classList.toggle("visible");
    });

    document.body.addEventListener("mouseover", e => {
      if (e.target.classList.contains("hypeless-highlight")) {
        const expl = e.target.getAttribute("data-expl");
        if (expl) {
          tooltip.innerText = expl;
          tooltip.style.display = "block";
        }
      }
    });
    document.body.addEventListener("mousemove", e => {
      if (tooltip.style.display === "block") {
        tooltip.style.left = e.pageX + 12 + "px";
        tooltip.style.top = e.pageY + 12 + "px";
      }
    });
    document.body.addEventListener("mouseout", e => {
      if (e.target.classList.contains("hypeless-highlight")) {
        tooltip.style.display = "none";
      }
    });

    // --- Custom sidebar resizing logic ---
    const resizerEl = document.getElementById("hypeless-resizer");
    if (resizerEl) {
      const css = getComputedStyle(sidebar);
      const minW = parseInt(css.minWidth, 10) || 180;
      const maxW = parseInt(css.maxWidth, 10) || 500;
      let startX = 0;
      let startW = 0;

      const onPointerMove = (e) => {
        const dx = startX - e.clientX; // drag left increases width
        let newW = Math.min(maxW, Math.max(minW, startW + dx));
        sidebar.style.width = newW + "px";
      };

      const onPointerUp = () => {
        sidebar.classList.remove("resizing");
        document.removeEventListener("pointermove", onPointerMove);
        document.removeEventListener("pointerup", onPointerUp);
      };

      const onPointerDown = (e) => {
        if (sidebar.classList.contains("collapsed")) return;
        startX = e.clientX;
        startW = sidebar.offsetWidth;
        sidebar.classList.add("resizing");
        document.addEventListener("pointermove", onPointerMove);
        document.addEventListener("pointerup", onPointerUp);
      };

      resizerEl.addEventListener("pointerdown", onPointerDown);
    }
  }

  // MAIN
  const terms = window.hypeLessTerms;
  if (!terms || terms.length === 0) return;

  const termMap = new Map(terms.map(t => [t.term.toLowerCase(), t.explanation]));
  const textNodes = getTextNodes(document.body);
  const regex = buildCombinedRegex(terms);
  const { matchesByTerm, termCounts } = highlightMatches(textNodes, regex, termMap);

  const sidebar = buildSidebar(termCounts, matchesByTerm);
  const floatBtn = buildFloatButton();
  const tooltip = buildTooltip();

  setupInteractions(sidebar, floatBtn, matchesByTerm, tooltip);
})();
