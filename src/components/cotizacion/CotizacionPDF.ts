import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface CotizacionItem {
  item_numero: number;
  nombre_prestacion: string;
  detalle_examenes: Array<{ nombre: string }>;
  valor_unitario_neto: number;
  cantidad: number;
  valor_final: number;
}

interface CotizacionData {
  numero_cotizacion: number;
  fecha_cotizacion: string;
  empresa_nombre: string | null;
  empresa_rut: string | null;
  empresa_telefono: string | null;
  empresa_contacto: string | null;
  observaciones: string | null;
  items: CotizacionItem[];
  subtotal_neto: number;
  total_iva: number;
  total_con_iva: number;
  total_con_margen: number;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    minimumFractionDigits: 0,
  }).format(value);
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  const options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  };
  return date.toLocaleDateString("es-CL", options);
};

// Colors based on the reference image
const COLORS = {
  primary: [0, 120, 170] as [number, number, number], // Blue header
  accent: [0, 180, 180] as [number, number, number], // Cyan accent
  tableHeader: [0, 120, 170] as [number, number, number],
  text: [50, 50, 50] as [number, number, number],
  lightGray: [240, 240, 240] as [number, number, number],
};

export const generateCotizacionPDF = (data: CotizacionData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;

  const drawHeader = (startY: number) => {
    // Top cyan line
    doc.setFillColor(...COLORS.accent);
    doc.rect(0, 0, pageWidth, 3, "F");

    // Logo placeholder - Centro Médico Jenner text
    doc.setFontSize(20);
    doc.setTextColor(...COLORS.primary);
    doc.setFont("helvetica", "bold");
    doc.text("Centro Médico Jenner", 50, startY + 15);

    // Contact info
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.text);
    doc.setFont("helvetica", "normal");
    doc.text("Av. Salvador Allende 3432, Edif. Nuevo Prado, piso 2. Iquique - Chile.", 50, startY + 22);
    doc.text("www.centrojenner.cl", 50, startY + 27);
    doc.text("contacto@centrojenner.cl", 50, startY + 32);
    doc.text("57 226 2775", 50, startY + 37);

    // Logo icon circle on the left
    doc.setFillColor(...COLORS.primary);
    doc.circle(25, startY + 20, 12, "F");
    doc.setFillColor(...COLORS.accent);
    doc.circle(25, startY + 20, 8, "F");
    doc.setFillColor(255, 255, 255);
    doc.circle(25, startY + 20, 4, "F");

    // Right side decorative element
    doc.setFillColor(...COLORS.primary);
    doc.rect(pageWidth - 40, startY + 5, 25, 35, "F");
    doc.setFillColor(...COLORS.accent);
    doc.rect(pageWidth - 40, startY + 5, 5, 35, "F");

    return startY + 45;
  };

  const drawClientInfo = (startY: number) => {
    // Left cyan bar
    doc.setFillColor(...COLORS.accent);
    doc.rect(margin, startY, 3, 35, "F");

    // Client info labels and values
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.text);

    const leftCol = margin + 8;
    const valueCol = margin + 35;

    doc.text("Solicitante:", leftCol, startY + 8);
    doc.text("Empresa:", leftCol, startY + 16);
    doc.text("Rut Empresa:", leftCol, startY + 24);
    doc.text("Teléfono:", leftCol, startY + 32);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.primary);
    doc.text(data.empresa_contacto || "-", valueCol, startY + 8);
    doc.text(data.empresa_nombre || "-", valueCol, startY + 16);
    doc.text(data.empresa_rut || "-", valueCol, startY + 24);
    doc.text(data.empresa_telefono || "-", valueCol, startY + 32);

    // Right side - Date and cotizacion number
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.text);
    doc.text("Fecha:", pageWidth - 80, startY + 8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.primary);
    doc.text(formatDate(data.fecha_cotizacion), pageWidth - 65, startY + 8);

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.accent);
    doc.text(`COTIZACION N°: ${data.numero_cotizacion}`, pageWidth - 80, startY + 24);

    return startY + 45;
  };

  const drawTotals = (startY: number) => {
    const rightCol = pageWidth - margin - 60;
    const valueCol = pageWidth - margin - 10;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.text);

    doc.text("Subtotal Neto:", rightCol, startY + 10);
    doc.text(formatCurrency(data.subtotal_neto), valueCol, startY + 10, { align: "right" });

    doc.text("IVA (19%):", rightCol, startY + 18);
    doc.text(formatCurrency(data.total_iva), valueCol, startY + 18, { align: "right" });

    doc.text("Total con IVA:", rightCol, startY + 26);
    doc.text(formatCurrency(data.total_con_iva), valueCol, startY + 26, { align: "right" });

    doc.setFillColor(...COLORS.primary);
    doc.rect(rightCol - 5, startY + 30, 70, 12, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("TOTAL:", rightCol, startY + 38);
    doc.text(formatCurrency(data.total_con_margen), valueCol, startY + 38, { align: "right" });

    return startY + 50;
  };

  const drawFooter = () => {
    const footerY = pageHeight - 35;

    // Left cyan bar
    doc.setFillColor(...COLORS.accent);
    doc.rect(margin, footerY, 3, 25, "F");

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.primary);
    doc.text("Aline Pacheco Bravo", margin + 8, footerY + 8);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.accent);
    doc.text("Gerente General", margin + 8, footerY + 14);

    doc.setTextColor(...COLORS.primary);
    doc.text("aline.pacheco@centrojenner.cl", margin + 8, footerY + 20);
    doc.text("57 226 2772 - 9 9543 1823", margin + 8, footerY + 26);
  };

  // Generate PDF - First page: draw client info only (header will be drawn by didDrawPage)
  // We need to manually draw header and client info for the first page since didDrawPage 
  // is called BEFORE the table content, but we want client info only on page 1
  
  // Track if this is the first page
  let isFirstPageDrawn = false;
  
  // Override the drawTable to handle first page specially
  const tableStartY = 95; // After header (55) + client info (40)
  
  // Draw initial header and client info manually for page 1
  drawHeader(5);
  drawClientInfo(50);
  
  // Prepare table data
  const tableData: any[] = [];

  data.items.forEach((item) => {
    tableData.push([
      { content: item.item_numero.toString(), styles: { fontStyle: "bold" } },
      {
        content: item.nombre_prestacion.toUpperCase(),
        styles: { fontStyle: "bold" },
      },
      { content: `$ ${item.valor_unitario_neto.toLocaleString("es-CL")}`, styles: { halign: "right" } },
      { content: item.cantidad.toString(), styles: { halign: "center" } },
      { content: formatCurrency(item.valor_final), styles: { halign: "right", fontStyle: "bold" } },
    ]);

    if (item.detalle_examenes && item.detalle_examenes.length > 1) {
      item.detalle_examenes.forEach((examen) => {
        tableData.push([
          { content: "", styles: { fillColor: [255, 255, 255] } },
          {
            content: examen.nombre,
            styles: {
              fontSize: 7,
              textColor: [100, 100, 100],
              fontStyle: "normal",
              cellPadding: { left: 10, top: 1, bottom: 1, right: 2 },
            },
          },
          { content: "", styles: { fillColor: [255, 255, 255] } },
          { content: "", styles: { fillColor: [255, 255, 255] } },
          { content: "", styles: { fillColor: [255, 255, 255] } },
        ]);
      });
    }
  });

  autoTable(doc, {
    startY: tableStartY,
    head: [["Item", "Prestaciones", "Valor unit.", "Cantidad", "Valor Total"]],
    body: tableData,
    theme: "plain",
    headStyles: {
      fillColor: COLORS.tableHeader,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
      halign: "center",
    },
    columnStyles: {
      0: { cellWidth: 15, halign: "center" },
      1: { cellWidth: "auto" },
      2: { cellWidth: 30, halign: "right" },
      3: { cellWidth: 25, halign: "center" },
      4: { cellWidth: 30, halign: "right" },
    },
    styles: {
      fontSize: 8,
      cellPadding: 3,
      lineColor: [200, 200, 200],
      lineWidth: 0.1,
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250],
    },
    margin: { left: margin, right: margin, top: 60 },
    didDrawPage: (hookData) => {
      // Only draw header on pages after the first
      if (hookData.pageNumber > 1) {
        drawHeader(5);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...COLORS.text);
        doc.text(`Cotización N° ${data.numero_cotizacion} - ${data.empresa_nombre || ""}`, margin, 52);
      }
    },
  });

  let currentY = (doc as any).lastAutoTable.finalY;
  
  // Check if we need a new page for totals
  if (currentY + 60 > pageHeight - 40) {
    doc.addPage();
    drawHeader(5);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.text);
    doc.text(`Cotización N° ${data.numero_cotizacion} - ${data.empresa_nombre || ""}`, margin, 52);
    currentY = 55;
  }
  
  drawTotals(currentY);
  
  // Draw footer on every page
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter();
  }

  // Save the PDF
  const fileName = `Cotizacion_${data.numero_cotizacion}_${data.empresa_nombre || "SinNombre"}.pdf`;
  doc.save(fileName.replace(/\s+/g, "_"));

  return doc;
};
