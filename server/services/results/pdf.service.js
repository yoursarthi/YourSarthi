'use strict';

const PDFDocument = require('pdfkit');

const BLUE  = '#1a237e';
const AMBER = '#ff6f00';
const LIGHT = '#f8f9ff';
const GRAY  = '#64748b';
const BLACK = '#0f172a';

// Horizontal line helper
function hLine(doc, y, x1 = 40, x2 = 555) {
  doc.moveTo(x1, y).lineTo(x2, y).strokeColor('#e5e7eb').lineWidth(0.5).stroke();
}

// Table cell text helper
function cell(doc, text, x, y, w, opts = {}) {
  const align = opts.align || 'left';
  const color = opts.color || BLACK;
  const size  = opts.size  || 9;
  const bold  = opts.bold  || false;
  doc.font(bold ? 'Helvetica-Bold' : 'Helvetica')
     .fontSize(size)
     .fillColor(color)
     .text(String(text ?? '—'), x, y, { width: w, align, lineBreak: false });
}

/**
 * Generate a PDF buffer for a single student marksheet.
 * @param {object} ms  marksheet data from marksheet.service.generateMarksheets
 * @returns {Promise<Buffer>}
 */
function generateMarksheetPDF(ms) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });
    const chunks = [];
    doc.on('data',  c => chunks.push(c));
    doc.on('end',   () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageW = doc.page.width;
    const L = 40;
    const R = pageW - 40;
    const W = R - L;

    // ── Header ──────────────────────────────────────────────────────────────
    doc.rect(L, 40, W, 70).fill(BLUE);

    doc.font('Helvetica-Bold').fontSize(18).fillColor('#ffffff')
       .text('ITM UNIVERSITY, GWALIOR', L, 52, { align: 'center', width: W });

    doc.font('Helvetica').fontSize(9).fillColor('rgba(255,255,255,0.8)')
       .text(ms.institute?.affiliation || 'Affiliated to RGPV, Bhopal · NAAC Accredited', L, 74, { align: 'center', width: W });

    // Amber divider strip
    doc.rect(L, 110, W, 4).fill(AMBER);

    // Title bar
    doc.rect(L, 114, W, 22).fill(LIGHT);
    doc.font('Helvetica-Bold').fontSize(11).fillColor(BLUE)
       .text('GRADE CARD / MARK SHEET', L, 120, { align: 'center', width: W });

    let y = 146;

    // ── Student Details ──────────────────────────────────────────────────────
    doc.rect(L, y, W, 14).fill(BLUE);
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#ffffff')
       .text('STUDENT INFORMATION', L + 6, y + 3);
    y += 14;

    const { student } = ms;
    const detailRows = [
      ['Student Name', student.name,          'Roll No.',       student.roll_no],
      ['Enrollment No.',student.enrollment_no,'Program',        student.program],
      ['Department',   student.department,    'Semester',       ms.semester],
      ['Batch',        student.batch,         'Academic Year',  ms.academic_year],
    ];

    doc.rect(L, y, W, detailRows.length * 18).fill('#ffffff').stroke();
    detailRows.forEach((row, ri) => {
      const rowY = y + ri * 18 + 4;
      if (ri > 0) hLine(doc, y + ri * 18, L, R);
      // Col 1 label
      doc.font('Helvetica').fontSize(8).fillColor(GRAY)
         .text(row[0] + ':', L + 6, rowY, { width: 90, lineBreak: false });
      doc.font('Helvetica-Bold').fontSize(8).fillColor(BLACK)
         .text(row[1] || '—', L + 100, rowY, { width: W / 2 - 110, lineBreak: false });
      // Col 2 label
      doc.font('Helvetica').fontSize(8).fillColor(GRAY)
         .text(row[2] + ':', L + W / 2 + 4, rowY, { width: 90, lineBreak: false });
      doc.font('Helvetica-Bold').fontSize(8).fillColor(BLACK)
         .text(row[3] || '—', L + W / 2 + 98, rowY, { width: W / 2 - 110, lineBreak: false });
    });
    y += detailRows.length * 18 + 10;

    // ── Marks Table ──────────────────────────────────────────────────────────
    doc.rect(L, y, W, 14).fill(BLUE);
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#ffffff')
       .text('SUBJECT-WISE MARKS', L + 6, y + 3);
    y += 14;

    // Determine columns from the first course's breakdown
    const sampleBreakdown = (ms.courses[0]?.breakdown) || [];
    const compCols = sampleBreakdown.map(b => ({
      name: b.component_name,
      id:   b.component_id,
    }));

    // Column widths
    const colNo   = 22;
    const colCode = 52;
    const colName = Math.max(100, W - colNo - colCode - 28 - 28 - 36 - 24 - compCols.length * 50);
    const colCr   = 24;
    const colComp = 50;
    const colPct  = 32;
    const colGr   = 24;
    const colPt   = 28;

    // Header row
    doc.rect(L, y, W, 16).fill('#e8eaf6');
    let cx = L + 2;
    cell(doc, '#',           cx, y + 4, colNo,   { bold: true, align: 'center' }); cx += colNo;
    cell(doc, 'Code',        cx, y + 4, colCode,  { bold: true });                  cx += colCode;
    cell(doc, 'Course Name', cx, y + 4, colName,  { bold: true });                  cx += colName;
    cell(doc, 'Cr',          cx, y + 4, colCr,    { bold: true, align: 'center' }); cx += colCr;
    compCols.forEach(c => {
      cell(doc, c.name.slice(0, 8), cx, y + 4, colComp, { bold: true, align: 'center', size: 7 });
      cx += colComp;
    });
    cell(doc, '%',   cx, y + 4, colPct, { bold: true, align: 'center' }); cx += colPct;
    cell(doc, 'Gr',  cx, y + 4, colGr,  { bold: true, align: 'center' }); cx += colGr;
    cell(doc, 'GP',  cx, y + 4, colPt,  { bold: true, align: 'center' });
    y += 16;

    ms.courses.forEach((course, idx) => {
      const rowH = 14;
      const bg   = idx % 2 === 0 ? '#ffffff' : '#f8f9ff';
      doc.rect(L, y, W, rowH).fill(bg);

      const passed = course.passed;
      cx = L + 2;
      cell(doc, idx + 1,            cx, y + 3, colNo,   { align: 'center' }); cx += colNo;
      cell(doc, course.course_code, cx, y + 3, colCode, { size: 8 });          cx += colCode;
      cell(doc, course.course_name, cx, y + 3, colName, { size: 8 });          cx += colName;
      cell(doc, course.credits,     cx, y + 3, colCr,   { align: 'center' });  cx += colCr;

      compCols.forEach(c => {
        const bd = course.breakdown.find(b => b.component_id === c.id);
        const txt = bd ? `${bd.marks_obtained}/${bd.max_marks}` : '—';
        cell(doc, txt, cx, y + 3, colComp, { align: 'center', size: 8 }); cx += colComp;
      });

      cell(doc, course.finalPercentage.toFixed(1), cx, y + 3, colPct,
           { align: 'center', color: passed ? '#166534' : '#991b1b' });
      cx += colPct;

      cell(doc, course.grade, cx, y + 3, colGr,
           { align: 'center', bold: true, color: passed ? '#166534' : '#991b1b' });
      cx += colGr;

      cell(doc, course.grade_point, cx, y + 3, colPt, { align: 'center' });
      hLine(doc, y + rowH, L, R);
      y += rowH;
    });

    y += 10;

    // ── Summary ──────────────────────────────────────────────────────────────
    doc.rect(L, y, W, 30).fill(LIGHT);
    doc.rect(L, y, W, 30).stroke().strokeColor('#c7d2fe').lineWidth(1);

    const summaryItems = [
      ['SGPA', ms.sgpa?.toFixed(2) || '—'],
      ['Total Credits', ms.total_credits],
      ['Earned Credits', ms.earned_credits],
      ['Result', ms.overall_result],
    ];
    const sw = W / summaryItems.length;
    summaryItems.forEach(([label, value], i) => {
      const sx = L + i * sw;
      doc.font('Helvetica').fontSize(8).fillColor(GRAY)
         .text(label, sx + 4, y + 6, { width: sw - 8, align: 'center', lineBreak: false });
      doc.font('Helvetica-Bold').fontSize(11)
         .fillColor(label === 'Result' ? (ms.overall_result === 'PASS' ? '#166534' : '#991b1b') : BLUE)
         .text(String(value), sx + 4, y + 16, { width: sw - 8, align: 'center', lineBreak: false });
    });
    y += 40;

    // ── Weightage Note ───────────────────────────────────────────────────────
    if (ms.courses[0]?.breakdown?.length) {
      const note = ms.courses[0].breakdown
        .map(b => `${b.component_name}: ${b.weightage}%`)
        .join('  ·  ');
      doc.font('Helvetica').fontSize(7.5).fillColor(GRAY)
         .text(`Weightage: ${note}`, L, y, { width: W });
      y += 14;
    }

    // ── Signature Area ───────────────────────────────────────────────────────
    y = Math.max(y + 20, doc.page.height - 110);
    hLine(doc, y, L, R);
    y += 10;

    const sigW = W / 3;
    const sigs = ['Controller of Examinations', 'Dean Academics', 'Principal'];
    sigs.forEach((sig, i) => {
      const sx = L + i * sigW;
      doc.moveTo(sx + 20, y + 30).lineTo(sx + sigW - 20, y + 30)
         .strokeColor(BLACK).lineWidth(0.5).stroke();
      doc.font('Helvetica').fontSize(8).fillColor(GRAY)
         .text(sig, sx, y + 34, { width: sigW, align: 'center', lineBreak: false });
    });

    // Footer
    doc.font('Helvetica').fontSize(7).fillColor(GRAY)
       .text(
         `Generated: ${new Date().toLocaleString('en-IN')}  ·  ITM University, Gwalior`,
         L, doc.page.height - 30, { width: W, align: 'center' }
       );

    doc.end();
  });
}

module.exports = { generateMarksheetPDF };
