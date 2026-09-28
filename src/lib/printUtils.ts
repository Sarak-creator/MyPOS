/**
 * Print utility for printing clean A4 documents, contracts, and receipts.
 * Uses window.open (or an off-screen rendered surface) to completely isolate
 * printable content from the dashboard DOM and CSS, guaranteeing 100% data visibility.
 */
export function printElement(elementId: string, documentTitle: string = "កិច្ចសន្យា") {
  if (typeof window === "undefined") return;

  const element = document.getElementById(elementId);
  if (!element) {
    console.warn(`Element #${elementId} not found, falling back to window.print()`);
    window.print();
    return;
  }

  // Clone element content
  const clone = element.cloneNode(true) as HTMLElement;

  // Remove sticky action headers and buttons from the clone
  clone.querySelectorAll(".print\\:hidden, .no-print, button").forEach((el) => el.remove());

  // Extract all existing CSS stylesheets and style tags
  const styleNodes = Array.from(document.querySelectorAll("link[rel='stylesheet'], style"));
  const stylesHtml = styleNodes.map((node) => node.outerHTML).join("\n");

  const printHtml = `
    <!DOCTYPE html>
    <html lang="km">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${documentTitle}</title>
        ${stylesHtml}
        <style>
          @page {
            size: A4 portrait;
            margin: 10mm 12mm;
          }
          *, *::before, *::after {
            visibility: visible !important;
            box-sizing: border-box !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            background-color: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 12px !important;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Hanuman", "Kantumruy Pro", sans-serif !important;
            font-size: 13px !important;
            line-height: 1.5 !important;
          }
          .print\\:hidden,
          .no-print,
          button {
            display: none !important;
            visibility: hidden !important;
          }
          .printable-document {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
            color: black !important;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          th, td {
            border-color: #cbd5e1 !important;
          }
        </style>
      </head>
      <body>
        <div class="print-container" style="width: 100%; max-width: 100%; margin: 0 auto; background: white; color: black;">
          ${clone.innerHTML}
        </div>
      </body>
    </html>
  `;

  // Try opening dedicated print window first
  try {
    const printWindow = window.open("", "_blank", "width=900,height=900,top=100,left=100");
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(printHtml);
      printWindow.document.close();

      const triggerPrint = () => {
        try {
          printWindow.focus();
          printWindow.print();
          setTimeout(() => {
            try {
              printWindow.close();
            } catch (_) {}
          }, 1000);
        } catch (e) {
          console.error("Print window error:", e);
        }
      };

      if (printWindow.document.readyState === "complete") {
        setTimeout(triggerPrint, 350);
      } else {
        printWindow.onload = () => setTimeout(triggerPrint, 350);
        // Fallback timeout in case onload event doesn't fire
        setTimeout(triggerPrint, 600);
      }
      return;
    }
  } catch (err) {
    console.warn("window.open blocked or failed, using iframe fallback", err);
  }

  // Fallback to active off-screen iframe (NOT visibility:hidden, NOT width:0)
  let iframe = document.getElementById("print-iframe-helper") as HTMLIFrameElement;
  if (iframe) iframe.remove();

  iframe = document.createElement("iframe");
  iframe.id = "print-iframe-helper";
  iframe.style.position = "fixed";
  iframe.style.left = "0";
  iframe.style.top = "0";
  iframe.style.width = "210mm";
  iframe.style.height = "297mm";
  iframe.style.zIndex = "-9999";
  iframe.style.opacity = "0.01";
  iframe.style.border = "none";
  iframe.style.pointerEvents = "none";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    window.print();
    return;
  }

  doc.open();
  doc.write(printHtml);
  doc.close();

  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.error("Iframe print error:", e);
      window.print();
    } finally {
      setTimeout(() => {
        iframe.remove();
      }, 3000);
    }
  }, 450);
}
