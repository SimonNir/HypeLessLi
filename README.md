# HypeLessLi - Extension

HypeLessLi helps you critically read scientific texts by highlighting hype-like, subjective, promotional, and vague terms in **yellow**.  
It also provides a **collapsible sidebar** with explanations, counts, and navigation through all occurrences.

NOTE: This is primarily the development side; for the most reliable public code, refer to the published version at https://zenodo.org/records/16814574 

---

## Installation 

1. **Clone the Repo**
   - In your desired download location, open the terminal and type:  
     `git clone https://github.com/SimonNir/HypeLessLi.git`

3. **Open Chrome Extensions Page**
   - In Chrome, go to:  
     `chrome://extensions/`

4. **Enable Developer Mode**
   - Turn on the **Developer mode** switch in the top-right corner.

5. **Load the Extension**
   - Click **Load unpacked**.
   - Select the folder containing the cloned files.
   - HypeLessLi will now appear in your extensions list.

---

## How to Use

1. **Open a webpage** with scientific writing.
2. HypeLessLi will:
   - Highlight hype/subjective terms in **yellow**.
   - Show them in the **sidebar** with:
     - The term itself
     - Number of occurrences
     - Explanation of why it’s flagged
3. **Navigation**
   - Click a term in the sidebar → jump to the next occurrence.
   - Click again → cycle through all occurrences.
   - Hover over a term → preview all matches in **light orange**.
4. **Collapse / Reopen**
   - Click the arrow (`Hide`) to hide the sidebar.
   - A small **“HypeLessLi” button** appears in the bottom-right.
   - Click it to reopen the sidebar.

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
- Example: *“benchmark test”*, *“unique identifier”*, *“extreme value theory”*, etc., will **not** be flagged.

### Visible Text Only
- Fixed bug where hidden metadata or SEO text caused **false matches** (e.g., “best (1)”).
- Now scans only **visible text** (ignores `display:none`, `visibility:hidden`, and `aria-hidden`).

---

## Limitations

- Works best on **visible webpage text** (not PDFs).
- Uses keyword matching, so borderline cases may still appear.
- Term list and exceptions can be expanded in `terms.js`.

---

## Authors
Dr. Xhoela Bame, Dr. Gjylije Hoti, Dr. Adibe Kingsley Mbachu, Dr. Vasilis Nikolaou, Simon Nirenberg, Klara Krmpotic, Dr. Christian Kuttner, Dr. Sudha Shankar (in alphabetical order)

The Li is short for Lindau, as the idea was born out of a workshop at the 74th Lindau Nobel Laureate Meeting (Chemistry)

## Changelog

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
- Added **floating “H” button**.
- Minor bugfixes

### v1
- Initial release with basic hype term highlighting and sidebar counts.

