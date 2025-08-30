(function () {
  // Prevent multiple runs on the same page
  if (window.hypeLessLiActivated) {
    if (window.HypeLessLiAPI && typeof window.HypeLessLiAPI.runScan === 'function') {
      return; 
    }
    return;
  }
  window.hypeLessLiActivated = true;

  let isEnabled = true;
  let isSidebarVisible = false;
  let isOverleafMode = false;
  let editorInstance = null;
  let decorations = [];
  
  let elements = {
    sidebar: null,
    floatBtn: null,
    tooltip: null,
    highlights: [],
  };

  // --- Core Scan and Initialization Logic ---
  
  function runScan() {
    clearAllUI(); // Clear previous results before scanning
    isOverleafMode = detectOverleaf();
    
    if (isEnabled) {
      if (isOverleafMode) {
        initializeOverleafMode();
      } else {
        initializeStandardMode();
      }
    }
  }

  function initializeExtensionState() {
    chrome.storage.local.get(['hypeLessEnabled']).then(result => {
      isEnabled = result.hypeLessEnabled ?? true;
      runScan();
    }).catch(() => {
      isEnabled = true;
      runScan();
    });
  }

  initializeExtensionState();

  // =================================================================
  // STANDARD MODE (for regular websites)
  // =================================================================

  function initializeStandardMode() {
    console.log("HypeLessLi: Standard mode initialized.");
    const terms = window.hypeLessTerms || [];
    if (terms.length === 0) return;

    const termMap = new Map(terms.map(t => [t.term.toLowerCase(), t.explanation]));
    const textNodes = getTextNodes(document.body);
    const regex = buildCombinedRegex(terms);
    const { matchesByTerm, termCounts } = highlightMatches(textNodes, regex, termMap);

    elements.sidebar = buildSidebar(termCounts, matchesByTerm);
    elements.floatBtn = buildFloatButton();
    elements.tooltip = buildTooltip();
    setupStandardInteractions(elements.sidebar, elements.floatBtn, matchesByTerm, elements.tooltip);
    
    elements.sidebar.classList.add("collapsed");
    elements.floatBtn.style.display = "block";
  }
  
  function highlightMatches(nodes, regex, termMap) {
    const matchesByTerm = new Map();
    const termCounts = new Map();
    let matchId = 0;
    const exceptions = (window.hypeLessExceptions || []).map(e => e.toLowerCase());

    nodes.forEach(node => {
      if (node.textContent.trim().length === 0) return;
      let replaced = false;
      const newHTML = node.textContent.replace(regex, (match, prefix, word, offset, fullText) => {
        const term = word.toLowerCase();
        const contextWindow = fullText.slice(Math.max(0, offset - 30), offset + word.length + 30).toLowerCase();
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

  function setupStandardInteractions(sidebar, floatBtn, matchesByTerm, tooltip) {
    const termPositions = new Map();
    matchesByTerm.forEach((_, term) => termPositions.set(term, 0));

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
      termPositions.set(term, index + 1);
    });

    sidebar.addEventListener("mouseover", e => {
      const item = e.target.closest(".hypeless-item");
      if (!item) return;
      (matchesByTerm.get(item.dataset.term) || []).forEach(m => document.getElementById(m.id)?.classList.add("hypeless-preview"));
    });
    
    sidebar.addEventListener("mouseout", e => {
      const item = e.target.closest(".hypeless-item");
      if (!item) return;
      (matchesByTerm.get(item.dataset.term) || []).forEach(m => document.getElementById(m.id)?.classList.remove("hypeless-preview"));
    });

    document.body.addEventListener("mouseover", e => {
      if (e.target.classList.contains("hypeless-highlight")) {
        tooltip.innerText = e.target.getAttribute("data-expl") || "";
        tooltip.style.display = "block";
      }
    });
    
    document.body.addEventListener("mousemove", e => {
      if (tooltip.style.display === "block") {
        tooltip.style.left = e.pageX + 12 + "px";
        tooltip.style.top = e.pageY + 12 + "px";
      }
    });
    
    document.body.addEventListener("mouseout", e => {
      if (e.target.classList.contains("hypeless-highlight")) tooltip.style.display = "none";
    });

    setupUIToggles(sidebar, floatBtn);
  }

  // =================================================================
  // OVERLEAF MODE
  // =================================================================

  /**
   * [NEW AND IMPROVED] This function now waits until it finds an editor
   * that also contains text, solving the "0 found" issue.
   */
  function initializeOverleafMode() {
    console.log('HypeLessLi: Overleaf mode detected. Waiting for editor and content...');
    let attempts = 0;
    const maxAttempts = 30; // Wait for 30 seconds max

    const waitForEditorAndContent = () => {
        if (attempts++ > maxAttempts) {
            console.error("HypeLessLi: Timed out waiting for Overleaf editor to load content.");
            return;
        }

        let potentialEditor = findEditor();
        if (potentialEditor) {
            const content = getEditorContent(potentialEditor);
            // Check for non-empty content, ignoring whitespace
            if (content && content.trim().length > 10) { // Check for a reasonable amount of text
                console.log(`HypeLessLi: Editor found with content of length ${content.length}. Setting up integration.`);
                editorInstance = potentialEditor;
                setupOverleafIntegration();
                return; // Success! Exit the loop.
            } else {
                 console.log("HypeLessLi: Editor instance found, but content is empty or too short. Retrying...");
            }
        }
        setTimeout(waitForEditorAndContent, 1000);
    };

    waitForEditorAndContent();
  }

  function setupOverleafIntegration() {
    if (!editorInstance) return;
    
    elements.sidebar = buildSidebar();
    elements.floatBtn = buildFloatButton();
    elements.tooltip = buildTooltip();
    
    setupEditorListeners();
    scanEditorContent();
    setupUIToggles(elements.sidebar, elements.floatBtn);
    
    elements.sidebar.classList.add("collapsed");
    elements.floatBtn.style.display = "block";
  }

  function setupEditorListeners() {
    if (!editorInstance) return;
    const debounce = (func, wait) => {
      let timeout;
      return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
      };
    };
    const debouncedScan = debounce(scanEditorContent, 500);
    
    switch (editorInstance.type) {
      case 'codemirror6': editorInstance.instance.dispatch = ((tr) => { if (tr.docChanged) { debouncedScan() } return editorInstance.originalDispatch(tr) }); break;
      case 'monaco': editorInstance.instance.onDidChangeModelContent(debouncedScan); break;
      case 'ace': editorInstance.instance.on('change', debouncedScan); break;
      case 'codemirror': editorInstance.instance.on('change', debouncedScan); break;
    }
  }

  function scanEditorContent() {
    if (!editorInstance || !isEnabled) return;
    const content = getEditorContent();
    if (!content) return;

    clearEditorDecorations();

    const terms = window.hypeLessTerms || [];
    const termMap = new Map(terms.map(t => [t.term.toLowerCase(), t.explanation]));
    const regex = buildCombinedRegex(terms);
    const exceptions = (window.hypeLessExceptions || []).map(e => e.toLowerCase());
    const lines = content.split('\n');
    
    const matchesByTerm = new Map();
    const termCounts = new Map();

    lines.forEach((line, lineIndex) => {
      const exclusionZones = [];
      // Patterns for things that are definitely NOT prose
      const patternsToExclude = [
        /\\([a-zA-Z]+)\*?(?:\[[^\]]*\])?/g, // Commands: \section, \textit[...], etc.
        /\{|}/g, // Individual braces are often syntax
        /\$(.*?)\$/g, // Math
        /\\\[(.*?)\\\]/g, // Display Math
        /\\(begin|end)\{.*?\}/g, // Environment boundaries
      ];

      for (const pattern of patternsToExclude) {
        let zoneMatch;
        while ((zoneMatch = pattern.exec(line)) !== null) {
          exclusionZones.push({ start: zoneMatch.index, end: zoneMatch.index + zoneMatch[0].length });
        }
      }

      let potentialMatch;
      while ((potentialMatch = regex.exec(line)) !== null) {
        const word = potentialMatch[2];
        const matchStart = potentialMatch.index + potentialMatch[1].length;
        const matchEnd = matchStart + word.length;

        let isExcluded = false;
        for (const zone of exclusionZones) {
          if (matchStart >= zone.start && matchEnd <= zone.end) {
            isExcluded = true;
            break;
          }
        }
        if (isExcluded) continue;

        const term = word.toLowerCase();
        const contextWindow = line.slice(Math.max(0, matchStart - 30), matchEnd + 30).toLowerCase();
        if (exceptions.some(exc => contextWindow.includes(exc))) continue;

        const newMatch = {
          term: word,
          explanation: termMap.get(term) || "",
          line: lineIndex,
          startCol: matchStart,
          endCol: matchEnd,
        };

        if (!matchesByTerm.has(term)) matchesByTerm.set(term, []);
        matchesByTerm.get(term).push(newMatch);
        termCounts.set(term, (termCounts.get(term) || 0) + 1);
        addEditorDecoration(newMatch);
      }
    });
    
    updateSidebar(termCounts, matchesByTerm);
  }
  
  // =================================================================
  // SHARED HELPER FUNCTIONS (UI, Toggling, etc.)
  // =================================================================

  function clearAllUI() {
    // ... (rest of the code is unchanged from previous version)
    document.getElementById('hypeless-sidebar')?.remove();
    document.getElementById('hypeless-overleaf-sidebar')?.remove();
    document.getElementById('hypeless-float-btn')?.remove();
    document.getElementById('hypeless-tooltip')?.remove();
    const highlights = document.querySelectorAll('.hypeless-highlight');
    highlights.forEach(mark => {
        const parent = mark.parentNode;
        if (parent) {
            parent.replaceChild(document.createTextNode(mark.textContent), mark);
            parent.normalize();
        }
    });
    clearEditorDecorations();
    elements = { sidebar: null, floatBtn: null, tooltip: null, highlights: [] };
  }
  
  function getContrastingHighlightColor(element) {
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
      if (!textColor) textColor = 'rgb(0,0,0)';
    }

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

    if (textLuminance < 0.5) {
      return { normal: '#FFDD33', preview: '#FFAA33', focus: '#FF5533' };
    } else {
      return { normal: '#CC9900', preview: '#FF6600', focus: '#CC3300' };
    }
  }

  function detectOverleaf() {
    return window.location.hostname.includes('overleaf.com') && document.querySelector('.cm-editor') !== null;
  }
  
  /**
   * [NEW AND IMPROVED] Finds the editor instance, with a new check
   * for the modern CodeMirror 6 editor used by Overleaf.
   */
  function findEditor() {
    // Modern Overleaf uses CodeMirror 6, which attaches the view to the DOM element
    const cm6Wrapper = document.querySelector('.cm-editor');
    if (cm6Wrapper && cm6Wrapper.cmView) {
        console.log("HypeLessLi: Found CodeMirror 6 instance.");
        const instance = cm6Wrapper.cmView;
        // Monkey-patch dispatch to listen for changes
        if (!instance.originalDispatch) {
          instance.originalDispatch = instance.dispatch;
        }
        return { type: 'codemirror6', instance: instance };
    }

    // Fallbacks for older versions or other editors
    if (window.ace) {
        const aceEditorEl = document.querySelector('.ace_editor:not([style*="display: none"])');
        if (aceEditorEl && window.ace.edit) {
            console.log("HypeLessLi: Found ACE instance.");
            return { type: 'ace', instance: window.ace.edit(aceEditorEl) };
        }
    }
    return null;
  }

  /**
   * [NEW AND IMPROVED] Gets content from the editor, with a new method
   * for the modern CodeMirror 6 editor.
   */
  function getEditorContent(editor = editorInstance) {
      if (!editor) return '';
      try {
          switch (editor.type) {
              case 'codemirror6': return editor.instance.state.doc.toString();
              case 'monaco': return editor.instance.getModel().getValue();
              case 'ace': return editor.instance.getValue();
              case 'codemirror': return editor.instance.getValue();
              default: return '';
          }
      } catch (e) {
          console.error("HypeLessLi: Error getting editor content.", e);
          return '';
      }
  }

  function addEditorDecoration(match) {
    if (!editorInstance) return;
    const from = editorInstance.instance.state.doc.line(match.line + 1).from + match.startCol;
    const to = from + (match.endCol - match.startCol);
    
    // This part requires CodeMirror 6 specific logic which is complex to add without the full library.
    // For now, we will log that a match is found. Highlighting requires a deeper integration.
    // In a real scenario, you'd use Decoration.mark() and a ViewPlugin.
    // console.log(`Match found: "${match.term}" at line ${match.line + 1}, cols ${match.startCol}-${match.endCol}`);
    
    // Placeholder for actual highlighting. A full implementation requires CM6 ViewPlugins.
    // This is a limitation without adding the entire CM6 library to the extension.
    // For now, let's just use the older methods if they exist, but they likely won't work on CM6.
    try {
      switch (editorInstance.type) {
        case 'ace':
          const aceRange = new (window.ace.Range)(match.line, match.startCol, match.line, match.endCol);
          const marker = editorInstance.instance.session.addMarker(aceRange, 'hypeless-ace-highlight', 'text');
          decorations.push(marker);
          break;
      }
    } catch (e) {
      // It's expected this might fail on CM6
    }
  }

  function clearEditorDecorations() {
    if (!editorInstance || decorations.length === 0) return;
    switch (editorInstance.type) {
      case 'monaco': editorInstance.instance.deltaDecorations(decorations, []); break;
      case 'ace': decorations.forEach(m => editorInstance.instance.session.removeMarker(m)); break;
      case 'codemirror': decorations.forEach(m => m.clear()); break;
    }
    decorations = [];
  }

  function escapeRegex(str) { return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

  function getTextNodes(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) {
      const parentEl = walker.currentNode.parentNode;
      if (!parentEl) continue;
      const tag = parentEl.tagName.toLowerCase();
      if (["script", "style", "code", "pre", "noscript"].includes(tag)) continue;
      const style = window.getComputedStyle(parentEl);
      if (style.display === "none" || style.visibility === "hidden") continue;
      nodes.push(walker.currentNode);
    }
    return nodes;
  }

  function buildCombinedRegex(terms) {
    const patterns = terms.map(t => escapeRegex(t.term.trim()));
    return new RegExp(`(^|\\W)(${patterns.join("|")})(?=\\W|$)`, "gi");
  }

  function buildSidebar(termCounts = new Map(), matchesByTerm = new Map()) {
    const sidebar = document.createElement("div");
    sidebar.id = isOverleafMode ? "hypeless-overleaf-sidebar" : "hypeless-sidebar";
    sidebar.innerHTML = `
      <div id="hypeless-header">
        <span>HypeLessLi (0 found)</span>
        <div>
          <button id="hypeless-suggestions" title="AI Suggestions" style="${isOverleafMode ? '' : 'display:none;'}">✨ AI</button>
          <button id="hypeless-help">Info</button>
          <button id="hypeless-toggle">Hide</button>
        </div>
      </div>
      <div id="hypeless-content"></div>
      <div id="hypeless-help-popup">...Help text...</div>`;
    document.body.appendChild(sidebar);
    const resizer = document.createElement("div");
    resizer.id = "hypeless-resizer";
    sidebar.appendChild(resizer);
    updateSidebar(termCounts, matchesByTerm);
    return sidebar;
  }
  
  function updateSidebar(termCounts, matchesByTerm) {
      const content = document.querySelector('#hypeless-content');
      const header = document.querySelector('#hypeless-header span');
      if (!content || !header) return;

      const totalCount = [...termCounts.values()].reduce((a, b) => a + b, 0);
      header.textContent = `HypeLessLi (${totalCount} found)`;

      const itemsHTML = [...termCounts.entries()]
        .sort((a, b) => b[1] - a[1]) // Sort by count descending
        .map(([term, count]) => {
            const explanation = (matchesByTerm.get(term) || [])[0]?.explanation || "";
            return `
              <div class="hypeless-item" data-term="${term}">
                <b>${term}</b> (${count})<br>
                <small>${explanation}</small>
              </div>`;
        }).join("");
      content.innerHTML = itemsHTML || "<p style='padding: 8px; color: #999;'>No hype terms found.</p>";
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
  
  function setupUIToggles(sidebar, floatBtn) {
    if (!sidebar || !floatBtn) return;
    const toggleSidebar = () => {
      sidebar.classList.toggle("collapsed");
      isSidebarVisible = !sidebar.classList.contains("collapsed");
      floatBtn.style.display = isSidebarVisible ? "none" : "block";
    };
    
    document.getElementById("hypeless-toggle")?.addEventListener("click", toggleSidebar);
    floatBtn.addEventListener("click", toggleSidebar);
    document.getElementById("hypeless-help")?.addEventListener("click", () => {
      document.getElementById("hypeless-help-popup")?.classList.toggle("visible");
    });
    
    setupSidebarResizer(sidebar);
  }

  function setupSidebarResizer(sidebar) {
    const resizerEl = sidebar.querySelector("#hypeless-resizer");
    if (!resizerEl) return;
    
    let startX = 0, startW = 0;
    const onPointerMove = (e) => {
      const newW = startW - (e.clientX - startX);
      sidebar.style.width = Math.max(180, Math.min(500, newW)) + "px";
    };
    const onPointerUp = () => {
      sidebar.classList.remove("resizing");
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
    };
    resizerEl.addEventListener("pointerdown", (e) => {
      startX = e.clientX;
      startW = sidebar.offsetWidth;
      sidebar.classList.add("resizing");
      document.addEventListener("pointermove", onPointerMove);
      document.addEventListener("pointerup", onPointerUp);
    });
  }

  function toggleExtension(enabled) {
    isEnabled = enabled;
    runScan(); // The simplest way to reflect the new state is to rescan
  }

  // --- Global API and Event Listeners ---
  window.HypeLessLiAPI = { runScan };
  window.addEventListener('hypeless-rescan', runScan);

  if (chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === 'stateChanged') {
        toggleExtension(message.enabled);
      } else if (message.type === 'toggleSidebar') {
        if (elements.sidebar && elements.floatBtn) {
          elements.sidebar.classList.toggle('collapsed');
          isSidebarVisible = !elements.sidebar.classList.contains('collapsed');
          elements.floatBtn.style.display = isSidebarVisible ? 'none' : 'block';
        }
      }
    });
  }
})();