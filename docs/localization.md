# English and French versions

English pages live at the root and in `projects/`; their French counterparts live in `fr/` and `fr/projects/`. Both versions are static HTML and work without JavaScript.

Keep the same IDs and structure when updating translations. French home assets use `../assets/`, and French project assets use `../../assets/`. Internal project navigation stays within the selected language.

`assets/language.css` styles the header selector. `assets/language.js` remembers an explicit selection in local storage, preserves the query and section hash, and applies that preference on subsequent visits to known pages. Native links remain usable when storage or JavaScript is unavailable.

Dynamic labels in `home-intro.js`, `air-france-technical.js` and `sand-science.js` select English or French from the document's `lang` attribute. Update those strings alongside both HTML versions.
