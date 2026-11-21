/* global document, localStorage */
// Applies the saved light/dark choice before the page paints, so a light-mode user never sees a
// dark flash. An external file because the Content Security Policy allows no inline scripts.
try {
  if (localStorage.getItem('scrollosaurus:theme') === 'light') {
    document.documentElement.dataset.theme = 'light';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#f4efe4');
  }
} catch {
  // Storage blocked (private mode, settings): stay on the default dark theme.
}
