import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from "qrcode";
import { supabase } from "@/integrations/supabase/client";

interface EvaluacionPDFData {
  evaluacion: {
    id: string;
    resultado: string;
    observaciones: string | null;
    restricciones: string | null;
    numero_informe: number | null;
    evaluado_at: string | null;
    datos_clinicos: any;
    paquete: { nombre: string };
    evaluado_por: string | null;
  };
  paciente: {
    nombre: string;
    rut: string;
    cargo: string;
    fecha_nacimiento: string | null;
  };
  empresa: {
    nombre: string;
    rut: string;
  };
  tipo_servicio: string | null;
  fecha_atencion: string;
  examenes: Array<{
    nombre: string;
    estado: string;
  }>;
}

const loadImage = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = reject;
    img.src = url;
  });
};

const calcularEdad = (fechaNac: string | null): string => {
  if (!fechaNac) return "-";
  const hoy = new Date();
  const nacimiento = new Date(fechaNac);
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const m = hoy.getMonth() - nacimiento.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
  return `${edad} años`;
};

export const generarEvaluacionPDF = async (data: EvaluacionPDFData) => {
  // Load config
  const { data: configData } = await supabase
    .from("configuracion_centro")
    .select("*")
    .limit(1)
    .single();

  // Load doctor info
  let doctorInfo: { username: string; firma_url: string | null } | null = null;
  if (data.evaluacion.evaluado_por) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("username, firma_url")
      .eq("id", data.evaluacion.evaluado_por)
      .single();
    doctorInfo = profile;
  }

  // Get or create verification token
  let verificationToken = "";
  const { data: existing } = await supabase
    .from("informe_verificacion")
    .select("token_verificacion")
    .eq("evaluacion_id", data.evaluacion.id)
    .single();

  if (existing) {
    verificationToken = existing.token_verificacion;
  } else {
    const { data: created } = await supabase
      .from("informe_verificacion")
      .insert({ evaluacion_id: data.evaluacion.id })
      .select("token_verificacion")
      .single();
    verificationToken = created?.token_verificacion || "";
  }

  const verifyUrl = `${window.location.origin}/verificar/${verificationToken}`;

  const doc = new jsPDF("p", "mm", "letter");
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 15;
  let y = margin;

  // Pre-load background image if configured
  let fondoImg: string | null = null;
  if ((configData as any)?.fondo_url) {
    try {
      fondoImg = await loadImage((configData as any).fondo_url);
    } catch {
      // skip background
    }
  }

  // Helper: add background image to current page
  const addBackground = () => {
    if (fondoImg) {
      doc.addImage(fondoImg, "PNG", 0, 0, pageW, pageH);
    }
  };

  // Helper: add footer
  const addFooter = () => {
    const footerY = pageH - 20;
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(configData?.nombre_centro || "Centro Médico", margin, footerY);
    doc.text(configData?.direccion || "", margin, footerY + 4);
    const rightTexts = [configData?.web, configData?.email_contacto, configData?.telefono].filter(Boolean);
    doc.text(rightTexts.join(" | "), pageW - margin, footerY, { align: "right" });
    doc.text(rightTexts.length > 1 ? "" : "", pageW - margin, footerY + 4, { align: "right" });
  };

  // === PAGE 1 ===
  addBackground();

  // Logo
  if (configData?.logo_url) {
    try {
      const logoImg = await loadImage(configData.logo_url);
      doc.addImage(logoImg, "PNG", margin, y, 40, 15);
    } catch {
      // skip logo
    }
  }
  y += 20;

  // Title box
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.rect(margin, y, pageW - margin * 2, 16);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0);
  doc.text("RESULTADO EXAMEN", pageW / 2, y + 6, { align: "center" });
  doc.setFontSize(11);
  doc.text(data.evaluacion.paquete.nombre.toUpperCase(), pageW / 2, y + 12, { align: "center" });
  y += 22;

  // Fecha y Folio
  const fechaEval = data.evaluacion.evaluado_at
    ? new Date(data.evaluacion.evaluado_at)
    : new Date(data.fecha_atencion);
  const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  const fechaStr = `${fechaEval.getDate()} de ${meses[fechaEval.getMonth()]} del ${fechaEval.getFullYear()}`;

  // Calc valid until (1 year default)
  const validHasta = new Date(fechaEval);
  validHasta.setFullYear(validHasta.getFullYear() + 1);
  const validStr = `${String(validHasta.getDate()).padStart(2, "0")}-${String(validHasta.getMonth() + 1).padStart(2, "0")}-${validHasta.getFullYear()}`;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Fecha: ${fechaStr}`, margin, y);
  doc.setFont("helvetica", "bold");
  doc.text(`FOLIO ${data.evaluacion.numero_informe || "-"}  VÁLIDO HASTA ${validStr}`, pageW - margin, y, { align: "right" });
  y += 8;

  // Datos Paciente
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("DATOS DEL PACIENTE", margin, y);
  y += 5;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Nombre: ${data.paciente.nombre}`, margin, y); y += 4;
  doc.text(`RUT: ${data.paciente.rut}`, margin, y); y += 4;
  doc.text(`Edad: ${calcularEdad(data.paciente.fecha_nacimiento)}`, margin, y); y += 4;
  doc.text(`Cargo: ${data.paciente.cargo || "-"}`, margin, y); y += 7;

  // Datos Empresa
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("DATOS EMPRESA", margin, y);
  y += 5;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Empresa: ${data.empresa.nombre}`, margin, y); y += 4;
  doc.text(`Rut empresa: ${data.empresa.rut}`, margin, y); y += 4;
  doc.text(`Tipo de evaluación: ${(data.tipo_servicio || "OCUPACIONAL").toUpperCase()}`, margin, y); y += 10;

  // Resultado grande
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  const resultado = data.evaluacion.resultado === "apto" || data.evaluacion.resultado === "apto_con_restricciones" ? "APTO" : "NO APTO";
  doc.text(resultado, pageW / 2, y, { align: "center" });
  y += 8;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  if (data.evaluacion.resultado === "apto" || data.evaluacion.resultado === "apto_con_restricciones") {
    doc.text("El examen de salud realizado no demuestra alteraciones que impidan su desempeño", pageW / 2, y, { align: "center" });
  } else {
    doc.text("El examen de salud realizado demuestra alteraciones que impiden su desempeño", pageW / 2, y, { align: "center" });
  }
  y += 10;

  // Exámenes complementarios
  if (data.examenes.length > 0) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("EXÁMENES REALIZADOS", margin, y);
    y += 3;

    const examenesRows = data.examenes.map((ex) => [
      ex.nombre,
      ex.estado === "completado" || ex.estado === "muestra_tomada" ? "✓" : "",
      ex.estado === "pendiente" ? "Pendiente" : "",
    ]);

    autoTable(doc, {
      startY: y,
      head: [["Examen", "Normal", "Observación"]],
      body: examenesRows,
      margin: { left: margin, right: margin },
      styles: { fontSize: 8 },
      headStyles: { fillColor: [60, 60, 60] },
    });

    y = (doc as any).lastAutoTable.finalY + 8;
  }

  addFooter();

  // === PAGE 2 ===
  doc.addPage();
  addBackground();
  y = margin;

  // Logo again
  if (configData?.logo_url) {
    try {
      const logoImg = await loadImage(configData.logo_url);
      doc.addImage(logoImg, "PNG", margin, y, 40, 15);
    } catch { /* skip */ }
  }
  y += 20;

  // Conclusión
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("CONCLUSIÓN FINAL", margin, y);
  y += 6;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");

  if (data.evaluacion.resultado === "apto" || data.evaluacion.resultado === "apto_con_restricciones") {
    doc.text(`PACIENTE APTO PARA ${data.evaluacion.paquete.nombre.toUpperCase()}`, margin, y);
  } else {
    doc.text(`PACIENTE NO APTO PARA ${data.evaluacion.paquete.nombre.toUpperCase()}`, margin, y);
  }
  y += 8;

  // Observaciones
  if (data.evaluacion.observaciones) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("RECOMENDACIONES MÉDICAS GENERALES", margin, y);
    y += 6;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const obsLines = doc.splitTextToSize(data.evaluacion.observaciones, pageW - margin * 2);
    doc.text(obsLines, margin, y);
    y += obsLines.length * 4 + 6;
  }

  // Restricciones
  if (data.evaluacion.restricciones) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("RESTRICCIONES", margin, y);
    y += 6;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const restLines = doc.splitTextToSize(data.evaluacion.restricciones, pageW - margin * 2);
    doc.text(restLines, margin, y);
    y += restLines.length * 4 + 6;
  }

  // Nota legal corta
  doc.setFontSize(7);
  doc.setTextColor(100);
  doc.text(
    "Nota: Cualquier elemento de diagnóstico que se emplee en este tipo de evaluación, no asegura que el trabajador examinado esté exento de presentar síntomas o complicaciones de salud.",
    margin,
    y,
    { maxWidth: pageW - margin * 2 }
  );
  doc.setTextColor(0);
  y += 14;

  // Firma
  doc.text("Atentamente,", margin, y);
  y += 8;

  if (doctorInfo?.firma_url) {
    try {
      const firmaImg = await loadImage(doctorInfo.firma_url);
      doc.addImage(firmaImg, "PNG", margin, y, 40, 15);
      y += 18;
    } catch {
      doc.line(margin, y + 5, margin + 50, y + 5);
      y += 10;
    }
  } else {
    doc.line(margin, y + 5, margin + 50, y + 5);
    y += 10;
  }

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(doctorInfo?.username || "Médico Evaluador", margin, y);
  y += 4;
  doc.setFont("helvetica", "normal");
  doc.text("Dirección Salud Ocupacional", margin, y);

  // QR code for verification
  try {
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, { width: 120, margin: 1 });
    doc.addImage(qrDataUrl, "PNG", pageW - margin - 35, y - 25, 35, 35);
    doc.setFontSize(7);
    doc.setTextColor(100);
    doc.text("Verificar documento", pageW - margin - 35, y + 13, { align: "left" });
    doc.setTextColor(0);
  } catch {
    // Fallback to text URL if QR generation fails
    doc.setFontSize(7);
    doc.setTextColor(100);
    doc.text("Verificar documento:", pageW - margin - 50, y - 15);
    doc.text(verifyUrl, pageW - margin - 50, y - 11, { maxWidth: 48 });
    doc.setTextColor(0);
  }

  addFooter();

  // === PAGE 3 === (Legal)
  if (configData?.parrafo_legal) {
    doc.addPage();
    addBackground();
    y = margin;

    if (configData?.logo_url) {
      try {
        const logoImg = await loadImage(configData.logo_url);
        doc.addImage(logoImg, "PNG", margin, y, 40, 15);
      } catch { /* skip */ }
    }
    y += 25;

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(configData.nombre_centro || "Centro Médico", pageW / 2, y, { align: "center" });
    y += 10;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const legalLines = doc.splitTextToSize(configData.parrafo_legal, pageW - margin * 2);
    doc.text(legalLines, margin, y);

    addFooter();
  }

  // Download
  const filename = `Evaluacion_${data.evaluacion.paquete.nombre.replace(/\s+/g, "_")}_${data.evaluacion.numero_informe || "sin_folio"}.pdf`;
  doc.save(filename);
};
