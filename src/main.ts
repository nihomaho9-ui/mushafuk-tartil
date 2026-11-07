import "./tartil.css";
import wordsData from "./data/words.json";
import pagesData from "./data/pages.json";
import qcfPagesData from "./data/qcf-pages.json";
import qcfWordsData from "./data/qcf-words.json";
import qcfAyahsData from "./data/qcf-ayahs.json";

const DELAY_MIN = 400;
const DELAY_STEP = 30;
const DELAY_CAP = 120;
const AZ = [
  "Fatihə", "Bəqərə", "Ali İmran", "Nisa", "Maidə", "Ənam", "Əraf", "Ənfal", "Tövbə", "Yunus",
  "Hud", "Yusuf", "Rəd", "İbrahim", "Hicr", "Nəhl", "İsra", "Kəhf", "Məryəm", "Taha",
  "Ənbiya", "Həcc", "Muminun", "Nur", "Furqan", "Şüəra", "Nəml", "Qəsəs", "Ənkəbut", "Rum",
  "Loğman", "Səcdə", "Əhzab", "Səba", "Fatir", "Yasin", "Saffat", "Sad", "Zümər", "Ğafir",
  "Fussilət", "Şura", "Zuxruf", "Duxan", "Casiyə", "Əhqaf", "Məhəmməd", "Fəth", "Hucurat", "Qaf",
  "Zariyat", "Tur", "Nəcm", "Qəmər", "Rəhman", "Vaqiə", "Hədid", "Mucadələ", "Həşr", "Mumtəhənə",
  "Səff", "Cumuə", "Munafiqun", "Təğabun", "Talaq", "Təhrim", "Mülk", "Qələm", "Haqqə", "Məaric",
  "Nuh", "Cinn", "Muzzəmmil", "Muddəssir", "Qiyamət", "İnsan", "Mursəlat", "Nəbə", "Naziat", "Əbəsə",
  "Təkvir", "İnfitar", "Mutaffifin", "İnşiqaq", "Buruc", "Tariq", "Əla", "Ğaşiyə", "Fəcr", "Bələd",
  "Şəms", "Leyl", "Duha", "Şərh", "Tin", "Ələq", "Qədr", "Bəyyinə", "Zəlzələ", "Adiyat",
  "Qariə", "Təkasur", "Əsr", "Huməzə", "Fil", "Qureyş", "Maun", "Kövsər", "Kafirun", "Nəsr",
  "Məsəd", "İxlas", "Fələq", "Nas",
];

type WordsFile = { names: string[]; ayahs: string[][][] };
type PagesFile = { pages: number[][][] };
type FeedSession = {
  feed: (pcm: Float32Array) => Promise<unknown>;
  stop: () => Promise<unknown>;
  reset: () => void;
  zipformer: {
    setMode: (mode: "tracking" | "correction") => unknown;
    setExpected: (passage: { surah: number; ayah: number; ayahEnd?: number } | null) => void;
    correct: (action: "review_later") => unknown;
  } | null;
};
type Issue = { surah?: number; ayah?: number; word?: number; kind?: string };
type ProgressMsg = {
  type: string;
  surah?: number;
  ayah?: number;
  word_index?: number;
  matched_indices?: number[];
  issue?: Issue;
  state?: { phase?: string; issue?: Issue | null };
};
type Miss = { s: number; a: number; w: number; kind: string; n: number; t: number };
const MISS_KEY = "tartil.misses";
const KIND_AZ: Record<string, string> = {
  possible_omission: "söz düşüb",
  possible_substitution: "söz səhvdir",
  possible_vowel: "hərəkə",
  possible_repetition: "təkrar",
  possible_skipped_ayah: "ayə keçilib",
  unclear_ayah: "ayə tutulmayıb",
};

const BASE = import.meta.env.BASE_URL || "/";
const QCF = "https://mushafuk.online/yazi-fonts/qcf/";
const BISM = "\uFC41\uFC42\uFC43\uFC44";
const STARTS =
  "1:1:2,2:2:3,3:50:3,4:77:2,5:106:8,6:128:3,7:151:3,8:177:3,9:187:2,10:208:2,11:221:9,12:235:11,13:249:3,14:255:5,15:262:3,16:267:9,17:282:3,18:293:12,19:305:3,20:312:7,21:322:3,22:332:2,23:342:2,24:350:2,25:359:13,26:367:2,27:377:2,28:385:10,29:396:10,30:404:12,31:411:3,32:415:2,33:418:2,34:428:3,35:434:10,36:440:6,37:446:2,38:453:2,39:458:6,40:467:5,41:477:3,42:483:3,43:489:7,44:496:3,45:499:2,46:502:9,47:507:2,48:511:3,49:515:9,50:518:3,51:520:14,52:523:10,53:526:2,54:528:12,55:531:7,56:534:9,57:537:13,58:542:3,59:545:9,60:549:2,61:551:9,62:553:3,63:554:9,64:556:2,65:558:2,66:560:3,67:562:3,68:564:8,69:566:12,70:568:11,71:570:7,72:572:3,73:574:3,74:575:10,75:577:8,76:578:12,77:580:9,78:582:3,79:583:10,80:585:2,81:586:4,82:587:3,83:587:14,84:589:5,85:590:4,86:591:3,87:591:12,88:592:7,89:593:5,90:594:8,91:595:4,92:595:13,93:596:8,94:596:15,95:597:5,96:597:11,97:598:6,98:598:11,99:599:8,100:599:14,101:600:6,102:600:13,103:601:3,104:601:7,105:601:13,106:602:3,107:602:8,108:602:14,109:603:3,110:603:8,111:603:13,112:604:3,113:604:7,114:604:12";

type QcfPages = Record<string, string[]>;
type QcfWords = Record<string, number[][]>;
type QcfAyahs = Record<string, [string, number][]>;
const qcfPages = qcfPagesData as QcfPages;
const qcfWords = qcfWordsData as QcfWords;
const qcfAyahs = qcfAyahsData as QcfAyahs;
const heads: Record<number, Record<number, number>> = {};
const bisLines: Record<number, Record<number, boolean>> = {};
const stackLines: Record<number, Record<number, boolean>> = {};
for (const item of STARTS.split(",")) {
  const [id, pg, line] = item.split(":").map(Number);
  if (id === 1 || id === 9) (heads[pg] ??= {})[Math.max(0, line - 2)] = id;
  else if (line >= 3) {
    (heads[pg] ??= {})[line - 3] = id;
    (bisLines[pg] ??= {})[line - 2] = true;
  } else {
    (heads[pg] ??= {})[0] = id;
    (stackLines[pg] ??= {})[0] = true;
  }
}
const loadedFonts = new Set<number>();
let namesReady: Promise<void> | null = null;

function asset(path: string): string {
  return BASE + path.replace(/^\//, "");
}

function clampPage(n: number): number {
  if (!Number.isFinite(n)) return 1;
  return Math.min(604, Math.max(1, Math.round(n)));
}

export function mountTartil(root: HTMLElement, opts?: { hash?: boolean }): () => void {
  const hashMode = opts?.hash === true;
  let words: WordsFile | null = wordsData as WordsFile;
  let pages: number[][][] = (pagesData as PagesFile).pages;
  const pageOf = new Map<string, number>();
  const surahPage = new Map<number, number>();
  let page = 1;
  let alive = true;
  let micOn = false;
  let loadingModel = false;
  let session: FeedSession | null = null;
  let expectedSurah = 0;
  let retryKey = "";
  let heard = 0;
  let takeMisses: Miss[] = [];
  let retryClose = false;
  let audioStop: (() => Promise<void>) | null = null;
  const shown = new Set<string>();
  const timers = new Map<string, number>();
  let freshKey = "";

  root.className = "tartil";
  root.innerHTML = `
    <header class="t-top">
      <div class="t-brand"><b>TARTIL</b><span>oxu izləmə</span></div>
      <button type="button" class="t-theme" aria-label="Rəng: krem"></button>
      <button type="button" class="t-missbtn" aria-expanded="false">Xəta 0</button>
      <select class="t-surah" aria-label="Surə"></select>
      <div class="t-pager">
        <button type="button" data-dir="-1" aria-label="Əvvəlki səhifə">‹</button>
        <input class="t-pageno" inputmode="numeric" aria-label="Səhifə" />
        <button type="button" data-dir="1" aria-label="Növbəti səhifə">›</button>
      </div>
    </header>
    <main class="t-page" dir="rtl"></main>
    <p class="t-foot">Tanıma telefonun özündə işləyir. Model və lüğət NPL-1.2 — yalnız qeyri-kommersiya.</p>
    <div class="t-bar">
      <button type="button" class="t-mic" aria-pressed="false" aria-label="Mikrofon">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2z"/></svg>
      </button>
      <div class="t-status">
        <b class="t-st">Oxu</b>
        <span class="t-sub">Mikrofonu açın: ayələr gizlənir, model təsdiqləyəndə açılır.</span>
        <div class="t-load" aria-hidden="true"><i></i></div>
        <div class="t-level" aria-hidden="true"><i></i></div>
      </div>
    </div>
    <div class="t-miss" hidden>
      <div class="t-miss-h"><b>Xəta yerləri</b><button type="button" class="t-miss-clear">Təmizlə</button></div>
      <div class="t-miss-list"></div>
    </div>
    <div class="t-sum" hidden>
      <div class="t-sum-h"><b>Hesab</b><button type="button" class="t-sum-ok">Bağla</button></div>
      <p class="t-sum-n"></p>
      <ul class="t-sum-list"></ul>
    </div>`;

  if (!hashMode) {
    const foot = root.querySelector(".t-foot");
    if (foot) {
      foot.appendChild(document.createTextNode(" "));
      const link = document.createElement("a");
      link.href = "/axtaris";
      link.textContent = "Axtarış";
      foot.appendChild(link);
    }
  }
  function need<T extends Element>(sel: string): T {
    const el = root.querySelector<T>(sel);
    if (!el) throw new Error(sel);
    return el;
  }
  const surahSel = need<HTMLSelectElement>(".t-surah");
  const pageInput = need<HTMLInputElement>(".t-pageno");
  const pageEl = need<HTMLElement>(".t-page");
  const sheet = pageEl;
  const micBtn = need<HTMLButtonElement>(".t-mic");
  const st = need<HTMLElement>(".t-st");
  const sub = need<HTMLElement>(".t-sub");
  const loadBar = need<HTMLElement>(".t-load");
  const loadFill = need<HTMLElement>(".t-load i");
  const levelBar = need<HTMLElement>(".t-level");
  const levelFill = need<HTMLElement>(".t-level i");
  const themeBtn = need<HTMLButtonElement>(".t-theme");
  const sumBox = need<HTMLElement>(".t-sum");
  const sumN = need<HTMLElement>(".t-sum-n");
  const sumList = need<HTMLElement>(".t-sum-list");
  const missBtn = need<HTMLButtonElement>(".t-missbtn");
  const missBox = need<HTMLElement>(".t-miss");
  const missList = need<HTMLElement>(".t-miss-list");
  let misses: Miss[] = [];
  try {
    const saved = JSON.parse(localStorage.getItem(MISS_KEY) || "[]") as Miss[];
    if (Array.isArray(saved)) misses = saved.filter((m) => m && m.s && m.a);
  } catch {
    misses = [];
  }

  function saveMisses(): void {
    try {
      localStorage.setItem(MISS_KEY, JSON.stringify(misses.slice(-200)));
    } catch {
      /* ignore quota */
    }
  }

  function paintMisses(): void {
    const marks = new Set(misses.map((m) => `${m.s}:${m.a}:${m.w}`));
    sheet.querySelectorAll<HTMLElement>(".w").forEach((el) => {
      el.classList.toggle("err", marks.has(el.dataset.k || ""));
    });
    const total = misses.reduce((n, m) => n + (m.n || 1), 0);
    missBtn.textContent = `Xəta ${total}`;
    missList.replaceChildren();
    if (!misses.length) {
      const empty = document.createElement("p");
      empty.className = "t-miss-empty";
      empty.textContent = "Hələ xəta yoxdur.";
      missList.appendChild(empty);
      return;
    }
    [...misses].reverse().forEach((m) => {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "t-miss-row";
      const name = AZ[m.s - 1] ?? String(m.s);
      const kind = KIND_AZ[m.kind] ?? "xəta";
      const times = m.n > 1 ? ` · ${m.n}` : "";
      row.textContent = `${name} ${m.a}${m.w >= 0 ? `, söz ${m.w + 1}` : ""} — ${kind}${times}`;
      row.addEventListener("click", () => {
        void beginRetry(m);
      });
      missList.appendChild(row);
    });
  }

  function remember(issue: Issue): void {
    const s = issue.surah ?? 0;
    const a = issue.ayah ?? 0;
    const w = issue.word ?? -1;
    if (!s || !a) return;
    const kind = issue.kind || "xəta";
    const prev = misses.find((m) => m.s === s && m.a === a && m.w === w && m.kind === kind);
    if (prev) prev.n += 1;
    else misses.push({ s, a, w, kind, n: 1, t: Date.now() });
    if (misses.length > 200) misses = misses.slice(-200);
    takeMisses.push({ s, a, w, kind, n: 1, t: Date.now() });
    saveMisses();
    paintMisses();
    const name = AZ[s - 1] ?? String(s);
    setStatus("Xəta", `${name} ${a}${w >= 0 ? `, söz ${w + 1}` : ""} — ${KIND_AZ[kind] ?? kind}`);
  }

  missBtn.addEventListener("click", () => {
    missBox.hidden = !missBox.hidden;
    missBtn.setAttribute("aria-expanded", missBox.hidden ? "false" : "true");
    if (!missBox.hidden) paintMisses();
  });
  need<HTMLButtonElement>(".t-miss-clear").addEventListener("click", () => {
    misses = [];
    saveMisses();
    paintMisses();
  });
  need<HTMLButtonElement>(".t-sum-ok").addEventListener("click", () => {
    sumBox.hidden = true;
  });
  const themes = ["cream", "white", "black"] as const;
  let theme: (typeof themes)[number] = "cream";
  try {
    const savedTheme = localStorage.getItem("tartil.theme");
    if (savedTheme === "white" || savedTheme === "black" || savedTheme === "cream") theme = savedTheme;
  } catch {
    /* ignore */
  }
  function applyTheme(name: (typeof themes)[number]): void {
    theme = name;
    root.classList.toggle("theme-white", name === "white");
    root.classList.toggle("theme-black", name === "black");
    const label = name === "white" ? "ağ" : name === "black" ? "qara" : "krem";
    themeBtn.setAttribute("aria-label", `Rəng: ${label}`);
    try {
      localStorage.setItem("tartil.theme", name);
    } catch {
      /* ignore quota */
    }
  }
  applyTheme(theme);
  themeBtn.addEventListener("click", () => {
    applyTheme(themes[(themes.indexOf(theme) + 1) % themes.length]);
  });

  function setStatus(title: string, detail: string): void {
    st.textContent = title;
    sub.textContent = detail;
  }

  function setProgress(p: number | null): void {
    if (p == null) {
      loadBar.classList.remove("on");
      return;
    }
    loadBar.classList.add("on");
    loadFill.style.width = `${Math.round(p * 100)}%`;
  }

  function wordList(surah: number, ayah: number): string[] {
    return words?.ayahs[surah - 1]?.[ayah - 1] ?? [];
  }

  function loadNames(): Promise<void> {
    if (!namesReady) {
      namesReady = Promise.all([
        new FontFace("surahnames", `url(${asset("sura_names.woff2")})`).load(),
        new FontFace("QCF1", `url(${QCF}p1.woff2)`).load(),
      ]).then((faces) => {
        faces.forEach((face) => document.fonts.add(face));
        loadedFonts.add(1);
      });
    }
    return namesReady;
  }

  async function loadPageFont(n: number): Promise<void> {
    if (loadedFonts.has(n)) return;
    const face = new FontFace(`QCF${n}`, `url(${QCF}p${n}.woff2)`);
    await face.load();
    document.fonts.add(face);
    loadedFonts.add(n);
  }

  function textWidth(line: HTMLElement): number {
    const range = document.createRange();
    range.selectNodeContents(line);
    return range.getBoundingClientRect().width;
  }

  function fit(): void {
    pageEl.querySelectorAll<HTMLElement>(".line").forEach((line) => line.style.removeProperty("--g"));
    const h = pageEl.clientHeight;
    const w = pageEl.clientWidth - 12;
    if (!h || !w) return;
    let size = h / 15;
    for (let i = 0; i < 3; i += 1) {
      pageEl.style.fontSize = `${size}px`;
      let widest = 0;
      pageEl.querySelectorAll<HTMLElement>(".line:not(.surah):not(.basmala)").forEach((line) => {
        widest = Math.max(widest, line.scrollWidth);
      });
      if (widest <= w || widest === 0) break;
      size *= (w / widest) * 0.94;
    }
    const phone = matchMedia("(max-width: 520px)").matches;
    pageEl.style.fontSize = `${size * (phone ? 1 : 0.92)}px`;
    let ink = 0;
    pageEl.querySelectorAll<HTMLElement>(".line:not(.surah):not(.basmala)").forEach((line) => {
      ink = Math.max(ink, textWidth(line));
    });
    const card = Math.min(Math.max(ink, 0), pageEl.clientWidth * 0.94);
    pageEl.querySelectorAll<HTMLElement>(".shead").forEach((head) => {
      if (card > 0) head.style.width = `${card}px`;
    });
    if (card > 0) {
      pageEl.querySelectorAll<HTMLElement>(".line:not(.surah):not(.basmala)").forEach((line) => {
        const ws = line.querySelectorAll<HTMLElement>(".w");
        if (ws.length < 2) return;
        const gap0 = parseFloat(getComputedStyle(ws[1]).marginInlineStart) || 0;
        const nat = textWidth(line) - gap0 * (ws.length - 1);
        const g = (card - nat) / (ws.length - 1);
        if (nat >= card * 0.8 && g >= gap0) line.style.setProperty("--g", `${g.toFixed(2)}px`);
      });
    }
    pageEl.querySelectorAll<HTMLElement>(".snames").forEach((row) => {
      const head = row.parentElement;
      if (!head) return;
      row.style.fontSize = `${Math.max(13, head.clientHeight * 0.46)}px`;
    });
  }

  function draw(pageNo: number): void {
    const pageLines = qcfPages[String(pageNo)] ?? [];
    const wlens = qcfWords[String(pageNo)] ?? [];
    const runs = qcfAyahs[String(pageNo)] ?? [];
    const marks: Record<number, number> = { ...(heads[pageNo] ?? {}) };
    const bis: Record<number, boolean> = { ...(bisLines[pageNo] ?? {}) };
    const stack: Record<number, boolean> = { ...(stackLines[pageNo] ?? {}) };
    const prev = qcfPages[String(pageNo - 1)];
    if (stack[0] && prev && !prev[14]) {
      delete marks[0];
      delete stack[0];
      bis[0] = true;
    }
    const nextStack = stackLines[pageNo + 1] ?? {};
    if (nextStack[0] && !pageLines[14] && marks[14] == null) {
      const id = heads[pageNo + 1]?.[0];
      if (id) marks[14] = id;
    }
    pageEl.classList.toggle("mid", pageNo === 1 || pageNo === 2);
    pageEl.style.fontFamily = `QCF${pageNo}, serif`;
    let ri = 0;
    let left = runs[0] ? runs[0][1] : 0;
    const lineKeys = pageLines.map((text) =>
      [...text].map((ch) => {
        if (ch !== " ") {
          while (left === 0 && ri < runs.length - 1) {
            ri += 1;
            left = runs[ri]?.[1] ?? 0;
          }
          left -= 1;
        }
        return runs[ri]?.[0] ?? "";
      }),
    );
    const wordIx = new Map<string, number>();
    const addBasmala = (parent: HTMLElement, surahId: number) => {
      const b = document.createElement("span");
      b.className = "basmala";
      if (surahId) b.dataset.k = `bism:${surahId}`;
      b.textContent = BISM;
      parent.appendChild(b);
    };
    const addAyahs = (row: HTMLElement, text: string, i: number) => {
      let span: HTMLElement | null = null;
      let word: HTMLElement | null = null;
      const ks = lineKeys[i] ?? [];
      const lens = wlens[i] ?? [];
      let wi = 0;
      let remain = lens[0] || Infinity;
      let first = true;
      [...text].forEach((ch, j) => {
        const key = ks[j] || "";
        if (!span || span.dataset.ayah !== key) {
          span = document.createElement("span");
          span.className = "ay";
          span.dataset.ayah = key;
          row.appendChild(span);
          word = null;
        }
        if (remain === 0) {
          wi += 1;
          remain = lens[wi] || Infinity;
          word = null;
        }
        if (!word) {
          word = document.createElement("span");
          word.className = first ? "w w0" : "w";
          first = false;
          const idx = wordIx.get(key) ?? 0;
          wordIx.set(key, idx + 1);
          if (key) {
            word.dataset.k = `${key}:${idx}`;
            const [s, a] = key.split(":");
            const spoken = wordList(Number(s), Number(a)).length;
            if (spoken && idx === spoken) word.classList.add("num");
          }
          span.appendChild(word);
        }
        word.textContent += ch;
        remain -= 1;
      });
    };
    let last = pageLines.length - 1;
    if (pageNo === 1 || pageNo === 2) {
      while (last > 0 && !pageLines[last] && marks[last] == null && !bis[last]) last -= 1;
    }
    pageEl.replaceChildren();
    pageLines.forEach((text, i) => {
      if (i > last) return;
      if ((pageNo === 1 || pageNo === 2) && !text && marks[i] == null && !bis[i]) return;
      const row = document.createElement("div");
      const surahId = marks[i];
      row.className = surahId != null ? `line surah${stack[i] ? " stack" : ""}` : bis[i] ? "line basmala" : "line";
      if (surahId != null) {
        const head = document.createElement("div");
        head.className = "shead";
        const frame = document.createElement("img");
        frame.src = asset("surah-banner.png");
        frame.alt = "";
        const names = document.createElement("span");
        names.className = "snames";
        const ornament = document.createElement("span");
        ornament.className = "sname";
        ornament.textContent = "\uE000";
        const name = document.createElement("span");
        name.className = "sname";
        name.textContent = String.fromCharCode(0xe000 + Number.parseInt(String(surahId), 16));
        names.append(ornament, name);
        head.append(frame, names);
        row.appendChild(head);
        if (stack[i]) addBasmala(row, surahId);
      } else if (bis[i]) addBasmala(row, marks[i - 1] ?? 0);
      else addAyahs(row, text, i);
      pageEl.appendChild(row);
    });
  }

  let paint = 0;
  async function render(): Promise<void> {
    const id = ++paint;
    const n = page;
    if (!pageEl.childElementCount) pageEl.textContent = "Quran açılır…";
    try {
      await Promise.all([loadNames(), loadPageFont(n)]);
    } catch {
      /* draw anyway; the next page load retries */
    }
    if (!alive || id !== paint) return;
    draw(n);
    fit();
    if (micOn || retryKey) applyShown();
    if (retryKey) markRetry();
    paintMisses();
    pageInput.value = String(n);
    const first = pages[n - 1]?.[0];
    if (first) surahSel.value = String(first[0]);
    if (hashMode) history.replaceState(null, "", `#${n}`);
    try {
      localStorage.setItem("tartil.page", String(n));
    } catch {
      /* ignore quota */
    }
    const ahead = n + 1;
    if (ahead <= 604) void loadPageFont(ahead).catch(() => undefined);
  }

  function clearTimers(): void {
    for (const id of timers.values()) window.clearTimeout(id);
    timers.clear();
  }

  function applyShown(): void {
    const nodes = sheet.querySelectorAll<HTMLElement>("[data-k]");
    nodes.forEach((el) => {
      const key = el.dataset.k || "";
      el.classList.toggle("on", shown.has(key));
      el.classList.toggle("fresh", key === freshKey);
    });
  }

  function go(n: number): void {
    page = clampPage(n);
    void render();
  }

  function reveal(key: string): void {
    if (!alive) return;
    timers.delete(key);
    shown.add(key);
    freshKey = key;
    const parts = key.split(":");
    if (parts[0] !== "bism" && parts[0] !== "num") {
      const surah = Number(parts[0]);
      const ayah = Number(parts[1]);
      const target = pageOf.get(`${surah}:${ayah}`);
      if (target && target !== page) {
        page = target;
        if (!retryHit(key)) {
          render();
          return;
        }
      }
      const total = wordList(surah, ayah).length;
      const idx = Number(parts[2]);
      if (idx === total - 1) {
        shown.add(`num:${surah}:${ayah}`);
        const prefix = `${surah}:${ayah}:`;
        sheet.querySelectorAll<HTMLElement>(".w").forEach((el) => {
          const k = el.dataset.k || "";
          if (k.startsWith(prefix) && /^\d+$/.test(k.slice(prefix.length))) shown.add(k);
        });
      }
      if (ayah === 1) shown.add(`bism:${surah}`);
    }
    if (/^\d+:\d+:\d+$/.test(key)) {
      const bits = key.split(":").map(Number);
      if (bits[2] < wordList(bits[0], bits[1]).length) heard += 1;
    }
    if (retryHit(key)) {
      const bits = key.split(":").map(Number);
      const whole = retryKey.endsWith(":*");
      misses = misses.filter((m) => !(m.s === bits[0] && m.a === bits[1] && (whole || m.w === bits[2])));
      saveMisses();
      retryKey = "";
      retryClose = true;
      paintMisses();
      applyShown();
      queueMicrotask(() => {
        if (micOn) void stopMic();
      });
      return;
    }
    applyShown();
    if (retryKey) markRetry();
  }

  function schedule(surah: number, ayah: number, indices: number[]): void {
    if (surah === 1 && ayah === 1 && pageOf.get("1:1") !== page) return;
    const fresh = indices
      .filter((i) => {
        const key = `${surah}:${ayah}:${i}`;
        return !shown.has(key) && !timers.has(key);
      })
      .sort((a, b) => a - b);
    fresh.forEach((i, n) => {
      const key = `${surah}:${ayah}:${i}`;
      const delay = DELAY_MIN + Math.min(DELAY_CAP, n * DELAY_STEP);
      const id = window.setTimeout(() => reveal(key), delay);
      timers.set(key, id);
    });
    if (fresh.length && !retryKey) {
      const name = AZ[surah - 1] ?? String(surah);
      setStatus("Dinləyirəm", `${name} ${ayah}`);
    }
  }

  function onEvent(msg: ProgressMsg): void {
    if (msg.type === "correction" || msg.type === "correction_note") {
      const issue = msg.type === "correction_note" ? msg.issue : msg.state?.issue;
      const flag = msg.type === "correction_note" || msg.state?.phase === "error";
      if (issue && flag) {
        remember(issue);
        if (msg.type === "correction") queueMicrotask(() => session?.zipformer?.correct("review_later"));
      }
      return;
    }
    if (!micOn || msg.type !== "word_progress") return;
    const surah = msg.surah;
    const ayah = msg.ayah;
    if (!surah || !ayah) return;
    const upto = typeof msg.word_index === "number" ? msg.word_index : -1;
    const idxs = new Set<number>(msg.matched_indices ?? []);
    for (let i = 0; i <= upto; i += 1) idxs.add(i);
    if (!idxs.size) return;
    if (surah) expectSurah(surah);
    schedule(surah, ayah, [...idxs]);
  }

  async function loadBytes(url: string, label: string): Promise<ArrayBuffer> {
    const cache = "caches" in window ? await caches.open("tartil-v1") : null;
    const hit = cache ? await cache.match(url) : undefined;
    if (hit) {
      setProgress(1);
      return hit.arrayBuffer();
    }
    const res = await fetch(url);
    if (!res.ok || !res.body) throw new Error(`${label} açılmadı`);
    const total = Number(res.headers.get("content-length") || 0);
    const reader = res.body.getReader();
    const parts: Uint8Array[] = [];
    let got = 0;
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      if (!chunk.value) continue;
      parts.push(chunk.value);
      got += chunk.value.byteLength;
      if (total) setProgress(Math.min(0.99, got / total));
    }
    const buf = new Uint8Array(got);
    let offset = 0;
    for (const part of parts) {
      buf.set(part, offset);
      offset += part.byteLength;
    }
    if (cache) {
      try {
        await cache.put(url, new Response(buf.slice().buffer));
      } catch {
        /* cache optional */
      }
    }
    setProgress(1);
    return buf.buffer;
  }

  async function ensureSession(): Promise<FeedSession> {
    if (session) return session;
    loadingModel = true;
    micBtn.disabled = true;
    setStatus("Model yüklənir", "Bir dəfə, təxminən 66 MB. Sonra telefonda qalır.");
    setProgress(0.02);
    const ort = await import("onnxruntime-web/wasm");
    const core = await import("@tilawa/core");
    const env = ort.env.wasm;
    env.numThreads = 1;
    env.wasmPaths = new URL(asset("ort/"), window.location.href).href;
    const model = await loadBytes(asset("model.onnx"), "Model");
    setStatus("Lüğət açılır", "Ayə sözləri hazırlanır…");
    const corpusRes = await fetch(asset("corpus.json"));
    if (!corpusRes.ok) throw new Error("Lüğət açılmadı");
    const corpus: unknown = await corpusRes.json();
    const created = await core.createRecognitionSession({
      ort,
      model,
      corpus,
      onEvent: (msg) => {
        if (msg && typeof msg === "object" && "type" in msg) onEvent(msg as ProgressMsg);
      },
    });
    session = created;
    created.zipformer?.setMode("correction");
    loadingModel = false;
    setProgress(null);
    return created;
  }

  function resample(input: Float32Array, fromRate: number): Float32Array {
    if (fromRate === 16000) return input;
    const ratio = fromRate / 16000;
    const outLen = Math.floor(input.length / ratio);
    const out = new Float32Array(outLen);
    for (let i = 0; i < outLen; i += 1) {
      const x = i * ratio;
      const i0 = Math.floor(x);
      const i1 = Math.min(i0 + 1, input.length - 1);
      const f = x - i0;
      out[i] = (input[i0] ?? 0) * (1 - f) + (input[i1] ?? 0) * f;
    }
    return out;
  }

  function expectSurah(surah: number): void {
    if (retryKey || !session?.zipformer || !words || expectedSurah === surah) return;
    expectedSurah = surah;
    const total = words.ayahs[surah - 1]?.length ?? 1;
    session.zipformer.setExpected({ surah, ayah: 1, ayahEnd: total });
  }

  function retryHit(key: string): boolean {
    if (!retryKey) return false;
    if (retryKey.endsWith(":*")) {
      const [s, a] = retryKey.split(":");
      const last = wordList(Number(s), Number(a)).length - 1;
      return key === `${s}:${a}:${last}`;
    }
    return key === retryKey;
  }

  function isRetryWord(key: string): boolean {
    if (!retryKey) return false;
    if (retryKey.endsWith(":*")) {
      const prefix = retryKey.slice(0, -1);
      if (!key.startsWith(prefix)) return false;
      const [s, a] = retryKey.split(":");
      return Number(key.slice(prefix.length)) < wordList(Number(s), Number(a)).length;
    }
    return key === retryKey;
  }

  function markRetry(): void {
    sheet.querySelectorAll<HTMLElement>(".w").forEach((el) => {
      el.classList.toggle("retry", isRetryWord(el.dataset.k || ""));
    });
  }

  function showSummary(fixed: boolean, nHeard: number, found: Miss[]): void {
    sumN.textContent = `Düz söz: ${nHeard}. Xəta: ${found.length}.`;
    sumList.replaceChildren();
    found.forEach((m) => {
      const li = document.createElement("li");
      const name = AZ[m.s - 1] ?? String(m.s);
      li.textContent = `${name} ${m.a}${m.w >= 0 ? `, söz ${m.w + 1}` : ""} — ${KIND_AZ[m.kind] ?? "xəta"}`;
      sumList.appendChild(li);
    });
    sumBox.hidden = false;
    setStatus(fixed ? "Düzəldi" : "Hesab", sumN.textContent || "");
  }

  function setLevel(raw: Float32Array): void {
    let acc = 0;
    const step = 8;
    for (let i = 0; i < raw.length; i += step) acc += raw[i] * raw[i];
    const rms = Math.sqrt(acc / Math.max(1, Math.ceil(raw.length / step)));
    levelFill.style.width = `${Math.min(100, Math.round(rms * 450))}%`;
  }

  async function beginRetry(m: Miss): Promise<void> {
    retryKey = m.w >= 0 ? `${m.s}:${m.a}:${m.w}` : `${m.s}:${m.a}:*`;
    missBox.hidden = true;
    missBtn.setAttribute("aria-expanded", "false");
    sumBox.hidden = true;
    const target = pageOf.get(`${m.s}:${m.a}`);
    if (target) page = clampPage(target);
    const name = AZ[m.s - 1] ?? String(m.s);
    const place = `${name} ${m.a}${m.w >= 0 ? `, söz ${m.w + 1}` : ""}`;
    if (!micOn) {
      await render();
      micBtn.disabled = true;
      try {
        await startMic();
      } catch (err: unknown) {
        micOn = false;
        retryKey = "";
        root.classList.remove("mic", "retry");
        levelBar.classList.remove("on");
        const message = err instanceof Error ? err.message : "Mikrofon açılmadı";
        setStatus("Alınmadı", message);
      } finally {
        micBtn.disabled = false;
      }
      return;
    }
    heard = 0;
    takeMisses = [];
    root.classList.remove("mic");
    root.classList.add("retry");
    session?.reset();
    shown.clear();
    freshKey = "";
    clearTimers();
    expectedSurah = 0;
    session?.zipformer?.setExpected({ surah: m.s, ayah: m.a, ayahEnd: m.a });
    expectedSurah = m.s;
    await render();
    markRetry();
    setStatus("Təkrar", `${place} — yalnız bu yer gizlidir`);
  }

  async function startMic(): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("Mikrofon yoxdur", "Bu brauzer səs yazmır. Chrome və ya Huawei brauzerində HTTPS ilə açın.");
      return;
    }
    const engine = await ensureSession();
    engine.reset();
    shown.clear();
    freshKey = "";
    clearTimers();
    heard = 0;
    takeMisses = [];
    sumBox.hidden = true;
    expectedSurah = 0;
    const retrying = Boolean(retryKey);
    if (retrying) {
      const [s, a] = retryKey.split(":").map(Number);
      engine.zipformer?.setExpected({ surah: s, ayah: a, ayahEnd: a });
      expectedSurah = s;
    } else {
      const here = pages[page - 1]?.[0]?.[0];
      if (here) expectSurah(here);
    }
    micOn = true;
    root.classList.toggle("mic", !retrying);
    root.classList.toggle("retry", retrying);
    micBtn.setAttribute("aria-pressed", "true");
    levelBar.classList.add("on");
    applyShown();
    markRetry();
    if (retrying) {
      const [s, a, w] = retryKey.split(":");
      const name = AZ[Number(s) - 1] ?? s;
      const word = w === "*" ? "" : `, söz ${Number(w) + 1}`;
      setStatus("Təkrar", `${name} ${a}${word} — yalnız bu yer gizlidir`);
    } else {
      setStatus("Dinləyirəm", "Ayələr gizləndi. Nömrələr qalır. Təsdiqlənən söz açılır.");
    }
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
    });
    const ctx = new AudioContext();
    await ctx.resume();
    const source = ctx.createMediaStreamSource(stream);
    const proc = ctx.createScriptProcessor(4096, 1, 1);
    const gain = ctx.createGain();
    gain.gain.value = 0;
    let pending = new Float32Array(0);
    let chain: Promise<unknown> = Promise.resolve();
    const chunkSize = 4000;
    proc.onaudioprocess = (ev) => {
      if (!micOn) return;
      const raw = ev.inputBuffer.getChannelData(0);
      setLevel(raw);
      const next = resample(raw, ctx.sampleRate);
      const merged = new Float32Array(pending.length + next.length);
      merged.set(pending, 0);
      merged.set(next, pending.length);
      let offset = 0;
      while (merged.length - offset >= chunkSize) {
        const slice = merged.slice(offset, offset + chunkSize);
        offset += chunkSize;
        chain = chain.then(() => engine.feed(slice)).catch(() => undefined);
      }
      pending = merged.slice(offset);
    };
    source.connect(proc);
    proc.connect(gain);
    gain.connect(ctx.destination);
    audioStop = async () => {
      proc.onaudioprocess = null;
      proc.disconnect();
      source.disconnect();
      gain.disconnect();
      stream.getTracks().forEach((t) => t.stop());
      await ctx.close();
      try {
        const flushed = await engine.stop();
        if (Array.isArray(flushed)) {
          for (const msg of flushed) {
            if (msg && typeof msg === "object" && "type" in msg) onEvent(msg as ProgressMsg);
          }
        }
      } catch {
        /* flush is best-effort */
      }
      engine.reset();
    };
  }

  async function stopMic(): Promise<void> {
    const stop = audioStop;
    audioStop = null;
    if (stop) await stop();
    micOn = false;
    root.classList.remove("mic", "retry");
    micBtn.setAttribute("aria-pressed", "false");
    levelBar.classList.remove("on");
    levelFill.style.width = "0";
    clearTimers();
    shown.clear();
    freshKey = "";
    expectedSurah = 0;
    const fixed = retryClose;
    retryClose = false;
    retryKey = "";
    const nHeard = heard;
    const found = takeMisses;
    heard = 0;
    takeMisses = [];
    setProgress(null);
    if (nHeard || found.length) showSummary(fixed, nHeard, found);
    else setStatus("Oxu", "Mikrofon bağlıdır. Ayələr açıqdır.");
    render();
  }

  micBtn.addEventListener("click", () => {
    if (loadingModel) return;
    if (micOn) {
      void stopMic();
      return;
    }
    micBtn.disabled = true;
    void startMic()
      .catch((err: unknown) => {
        micOn = false;
        retryKey = "";
        root.classList.remove("mic", "retry");
        levelBar.classList.remove("on");
        const message = err instanceof Error ? err.message : "Mikrofon açılmadı";
        const denied = /denied|permission|notallowed/i.test(message);
        setStatus(
          denied ? "İcazə lazımdır" : "Alınmadı",
          denied ? "Brauzer mikrofonu bloklayıb. İcazəni açıb yenidən basın." : message,
        );
        setProgress(null);
      })
      .finally(() => {
        micBtn.disabled = false;
      });
  });

  root.querySelectorAll<HTMLButtonElement>("[data-dir]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const dir = Number(btn.dataset.dir || 0);
      go(page + dir);
    });
  });
  pageInput.addEventListener("change", () => go(Number(pageInput.value)));
  surahSel.addEventListener("change", () => {
    const n = Number(surahSel.value);
    const target = surahPage.get(n);
    if (target) go(target);
  });

  let sx = 0;
  let sy = 0;
  pageEl.addEventListener("touchstart", (ev) => {
    const t = ev.changedTouches[0];
    if (!t) return;
    sx = t.clientX;
    sy = t.clientY;
  }, { passive: true });
  pageEl.addEventListener("touchend", (ev) => {
    const t = ev.changedTouches[0];
    if (!t) return;
    const dx = t.clientX - sx;
    const dy = t.clientY - sy;
    if (Math.abs(dx) < 72 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    go(page + (dx < 0 ? 1 : -1));
  }, { passive: true });

  window.addEventListener("keydown", onKey);
  function onKey(ev: KeyboardEvent): void {
    if (ev.key === "ArrowLeft") go(page + 1);
    if (ev.key === "ArrowRight") go(page - 1);
  }

  pages.forEach((ayahs, i) => {
    for (const pair of ayahs) {
      const surah = pair[0] ?? 0;
      const ayah = pair[1] ?? 0;
      const key = `${surah}:${ayah}`;
      if (!pageOf.has(key)) pageOf.set(key, i + 1);
      if (ayah === 1 && !surahPage.has(surah)) surahPage.set(surah, i + 1);
    }
  });
  AZ.forEach((name, i) => {
    const opt = document.createElement("option");
    opt.value = String(i + 1);
    opt.textContent = `${i + 1}. ${name}`;
    surahSel.appendChild(opt);
  });
  let start = 1;
  if (hashMode) {
    const fromHash = Number((location.hash || "").replace("#", ""));
    if (fromHash) start = fromHash;
  }
  try {
    const saved = Number(localStorage.getItem("tartil.page") || "");
    if (!hashMode && saved) start = saved;
    if (hashMode && !Number((location.hash || "").replace("#", "")) && saved) start = saved;
  } catch {
    /* ignore */
  }
  page = clampPage(start);
  void render();
  setStatus("Oxu", "Mikrofonu açın: ayələr gizlənir, model təsdiqləyəndə açılır.");
  const onResize = () => fit();
  window.addEventListener("resize", onResize);

  return () => {
    alive = false;
    window.removeEventListener("keydown", onKey);
    window.removeEventListener("resize", onResize);
    clearTimers();
    if (micOn) void stopMic();
  };
}

if (typeof document !== "undefined") {
  const boot = document.getElementById("app");
  if (boot && boot.dataset.tartil !== "1") {
    boot.dataset.tartil = "1";
    mountTartil(boot, { hash: true });
  }
}
