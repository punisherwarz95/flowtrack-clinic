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
    // Top cyan line - más delgada
    doc.setFillColor(...COLORS.accent);
    doc.rect(0, 0, pageWidth, 2, "F");

    // Logo placeholder - Centro Médico Jenner text
    doc.setFontSize(20);
    doc.setTextColor(...COLORS.primary);
    doc.setFont("helvetica", "bold");
    doc.text("Centro Médico Jenner", 42, startY + 12);

    // Contact info
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.text);
    doc.setFont("helvetica", "normal");
    doc.text("Av. Salvador Allende 3432, Edif. Nuevo Prado, piso 2. Iquique - Chile.", 42, startY + 18);
    doc.text("www.centrojenner.cl", 42, startY + 23);
    doc.text("contacto@centrojenner.cl", 42, startY + 28);
    doc.text("57 226 2775", 42, startY + 33);

    // Logo icon circle on the left - más pequeño
    doc.setFillColor(...COLORS.primary);
    doc.circle(22, startY + 18, 9, "F");
    doc.setFillColor(...COLORS.accent);
    doc.circle(22, startY + 18, 6, "F");
    doc.setFillColor(255, 255, 255);
    doc.circle(22, startY + 18, 3, "F");

    // Right side decorative element - más compacto
    doc.setFillColor(...COLORS.primary);
    doc.rect(pageWidth - 30, startY + 5, 18, 28, "F");
    doc.setFillColor(...COLORS.accent);
    doc.rect(pageWidth - 30, startY + 5, 4, 28, "F");

    return startY + 38;
  };

  const drawClientInfo = (startY: number) => {
    // Left cyan bar - más compacta
    doc.setFillColor(...COLORS.accent);
    doc.rect(margin, startY, 2, 28, "F");

    // Client info labels and values
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.text);

    const leftCol = margin + 6;
    const valueCol = margin + 32;

    doc.text("Solicitante:", leftCol, startY + 6);
    doc.text("Empresa:", leftCol, startY + 13);
    doc.text("Rut Empresa:", leftCol, startY + 20);
    doc.text("Teléfono:", leftCol, startY + 27);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.primary);
    doc.text(data.empresa_contacto || "-", valueCol, startY + 6);
    doc.text(data.empresa_nombre || "-", valueCol, startY + 13);
    doc.text(data.empresa_rut || "-", valueCol, startY + 20);
    doc.text(data.empresa_telefono || "-", valueCol, startY + 27);

    // Right side - Date and cotizacion number
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.text);
    doc.text("Fecha:", pageWidth - 75, startY + 6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.primary);
    doc.text(formatDate(data.fecha_cotizacion), pageWidth - 60, startY + 6);

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.accent);
    doc.text(`COTIZACION N°: ${data.numero_cotizacion}`, pageWidth - 75, startY + 18);

    return startY + 35;
  };

  const drawTotals = (startY: number) => {
    const rightCol = pageWidth - margin - 55;
    const valueCol = pageWidth - margin - 8;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.text);

    doc.text("Subtotal Neto:", rightCol, startY + 8);
    doc.text(formatCurrency(data.subtotal_neto), valueCol, startY + 8, { align: "right" });

    doc.text("IVA (19%):", rightCol, startY + 15);
    doc.text(formatCurrency(data.total_iva), valueCol, startY + 15, { align: "right" });

    doc.text("Total con IVA:", rightCol, startY + 22);
    doc.text(formatCurrency(data.total_con_iva), valueCol, startY + 22, { align: "right" });

    // Recuadro del total - más compacto
    doc.setFillColor(...COLORS.primary);
    doc.rect(rightCol - 4, startY + 26, 62, 10, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("TOTAL:", rightCol, startY + 33);
    doc.text(formatCurrency(data.total_con_margen), valueCol, startY + 33, { align: "right" });

    return startY + 42;
  };

  const drawFooter = () => {
    const footerY = pageHeight - 30;

    // Left cyan bar - más compacta
    doc.setFillColor(...COLORS.accent);
    doc.rect(margin, footerY, 2, 20, "F");

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.primary);
    doc.text("Aline Pacheco Bravo", margin + 6, footerY + 6);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.accent);
    doc.text("Gerente General", margin + 6, footerY + 11);

    doc.setTextColor(...COLORS.primary);
    doc.text("aline.pacheco@centrojenner.cl", margin + 6, footerY + 16);
    doc.text("57 226 2772 - 9 9543 1823", margin + 55, footerY + 16);
  };

  // Generate PDF
  // Header height: 38, Client info height: 35
  const tableStartY = 80; // After header (38 + 5) + client info (35) + spacing
  
  // Draw initial header and client info manually for page 1
  drawHeader(5);
  drawClientInfo(43);
  
  // Prepare table data with row grouping for items with sub-items
  const tableData: any[] = [];
  const rowSpanMap: number[] = []; // Track which rows belong together

  data.items.forEach((item, itemIndex) => {
    const itemStartRow = tableData.length;
    
    // Main item row
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
    rowSpanMap.push(itemIndex);

    // Sub-items (detail examenes) - only if there are multiple
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
        rowSpanMap.push(itemIndex); // Same item group
      });
    }
  });

  // Footer height reservation
  const footerHeight = 45;

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
    margin: { left: margin, right: margin, top: 50, bottom: footerHeight },
    rowPageBreak: 'avoid', // Try to keep rows together
    willDrawCell: (hookData) => {
      // Check if this row and its related sub-rows would be split
      if (hookData.section === 'body' && hookData.row.index !== undefined) {
        const currentItemGroup = rowSpanMap[hookData.row.index];
        const lastRowOfGroup = rowSpanMap.lastIndexOf(currentItemGroup);
        const isFirstRowOfGroup = hookData.row.index === rowSpanMap.indexOf(currentItemGroup);
        
        if (isFirstRowOfGroup && lastRowOfGroup > hookData.row.index) {
          // Calculate approximate height for all rows in this group
          const rowsInGroup = lastRowOfGroup - hookData.row.index + 1;
          const estimatedGroupHeight = rowsInGroup * 8; // Approximate row height
          const remainingSpace = pageHeight - footerHeight - hookData.cursor.y;
          
          // If group won't fit, force page break before this row
          if (estimatedGroupHeight > remainingSpace && hookData.cursor.y > tableStartY + 20) {
            // This will be handled by pageBreak logic
          }
        }
      }
    },
    didDrawPage: (hookData) => {
      // Only draw header on pages after the first
      if (hookData.pageNumber > 1) {
        drawHeader(5);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...COLORS.text);
        doc.text(`Cotización N° ${data.numero_cotizacion} - ${data.empresa_nombre || ""}`, margin, 45);
      }
    },
  });

  let currentY = (doc as any).lastAutoTable.finalY;
  
  // Check if we need a new page for totals
  if (currentY + 50 > pageHeight - 35) {
    doc.addPage();
    drawHeader(5);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.text);
    doc.text(`Cotización N° ${data.numero_cotizacion} - ${data.empresa_nombre || ""}`, margin, 45);
    currentY = 48;
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
