# HypeLessLi - Extension

HypeLessLi helps you critically read scientific texts by highlighting hype-like, subjective, promotional, and vague terms in **yellow**.  
It also provides a **collapsible sidebar** with explanations, counts, and navigation through all occurrences.

NOTE: This is primarily the development side; for the most reliable public code, refer to the published version at https://zenodo.org/records/16814574 

---

## Installation 

1. **Clone the Repo**
   - In your desired download location, open the terminal and type:  
     `git clone https://github.com/SimonNir/HypeLessLi.git`

2. **Open Chrome Extensions Page**
   - In Chrome, go to:  
     `chrome://extensions/`

3. **Enable Developer Mode**
   - Turn on the **Developer mode** switch in the top-right corner.

4. **Load the Extension**
   - Click **Load unpacked**.
   - Select the folder containing the cloned files.
   - HypeLessLi will now appear in your extensions list.

---

## How to Use

1. **Navigate to a webpage** with scientific writing.
2. **The extension highlights hype terms automatically** with the sidebar minimized.
3. **Use the extension popup** (click the HypeLessLi icon in your browser toolbar) to:
   - Toggle highlighting on/off globally
   - Show/hide the sidebar
   - Access help information
4. **Alternatively, click the floating 📝 button** (bottom-right) to show the sidebar.
5. **In the sidebar** you can:
   - See all flagged terms with counts and explanations
   - Click a term to jump to the next occurrence  
   - Click again to cycle through all occurrences
   - Hover over a term to preview all matches in light orange
6. **Resize the sidebar** by dragging its left edge.
7. **Hover over highlighted words** to see explanations in a tooltip.

---

## Highlighted Terms

These words/phrases are flagged for being potentially subjective, hype-driven, or vague in scientific writing (default list in `terms.js`):

- extreme  
- groundbreaking  
- cutting-edge  
- revolutionary  
- novel  
- unique  
- breakthrough  
- state-of-the-art  
- exciting  
- unprecedented  
- best  
etc.

---

## Why These Terms Are Flagged

These terms often:
- Overstate results
- Add subjective evaluation instead of objective data
- Make novelty claims that should be clear from context
- Use vague or promotional metaphors
- Risk making the writing less precise or more marketing-like

HypeLessLi encourages **clear, precise, and evidence-based** scientific communication.

---

## New Functionalities & Bugfixes

HypeLessLi has been updated with the following improvements over the original version:

### Manual Activation
- Extension now only runs when you **click the extension icon** in the browser toolbar.
- No longer automatically activates on every page load.
- Prevents unwanted highlighting on non-scientific content.

### Dark Mode
- Automatically adapts to system settings (`prefers-color-scheme: dark`).
- Uses darker sidebar and tooltip styles for readability.

### Animation Feedback
- Highlight flashes smoothly when clicked or previewed.
- Subtle transitions for highlight colors.

### Help Button
- Sidebar includes an **Info** button.
- Opens a popup with instructions on how to use the extension.

### Resizable Sidebar
- Sidebar width can be adjusted by dragging its edge.
- Minimum width: 180px, Maximum width: 500px.

### Hover Tooltips
- Hovering over a highlighted word shows an **explanation tooltip**.
- Helps users understand why a word was flagged without opening the sidebar.

### Exceptions to Reduce False Positives
- Added an **exceptions list** in `terms.js`.
- Example: *"benchmark test"*, *"unique identifier"*, *"extreme value theory"*, etc., will **not** be flagged.

### Visible Text Only
- Fixed bug where hidden metadata or SEO text caused **false matches** (e.g., "best (1)").
- Now scans only **visible text** (ignores `display:none`, `visibility:hidden`, and `aria-hidden`).

---

## Limitations

- Works best on **visible webpage text** (not PDFs).
- Uses keyword matching, so borderline cases may still appear.
- Term list and exceptions can be expanded in `terms.js`.
- Must be manually activated on each page by clicking the extension icon.

---


## Experimental: AI Q&A (Optional)

HypeLessLi includes an **experimental AI Q&A feature** in the sidebar, allowing you to ask questions about hype terms and get suggestions for more objective alternatives.

**Note:**
- This feature requires running a local backend server (see `groq-backend.js`) and a valid Groq API key (put into a local .env file).
- If the backend is not running, the AI Q&A section will not function.
- The main extension features work independently of the AI Q&A.

---

## Authors
Dr. Xhoela Bame, Dr. Gjylije Hoti, Dr. Adibe Kingsley Mbachu, Dr. Vasilis Nikolaou, Simon Nirenberg, Klara Krmpotic, Dr. Christian Kuttner, Dr. Sudha Shankar (in alphabetical order)

The Li is short for Lindau, as the idea was born out of a workshop at the 74th Lindau Nobel Laureate Meeting (Chemistry)

## Changelog

### v3.1
- Added smart **contrast-aware highlighting** for better visibility.  
- Polished **popup interface** with toggle switches and action buttons.  
- Hid sidebar by default, retaining auto-highlighting  
- Improved **floating button** with smooth animations.  
- Unified **dark/light modes** into a single consistent interface that always contrasts well.

### v3
- Added filtering for **visible text only** (fixes phantom matches from hidden metadata).
- Introduced **exceptions list** to reduce **false positives**.
- Added **dark mode support**.
- Added **animations** for highlights and previews.
- Added **help button** with instructions.
- Added **resizable sidebar**.
- Added **hover tooltips** on flagged words.
- Minor bugfixes

### v2
- Sidebar can now be **collapsed/reopened**.
- Added **floating "H" button**.
- Minor bugfixes

### v1
- Initial release with basic hype term highlighting and sidebar counts.