/* global document, localStorage */
// Applies the saved light/dark choice before the page paints, so a light-mode user never sees a
// dark flash. An external file because the Content Security Policy allows no inline scripts.
try {
  if (localStorage.getItem('scrollosaurus:theme') === 'light') {
    document.documentElement.dataset.theme = 'light';
  }
} catch {
  // Storage blocked (private mode, settings): stay on the default dark theme.
}
