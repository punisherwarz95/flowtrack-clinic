import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from "qrcode";
import { supabase } from "@/integrations/supabase/client";

// v5 - Filter exams by paquete, remove top bar, detailed sub-results

interface EvaluacionPDFData {
  evaluacion: {
    id: string;
    resultado: string;
    observaciones: string | null;
    restricciones: string | null;
    numero_informe: number | null;
    evaluado_at: string | null;
    datos_clinicos: any;
    paquete: { id: string; nombre: string };
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
  atencion_id: string;
  examenes: Array<{
    nombre: string;
    estado: string;
  }>;
}

// Color palette - Blue/Teal Medical
const COLORS = {
  primary: [0, 105, 148] as [number, number, number],       // Deep teal-blue
  primaryDark: [0, 75, 110] as [number, number, number],     // Darker teal
  secondary: [0, 150, 199] as [number, number, number],      // Bright cerulean
  accent: [72, 191, 227] as [number, number, number],        // Light cyan
  lightBg: [230, 245, 252] as [number, number, number],      // Very light blue bg
  headerBg: [0, 105, 148] as [number, number, number],       // Table header
  text: [30, 40, 50] as [number, number, number],            // Dark text
  muted: [100, 115, 130] as [number, number, number],        // Muted text
  white: [255, 255, 255] as [number, number, number],
  aptoBg: [220, 252, 231] as [number, number, number],
  aptoText: [22, 101, 52] as [number, number, number],
  noAptoBg: [254, 226, 226] as [number, number, number],
  noAptoText: [153, 27, 27] as [number, number, number],
};

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

interface ExamDetailResult {
  examen_nombre: string;
  campos: Array<{ etiqueta: string; valor: string | null; grupo: string | null }>;
}

const fetchExamDetails = async (atencionId: string, paqueteId: string): Promise<ExamDetailResult[]> => {
  // First get examen_ids that belong to this paquete
  const { data: paqueteItems } = await supabase
    .from("paquete_examen_items")
    .select("examen_id")
    .eq("paquete_id", paqueteId);

  const paqueteExamenIds = new Set((paqueteItems || []).map((p: any) => p.examen_id));

  const { data } = await supabase
    .from("atencion_examenes")
    .select(`
      id,
      estado,
      examen_id,
      examen:examenes(nombre),
      resultados:examen_resultados(
        valor,
        campo:examen_formulario_campos(etiqueta, grupo, orden, tipo_campo)
      )
    `)
    .eq("atencion_id", atencionId);

  if (!data) return [];

  const results: ExamDetailResult[] = [];
  for (const ae of data as any[]) {
    // Only include exams that belong to this paquete
    if (!paqueteExamenIds.has(ae.examen_id)) continue;
    const nombre = ae.examen?.nombre || "";
    const campos: Array<{ etiqueta: string; valor: string | null; grupo: string | null }> = [];

    if (ae.resultados && Array.isArray(ae.resultados)) {
      const sorted = ae.resultados
        .filter((r: any) => r.campo && r.valor)
        .sort((a: any, b: any) => (a.campo?.orden || 0) - (b.campo?.orden || 0));

      for (const r of sorted) {
        // Skip special field types that don't have meaningful text values
        if (r.campo.tipo_campo === "audiometria" || r.campo.tipo_campo === "antropometria") continue;
        campos.push({
          etiqueta: r.campo.etiqueta,
          valor: r.valor,
          grupo: r.campo.grupo,
        });
      }
    }

    results.push({ examen_nombre: nombre, campos });
  }

  return results;
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

  // Fetch detailed exam results
  const examDetails = await fetchExamDetails(data.atencion_id, data.evaluacion.paquete.id);

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
    } catch { /* skip */ }
  }

  const addBackground = () => {
    if (fondoImg) {
      doc.addImage(fondoImg, "PNG", 0, 0, pageW, pageH);
    }
  };

  const addFooter = () => {
    const footerY = pageH - 18;
    // Blue line above footer
    doc.setDrawColor(...COLORS.primary);
    doc.setLineWidth(0.5);
    doc.line(margin, footerY - 3, pageW - margin, footerY - 3);

    doc.setFontSize(7);
    doc.setTextColor(...COLORS.muted);
    doc.text(configData?.nombre_centro || "Centro Médico", margin, footerY);
    doc.text(configData?.direccion || "", margin, footerY + 3.5);
    const rightTexts = [configData?.web, configData?.email_contacto, configData?.telefono].filter(Boolean);
    doc.text(rightTexts.join(" | "), pageW - margin, footerY, { align: "right" });
  };

  const checkPageBreak = (neededSpace: number): number => {
    if (y + neededSpace > pageH - 25) {
      addFooter();
      doc.addPage();
      addBackground();
      y = margin;
      // Logo on new page
      if (configData?.logo_url) {
        try {
          // Logo will be loaded synchronously from cache
        } catch { /* skip */ }
      }
      y += 5;
    }
    return y;
  };

  // === PAGE 1 ===
  addBackground();


  // Logo
  if (configData?.logo_url) {
    try {
      const logoImg = await loadImage(configData.logo_url);
      doc.addImage(logoImg, "PNG", margin, y + 2, 40, 15);
    } catch { /* skip */ }
  }
  y += 22;

  // Title box with gradient effect
  doc.setFillColor(...COLORS.primary);
  doc.roundedRect(margin, y, pageW - margin * 2, 18, 2, 2, "F");
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.white);
  doc.text("RESULTADO EXAMEN", pageW / 2, y + 7, { align: "center" });
  doc.setFontSize(11);
  doc.text(data.evaluacion.paquete.nombre.toUpperCase(), pageW / 2, y + 13, { align: "center" });
  y += 24;

  // Fecha y Folio
  const fechaEval = data.evaluacion.evaluado_at
    ? new Date(data.evaluacion.evaluado_at)
    : new Date(data.fecha_atencion);
  const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  const fechaStr = `${fechaEval.getDate()} de ${meses[fechaEval.getMonth()]} del ${fechaEval.getFullYear()}`;

  const validHasta = new Date(fechaEval);
  validHasta.setFullYear(validHasta.getFullYear() + 1);
  const validStr = `${String(validHasta.getDate()).padStart(2, "0")}-${String(validHasta.getMonth() + 1).padStart(2, "0")}-${validHasta.getFullYear()}`;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.text);
  doc.text(`Fecha: ${fechaStr}`, margin, y);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.primary);
  doc.text(`FOLIO ${data.evaluacion.numero_informe || "-"}  |  VÁLIDO HASTA ${validStr}`, pageW - margin, y, { align: "right" });
  y += 8;

  // Datos Paciente - Card style
  doc.setFillColor(...COLORS.lightBg);
  doc.roundedRect(margin, y, pageW - margin * 2, 28, 2, 2, "F");
  doc.setDrawColor(...COLORS.accent);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, pageW - margin * 2, 28, 2, 2, "S");

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.primary);
  doc.text("DATOS DEL PACIENTE", margin + 4, y + 5);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.text);
  doc.text(`Nombre: ${data.paciente.nombre}`, margin + 4, y + 11);
  doc.text(`RUT: ${data.paciente.rut}`, margin + 4, y + 16);
  doc.text(`Edad: ${calcularEdad(data.paciente.fecha_nacimiento)}`, margin + 100, y + 11);
  doc.text(`Cargo: ${data.paciente.cargo || "-"}`, margin + 100, y + 16);
  // Empresa info in same card
  doc.text(`Empresa: ${data.empresa.nombre}`, margin + 4, y + 22);
  doc.text(`RUT Empresa: ${data.empresa.rut}`, margin + 100, y + 22);
  y += 34;

  // Tipo evaluación
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.muted);
  doc.text(`Tipo de evaluación: ${(data.tipo_servicio || "OCUPACIONAL").toUpperCase()}`, margin, y);
  y += 8;

  // Resultado grande with colored box
  const isApto = data.evaluacion.resultado === "apto" || data.evaluacion.resultado === "apto_con_restricciones";
  const resultado = isApto ? "APTO" : "NO APTO";
  const resBg = isApto ? COLORS.aptoBg : COLORS.noAptoBg;
  const resText = isApto ? COLORS.aptoText : COLORS.noAptoText;

  doc.setFillColor(...resBg);
  doc.roundedRect(margin, y, pageW - margin * 2, 20, 3, 3, "F");
  doc.setDrawColor(...(isApto ? COLORS.aptoText : COLORS.noAptoText));
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, y, pageW - margin * 2, 20, 3, 3, "S");

  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...resText);
  doc.text(resultado, pageW / 2, y + 10, { align: "center" });
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  if (isApto) {
    doc.text("El examen de salud realizado no demuestra alteraciones que impidan su desempeño", pageW / 2, y + 16, { align: "center" });
  } else {
    doc.text("El examen de salud realizado demuestra alteraciones que impiden su desempeño", pageW / 2, y + 16, { align: "center" });
  }
  y += 26;

  // === DETAILED EXAM RESULTS ===
  if (examDetails.length > 0) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.primary);
    doc.text("DETALLE DE EXÁMENES REALIZADOS", margin, y);
    y += 5;

    for (const exam of examDetails) {
      // Check if we need a new page
      const estimatedHeight = 10 + (exam.campos.length > 0 ? exam.campos.length * 5 + 10 : 5);
      y = checkPageBreak(estimatedHeight);

      // Exam name header
      doc.setFillColor(...COLORS.secondary);
      doc.roundedRect(margin, y, pageW - margin * 2, 7, 1, 1, "F");
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...COLORS.white);
      doc.text(exam.examen_nombre, margin + 3, y + 5);
      y += 10;

      if (exam.campos.length > 0) {
        // Group fields by grupo
        const groups = new Map<string, Array<{ etiqueta: string; valor: string | null }>>();
        for (const c of exam.campos) {
          const key = c.grupo || "";
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key)!.push({ etiqueta: c.etiqueta, valor: c.valor });
        }

        for (const [groupName, fields] of groups) {
          if (groupName) {
            y = checkPageBreak(8);
            doc.setFontSize(8);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(...COLORS.primaryDark);
            doc.text(groupName, margin + 2, y);
            y += 4;
          }

          const rows = fields.map(f => [f.etiqueta, f.valor || "-"]);
          autoTable(doc, {
            startY: y,
            head: [],
            body: rows,
            margin: { left: margin + 2, right: margin },
            styles: { fontSize: 7.5, cellPadding: 1.5, textColor: COLORS.text },
            columnStyles: {
              0: { fontStyle: "bold", cellWidth: 60, textColor: COLORS.primaryDark },
              1: { cellWidth: "auto" },
            },
            alternateRowStyles: { fillColor: [245, 250, 255] },
            theme: "plain",
          });
          y = (doc as any).lastAutoTable.finalY + 3;
        }
      } else {
        doc.setFontSize(8);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(...COLORS.muted);
        doc.text("Examen completado - sin campos detallados", margin + 3, y);
        y += 5;
      }

      y += 2;
    }
  }

  addFooter();

  // === PAGE 2 - CONCLUSION ===
  doc.addPage();
  addBackground();
  y = margin;


  // Logo
  if (configData?.logo_url) {
    try {
      const logoImg = await loadImage(configData.logo_url);
      doc.addImage(logoImg, "PNG", margin, y + 2, 40, 15);
    } catch { /* skip */ }
  }
  y += 22;

  // Conclusión title
  doc.setFillColor(...COLORS.primary);
  doc.roundedRect(margin, y, pageW - margin * 2, 10, 2, 2, "F");
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.white);
  doc.text("CONCLUSIÓN FINAL", pageW / 2, y + 7, { align: "center" });
  y += 16;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.text);
  if (isApto) {
    doc.text(`PACIENTE APTO PARA ${data.evaluacion.paquete.nombre.toUpperCase()}`, margin, y);
  } else {
    doc.text(`PACIENTE NO APTO PARA ${data.evaluacion.paquete.nombre.toUpperCase()}`, margin, y);
  }
  y += 10;

  // Observaciones
  if (data.evaluacion.observaciones) {
    doc.setFillColor(...COLORS.lightBg);
    const obsLines = doc.splitTextToSize(data.evaluacion.observaciones, pageW - margin * 2 - 8);
    const obsHeight = obsLines.length * 4 + 12;
    doc.roundedRect(margin, y, pageW - margin * 2, obsHeight, 2, 2, "F");
    doc.setDrawColor(...COLORS.accent);
    doc.roundedRect(margin, y, pageW - margin * 2, obsHeight, 2, 2, "S");

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.primary);
    doc.text("RECOMENDACIONES MÉDICAS GENERALES", margin + 4, y + 6);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.text);
    doc.text(obsLines, margin + 4, y + 12);
    y += obsHeight + 6;
  }

  // Restricciones
  if (data.evaluacion.restricciones) {
    const restLines = doc.splitTextToSize(data.evaluacion.restricciones, pageW - margin * 2 - 8);
    const restHeight = restLines.length * 4 + 12;
    doc.setFillColor(255, 251, 235);
    doc.roundedRect(margin, y, pageW - margin * 2, restHeight, 2, 2, "F");
    doc.setDrawColor(217, 119, 6);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, pageW - margin * 2, restHeight, 2, 2, "S");

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(180, 83, 9);
    doc.text("RESTRICCIONES", margin + 4, y + 6);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.text);
    doc.text(restLines, margin + 4, y + 12);
    y += restHeight + 6;
  }

  // Nota legal
  doc.setFontSize(7);
  doc.setTextColor(...COLORS.muted);
  doc.text(
    "Nota: Cualquier elemento de diagnóstico que se emplee en este tipo de evaluación, no asegura que el trabajador examinado esté exento de presentar síntomas o complicaciones de salud.",
    margin, y, { maxWidth: pageW - margin * 2 }
  );
  y += 14;

  // Firma
  doc.setTextColor(...COLORS.text);
  doc.setFontSize(9);
  doc.text("Atentamente,", margin, y);
  y += 8;

  if (doctorInfo?.firma_url) {
    try {
      const firmaImg = await loadImage(doctorInfo.firma_url);
      doc.addImage(firmaImg, "PNG", margin, y, 40, 15);
      y += 18;
    } catch {
      doc.setDrawColor(...COLORS.primary);
      doc.line(margin, y + 5, margin + 50, y + 5);
      y += 10;
    }
  } else {
    doc.setDrawColor(...COLORS.primary);
    doc.line(margin, y + 5, margin + 50, y + 5);
    y += 10;
  }

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.primary);
  doc.text(doctorInfo?.username || "Médico Evaluador", margin, y);
  y += 4;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.text);
  doc.text("Dirección Salud Ocupacional", margin, y);

  // QR code
  try {
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, { width: 120, margin: 1, color: { dark: "#006994", light: "#ffffff" } });
    doc.addImage(qrDataUrl, "PNG", pageW - margin - 35, y - 25, 35, 35);
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.muted);
    doc.text("Verificar documento", pageW - margin - 35, y + 13, { align: "left" });
  } catch {
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.muted);
    doc.text("Verificar: " + verifyUrl, pageW - margin - 50, y - 10, { maxWidth: 48 });
  }

  addFooter();

  // === PAGE 3 - Legal ===
  if (configData?.parrafo_legal) {
    doc.addPage();
    addBackground();
    y = margin;

    doc.setFillColor(...COLORS.primary);
    doc.rect(0, 0, pageW, 8, "F");

    if (configData?.logo_url) {
      try {
        const logoImg = await loadImage(configData.logo_url);
        doc.addImage(logoImg, "PNG", margin, y + 2, 40, 15);
      } catch { /* skip */ }
    }
    y += 25;

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.primary);
    doc.text(configData.nombre_centro || "Centro Médico", pageW / 2, y, { align: "center" });
    y += 10;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.text);
    const legalLines = doc.splitTextToSize(configData.parrafo_legal, pageW - margin * 2);
    doc.text(legalLines, margin, y);

    addFooter();
  }

  // Download
  const filename = `Evaluacion_${data.evaluacion.paquete.nombre.replace(/\s+/g, "_")}_${data.evaluacion.numero_informe || "sin_folio"}.pdf`;
  doc.save(filename);
};
