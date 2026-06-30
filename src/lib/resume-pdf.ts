import { jsPDF } from "jspdf";

export function exportResumePdf(text: string, name = "resume.pdf") {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 48;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const usableWidth = pageWidth - margin * 2;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);

  const lines: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    if (!raw.trim()) { lines.push(""); continue; }
    const wrapped = doc.splitTextToSize(raw, usableWidth) as string[];
    lines.push(...wrapped);
  }

  let y = margin;
  const lineHeight = 14;
  for (const line of lines) {
    if (y > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
    // Headings: ALL-CAPS short lines or markdown-style headers
    const isHeading = /^#{1,3}\s/.test(line) || (line.length < 60 && line === line.toUpperCase() && /[A-Z]/.test(line));
    if (isHeading) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text(line.replace(/^#{1,3}\s/, ""), margin, y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
    } else {
      doc.text(line, margin, y);
    }
    y += lineHeight;
  }

  doc.save(name);
}
