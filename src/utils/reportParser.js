// Turns text read from a lab report photo into editable test rows.
// This is a best-effort helper: layouts differ, so the user must always check every value.

const RATIOS = [
  { re: /chol\w*\s*\/\s*hdl/i, name: 'Cholesterol/HDL Ratio' },
  { re: /hdl\s*\/\s*ldl/i, name: 'HDL/LDL Ratio' },
  { re: /ldl\s*\/\s*hdl/i, name: 'LDL/HDL Ratio' },
];

const TESTS = [
  { name: 'HbA1c', category: 'Diabetes Profile', unit: '%', re: /hb\s*a1c|glyc(?:o|a)sylated\s*h(?:a)?emoglobin|glycated\s*h(?:a)?emoglobin/i },
  { name: 'Estimated Average Glucose (eAG)', category: 'Diabetes Profile', unit: 'mg/dL', re: /estimated\s*average\s*glucose|\beag\b/i },
  { name: 'Fasting Blood Sugar (FBS)', category: 'Blood Glucose', unit: 'mg/dL', re: /fasting\s*(?:plasma\s*|blood\s*)?(?:sugar|glucose)|glucose\s*[-,(:]*\s*fasting|\bfbs\b|\bfbg\b/i },
  { name: 'Postprandial Blood Sugar (PPBS)', category: 'Blood Glucose', unit: 'mg/dL', re: /post\s*-?\s*(?:prandial|meal)\s*(?:plasma\s*|blood\s*)?(?:sugar|glucose)|glucose\s*[-,(:]*\s*(?:post|pp)|\bppbs\b|\bppbg\b|\bpp\s*bs\b/i },
  { name: 'Random Blood Sugar (RBS)', category: 'Blood Glucose', unit: 'mg/dL', re: /random\s*(?:plasma\s*|blood\s*)?(?:sugar|glucose)|\brbs\b/i },
  { name: 'VLDL', category: 'Lipid Profile', unit: 'mg/dL', re: /\bvldl\b/i },
  { name: 'HDL', category: 'Lipid Profile', unit: 'mg/dL', re: /\bhdl\b/i },
  { name: 'LDL', category: 'Lipid Profile', unit: 'mg/dL', re: /\bldl\b/i },
  { name: 'Triglycerides', category: 'Lipid Profile', unit: 'mg/dL', re: /triglycerides?|\btgl?\b/i },
  { name: 'Total Cholesterol', category: 'Lipid Profile', unit: 'mg/dL', re: /total\s*cholesterol|cholesterol\s*[,\-]?\s*total|^\s*cholesterol\b/i },
  { name: 'Creatinine', category: 'Kidney Function', unit: 'mg/dL', re: /creatinine/i },
  { name: 'Urea', category: 'Kidney Function', unit: 'mg/dL', re: /\burea\b/i },
];

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const pad = (n) => String(n).padStart(2, '0');

function matchTest(line) {
  if (/non[-\s]*hdl/i.test(line)) return null;
  if (/ratio/i.test(line)) {
    for (const r of RATIOS) {
      const m = line.match(r.re);
      if (m) {
        const ratioWord = line.search(/ratio/i);
        return { name: r.name, category: 'Lipid Profile', unit: '', end: ratioWord + 5 };
      }
    }
    return null;
  }
  for (const t of TESTS) {
    const m = line.match(t.re);
    if (m) return { name: t.name, category: t.category, unit: t.unit, end: m.index + m[0].length };
  }
  return null;
}

// Blank out (...) groups, keeping string length, so numbers inside them (for example "2 Hrs") are ignored.
const blankParens = (s) => s.replace(/\([^)]*\)/g, (x) => ' '.repeat(x.length));
const NUM_RE = /(\d+(?:\.\d+)?)/;
const UNIT_RE = /^\s*(mg\s*\/\s*d[lL]|mmol\s*\/\s*[lL]|g\s*\/\s*d[lL]|mg\/mol|mmol\/mol|%|u\s*\/\s*l|iu\s*\/\s*l)/i;

function normalizeUnit(u) {
  const x = u.replace(/\s+/g, '').toLowerCase();
  const map = { 'mg/dl': 'mg/dL', 'mmol/l': 'mmol/L', 'g/dl': 'g/dL', 'u/l': 'U/L', 'iu/l': 'IU/L' };
  return map[x] || x;
}

function extractRange(text) {
  const span = text.match(/(\d+(?:\.\d+)?)\s*(?:-|–|—|to)\s*(\d+(?:\.\d+)?)/i);
  if (span) return `${span[1]}-${span[2]}`;
  const cmp = text.match(/([<>≤≥]=?)\s*(\d+(?:\.\d+)?)/);
  if (cmp) return `${cmp[1]}${cmp[2]}`;
  return '';
}

function readValue(afterName) {
  const cleaned = blankParens(afterName);
  const m = cleaned.match(NUM_RE);
  if (!m) return null;
  const valueEnd = m.index + m[0].length;
  const rest = afterName.slice(valueEnd);
  const u = rest.match(UNIT_RE);
  const unit = u ? normalizeUnit(u[1]) : '';
  const afterUnit = u ? rest.slice(u[0].length) : rest;
  return { value: m[1], unit, range: extractRange(afterUnit) };
}

function findDate(lines) {
  const tryLine = (line) => {
    if (/d\.?o\.?b|birth/i.test(line)) return null;
    let m = line.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4}|\d{2})\b/);
    if (m) {
      const d = Number(m[1]); const mo = Number(m[2]); let y = Number(m[3]);
      if (y < 100) y += 2000;
      if (d >= 1 && d <= 31 && mo >= 1 && mo <= 12) return `${pad(d)}-${pad(mo)}-${y}`;
    }
    m = line.match(/(\d{1,2})[-\s\/.]*([A-Za-z]{3})[a-z]*[-\s\/.,]*(\d{4}|\d{2})\b/);
    if (m) {
      const mo = MONTHS.indexOf(m[2].toLowerCase()) + 1;
      let y = Number(m[3]);
      if (y < 100) y += 2000;
      const d = Number(m[1]);
      if (mo > 0 && d >= 1 && d <= 31) return `${pad(d)}-${pad(mo)}-${y}`;
    }
    return null;
  };
  // Most specific label first, so "Report Date" wins over "Registered On".
  const priorities = [/report(?:ed)?\s*(?:date|on)|date\s*of\s*report/i, /collect|reported|date/i, /registered|received/i];
  for (const re of priorities) {
    for (const l of lines) {
      if (re.test(l)) {
        const d = tryLine(l);
        if (d) return d;
      }
    }
  }
  for (const l of lines) {
    const d = tryLine(l);
    if (d) return d;
  }
  return '';
}

function findLab(lines) {
  for (const l of lines.slice(0, 10)) {
    if (/referred|doctor|dr\.|patient/i.test(l)) continue;
    if (/\b(labs?|laborator(?:y|ies)|diagnostics?|pathology|path\s*lab|clinic|hospital)\b/i.test(l)) {
      return l.trim().replace(/\s+/g, ' ').slice(0, 100);
    }
  }
  return '';
}

function findPatient(lines) {
  for (const l of lines.slice(0, 20)) {
    const m = l.match(/patient\s*name\s*[:\-]\s*(.+)/i) || l.match(/^\s*name\s*[:\-]\s*(.+)/i);
    if (m) {
      return m[1].split(/\s{2,}|\s+(?:age|sex|gender|ref|id|date)\b/i)[0].trim().slice(0, 100);
    }
  }
  return '';
}

// lines: array of text lines. Returns { patientName, labName, reportDate (DD-MM-YYYY), tests }.
export function parseReportText(lines) {
  const clean = lines.map((l) => String(l).replace(/\s+/g, ' ').trim()).filter(Boolean);
  const tests = [];
  const seen = new Set();

  clean.forEach((line, i) => {
    const hit = matchTest(line);
    if (!hit || seen.has(hit.name)) return;
    let read = readValue(line.slice(hit.end));
    if (!read && i + 1 < clean.length && !matchTest(clean[i + 1])) {
      read = readValue(clean[i + 1]); // some layouts put the value on the next line
    }
    if (!read) return;
    seen.add(hit.name);
    tests.push({
      name: hit.name,
      category: hit.category,
      value: read.value,
      unit: read.unit || hit.unit,
      range: read.range,
      notes: '',
    });
  });

  return { patientName: findPatient(clean), labName: findLab(clean), reportDate: findDate(clean), tests };
}
