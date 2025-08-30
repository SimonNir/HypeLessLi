(function () {
  // Prevent multiple runs on the same page
  if (window.hypeLessLiActivated) {
    return;
  }
  window.hypeLessLiActivated = true;

  let isEnabled = true;
  let isSidebarVisible = false; // Start with sidebar hidden
  let elements = {
    sidebar: null,
    floatBtn: null,
    tooltip: null,
    highlights: []
  };

  // Initialize with extension state
  initializeExtensionState();

  function initializeExtensionState() {
    // Check storage for current state
    if (chrome.storage) {
      chrome.storage.local.get(['hypeLessEnabled']).then(result => {
        isEnabled = result.hypeLessEnabled ?? true;
        if (isEnabled) {
          initializeExtension();
        }
      }).catch(() => {
        // Fallback if storage fails
        isEnabled = true;
        initializeExtension();
      });
    } else {
      // Fallback if chrome.storage not available
      isEnabled = true;
      initializeExtension();
    }
  }

  function initializeExtension() {
    const terms = window.hypeLessTerms;
    if (!terms || terms.length === 0) return;

    const termMap = new Map(terms.map(t => [t.term.toLowerCase(), t.explanation]));
    const textNodes = getTextNodes(document.body);
    const regex = buildCombinedRegex(terms);
    const { matchesByTerm, termCounts } = highlightMatches(textNodes, regex, termMap);

    elements.sidebar = buildSidebar(termCounts, matchesByTerm);
    elements.floatBtn = buildFloatButton();
    elements.tooltip = buildTooltip();

    setupInteractions(elements.sidebar, elements.floatBtn, matchesByTerm, elements.tooltip);
    
    // Start with sidebar hidden
    elements.sidebar.classList.add("collapsed");
    elements.floatBtn.style.display = "block";
  }

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

  function getContrastingHighlightColor(element) {
    // Pick the effective text color where the highlight sits (fall back to parent colors).
    let target = element || document.body;
    let textColor = window.getComputedStyle(target).color;

    if (!textColor || textColor === 'transparent' || textColor === 'rgba(0, 0, 0, 0)') {
      let parent = target.parentElement;
      while (parent && parent !== document.body) {
        const pColor = window.getComputedStyle(parent).color;
        if (pColor && pColor !== 'transparent' && pColor !== 'rgba(0, 0, 0, 0)') {
          textColor = pColor;
          break;
        }
        parent = parent.parentElement;
      }
      if (!textColor) textColor = 'rgb(0,0,0)'; // default to black
    }

    // Parse "rgb(...)" or hex "#..." into [r,g,b]
    const parseRGB = (color) => {
      if (!color) return [0,0,0];
      const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
      if (rgbMatch) return [parseInt(rgbMatch[1],10), parseInt(rgbMatch[2],10), parseInt(rgbMatch[3],10)];
      const hexMatch = color.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
      if (hexMatch) {
        let hex = hexMatch[1];
        if (hex.length === 3) hex = hex.split('').map(c=>c+c).join('');
        return [parseInt(hex.substr(0,2),16), parseInt(hex.substr(2,2),16), parseInt(hex.substr(4,2),16)];
      }
      return [0,0,0];
    };

    const [r, g, b] = parseRGB(textColor);

    const getLuminance = (r, g, b) => {
      const [rs, gs, bs] = [r, g, b].map(c => {
        c = c / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
    };

    const textLuminance = getLuminance(r, g, b);

    // YOUR REQUIREMENT:
    // - If the *text* is dark (low luminance) => use yellow highlights.
    // - If the *text* is light (high luminance, e.g. white text on dark bg) => use purple highlights.
    if (textLuminance < 0.5) {
        // dark text -> lighter warm highlight
        return {
            normal: '#FFDD33',   // lighter gold/yellow
            preview: '#FFAA33',  // lighter orange, pops
            focus: '#FF5533'     // lighter red, strong focus
        };
    } else {
        // light text -> darker warm highlight
        return {
            normal: '#CC9900',   // dark gold
            preview: '#FF6600',  // rich orange, pops
            focus: '#CC3300'     // brick red, strong focus
        };
    }
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
        return `${prefix}<mark id="${id}" class="hypeless-highlight" data-expl="${explanation}" data-term="${term}">${word}</mark>`;
      });

      if (replaced && node.parentNode) {
        const wrapper = document.createElement("span");
        wrapper.innerHTML = newHTML;
        node.parentNode.replaceChild(wrapper, node);
        
        // Apply dynamic highlighting colors
        const highlights = wrapper.querySelectorAll('.hypeless-highlight');
        highlights.forEach(highlight => {
          elements.highlights.push(highlight);
          const colors = getContrastingHighlightColor(highlight);
          highlight.style.setProperty('--highlight-normal', colors.normal);
          highlight.style.setProperty('--highlight-preview', colors.preview);
          highlight.style.setProperty('--highlight-focus', colors.focus);
        });
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

    const totalCount = [...termCounts.values()].reduce((a, b) => a + b, 0);
    sidebar.innerHTML = `
      <div id="hypeless-header">
        <span>HypeLessLi v3.1 <br> (${totalCount} found)</span>
        <div style="display:flex;gap:6px;align-items:center;margin-top:4px;">
          <button id="hypeless-help" style="flex:1 1 0;min-width:0;padding:4px 8px;">Info</button>
          <button id="hypeless-toggle" style="flex:1 1 0;min-width:0;padding:4px 8px;">Hide</button>
        </div>
      </div>
      <div id="hypeless-content">${itemsHTML}</div>
      <div id="hypeless-help-popup">
        <b>HypeLessLi Help</b><br><br>
        - Highlights hype/buzz words in text.<br>
        - Hover a highlighted word to see explanation.<br>
        - Click a term in sidebar to jump to it.<br>
        - Resize sidebar by dragging its edge.<br>
        - Toggle with extension popup or floating button.<br>
      </div>
      <div id="hypeless-ai-qa" style="padding:12px 8px 8px 8px; border-top:1px solid #eee; margin-top:8px;">
  <input id="hypeless-ai-input" type="text" placeholder="Ask about a term..." style="width:calc(100% - 70px);padding:4px 8px;color:#fff;background:#222;border:1px solid #444;" />
  <button id="hypeless-ai-btn" style="width:56px;padding:4px 0;margin-left:4px;">Ask AI</button>
  <div style="font-size:11px;color:#bbb;margin-top:2px;line-height:1.2;">AI Q&A requires<br>local server</div>
  <div id="hypeless-ai-answer" style="margin-top:8px;font-size:15px;color:#fff;"></div>
      </div>
    `;
    document.body.appendChild(sidebar);

    // Add custom visible resizer handle
    const resizer = document.createElement("div");
    resizer.id = "hypeless-resizer";
    sidebar.appendChild(resizer);

    return sidebar;
  }

  function buildFloatButton() {
    const btn = document.createElement("button");
    btn.id = "hypeless-float-btn";
    btn.innerHTML = "📝";
    btn.title = "Show HypeLessLi sidebar";
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
    // --- AI Q&A logic ---
    const aiInput = sidebar.querySelector('#hypeless-ai-input');
    const aiBtn = sidebar.querySelector('#hypeless-ai-btn');
    const aiAnswer = sidebar.querySelector('#hypeless-ai-answer');

    // On highlight click, pre-fill the input with the term
    document.body.addEventListener('click', e => {
      if (e.target.classList && e.target.classList.contains('hypeless-highlight')) {
        const term = e.target.getAttribute('data-term');
        const expl = e.target.getAttribute('data-expl');
        if (aiInput) {
          aiInput.value = `What does "${term}" mean in academic writing? ${expl ? 'Explanation: ' + expl : ''}`;
          aiInput.focus();
        }
      }
    });

    // On AI button click, ask Groq
    if (aiBtn && aiInput && aiAnswer) {
      aiBtn.addEventListener('click', async () => {
        const question = aiInput.value.trim();
        if (!question) return;
        aiBtn.disabled = true;
        aiAnswer.textContent = 'Thinking...';
        try {
          const answer = await askGroq(question);
          aiAnswer.textContent = answer;
        } catch (err) {
          aiAnswer.textContent = 'Error contacting AI.';
        }
        aiBtn.disabled = false;
      });
      // Enter key submits
      aiInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') aiBtn.click();
      });
    }
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
      isSidebarVisible = !sidebar.classList.contains("collapsed");
      floatBtn.style.display = isSidebarVisible ? "none" : "block";
      floatBtn.title = isSidebarVisible ? "Hide HypeLessLi sidebar" : "Show HypeLessLi sidebar";
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

    // Custom sidebar resizing logic
    const resizerEl = document.getElementById("hypeless-resizer");
    if (resizerEl) {
      const css = getComputedStyle(sidebar);
      const minW = parseInt(css.minWidth, 10) || 180;
      const maxW = parseInt(css.maxWidth, 10) || 500;
      let startX = 0;
      let startW = 0;

      const onPointerMove = (e) => {
        const dx = startX - e.clientX;
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

  function toggleExtension(enabled) {
    isEnabled = enabled;
    
    if (enabled) {
      // Show all highlights
      elements.highlights.forEach(highlight => {
        highlight.style.display = '';
      });
      
      // Show sidebar and button if they exist
      if (elements.sidebar) {
        elements.sidebar.style.display = 'flex';
      }
      if (elements.floatBtn) {
        elements.floatBtn.style.display = isSidebarVisible ? 'none' : 'block';
      }
    } else {
      // Hide all highlights
      elements.highlights.forEach(highlight => {
        highlight.style.display = 'none';
      });
      
      // Hide sidebar and button
      if (elements.sidebar) {
        elements.sidebar.style.display = 'none';
      }
      if (elements.floatBtn) {
        elements.floatBtn.style.display = 'none';
      }
    }
    
    if (elements.tooltip) {
      elements.tooltip.style.display = 'none';
    }
  }

  async function askGroq(question) {
  const response = await fetch('http://localhost:3001/ask-groq', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question })
  });
  const data = await response.json();
  return data.answer;
}

  // Listen for messages from background script
  if (chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'stateChanged') {
        // No response needed
        toggleExtension(message.enabled);
      } else if (message.type === 'toggleSidebar') {
        // Only act if UI exists; otherwise ignore silently
        if (elements.sidebar && elements.floatBtn) {
          const isCollapsed = elements.sidebar.classList.contains('collapsed');
          if (isCollapsed) {
            elements.sidebar.classList.remove('collapsed');
            elements.floatBtn.style.display = 'none';
            isSidebarVisible = true;
          } else {
            elements.sidebar.classList.add('collapsed');
            elements.floatBtn.style.display = 'block';
            isSidebarVisible = false;
          }
        }
      }
      // IMPORTANT: Do NOT return true unless you will call sendResponse later.
      // We are not sending any response from the content script, so we simply return undefined.
    });
  }
})();