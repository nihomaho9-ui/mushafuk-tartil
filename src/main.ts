import "./tartil.css";
import wordsData from "./data/words.json";
import pagesData from "./data/pages.json";
import qcfPagesData from "./data/qcf-pages.json";
import qcfWordsData from "./data/qcf-words.json";
import qcfAyahsData from "./data/qcf-ayahs.json";

let delayMin = 400;
let delayStep = 30;
let delayCap = 120;
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
    setStructural: (opts: { ayahOrder?: boolean; similarVerse?: boolean; timing?: "stop" | "pause" }) => Promise<void>;
    setSlipHead: (mode: false | "strict" | "high") => void;
    correct: (action: "review_later" | "retry" | "continue") => unknown;
    verdicts: () => Verdict[];
    correction: { state: { phase?: string }; suppressed?: { delete: (wordIndex: number) => void } };
  } | null;
};
type Issue = { surah?: number; ayah?: number; word?: number; kind?: string; wordIndex?: number; source?: string };
type Verdict = { surah: number; ayah: number; word: number; state: string; distance: number; heardRatio: number; margin: number };
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
const fontLoads = new Map<number, Promise<void>>();
let namesReady: Promise<void> | null = null;

function asset(path: string): string {
  return BASE + path.replace(/^\//, "");
}

const LANDSCAPE_PHONE = "(orientation: landscape) and (max-height: 520px)";

function clampPage(n: number): number {
  if (!Number.isFinite(n)) return 1;
  return Math.min(604, Math.max(1, Math.round(n)));
}

export function mountTartil(root: HTMLElement, opts?: { hash?: boolean }): () => void {
  const hashMode = opts?.hash === true;
  let words: WordsFile | null = wordsData as WordsFile;
  // Ayahs per page follow the drawn Madinah layout so recitation, jumps and lessons match what is on screen.
  let pages: number[][][] = Array.from({ length: 604 }, (_, i) =>
    (qcfAyahs[String(i + 1)] ?? []).map(([key]) => key.split(":").map(Number)),
  );
  if (!pages.some((list) => list.length)) pages = (pagesData as PagesFile).pages;
  const pageOf = new Map<string, number>();
  const surahPage = new Map<number, number>();
  let page = 1;
  let pickedSurah = 0;
  let alive = true;
  let micOn = false;
  let loadingModel = false;
  let session: FeedSession | null = null;
  let expectedSurah = 0;
  let retryKey = "";
  let ayahLock = "";
  let lockDirty = false;
  let rearm = false;
  let settling = false;
  let wake: WakeLockSentinel | null = null;
  let heard = 0;
  let takeMisses: Miss[] = [];
  // Ayahs whose words were already checked once the reciter moved on to the next ayah.
  const ayahChecked = new Set<string>();
  let retryClose = false;
  let audioStop: (() => Promise<void>) | null = null;
  let settlingMic: Promise<void> = Promise.resolve();
  let opening = false;
  const shown = new Set<string>();
  const timers = new Map<string, number>();
  let freshKey = "";

  root.className = "tartil";
  root.innerHTML = `
    <header class="t-top">
      <div class="t-pager">
        <button type="button" data-dir="-1" aria-label="Əvvəlki səhifə">‹</button>
        <input class="t-pageno" inputmode="numeric" aria-label="Səhifə" />
        <button type="button" data-dir="1" aria-label="Növbəti səhifə">›</button>
      </div>
      <label class="t-ico t-surah-btn" aria-label="Surə">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 0-3 3V4z"/><path d="M5 4a3 3 0 0 0-3 3v13"/></svg>
        <select class="t-surah" aria-label="Surə"></select>
      </label>
      <button type="button" class="t-missbtn" aria-expanded="false" aria-label="Xətalar">0</button>
      <button type="button" class="t-theme" aria-label="Səhifə rəngi: krem">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5c3 3.6 5.5 6.6 5.5 9.6a5.5 5.5 0 0 1-11 0c0-3 2.5-6 5.5-9.6z"/></svg>
      </button>
      <button type="button" class="t-more" aria-expanded="false" aria-label="Alətlər">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
      </button>
    </header>
    <div class="t-tools" hidden>
      <button type="button" class="t-ico t-today" aria-label="Bu gün"></button>
      <button type="button" class="t-ico t-speed" aria-label="Sürət"></button>
      <button type="button" class="t-ico t-sense" aria-label="Həssaslıq"></button>
      <button type="button" class="t-ico t-hifz" aria-pressed="false" aria-label="Hifz"></button>
      <button type="button" class="t-ico t-listen" aria-label="Dinlə"></button>
      <button type="button" class="t-ico t-lesson" aria-label="Dərs"></button>
      <button type="button" class="t-ico t-mine" aria-label="Səsim" hidden></button>
      <button type="button" class="t-ico t-back" aria-label="Son səhifə" hidden></button>
      <label class="t-ico t-micbtn" aria-label="Mikrofon" hidden>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3zM5 11a7 7 0 0 0 14 0M12 18v3"/></svg>
        <select class="t-micpick" aria-label="Mikrofon"></select>
      </label>
    </div>
    <div class="t-range" hidden>
      <select class="t-from" aria-label="Başlanğıc ayə"></select>
      <span>–</span>
      <select class="t-to" aria-label="Son ayə"></select>
      <button type="button" class="t-ico t-range-go" aria-label="Başla"></button>
    </div>
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
      <div class="t-miss-h"><b>Xəta yerləri</b><span><button type="button" class="t-miss-go">Düzəlt</button><button type="button" class="t-miss-clear">Təmizlə</button></span></div>
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
  const strikes = new Map<string, number>();
  const warns = new Set<string>();
  let sense: "normal" | "sert" = "normal";
  let hifz = false;
  let queueOn = false;
  let lesson: Array<[number, number]> = [];
  let lessonAt = 0;
  let drill = false;
  let passes = 0;
  let passDirty = false;
  const voiceChunks: Float32Array[] = [];
  let voiceSamples = 0;
  let captureOn = false;
  let lastVoice: { s: number; a: number; pcm: Float32Array } | null = null;
  let quietStop = false;
  let playGen = 0;
  try {
    const saved = JSON.parse(localStorage.getItem(MISS_KEY) || "[]") as Miss[];
    if (Array.isArray(saved)) misses = saved.filter((m) => m && m.s && m.a);
  } catch {
    misses = [];
  }
  try {
    const raw = JSON.parse(localStorage.getItem("tartil.strikes") || "{}") as Record<string, number>;
    Object.entries(raw).forEach(([key, n]) => {
      if (n > 0) strikes.set(key, n);
    });
    if (localStorage.getItem("tartil.sense") === "sert") sense = "sert";
    hifz = localStorage.getItem("tartil.hifz") === "1";
  } catch {
    /* ignore */
  }
  if (hifz) root.classList.add("hifz");
  function saveStrikes(): void {
    try {
      localStorage.setItem("tartil.strikes", JSON.stringify(Object.fromEntries([...strikes].slice(-300))));
    } catch {
      /* ignore quota */
    }
  }

  function saveMisses(): void {
    try {
      localStorage.setItem(MISS_KEY, JSON.stringify(misses.slice(-200)));
    } catch {
      /* ignore quota */
    }
  }

  function paintMisses(): void {
    const rank: Record<string, number> = { "err-skip": 4, "err-miss": 3, "err-repeat": 2, "err-vowel": 1 };
    const mark = new Map<string, string>();
    const put = (key: string, cls: string) => {
      const prev = mark.get(key);
      if (!prev || rank[cls] > rank[prev]) mark.set(key, cls);
    };
    for (const m of misses) {
      const cls = m.kind === "possible_vowel"
        ? "err-vowel"
        : m.kind === "possible_repetition"
          ? "err-repeat"
          : m.kind === "possible_skipped_ayah" || m.kind === "unclear_ayah"
            ? "err-skip"
            : "err-miss";
      if (cls === "err-skip" || m.w < 0) {
        const total = wordList(m.s, m.a).length;
        for (let i = 0; i < total; i += 1) put(`${m.s}:${m.a}:${i}`, cls);
      } else put(`${m.s}:${m.a}:${m.w}`, cls);
    }
    sheet.querySelectorAll<HTMLElement>(".w").forEach((el) => {
      el.classList.remove("err", "err-miss", "err-vowel", "err-skip", "err-repeat", "warn");
      const key = el.dataset.k || "";
      const cls = mark.get(key);
      if (cls) el.classList.add(cls);
      else if (warns.has(key)) el.classList.add("warn");
    });
    const total = misses.reduce((n, m) => n + (m.n || 1), 0);
    missBtn.textContent = String(total);
    missBtn.setAttribute("aria-label", `Xəta ${total}`);
    paintToday();
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
        queueOn = false;
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
    passDirty = true;
    bumpWeek("error");
    saveMisses();
    paintMisses();
    navigator.vibrate?.(50);
    const name = AZ[s - 1] ?? String(s);
    setStatus("Xəta", `${name} ${a}${w >= 0 ? `, söz ${w + 1}` : ""} — ${KIND_AZ[kind] ?? kind}`);
  }

  function orderedMisses(): Miss[] {
    return [...misses].sort((a, b) => a.s - b.s || a.a - b.a || a.w - b.w);
  }

  function forgetSpot(surah: number, ayah: number, word = -1): void {
    for (const key of [...strikes.keys()]) {
      const parts = key.split(":");
      if (Number(parts[0]) !== surah || Number(parts[1]) !== ayah) continue;
      if (word >= 0 && Number(parts[2]) !== word) continue;
      strikes.delete(key);
      warns.delete(`${surah}:${ayah}:${parts[2]}`);
    }
    saveStrikes();
  }

  function advanceQueue(): void {
    if (!queueOn) return;
    const next = orderedMisses()[0];
    if (!next) {
      queueOn = false;
      setStatus("Bitdi", "Bütün xətalar düzəldi.");
      queueMicrotask(() => {
        if (micOn) void stopMic();
      });
      return;
    }
    void beginRetry(next);
  }

  function releaseIssue(issue: Issue): void {
    const z = session?.zipformer;
    if (!z) return;
    z.correct("review_later");
    if (typeof issue.wordIndex === "number") z.correction.suppressed?.delete(issue.wordIndex);
  }

  function noteStrike(issue: Issue): boolean {
    const s = issue.surah ?? 0;
    const a = issue.ayah ?? 0;
    const w = issue.word ?? -1;
    if (!s || !a) return false;
    const kind = issue.kind || "xəta";
    const key = `${s}:${a}:${w}:${kind}`;
    const n = (strikes.get(key) ?? 0) + 1;
    strikes.set(key, n);
    saveStrikes();
    warns.delete(`${s}:${a}:${w}`);
    return true;
  }

  missBtn.addEventListener("click", () => {
    missBox.hidden = !missBox.hidden;
    missBtn.setAttribute("aria-expanded", missBox.hidden ? "false" : "true");
    if (!missBox.hidden) paintMisses();
  });
  need<HTMLButtonElement>(".t-miss-clear").addEventListener("click", () => {
    misses = [];
    strikes.clear();
    warns.clear();
    saveStrikes();
    saveMisses();
    paintMisses();
  });
  need<HTMLButtonElement>(".t-miss-go").addEventListener("click", () => {
    if (!orderedMisses().length) {
      setStatus("Xəta yoxdur", "Düzəldiləcək yer qalmayıb.");
      return;
    }
    queueOn = true;
    missBox.hidden = true;
    void beginRetry(orderedMisses()[0]);
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
    themeBtn.setAttribute("aria-label", `Səhifə rəngi: ${label}`);
    themeBtn.title = `Səhifə rəngi: ${label}`;
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
  const todayEl = need<HTMLElement>(".t-today");
  const tools = need<HTMLElement>(".t-tools");
  const moreBtn = need<HTMLButtonElement>(".t-more");
  moreBtn.addEventListener("click", () => {
    const open = tools.hidden;
    tools.hidden = !open;
    if (!open) rangeBox.hidden = true;
    moreBtn.setAttribute("aria-expanded", open ? "true" : "false");
    moreBtn.classList.toggle("on", open);
  });
  const icon = (cls: string, body: string) => {
    const el = root.querySelector(cls);
    if (el && !el.querySelector("svg")) el.insertAdjacentHTML("afterbegin", `<svg viewBox="0 0 24 24" aria-hidden="true">${body}</svg>`);
  };
  icon(".t-today", `<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/>`);
  icon(".t-speed", `<path d="M13 3L5 14h7l-1 7 8-11h-7l1-7z"/>`);
  icon(".t-sense", `<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/>`);
  icon(".t-hifz", `<path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="2.5"/>`);
  icon(".t-listen", `<path d="M8 5v14l11-7L8 5z"/>`);
  icon(".t-lesson", `<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 0-3 3V4z"/>`);
  icon(".t-mine", `<path d="M4 12h2l2-5 3 10 2-5h7"/>`);
  icon(".t-back", `<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>`);
  icon(".t-range-go", `<path d="M8 5v14l11-7L8 5z"/>`);
  todayEl.addEventListener("click", () => setStatus("Hesab", todayEl.getAttribute("aria-label") || ""));
  const speedBtn = need<HTMLButtonElement>(".t-speed");
  let pace: "tez" | "orta" = "orta";
  try {
    if (localStorage.getItem("tartil.speed") === "tez") pace = "tez";
  } catch {
    /* ignore */
  }
  function applyPace(name: "tez" | "orta"): void {
    pace = name;
    if (name === "tez") {
      delayMin = 180;
      delayStep = 15;
      delayCap = 40;
    } else {
      delayMin = 400;
      delayStep = 30;
      delayCap = 120;
    }
    speedBtn.classList.toggle("on", name === "tez");
    speedBtn.setAttribute("aria-label", name === "tez" ? "Sürət: tez" : "Sürət: orta");
    try {
      localStorage.setItem("tartil.speed", name);
    } catch {
      /* ignore quota */
    }
  }
  speedBtn.addEventListener("click", () => applyPace(pace === "orta" ? "tez" : "orta"));
  applyPace(pace);
  const senseBtn = need<HTMLButtonElement>(".t-sense");
  const hifzBtn = need<HTMLButtonElement>(".t-hifz");
  function applySense(name: "normal" | "sert"): void {
    sense = name;
    senseBtn.classList.toggle("on", name === "sert");
    senseBtn.setAttribute("aria-label", name === "sert" ? "Həssaslıq: sərt" : "Həssaslıq: normal");
    session?.zipformer?.setSlipHead("high");
    try {
      localStorage.setItem("tartil.sense", name);
    } catch {
      /* ignore quota */
    }
  }
  senseBtn.addEventListener("click", () => applySense(sense === "normal" ? "sert" : "normal"));
  applySense(sense);
  function applyHifz(on: boolean): void {
    hifz = on;
    root.classList.toggle("hifz", on);
    hifzBtn.classList.toggle("on", on);
    hifzBtn.setAttribute("aria-pressed", on ? "true" : "false");
    try {
      localStorage.setItem("tartil.hifz", on ? "1" : "0");
    } catch {
      /* ignore quota */
    }
  }
  hifzBtn.addEventListener("click", () => applyHifz(!hifz));
  applyHifz(hifz);
  const listenBtn = need<HTMLButtonElement>(".t-listen");
  const micPick = need<HTMLSelectElement>(".t-micpick");
  function savedMic(): string {
    try {
      return localStorage.getItem("tartil.mic") || "";
    } catch {
      return "";
    }
  }
  async function listMics(): Promise<void> {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    const found = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === "audioinput");
    micPick.replaceChildren();
    const auto = document.createElement("option");
    auto.value = "";
    auto.textContent = "Mikrofon";
    micPick.appendChild(auto);
    found.forEach((d, i) => {
      const opt = document.createElement("option");
      opt.value = d.deviceId;
      opt.textContent = d.label || `Mikrofon ${i + 1}`;
      micPick.appendChild(opt);
    });
    const keep = savedMic();
    if ([...micPick.options].some((opt) => opt.value === keep)) micPick.value = keep;
    micPick.closest<HTMLElement>(".t-micbtn")?.toggleAttribute("hidden", found.length < 2);
  }
  micPick.addEventListener("change", () => {
    try {
      localStorage.setItem("tartil.mic", micPick.value);
    } catch {
      /* ignore quota */
    }
  });
  void listMics();
  listenBtn.addEventListener("click", () => {
    const pair = pages[page - 1]?.[0];
    if (!pair) return;
    queueOn = false;
    lesson = [];
    lessonAt = 0;
    passes = 0;
    drill = true;
    root.querySelector(".t-lesson")?.classList.remove("on");
    void beginRetry({ s: pair[0], a: pair[1], w: -1, kind: "oxu", n: 1, t: Date.now() });
  });
  const lessonBtn = need<HTMLButtonElement>(".t-lesson");
  const mineBtn = need<HTMLButtonElement>(".t-mine");
  const backBtn = need<HTMLButtonElement>(".t-back");
  const rangeBox = need<HTMLElement>(".t-range");
  const fromSel = need<HTMLSelectElement>(".t-from");
  const toSel = need<HTMLSelectElement>(".t-to");
  function pageAyahs(): Array<[number, number]> {
    const seen = new Set<string>();
    const out: Array<[number, number]> = [];
    for (const pair of pages[page - 1] ?? []) {
      const key = `${pair[0]}:${pair[1]}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push([pair[0], pair[1]]);
    }
    return out;
  }
  function fillRange(): void {
    const here = pageAyahs();
    const surah = here[0]?.[0] || Number(surahSel.value) || 1;
    const total = words?.ayahs[surah - 1]?.length || 1;
    const name = AZ[surah - 1] ?? String(surah);
    fromSel.setAttribute("aria-label", `${name}, başlanğıc`);
    toSel.setAttribute("aria-label", `${name}, son`);
    fromSel.replaceChildren();
    toSel.replaceChildren();
    for (let a = 1; a <= total; a += 1) {
      const start = document.createElement("option");
      start.value = String(a);
      start.textContent = String(a);
      fromSel.appendChild(start);
      const end = document.createElement("option");
      end.value = String(a);
      end.textContent = String(a);
      toSel.appendChild(end);
    }
    const onSurah = here.filter((pair) => pair[0] === surah);
    fromSel.value = String(onSurah[0]?.[1] ?? 1);
    toSel.value = String(onSurah[onSurah.length - 1]?.[1] ?? total);
    rangeBox.hidden = false;
  }
  lessonBtn.addEventListener("click", () => {
    if (lesson.length) {
      lesson = [];
      drill = false;
      lessonBtn.classList.remove("on");
      rangeBox.hidden = true;
      if (micOn) void stopMic();
      return;
    }
    if (!rangeBox.hidden) {
      rangeBox.hidden = true;
      return;
    }
    fillRange();
  });
  need<HTMLButtonElement>(".t-range-go").addEventListener("click", () => {
    const here = pageAyahs();
    const surah = here[0]?.[0] || Number(surahSel.value) || 1;
    let a1 = Number(fromSel.value);
    let a2 = Number(toSel.value);
    if (!a1 || !a2) return;
    if (a2 < a1) {
      const swap = a1;
      a1 = a2;
      a2 = swap;
    }
    const list: Array<[number, number]> = [];
    for (let a = a1; a <= a2; a += 1) list.push([surah, a]);
    queueOn = false;
    drill = false;
    lesson = list;
    lessonAt = 0;
    passes = 0;
    rangeBox.hidden = true;
    lessonBtn.classList.add("on");
    void beginRetry({ s: surah, a: a1, w: -1, kind: "ders", n: 1, t: Date.now() });
  });
  function snapshotVoice(): void {
    if (!voiceSamples || !retryKey) return;
    const [s, a] = retryKey.split(":").map(Number);
    if (!s || !a) return;
    const pcm = new Float32Array(voiceSamples);
    let at = 0;
    for (const chunk of voiceChunks) {
      pcm.set(chunk, at);
      at += chunk.length;
    }
    lastVoice = { s, a, pcm };
    mineBtn.hidden = false;
  }
  function playPcm(pcm: Float32Array): Promise<boolean> {
    const gen = playGen;
    return new Promise((resolve) => {
      void (async () => {
        try {
          const ctx = voice ?? new AudioContext();
          voice = ctx;
          await ctx.resume();
          if (gen !== playGen) {
            resolve(false);
            return;
          }
          const buf = ctx.createBuffer(1, pcm.length, 16000);
          buf.copyToChannel(pcm, 0);
          const src = ctx.createBufferSource();
          const gain = ctx.createGain();
          gain.gain.value = 1.6;
          src.buffer = buf;
          src.connect(gain);
          gain.connect(ctx.destination);
          voiceStop = () => src.stop();
          src.onended = () => resolve(gen === playGen);
          src.start();
        } catch {
          resolve(false);
        }
      })();
    });
  }
  mineBtn.addEventListener("click", () => {
    const clip = lastVoice;
    if (!clip) return;
    void (async () => {
      if (micOn || audioStop) await stopMic();
      const name = AZ[clip.s - 1] ?? String(clip.s);
      setStatus("Səsim", `${name} ${clip.a} — əvvəl qari, sonra sən.`);
      const ok = await playAyah(clip.s, clip.a);
      if (!ok) return;
      setStatus("Səsim", `${name} ${clip.a} — sənin oxuyuşun.`);
      await playPcm(clip.pcm);
    })();
  });
  const dayAyahs = new Set<string>();
  function todayStamp(): string {
    const n = new Date();
    return `${n.getFullYear()}-${n.getMonth() + 1}-${n.getDate()}`;
  }
  try {
    const raw = JSON.parse(localStorage.getItem("tartil.day") || "") as { d?: string; ayahs?: string[] };
    if (raw?.d === todayStamp() && Array.isArray(raw.ayahs)) raw.ayahs.forEach((key) => dayAyahs.add(key));
  } catch {
    /* ignore */
  }
  function paintToday(): void {
    const week = weekTotals();
    todayEl.setAttribute("aria-label", `Bu gün ${dayAyahs.size} ayə, ${misses.length} xəta. Həftə ${week.ayahs} ayə, ${week.errors} xəta`);
  }
  function weekKey(offset = 0): string {
    const n = new Date();
    n.setDate(n.getDate() - offset);
    return `${n.getFullYear()}-${n.getMonth() + 1}-${n.getDate()}`;
  }
  function readWeek(): Record<string, { ayahs?: string[]; errors?: number }> {
    try {
      const raw = JSON.parse(localStorage.getItem("tartil.week") || "{}") as Record<string, { ayahs?: string[]; errors?: number }>;
      return raw && typeof raw === "object" ? raw : {};
    } catch {
      return {};
    }
  }
  function weekTotals(): { ayahs: number; errors: number } {
    const week = readWeek();
    let ayahs = 0;
    let errors = 0;
    for (let i = 0; i < 7; i += 1) {
      const row = week[weekKey(i)];
      ayahs += row?.ayahs?.length ?? 0;
      errors += row?.errors ?? 0;
    }
    return { ayahs, errors };
  }
  function bumpWeek(kind: "ayah" | "error", ayahKey = ""): void {
    const week = readWeek();
    const key = weekKey();
    const row = week[key] ?? { ayahs: [], errors: 0 };
    if (!Array.isArray(row.ayahs)) row.ayahs = [];
    if (kind === "ayah" && ayahKey && !row.ayahs.includes(ayahKey)) row.ayahs.push(ayahKey);
    if (kind === "error") row.errors = (row.errors ?? 0) + 1;
    week[key] = row;
    const keep: Record<string, { ayahs?: string[]; errors?: number }> = {};
    for (let i = 0; i < 7; i += 1) {
      const day = weekKey(i);
      if (week[day]) keep[day] = week[day];
    }
    try {
      localStorage.setItem("tartil.week", JSON.stringify(keep));
    } catch {
      /* ignore quota */
    }
  }
  function noteAyah(surah: number, ayah: number): void {
    const key = `${surah}:${ayah}`;
    if (dayAyahs.has(key)) return;
    dayAyahs.add(key);
    bumpWeek("ayah", key);
    try {
      localStorage.setItem("tartil.day", JSON.stringify({ d: todayStamp(), ayahs: [...dayAyahs] }));
    } catch {
      /* ignore quota */
    }
    paintToday();
  }
  paintToday();

  let liveSub = "Mikrofonu açın: ayələr gizlənir, model təsdiqləyəndə açılır.";
  let quietOn = false;
  function setStatus(title: string, detail: string): void {
    st.textContent = title;
    liveSub = detail;
    if (!quietOn) sub.textContent = detail;
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

  function loadPageFont(n: number): Promise<void> {
    if (loadedFonts.has(n)) return Promise.resolve();
    const pending = fontLoads.get(n);
    if (pending) return pending;
    const face = new FontFace(`QCF${n}`, `url(${QCF}p${n}.woff2)`);
    const job = face
      .load()
      .then(() => {
        document.fonts.add(face);
        loadedFonts.add(n);
      })
      .finally(() => fontLoads.delete(n));
    fontLoads.set(n, job);
    return job;
  }

  function textWidth(line: HTMLElement): number {
    const range = document.createRange();
    range.selectNodeContents(line);
    return range.getBoundingClientRect().width;
  }

  function fit(): void {
    pageEl.querySelectorAll<HTMLElement>(".line").forEach((line) => line.style.removeProperty("--g"));
    const land = matchMedia(LANDSCAPE_PHONE).matches;
    root.classList.toggle("land", land);
    if (!land) root.style.removeProperty("--t-row");
    const bar = root.querySelector<HTMLElement>(".t-bar");
    const barH = bar ? Math.ceil(bar.getBoundingClientRect().height) : 0;
    root.style.setProperty("--t-bar-h", `${barH}px`);
    const h = Math.max(160, pageEl.clientHeight - barH - 21);
    const w = pageEl.clientWidth - 12;
    if (!h || !w) return;
    let size = land ? w / 12 : h / 15;
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
    const rowH = (pageEl.clientHeight - barH) / 15;
    if (land) {
      pageEl.style.fontSize = `${size}px`;
      root.style.setProperty("--t-row", `${(size / 0.62).toFixed(2)}px`);
    } else pageEl.style.fontSize = `${Math.min(size * (phone ? 1 : 0.92), rowH * 0.62)}px`;
    pageEl.style.overflowY = "hidden";
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
    const turned = pageInput.value !== String(n);
    draw(n);
    fit();
    if (turned && root.classList.contains("land")) window.scrollTo(0, 0);
    if (micOn || retryKey) applyShown();
    if (retryKey) markRetry();
    paintMisses();
    pageInput.value = String(n);
    const first = pages[n - 1]?.[0];
    const keepPick = pickedSurah > 0 && surahPage.get(pickedSurah) === n;
    pickedSurah = 0;
    if (!keepPick && first) surahSel.value = String(first[0]);
    if (hashMode) history.replaceState(null, "", `#${n}`);
    showBack();
    try {
      localStorage.setItem("tartil.page", String(n));
    } catch {
      /* ignore quota */
    }
    const ahead = n + 1;
    if (ahead <= 604) void loadPageFont(ahead).catch(() => undefined);
    if (n > 1) void loadPageFont(n - 1).catch(() => undefined);
    prefetchPage(n);
  }

  function clearTimers(): void {
    for (const id of timers.values()) window.clearTimeout(id);
    timers.clear();
  }

  let paintQueued = false;
  function applyShown(): void {
    if (paintQueued) return;
    paintQueued = true;
    window.requestAnimationFrame(() => {
      paintQueued = false;
      const nodes = sheet.querySelectorAll<HTMLElement>("[data-k]");
      nodes.forEach((el) => {
        const key = el.dataset.k || "";
        const on = shown.has(key);
        if (el.classList.contains("on") !== on) el.classList.toggle("on", on);
        const fresh = key === freshKey;
        if (el.classList.contains("fresh") !== fresh) el.classList.toggle("fresh", fresh);
      });
      paintCue();
      followLine();
    });
  }

  // Landscape scrolls: keep the line being recited in view, but give way to the reader's own scrolling.
  let userScrollAt = 0;
  const markUserScroll = (): void => {
    userScrollAt = Date.now();
  };
  const onScrollKey = (ev: KeyboardEvent): void => {
    if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(ev.key)) markUserScroll();
  };
  window.addEventListener("wheel", markUserScroll, { passive: true });
  window.addEventListener("touchmove", markUserScroll, { passive: true });
  window.addEventListener("keydown", onScrollKey);
  function followLine(): void {
    if (!micOn || !root.classList.contains("land")) return;
    if (Date.now() - userScrollAt < 4000) return;
    const target =
      sheet.querySelector<HTMLElement>(".w.cue") ||
      sheet.querySelector<HTMLElement>(".w.fresh") ||
      [...sheet.querySelectorAll<HTMLElement>(".w.on")].pop();
    const line = target?.closest<HTMLElement>(".line");
    if (!line) return;
    const head = root.querySelector<HTMLElement>(".t-top")?.getBoundingClientRect().bottom ?? 0;
    const foot = root.querySelector<HTMLElement>(".t-bar")?.getBoundingClientRect().top ?? window.innerHeight;
    const view = foot - head;
    const r = line.getBoundingClientRect();
    if (r.top >= head && r.bottom <= head + view * 0.8) return;
    const top = Math.max(0, window.scrollY + r.top - head - view * 0.2);
    if (Math.abs(top - window.scrollY) < 2) return;
    window.scrollTo({ top, behavior: "smooth" });
  }
  const followTimer = window.setInterval(followLine, 700);

  function paintCue(): void {
    sheet.querySelectorAll(".cue").forEach((el) => el.classList.remove("cue"));
    if (!micOn || root.classList.contains("retry")) return;
    const words = sheet.querySelectorAll<HTMLElement>(".w");
    for (const el of words) {
      if (el.classList.contains("num")) continue;
      const key = el.dataset.k || "";
      if (!key || shown.has(key)) continue;
      if (ayahLock && !key.startsWith(`${ayahLock}:`)) continue;
      el.classList.add("cue");
      break;
    }
  }

  function rewindLock(): void {
    if (!ayahLock) return;
    const [ls, la] = ayahLock.split(":").map(Number);
    for (const key of [...shown]) {
      const parts = key.split(":");
      if (parts.length < 3) continue;
      const ks = Number(parts[0]);
      const ka = Number(parts[1]);
      if (ks > ls || (ks === ls && ka >= la)) shown.delete(key);
    }
    for (const [key, id] of [...timers]) {
      const parts = key.split(":");
      if (parts.length < 3) continue;
      const ks = Number(parts[0]);
      const ka = Number(parts[1]);
      if (ks > ls || (ks === ls && ka >= la)) {
        window.clearTimeout(id);
        timers.delete(key);
      }
    }
  }

  function holdAyah(surah: number, ayah: number): void {
    const key = `${surah}:${ayah}`;
    if (!ayahLock) {
      ayahLock = key;
      lockDirty = false;
    } else if (ayahLock === key && !rearm) lockDirty = true;
    else {
      const [ls, la] = ayahLock.split(":").map(Number);
      if (surah < ls || (surah === ls && ayah < la)) {
        ayahLock = key;
        lockDirty = false;
      }
    }
    rearm = true;
    rewindLock();
    applyShown();
  }

  function go(n: number): void {
    page = clampPage(n);
    try {
      localStorage.setItem("tartil.read", String(page));
    } catch {
      /* ignore quota */
    }
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
        if (!retryKey) {
          try {
            localStorage.setItem("tartil.read", String(page));
          } catch {
            /* ignore quota */
          }
        }
        expectPage();
        if (!retryHit(key)) {
          render();
          return;
        }
      }
      const total = wordList(surah, ayah).length;
      const idx = Number(parts[2]);
      if (idx === total - 1) {
        if (surah === seqS && ayah === seqA) seqDone = true;
        noteAyah(surah, ayah);
        shown.add(`num:${surah}:${ayah}`);
        const prefix = `${surah}:${ayah}:`;
        sheet.querySelectorAll<HTMLElement>(".w").forEach((el) => {
          const k = el.dataset.k || "";
          if (k.startsWith(prefix) && /^\d+$/.test(k.slice(prefix.length))) shown.add(k);
        });
      }
      if (ayah === 1) shown.add(`bism:${surah}`);
      if (ayahLock === `${surah}:${ayah}` && idx === total - 1 && !rearm) {
        if (lockDirty) {
          lockDirty = false;
          rearm = true;
          rewindLock();
          setStatus("Yenidən", `${AZ[surah - 1] ?? surah} ${ayah} — ayəni təmiz oxuyun.`);
          applyShown();
          return;
        }
        misses = misses.filter((m) => !(m.s === surah && m.a === ayah));
        forgetSpot(surah, ayah);
        saveMisses();
        paintMisses();
        ayahLock = "";
        setStatus("Düzəldi", "Ayə təmizdir. Davam edə bilərsiniz.");
        if (queueOn) advanceQueue();
      }
    }
    if (/^\d+:\d+:\d+$/.test(key)) {
      const bits = key.split(":").map(Number);
      if (bits[2] < wordList(bits[0], bits[1]).length) heard += 1;
    }
    if (retryHit(key)) {
      const bits = key.split(":").map(Number);
      const whole = retryKey.endsWith(":*");
      misses = misses.filter((m) => !(m.s === bits[0] && m.a === bits[1] && (whole || m.w === bits[2])));
      forgetSpot(bits[0], bits[1], whole ? -1 : bits[2]);
      saveMisses();
      retryKey = "";
      paintMisses();
      applyShown();
      if (lesson.length || drill) {
        const name = AZ[bits[0] - 1] ?? String(bits[0]);
        const again = (why: string) => {
          retryKey = `${bits[0]}:${bits[1]}:*`;
          setStatus(why, `${name} ${bits[1]} — ${passes}/3`);
          void beginRetry({ s: bits[0], a: bits[1], w: -1, kind: "ders", n: 1, t: Date.now() });
        };
        if (passDirty) {
          passDirty = false;
          again("Yenidən");
          return;
        }
        passes += 1;
        if (passes < 3) {
          again("Təmiz");
          return;
        }
        passes = 0;
        passDirty = false;
        if (lesson.length) {
          lessonAt += 1;
          if (lessonAt < lesson.length) {
            const next = lesson[lessonAt];
            void beginRetry({ s: next[0], a: next[1], w: -1, kind: "ders", n: 1, t: Date.now() });
            return;
          }
          lesson = [];
          lessonAt = 0;
          root.querySelector(".t-lesson")?.classList.remove("on");
          setStatus("Bitdi", "Səhifə dərsi tamamdır.");
        } else {
          drill = false;
          setStatus("Bitdi", `${name} ${bits[1]} üç dəfə təmizdir.`);
        }
        retryClose = true;
        queueMicrotask(() => {
          if (micOn) void stopMic();
        });
        return;
      }
      if (queueOn) {
        advanceQueue();
        return;
      }
      retryClose = true;
      queueMicrotask(() => {
        if (micOn) void stopMic();
      });
      return;
    }
    applyShown();
    if (retryKey) markRetry();
  }

  let seqS = 0;
  let seqA = 0;
  let seqDone = false;
  let seqHold = false;
  function seqOk(surah: number, ayah: number): boolean {
    if (retryKey) return true;
    if (!seqA) {
      const here = pages[page - 1]?.[0];
      seqS = here?.[0] ?? surah;
      seqA = here?.[1] ?? ayah;
      seqDone = false;
    }
    if (surah === seqS && ayah <= seqA) return true;
    const follows = (surah === seqS && ayah === seqA + 1) || (surah === seqS + 1 && ayah === 1);
    if (follows && !seqDone && wordList(seqS, seqA).length <= 2) {
      // One- or two-word ayahs (93:1, 103:1) are often over before the model locks on; reading on proves them.
      const held = wordList(seqS, seqA).map((_, i) => i);
      const [hs, ha] = [seqS, seqA];
      seqDone = true;
      schedule(hs, ha, held);
    }
    if (follows && seqDone) {
      seqS = surah;
      seqA = ayah;
      seqDone = false;
      seqHold = false;
      return true;
    }
    if (!seqHold) {
      seqHold = true;
      const name = AZ[seqS - 1] ?? String(seqS);
      setStatus("Buraxıldı", `${name} ${seqA} bitməyib. Növbəti ayə açılmır.`);
    }
    return false;
  }

  function schedule(surah: number, ayah: number, indices: number[]): void {
    if (surah === 1 && ayah === 1 && pageOf.get("1:1") !== page) return;
    if (!seqOk(surah, ayah)) return;
    if (ayahLock) {
      const [ls, la] = ayahLock.split(":").map(Number);
      if (surah > ls || (surah === ls && ayah > la)) return;
    }
    if (rearm) {
      if (ayahLock !== `${surah}:${ayah}` || Math.min(...indices) > 0) return;
      rearm = false;
    }
    const fresh = indices
      .filter((i) => {
        const key = `${surah}:${ayah}:${i}`;
        return !shown.has(key) && !timers.has(key);
      })
      .sort((a, b) => a - b);
    fresh.forEach((i, n) => {
      const key = `${surah}:${ayah}:${i}`;
      const delay = delayMin + Math.min(delayCap, n * delayStep);
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
      const phase = msg.state?.phase;
      if (msg.type === "correction_note" && issue) {
        if (noteStrike(issue)) remember(issue);
        return;
      }
      if (phase === "error" && issue?.surah && issue.ayah) {
        // Look-alike-verse omissions fired on the same words for every clean qari (2:6, 2:38, 93:7);
        // the word rules and checkFinishedAyah catch real dropped words.
        const lookAlikeDrop = issue.source === "similar_verse" && issue.kind === "possible_omission";
        if (!lookAlikeDrop && noteStrike(issue)) remember(issue);
        if (!settling) {
          settling = true;
          try {
            releaseIssue(issue);
          } finally {
            settling = false;
          }
        }
        return;
      }
      if (phase === "corrected" && issue?.surah && issue.ayah) {
        misses = misses.filter((m) => !(m.s === issue.surah && m.a === issue.ayah && m.w === (issue.word ?? -1)));
        forgetSpot(issue.surah, issue.ayah, issue.word ?? -1);
        saveMisses();
        paintMisses();
        lockDirty = false;
        if (!settling) {
          settling = true;
          try {
            session?.zipformer?.correct("continue");
          } finally {
            settling = false;
          }
        }
        const name = AZ[issue.surah - 1] ?? String(issue.surah);
        setStatus("Düzəldi", `${name} ${issue.ayah} — söz düzəldi. Ayəni bitirin.`);
        return;
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
    checkFinishedAyah(surah, ayah);
    if (surah) expectPage();
    schedule(surah, ayah, [...idxs]);
  }

  // When the reciter starts ayah N+1, judge ayah N's words once more with its whole audio settled.
  // Tuned on real qari recordings with spliced mistakes (tools/recitation-bench): no extra flags on
  // clean takes, and it catches dropped endings and dropped or swapped words the live rules miss.
  function checkFinishedAyah(surah: number, ayah: number): void {
    const key = `${surah}:${ayah}`;
    if (retryKey || ayah < 2 || ayahChecked.has(key)) return;
    ayahChecked.add(key);
    let all: Verdict[] = [];
    try {
      all = session?.zipformer?.verdicts() ?? [];
    } catch {
      return;
    }
    const v = all.filter((x) => x.surah === surah && x.ayah === ayah - 1).sort((a, b) => a.word - b.word);
    if (v.length < 3) return;
    const found: Issue[] = [];
    const lost = (x: Verdict) => x.state === "skipped" || (x.state === "wrong" && x.distance >= 0.5);
    let k = v.length;
    while (k > 0 && lost(v[k - 1])) k -= 1;
    if (k < v.length && k > 0 && v[k - 1].state !== "skipped") {
      found.push({ surah, ayah: ayah - 1, word: v[k].word, kind: "possible_omission" });
    }
    const fine = (x?: Verdict) => !!x && (x.state === "ok" || x.state === "unsure") && x.distance <= 0.25;
    for (let i = 1; i < k - 1; i += 1) {
      const x = v[i];
      if (!fine(v[i - 1]) || !fine(v[i + 1])) continue;
      if (x.state === "skipped" && x.heardRatio <= 0.35) found.push({ surah, ayah: ayah - 1, word: x.word, kind: "possible_omission" });
      else if (x.state === "wrong" && x.distance >= 0.6 && x.margin >= 0.5) {
        found.push({ surah, ayah: ayah - 1, word: x.word, kind: "possible_substitution" });
      }
    }
    for (const issue of found) {
      const near = takeMisses.some((m) => m.s === issue.surah && m.a === issue.ayah && Math.abs(m.w - (issue.word ?? -9)) <= 1);
      if (!near && noteStrike(issue)) remember(issue);
    }
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
    env.proxy = true;
    env.wasmPaths = new URL(asset("ort/"), window.location.href).href;
    const model = await loadBytes(asset("model.onnx"), "Model");
    setStatus("Lüğət açılır", "Ayə sözləri hazırlanır…");
    const corpusRes = await fetch(asset("corpus.json"));
    if (!corpusRes.ok) throw new Error("Lüğət açılmadı");
    const corpus: unknown = await corpusRes.json();
    let created: FeedSession;
    try {
      created = await core.createRecognitionSession({
        ort,
        model,
        corpus,
        stayOnSurah: true,
        config: { outsideJumpCost: 24, commitDwell: 4, backfillRatio: 2 },
        onEvent: (msg: unknown) => {
          if (msg && typeof msg === "object" && "type" in msg) onEvent(msg as ProgressMsg);
        },
      });
    } catch {
      env.proxy = false;
      created = await core.createRecognitionSession({
        ort,
        model,
        corpus,
        stayOnSurah: true,
        config: { outsideJumpCost: 24, commitDwell: 4, backfillRatio: 2 },
        onEvent: (msg: unknown) => {
          if (msg && typeof msg === "object" && "type" in msg) onEvent(msg as ProgressMsg);
        },
      });
    }
    session = created;
    if (created.zipformer) {
      await created.zipformer.setStructural({ ayahOrder: true, similarVerse: true, timing: "pause" });
      // The slip head added false vowel flags on clean qari recordings and caught nothing extra.
      created.zipformer.setSlipHead(false);
      created.zipformer.setMode("correction");
    }
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

  let expectedKey = "";
  function expectPage(): void {
    if (retryKey || !session?.zipformer || !words) return;
    const onPage = pages[page - 1]?.[0];
    if (!onPage) return;
    const total = words.ayahs[onPage[0] - 1]?.length ?? onPage[1];
    // Expect this page plus the next ayah, which still turns the page. A window to the end of a long surah made each
    // pause allocate gigabytes in the recitation checks and froze or crashed the tab.
    let end = onPage[1];
    for (const pair of pages[page - 1] ?? []) {
      if (pair[0] === onPage[0] && pair[1] > end) end = pair[1];
    }
    end = Math.min(total, end + 1);
    const key = `${onPage[0]}:${onPage[1]}:${end}`;
    if (expectedKey === key) return;
    expectedKey = key;
    session.zipformer.setExpected({ surah: onPage[0], ayah: onPage[1], ayahEnd: end });
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
    watchLevel(rms);
  }

  let tapGain: ((room: number) => void) | null = null;
  let calUntil = 0;
  let calSum = 0;
  let calN = 0;
  let calDone = false;
  let quietSince = 0;
  function watchLevel(rms: number): void {
    levelFill.style.width = `${Math.min(100, Math.round(rms * 900))}%`;
    const now = performance.now();
    if (!calDone) {
      if (!calUntil) calUntil = now + 2000;
      calSum += rms;
      calN += 1;
      if (now < calUntil) return;
      calDone = true;
      const avg = calSum / Math.max(1, calN);
      if (avg < 0.012) {
        quietOn = true;
        sub.textContent = "Yaxınlaş. Səs zəifdir, telefonu yaxın tutun.";
      } else {
        const room = Math.min(12, Math.max(1, 0.08 / avg));
        try {
          localStorage.setItem("tartil.gain", room.toFixed(2));
        } catch {
          /* ignore quota */
        }
        tapGain?.(room);
        quietOn = false;
        if (!retryKey) {
          liveSub = "Səs kifayətdir. Oxuyun.";
          sub.textContent = liveSub;
        }
      }
    }
    if (rms < 0.008) {
      if (!quietSince) quietSince = now;
      if (!quietOn && now - quietSince > 1500) {
        quietOn = true;
        sub.textContent = "Səs gəlmir. Telefonu yaxınlaşdırın.";
      }
      return;
    }
    quietSince = 0;
    if (quietOn && calDone) {
      quietOn = false;
      sub.textContent = liveSub;
    }
  }

  async function lockWake(): Promise<void> {
    try {
      wake = await navigator.wakeLock?.request("screen") ?? null;
    } catch {
      wake = null;
    }
  }

  function onVisible(): void {
    if (micOn && document.visibilityState === "visible") void lockWake();
  }
  document.addEventListener("visibilitychange", onVisible);

  let voice: AudioContext | null = null;
  let voiceStop: (() => void) | null = null;

  function ayahUrl(surah: number, ayah: number): string {
    const file = `${String(surah).padStart(3, "0")}${String(ayah).padStart(3, "0")}.mp3`;
    return `https://verses.quran.com/Alafasy/mp3/${file}`;
  }

  async function loadAyah(url: string): Promise<ArrayBuffer | null> {
    const cache = "caches" in window ? await caches.open("tartil-audio") : null;
    let hit = cache ? await cache.match(url) : undefined;
    if (!hit) {
      const res = await fetch(url);
      if (!res.ok) return null;
      if (cache) await cache.put(url, res.clone());
      hit = res;
    }
    return hit.arrayBuffer();
  }

  function prefetchPage(n: number): void {
    const seen = new Set<string>();
    for (const pair of pages[n - 1] ?? []) {
      const key = `${pair[0]}:${pair[1]}`;
      if (seen.has(key)) continue;
      seen.add(key);
      void loadAyah(ayahUrl(pair[0], pair[1])).catch(() => undefined);
    }
  }

  function stopClip(): void {
    playGen += 1;
    try {
      voiceStop?.();
    } catch {
      /* already stopped */
    }
    voiceStop = null;
  }

  function playAyah(surah: number, ayah: number): Promise<boolean> {
    stopClip();
    const gen = playGen;
    const url = ayahUrl(surah, ayah);
    const name = AZ[surah - 1] ?? String(surah);
    const step = (lesson.length || drill) && passes > 0 ? ` ${passes}/3 təmiz.` : "";
    setStatus("Dinlə", `Yavaş — ${name} ${ayah}.${step} Sonra təkrar edin.`);
    return new Promise((resolve) => {
      const finish = (ok: boolean) => resolve(gen === playGen && ok);
      void (async () => {
        try {
          const raw = await loadAyah(url);
          if (!raw || gen !== playGen) {
            finish(false);
            return;
          }
          const ctx = voice ?? new AudioContext();
          voice = ctx;
          await ctx.resume();
          const buf = await ctx.decodeAudioData(raw.slice(0));
          if (gen !== playGen) {
            finish(false);
            return;
          }
          const src = ctx.createBufferSource();
          const gain = ctx.createGain();
          gain.gain.value = 1.45;
          src.buffer = buf;
          src.connect(gain);
          gain.connect(ctx.destination);
          src.playbackRate.value = 0.75;
          voiceStop = () => src.stop();
          src.onended = () => finish(true);
          src.start();
        } catch {
          finish(true);
        }
      })();
    });
  }

  async function beginRetry(m: Miss): Promise<void> {
    const keepQueue = queueOn;
    quietStop = true;
    if (micOn || audioStop) await stopMic();
    quietStop = false;
    queueOn = keepQueue;
    passDirty = false;
    const ok = await playAyah(m.s, m.a);
    if (!ok || !alive) return;
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
      try {
        await startMic();
      } catch (err: unknown) {
        micOn = false;
        retryKey = "";
        root.classList.remove("mic", "retry");
        levelBar.classList.remove("on");
        const message = err instanceof Error ? err.message : "Mikrofon açılmadı";
        setStatus("Alınmadı", message);
      }
      return;
    }
    heard = 0;
    takeMisses = [];
    ayahChecked.clear();
    root.classList.remove("mic");
    root.classList.add("retry");
    session?.reset();
    session?.zipformer?.setMode("correction");
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
    if (opening || micOn) return;
    opening = true;
    try {
    await settlingMic;
    if (micOn) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("Mikrofon yoxdur", "Bu brauzer səs yazmır. Chrome və ya Huawei brauzerində HTTPS ilə açın.");
      return;
    }
    const engine = await ensureSession();
    engine.reset();
    engine.zipformer?.setMode("correction");
    shown.clear();
    freshKey = "";
    clearTimers();
    heard = 0;
    takeMisses = [];
    ayahChecked.clear();
    ayahLock = "";
    lockDirty = false;
    rearm = false;
    sumBox.hidden = true;
    expectedSurah = 0;
    expectedKey = "";
    const retrying = Boolean(retryKey);
    if (retrying) {
      const [s, a] = retryKey.split(":").map(Number);
      engine.zipformer?.setExpected({ surah: s, ayah: a, ayahEnd: a });
      expectedKey = `${s}:${a}:${a}`;
      expectedSurah = s;
    } else {
      const here = pages[page - 1]?.[0]?.[0];
      if (here) expectPage();
    }
    micOn = true;
    seqS = 0;
    seqA = 0;
    seqDone = false;
    seqHold = false;
    voiceChunks.length = 0;
    voiceSamples = 0;
    captureOn = true;
    calUntil = 0;
    calSum = 0;
    calN = 0;
    calDone = false;
    quietSince = 0;
    quietOn = false;
    root.classList.toggle("mic", !retrying);
    root.classList.toggle("retry", retrying);
    micBtn.setAttribute("aria-pressed", "true");
    levelBar.classList.add("on");
    void lockWake();
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
    const micId = micPick.value;
    const audio = {
      channelCount: { ideal: 1 },
      sampleRate: { ideal: 16000 },
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
      googEchoCancellation: false,
      googEchoCancellation2: false,
      googDAEchoCancellation: false,
      googNoiseSuppression: false,
      googNoiseSuppression2: false,
      googAutoGainControl: false,
      googAutoGainControl2: false,
      googHighpassFilter: false,
      googTypingNoiseDetection: false,
      ...(micId ? { deviceId: { exact: micId } } : {}),
    } as MediaTrackConstraints;
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio });
    } catch (err) {
      if (!micId) throw err;
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { ...audio, deviceId: undefined } as MediaTrackConstraints,
      });
    }
    if (!micOn) {
      stream.getTracks().forEach((t) => t.stop());
      return;
    }
    const track = stream.getAudioTracks()[0];
    if (track) {
      try {
        await track.applyConstraints({
          channelCount: 1,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        });
      } catch {
        /* the browser keeps its own defaults */
      }
    }
    let ctx: AudioContext;
    try {
      ctx = new AudioContext({ sampleRate: 16000, latencyHint: "interactive" });
    } catch {
      ctx = new AudioContext({ latencyHint: "interactive" });
    }
    await ctx.resume();
    await new Promise((resolve) => window.requestAnimationFrame(() => resolve(undefined)));
    if (!micOn) {
      stream.getTracks().forEach((t) => t.stop());
      void ctx.close();
      return;
    }
    const source = ctx.createMediaStreamSource(stream);
    const gain = ctx.createGain();
    gain.gain.value = 0;
    let pending = new Float32Array(0);
    let feeding = false;
    let feedDone: (() => void) | null = null;
    const chunkSize = 7680;
    const pump = () => {
      if (!micOn || feeding || pending.length < chunkSize) {
        if (!feeding && !micOn) feedDone?.();
        return;
      }
      const slice = pending.slice(0, chunkSize);
      pending = pending.length > chunkSize * 2 ? pending.slice(pending.length - chunkSize) : pending.slice(chunkSize);
      feeding = true;
      void engine.feed(slice).catch(() => undefined).then(() => {
        feeding = false;
        if (!micOn) {
          feedDone?.();
          return;
        }
        window.setTimeout(pump, 20);
      });
    };
    const pushPcm = (next: Float32Array) => {
      if (!micOn || !next.length) return;
      if (captureOn && voiceSamples < 16000 * 25) {
        voiceChunks.push(next.slice());
        voiceSamples += next.length;
      }
      if (pending.length > chunkSize * 2) pending = pending.slice(pending.length - chunkSize * 2);
      const merged = new Float32Array(pending.length + next.length);
      merged.set(pending, 0);
      merged.set(next, pending.length);
      pending = merged;
      if (!feeding) pump();
    };
    let proc: ScriptProcessorNode | null = null;
    let tap: AudioWorkletNode | null = null;
    try {
      await ctx.audioWorklet.addModule(asset("mic-worklet.js"));
      if (!micOn) {
        stream.getTracks().forEach((t) => t.stop());
        void ctx.close();
        return;
      }
      tap = new AudioWorkletNode(ctx, "mic-tap");
      tapGain = (room) => tap?.port.postMessage({ room });
      const savedGain = Number(localStorage.getItem("tartil.gain") || "1");
      if (savedGain > 1) tap.port.postMessage({ room: savedGain });
      tap.port.onmessage = (ev: MessageEvent<Float32Array | { rms?: number; pcm?: Float32Array }>) => {
        if (!micOn) return;
        const data = ev.data;
        const chunk = data instanceof Float32Array ? data : data.pcm;
        if (!chunk) return;
        if (data instanceof Float32Array) setLevel(chunk);
        else if (typeof data.rms === "number") watchLevel(data.rms);
        pushPcm(chunk);
      };
      source.connect(tap);
      tap.connect(gain);
      void listMics();
    } catch {
      proc = ctx.createScriptProcessor(4096, 1, 1);
      let fbEnv = 0.0002;
      let fbGain = 1;
      let fbX1 = 0;
      let fbY1 = 0;
      const hp = Math.exp((-2 * Math.PI * 80) / 16000);
      proc.onaudioprocess = (ev) => {
        if (!micOn) return;
        const raw = ev.inputBuffer.getChannelData(0);
        setLevel(raw);
        const pcm = resample(raw, ctx.sampleRate);
        const shaped = new Float32Array(pcm.length);
        for (let i = 0; i < pcm.length; i += 1) {
          const y = hp * (fbY1 + pcm[i] - fbX1);
          fbX1 = pcm[i];
          fbY1 = y;
          fbEnv = fbEnv * 0.9992 + y * y * 0.0008;
          const rms = Math.sqrt(fbEnv);
          const target = rms > 0.0011 ? Math.min(18, 0.12 / rms) : 1;
          const rate = target > fbGain ? 0.012 : 0.00035;
          fbGain += (target - fbGain) * rate;
          shaped[i] = Math.tanh(y * fbGain);
        }
        pushPcm(shaped);
      };
      source.connect(proc);
      proc.connect(gain);
    }
    gain.connect(ctx.destination);
    audioStop = async () => {
      if (proc) proc.onaudioprocess = null;
      try {
        proc?.disconnect();
        tap?.disconnect();
        source.disconnect();
        gain.disconnect();
      } catch {
        /* already stopped */
      }
      stream.getTracks().forEach((t) => t.stop());
      void ctx.close();
      await Promise.race([
        new Promise<void>((resolve) => {
          if (!feeding) resolve();
          else feedDone = resolve;
        }),
        new Promise((resolve) => window.setTimeout(resolve, 700)),
      ]);
      try {
        await Promise.race([
          (async () => {
            const phase = engine.zipformer?.correction?.state?.phase;
            if (phase && phase !== "idle") engine.zipformer?.correct("review_later");
            const flushed = await engine.stop();
            if (Array.isArray(flushed)) {
              for (const msg of flushed) {
                if (msg && typeof msg === "object" && "type" in msg) onEvent(msg as ProgressMsg);
              }
            }
            engine.reset();
          })(),
          new Promise((resolve) => window.setTimeout(resolve, 900)),
        ]);
      } catch {
        /* flush is best-effort */
      }
    };
    } finally {
      opening = false;
    }
  }

  async function stopMic(): Promise<void> {
    stopClip();
    if (!micOn && !audioStop) return;
    micOn = false;
    micBtn.disabled = false;
    root.classList.remove("mic", "retry");
    micBtn.setAttribute("aria-pressed", "false");
    levelBar.classList.remove("on");
    levelFill.style.width = "0";
    clearTimers();
    shown.clear();
    freshKey = "";
    expectedSurah = 0;
    const fixed = retryClose;
    snapshotVoice();
    captureOn = false;
    retryClose = false;
    retryKey = "";
    ayahLock = "";
    lockDirty = false;
    rearm = false;
    const nHeard = heard;
    const found = takeMisses.slice();
    heard = 0;
    takeMisses = [];
    ayahChecked.clear();
    setProgress(null);
    void wake?.release();
    wake = null;
    if (!quietStop) {
      lesson = [];
      lessonAt = 0;
      drill = false;
      passes = 0;
      root.querySelector(".t-lesson")?.classList.remove("on");
      if (nHeard || found.length) showSummary(fixed, nHeard, found);
      else setStatus("Oxu", "Mikrofon bağlıdır. Ayələr açıqdır.");
    }
    render();
    const stop = audioStop;
    audioStop = null;
    if (!stop) return;
    settlingMic = Promise.race([
      stop().then(() => undefined).catch(() => undefined),
      new Promise<void>((resolve) => window.setTimeout(resolve, 1500)),
    ]);
    await settlingMic;
  }

  micBtn.addEventListener("click", () => {
    if (micOn || audioStop) {
      void stopMic();
      return;
    }
    if (loadingModel) return;
    void startMic().catch((err: unknown) => {
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
  pageInput.addEventListener("change", () => {
    const n = Number(pageInput.value.trim());
    if (!pageInput.value.trim() || !Number.isFinite(n)) {
      pageInput.value = String(page);
      return;
    }
    go(n);
  });
  surahSel.addEventListener("change", () => {
    const n = Number(surahSel.value);
    const target = surahPage.get(n);
    if (target) {
      pickedSurah = n;
      go(target);
    }
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
  function onHash(): void {
    if (!hashMode) return;
    const n = Number((location.hash || "").replace("#", ""));
    if (n && Number.isFinite(n)) {
      if (clampPage(n) !== page) go(n);
      else if (location.hash !== `#${page}`) history.replaceState(null, "", `#${page}`);
    } else history.replaceState(null, "", `#${page}`);
  }
  window.addEventListener("hashchange", onHash);
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
  let fromHash = 0;
  if (hashMode) {
    fromHash = Number((location.hash || "").replace("#", ""));
    if (fromHash) start = fromHash;
  }
  let savedPage = 0;
  let readPage = 0;
  try {
    savedPage = Number(localStorage.getItem("tartil.page") || "");
    readPage = Number(localStorage.getItem("tartil.read") || "") || savedPage;
    if (!localStorage.getItem("tartil.read") && savedPage) localStorage.setItem("tartil.read", String(savedPage));
    if (!hashMode && savedPage) start = savedPage;
    if (hashMode && !fromHash && savedPage) start = savedPage;
  } catch {
    /* ignore */
  }
  const explicit = hashMode && fromHash > 0 && fromHash !== savedPage;
  if (!explicit && misses.length) {
    const first = [...misses].sort((a, b) => a.s - b.s || a.a - b.a || a.w - b.w)[0];
    const errPage = first ? pageOf.get(`${first.s}:${first.a}`) : 0;
    if (errPage) start = errPage;
  }
  page = clampPage(start);
  function showBack(): void {
    const read = Number(localStorage.getItem("tartil.read") || "") || readPage;
    backBtn.hidden = !read || read === page;
  }
  backBtn.addEventListener("click", () => {
    const read = Number(localStorage.getItem("tartil.read") || "") || readPage;
    if (read) go(read);
  });
  void render();
  setStatus("Oxu", "Mikrofonu açın: ayələr gizlənir, model təsdiqləyəndə açılır.");
  const onResize = () => fit();
  window.addEventListener("resize", onResize);
  const barWatch = typeof ResizeObserver === "function" ? new ResizeObserver(() => fit()) : null;
  const barEl = root.querySelector<HTMLElement>(".t-bar");
  if (barWatch && barEl) barWatch.observe(barEl);
  if ("serviceWorker" in navigator) {
    const sw = asset("sw.js");
    void navigator.serviceWorker.register(sw).catch(() => undefined);
  }

  return () => {
    alive = false;
    window.removeEventListener("keydown", onKey);
    window.removeEventListener("hashchange", onHash);
    window.removeEventListener("wheel", markUserScroll);
    window.removeEventListener("touchmove", markUserScroll);
    window.removeEventListener("keydown", onScrollKey);
    window.clearInterval(followTimer);
    window.removeEventListener("resize", onResize);
    barWatch?.disconnect();
    document.removeEventListener("visibilitychange", onVisible);
    clearTimers();
    void wake?.release();
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
