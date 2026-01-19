import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoJenner from "@/assets/LogoCentro_Jenner-Vert.jpg";

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
  afecto_iva?: boolean;
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

// Colors based on Jenner brand
const COLORS = {
  primary: [0, 56, 101] as [number, number, number], // Dark blue #003865
  accent: [0, 188, 212] as [number, number, number], // Cyan/turquoise #00BCD4
  tableHeader: [0, 56, 101] as [number, number, number],
  text: [50, 50, 50] as [number, number, number],
  lightGray: [240, 240, 240] as [number, number, number],
};

export const generateCotizacionPDF = (data: CotizacionData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;

  const drawHeader = (startY: number) => {
    // Top accent line
    doc.setFillColor(...COLORS.accent);
    doc.rect(0, 0, pageWidth, 3, "F");

    // Company name - Centro Médico Jenner text
    doc.setFontSize(18);
    doc.setTextColor(...COLORS.primary);
    doc.setFont("helvetica", "bold");
    doc.text("Centro Médico Jenner", margin, startY + 12);

    // Contact info
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.text);
    doc.setFont("helvetica", "normal");
    doc.text("Av. Salvador Allende 3432, Edif. Nuevo Prado, piso 2. Iquique - Chile.", margin, startY + 18);
    doc.text("www.centrojenner.cl", margin, startY + 23);
    doc.text("contacto@centrojenner.cl", margin, startY + 28);
    doc.text("57 226 2775", margin, startY + 33);

    // Logo on the right side
    try {
      const logoWidth = 28;
      const logoHeight = 35;
      doc.addImage(logoJenner, "JPEG", pageWidth - margin - logoWidth, startY + 2, logoWidth, logoHeight);
    } catch (e) {
      // Fallback if logo fails to load - draw simple placeholder
      doc.setFillColor(...COLORS.accent);
      doc.rect(pageWidth - margin - 28, startY + 5, 28, 30, "F");
    }

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
    const isAfecto = data.afecto_iva !== false;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.text);

    let currentY = startY + 8;

    doc.text("Subtotal Neto:", rightCol, currentY);
    doc.text(formatCurrency(data.subtotal_neto), valueCol, currentY, { align: "right" });
    currentY += 7;

    if (isAfecto) {
      doc.text("IVA (19%):", rightCol, currentY);
      doc.text(formatCurrency(data.total_iva), valueCol, currentY, { align: "right" });
      currentY += 7;

      doc.text("Total con IVA:", rightCol, currentY);
      doc.text(formatCurrency(data.total_con_iva), valueCol, currentY, { align: "right" });
      currentY += 7;
    } else {
      doc.setFont("helvetica", "italic");
      doc.text("(Documento Exento de IVA)", rightCol, currentY);
      doc.setFont("helvetica", "normal");
      currentY += 7;
    }

    // Recuadro del total - más compacto
    doc.setFillColor(...COLORS.primary);
    doc.rect(rightCol - 4, currentY + 1, 62, 10, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("TOTAL:", rightCol, currentY + 8);
    doc.text(formatCurrency(data.total_con_margen), valueCol, currentY + 8, { align: "right" });

    return currentY + 17;
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
