/**
 * Export the current page as a PDF using the browser's native print dialog.
 * Works with all modern CSS (oklch, oklab, etc.) unlike html2canvas.
 */
export async function exportPagePdf(pageTitle: string) {
  const prevTitle = document.title;
  document.title = `CAA Analytics — ${pageTitle}`;
  window.print();
  document.title = prevTitle;
}
