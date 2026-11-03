/** Minimal HTML-table and CSV helpers for the raw snapshots. */

const ENTITIES: Record<string, string> = {
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ', '&deg;': '°',
  '&aacute;': 'á', '&eacute;': 'é', '&iacute;': 'í', '&oacute;': 'ó', '&uacute;': 'ú', '&ntilde;': 'ñ',
  '&ouml;': 'ö', '&uuml;': 'ü', '&auml;': 'ä', '&ccedil;': 'ç', '&minus;': '−', '&times;': '×',
  '&agrave;': 'à', '&egrave;': 'è', '&igrave;': 'ì', '&ograve;': 'ò', '&ugrave;': 'ù', '&acirc;': 'â', '&ecirc;': 'ê',
  '&icirc;': 'î', '&ocirc;': 'ô', '&ucirc;': 'û', '&atilde;': 'ã', '&otilde;': 'õ', '&euml;': 'ë', '&iuml;': 'ï',
  '&yacute;': 'ý', '&yuml;': 'ÿ', '&aring;': 'å', '&oslash;': 'ø', '&aelig;': 'æ', '&szlig;': 'ß', '&eth;': 'ð', '&thorn;': 'þ',
  '&scaron;': 'š', '&zcaron;': 'ž', '&ccaron;': 'č', '&rcaron;': 'ř', '&ecaron;': 'ě', '&ncaron;': 'ň', '&dcaron;': 'ď', '&tcaron;': 'ť',
  '&lstrok;': 'ł', '&nacute;': 'ń', '&sacute;': 'ś', '&zacute;': 'ź', '&zdot;': 'ż', '&cacute;': 'ć', '&aogon;': 'ą', '&eogon;': 'ę',
  '&odblac;': 'ő', '&udblac;': 'ű', '&uring;': 'ů', '&gbreve;': 'ğ', '&scedil;': 'ş', '&inodot;': 'ı', '&imath;': 'ı',
};

export function decode(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&[a-z]+;/gi, (e) => {
      if (ENTITIES[e]) return ENTITIES[e];
      const lower = ENTITIES[e.toLowerCase()];
      // '&Scaron;' → 'Š': same letter as the lowercase entity, upper-cased
      return lower ? (e[1] === e[1]!.toUpperCase() ? lower.toUpperCase() : lower) : e;
    });
}

export function text(html: string): string {
  return decode(html.replace(/<sup>(.*?)<\/sup>/gi, '^$1').replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

export function tableRows(html: string): string[][] {
  const rows: string[][] = [];
  for (const m of html.matchAll(/<tr[\s\S]*?<\/tr>/gi)) {
    const cells = [...m[0].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((c) => text(c[1] ?? ''));
    if (cells.length) rows.push(cells);
  }
  return rows;
}

/** Parse the first number in a string ("1,345.5", "0.384*", "~65.", "-5832.5"). */
export function num(s: string | undefined | null): number | null {
  if (s == null) return null;
  const m = s.replace(/,/g, '').match(/-?\d+(?:\.\d*)?(?:e-?\d+)?/i);
  if (!m) return null;
  const v = Number(m[0]);
  return Number.isFinite(v) ? v : null;
}

/** First whitespace-separated token of a table cell as a number ("n/a PLU060" → null, "0.0007087 0.0000006 MAR097" → 0.0007087). */
export function firstNum(s: string | undefined | null): number | null {
  const tok = (s ?? '').trim().split(/\s+/)[0] ?? '';
  if (!tok || /^n\/?a$/i.test(tok)) return null;
  return /^-?[\d,.]+(?:e-?\d+)?$/i.test(tok) ? num(tok) : null;
}

/** RFC 4180-ish CSV parser (handles quoted fields with commas, quotes and newlines). */
export function parseCsv(src: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let q = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (q) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else q = false;
      } else field += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += ch;
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  const [header, ...data] = rows;
  if (!header) return [];
  return data
    .filter((r) => r.length === header.length)
    .map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])));
}

export function slugify(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’!|]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
