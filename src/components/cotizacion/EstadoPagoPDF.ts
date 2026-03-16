import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoJenner from "@/assets/LogoCentro_Jenner-Vert.jpg";

interface EstadoPagoItem {
  paciente_nombre: string;
  paciente_rut: string | null;
  cargo: string | null;
  faena: string | null;
  fecha_atencion: string;
  baterias: { nombre: string; valor: number }[];
  subtotal: number | null;
}

interface BateriaSummary {
  nombre: string;
  cantidad: number;
  valorUnitario: number;
}

interface EstadoPagoData {
  numero: number;
  fecha_desde: string;
  fecha_hasta: string;
  empresa_nombre: string;
  empresa_rut: string | null;
  total_neto: number | null;
  total_iva: number | null;
  total: number | null;
  items: EstadoPagoItem[];
  bateriaSummary: BateriaSummary[];
  afecto_iva: boolean;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    minimumFractionDigits: 0,
  }).format(value);
};

const formatDateShort = (dateStr: string) => {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
};

const COLORS = {
  primary: [0, 56, 101] as [number, number, number],
  accent: [0, 188, 212] as [number, number, number],
  tableHeader: [0, 56, 101] as [number, number, number],
  text: [50, 50, 50] as [number, number, number],
  lightGray: [240, 240, 240] as [number, number, number],
};

export const generateEstadoPagoPDF = (data: EstadoPagoData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;

  const drawHeader = (startY: number) => {
    doc.setFillColor(...COLORS.accent);
    doc.rect(0, 0, pageWidth, 3, "F");

    doc.setFontSize(18);
    doc.setTextColor(...COLORS.primary);
    doc.setFont("helvetica", "bold");
    doc.text("Centro Médico Jenner", margin, startY + 12);

    doc.setFontSize(8);
    doc.setTextColor(...COLORS.text);
    doc.setFont("helvetica", "normal");
    doc.text("Av. Salvador Allende 3432, Edif. Nuevo Prado, piso 2. Iquique - Chile.", margin, startY + 18);
    doc.text("www.centrojenner.cl", margin, startY + 23);
    doc.text("contacto@centrojenner.cl", margin, startY + 28);
    doc.text("57 226 2775", margin, startY + 33);

    try {
      const logoWidth = 28;
      const logoHeight = 35;
      doc.addImage(logoJenner, "JPEG", pageWidth - margin - logoWidth, startY + 2, logoWidth, logoHeight);
    } catch {
      doc.setFillColor(...COLORS.accent);
      doc.rect(pageWidth - margin - 28, startY + 5, 28, 30, "F");
    }

    return startY + 38;
  };

  const drawClientInfo = (startY: number) => {
    doc.setFillColor(...COLORS.accent);
    doc.rect(margin, startY, 2, 22, "F");

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.text);

    const leftCol = margin + 6;
    const valueCol = margin + 28;

    doc.text("Empresa:", leftCol, startY + 6);
    doc.text("RUT:", leftCol, startY + 13);
    doc.text("Período:", leftCol, startY + 20);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.primary);
    doc.text(data.empresa_nombre, valueCol, startY + 6);
    doc.text(data.empresa_rut || "-", valueCol, startY + 13);
    doc.text(`${formatDateShort(data.fecha_desde)} al ${formatDateShort(data.fecha_hasta)}`, valueCol, startY + 20);

    // Right side - Estado de Pago number
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.accent);
    doc.text(`ESTADO DE PAGO N°: ${data.numero}`, pageWidth - margin - 75, startY + 10);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.text);
    doc.text(`${data.items.length} atenciones`, pageWidth - margin - 75, startY + 18);

    return startY + 28;
  };

  const drawTotals = (startY: number) => {
    const rightCol = pageWidth - margin - 55;
    const valueCol = pageWidth - margin - 8;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.text);

    let currentY = startY + 8;

    // Neto
    doc.text("Neto:", rightCol, currentY);
    doc.text(formatCurrency(data.total_neto || 0), valueCol, currentY, { align: "right" });
    currentY += 7;

    if (data.afecto_iva) {
      doc.text("IVA (19%):", rightCol, currentY);
      doc.text(formatCurrency(data.total_iva || 0), valueCol, currentY, { align: "right" });
      currentY += 7;
    } else {
      doc.setFont("helvetica", "italic");
      doc.text("(Documento Exento de IVA)", rightCol, currentY);
      doc.setFont("helvetica", "normal");
      currentY += 7;
    }

    // Total box
    doc.setFillColor(...COLORS.primary);
    doc.rect(rightCol - 4, currentY + 1, 62, 10, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("TOTAL:", rightCol, currentY + 8);
    doc.text(formatCurrency(data.total || 0), valueCol, currentY + 8, { align: "right" });

    return currentY + 17;
  };

  const drawFooter = () => {
    const footerY = pageHeight - 25;
    doc.setFillColor(...COLORS.accent);
    doc.rect(margin, footerY, 2, 16, "F");

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

  // Page 1: Header + client info
  drawHeader(5);
  drawClientInfo(43);

  const tableStartY = 76;
  const footerHeight = 40;

  // Detail table
  const tableData = data.items.map((item, idx) => [
    (idx + 1).toString(),
    formatDateShort(item.fecha_atencion),
    item.paciente_nombre,
    item.paciente_rut || "-",
    item.cargo || "-",
    item.faena || "-",
    (item.baterias || []).map(b => b.nombre).join(", "),
    formatCurrency(item.subtotal || 0),
  ]);

  autoTable(doc, {
    startY: tableStartY,
    head: [["#", "Fecha", "Paciente", "RUT", "Cargo", "Faena", "Baterías", "Subtotal"]],
    body: tableData,
    theme: "plain",
    headStyles: {
      fillColor: COLORS.tableHeader,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7,
      halign: "center",
    },
    columnStyles: {
      0: { cellWidth: 8, halign: "center", fontSize: 6 },
      1: { cellWidth: 18, fontSize: 7 },
      2: { cellWidth: "auto", fontSize: 7 },
      3: { cellWidth: 22, fontSize: 6, font: "courier" },
      4: { cellWidth: 20, fontSize: 6 },
      5: { cellWidth: 22, fontSize: 6 },
      6: { cellWidth: 38, fontSize: 6 },
      7: { cellWidth: 22, halign: "right", fontSize: 7 },
    },
    styles: {
      fontSize: 7,
      cellPadding: 2,
      lineColor: [200, 200, 200],
      lineWidth: 0.1,
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250],
    },
    margin: { left: margin, right: margin, top: 50, bottom: footerHeight },
    didDrawPage: (hookData) => {
      if (hookData.pageNumber > 1) {
        drawHeader(5);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...COLORS.text);
        doc.text(`Estado de Pago N° ${data.numero} - ${data.empresa_nombre}`, margin, 45);
      }
    },
  });

  let currentY = (doc as any).lastAutoTable.finalY;

  // Battery summary table
  if (data.bateriaSummary.length > 0) {
    if (currentY + 60 > pageHeight - footerHeight) {
      doc.addPage();
      drawHeader(5);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...COLORS.text);
      doc.text(`Estado de Pago N° ${data.numero} - ${data.empresa_nombre}`, margin, 45);
      currentY = 50;
    }

    currentY += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.primary);
    doc.text("Resumen por Batería", margin, currentY);
    currentY += 4;

    const summaryData = data.bateriaSummary.map(b => [
      b.nombre,
      b.cantidad.toString(),
      formatCurrency(b.valorUnitario),
      formatCurrency(b.cantidad * b.valorUnitario),
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [["Batería", "Cantidad", "Valor Unitario", "Total"]],
      body: summaryData,
      theme: "plain",
      headStyles: {
        fillColor: COLORS.tableHeader,
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 8,
        halign: "center",
      },
      columnStyles: {
        0: { cellWidth: "auto" },
        1: { cellWidth: 25, halign: "center" },
        2: { cellWidth: 30, halign: "right" },
        3: { cellWidth: 30, halign: "right", fontStyle: "bold" },
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
      margin: { left: margin, right: margin, bottom: footerHeight },
      didDrawPage: (hookData) => {
        if (hookData.pageNumber > 1) {
          drawHeader(5);
        }
      },
    });

    currentY = (doc as any).lastAutoTable.finalY;
  }

  // Totals
  if (currentY + 40 > pageHeight - footerHeight) {
    doc.addPage();
    drawHeader(5);
    currentY = 48;
  }

  drawTotals(currentY);

  // Footer on every page
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter();
  }

  const fileName = `EstadoPago_${data.numero}_${data.empresa_nombre}.pdf`;
  doc.save(fileName.replace(/\s+/g, "_"));

  return doc;
};
