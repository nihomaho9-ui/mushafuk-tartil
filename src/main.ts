import "./tartil.css";

const DELAY_MIN = 1200;
const DELAY_STEP = 100;
const DELAY_CAP = 800;
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
};
type ProgressMsg = {
  type: string;
  surah?: number;
  ayah?: number;
  word_index?: number;
  matched_indices?: number[];
};

const BASE = import.meta.env.BASE_URL || "/";

function asset(path: string): string {
  return BASE + path.replace(/^\//, "");
}

function arNum(n: number): string {
  return String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)] ?? d);
}

function clampPage(n: number): number {
  if (!Number.isFinite(n)) return 1;
  return Math.min(604, Math.max(1, Math.round(n)));
}

export function mountTartil(root: HTMLElement, opts?: { hash?: boolean }): () => void {
  const hashMode = opts?.hash === true;
  let words: WordsFile | null = null;
  let pages: number[][][] = [];
  const pageOf = new Map<string, number>();
  const surahPage = new Map<number, number>();
  let page = 1;
  let alive = true;
  let micOn = false;
  let loadingModel = false;
  let session: FeedSession | null = null;
  let audioStop: (() => Promise<void>) | null = null;
  const shown = new Set<string>();
  const timers = new Map<string, number>();
  let freshKey = "";

  root.className = "tartil";
  root.innerHTML = `
    <header class="t-top">
      <div class="t-brand"><b>TARTIL</b><span>oxu izləmə</span></div>
      <select class="t-surah" aria-label="Surə"></select>
      <div class="t-pager">
        <button type="button" data-dir="-1" aria-label="Əvvəlki səhifə">‹</button>
        <input class="t-pageno" inputmode="numeric" aria-label="Səhifə" />
        <button type="button" data-dir="1" aria-label="Növbəti səhifə">›</button>
      </div>
    </header>
    <main class="t-page" dir="rtl"><p class="t-ayahs">Quran açılır…</p></main>
    <p class="t-foot">Tanıma telefonun özündə işləyir. Model və lüğət NPL-1.2 — yalnız qeyri-kommersiya.</p>
    <div class="t-bar">
      <button type="button" class="t-mic" aria-pressed="false" aria-label="Mikrofon">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2z"/></svg>
      </button>
      <div class="t-status">
        <b class="t-st">Oxu</b>
        <span class="t-sub">Mikrofonu açın: ayələr gizlənir, oxuduqca 1–2 saniyə sonra görünür.</span>
        <div class="t-load" aria-hidden="true"><i></i></div>
      </div>
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
  const sheet = need<HTMLElement>(".t-ayahs");
  const pageEl = need<HTMLElement>(".t-page");
  const micBtn = need<HTMLButtonElement>(".t-mic");
  const st = need<HTMLElement>(".t-st");
  const sub = need<HTMLElement>(".t-sub");
  const loadBar = need<HTMLElement>(".t-load");
  const loadFill = need<HTMLElement>(".t-load i");

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

  function render(): void {
    if (!words) return;
    const ayahs = pages[page - 1] ?? [];
    sheet.replaceChildren();
    let last = 0;
    for (const pair of ayahs) {
      const surah = pair[0] ?? 0;
      const ayah = pair[1] ?? 0;
      if (!surah || !ayah) continue;
      if (surah !== last) {
        const head = document.createElement("span");
        head.className = "t-sura";
        const mark = document.createElement("i");
        mark.textContent = `سورة ${words.names[surah - 1] ?? ""}`;
        head.appendChild(mark);
        sheet.appendChild(head);
        if (surah !== 1 && surah !== 9 && ayah === 1) {
          const b = document.createElement("span");
          b.className = "bism";
          b.dataset.k = `bism:${surah}`;
          b.textContent = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ";
          sheet.appendChild(b);
        }
        last = surah;
      }
      const list = wordList(surah, ayah);
      list.forEach((text, i) => {
        const span = document.createElement("span");
        span.className = "w";
        span.dataset.k = `${surah}:${ayah}:${i}`;
        span.textContent = text;
        sheet.appendChild(span);
        sheet.appendChild(document.createTextNode(" "));
      });
      const num = document.createElement("span");
      num.className = "num";
      num.dataset.k = `num:${surah}:${ayah}`;
      num.textContent = arNum(ayah);
      sheet.appendChild(num);
      sheet.appendChild(document.createTextNode(" "));
    }
    if (micOn) applyShown();
    pageInput.value = String(page);
    const first = ayahs[0];
    if (first) surahSel.value = String(first[0]);
    if (hashMode) history.replaceState(null, "", `#${page}`);
    try {
      localStorage.setItem("tartil.page", String(page));
    } catch {
      /* ignore quota */
    }
  }

  function go(n: number): void {
    page = clampPage(n);
    render();
    pageEl.scrollIntoView({ block: "start", behavior: "smooth" });
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
        render();
        return;
      }
      const total = wordList(surah, ayah).length;
      const idx = Number(parts[2]);
      if (idx === total - 1) shown.add(`num:${surah}:${ayah}`);
      if (ayah === 1) shown.add(`bism:${surah}`);
    }
    applyShown();
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
    if (fresh.length) {
      const name = AZ[surah - 1] ?? String(surah);
      setStatus("Dinləyirəm", `${name} ${ayah} — sözlər bir-iki saniyə sonra açılacaq`);
    }
  }

  function onEvent(msg: ProgressMsg): void {
    if (!micOn || msg.type !== "word_progress") return;
    const surah = msg.surah;
    const ayah = msg.ayah;
    if (!surah || !ayah) return;
    const upto = typeof msg.word_index === "number" ? msg.word_index : -1;
    const idxs = new Set<number>(msg.matched_indices ?? []);
    for (let i = 0; i <= upto; i += 1) idxs.add(i);
    if (!idxs.size) return;
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
    micOn = true;
    root.classList.add("mic");
    micBtn.setAttribute("aria-pressed", "true");
    applyShown();
    setStatus("Dinləyirəm", "Ayələr gizləndi. Oxuduqca, bir-iki saniyə gecikmə ilə açılacaq.");
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
        await engine.stop();
      } catch {
        /* flush is best-effort */
      }
      engine.reset();
    };
  }

  async function stopMic(): Promise<void> {
    micOn = false;
    root.classList.remove("mic");
    micBtn.setAttribute("aria-pressed", "false");
    clearTimers();
    shown.clear();
    freshKey = "";
    const stop = audioStop;
    audioStop = null;
    if (stop) await stop();
    setProgress(null);
    setStatus("Oxu", "Mikrofon bağlıdır. Ayələr açıqdır.");
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
        root.classList.remove("mic");
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

  void (async () => {
    const [wordsRes, pagesRes] = await Promise.all([fetch(asset("words.json")), fetch(asset("pages.json"))]);
    if (!wordsRes.ok || !pagesRes.ok) {
      setStatus("Mətn açılmadı", "Quran faylları yüklənmədi.");
      return;
    }
    words = (await wordsRes.json()) as WordsFile;
    const parsed = (await pagesRes.json()) as PagesFile;
    pages = parsed.pages;
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
    render();
    setStatus("Oxu", "Mikrofonu açın: ayələr gizlənir, oxuduqca 1–2 saniyə sonra görünür.");
  })();

  return () => {
    alive = false;
    window.removeEventListener("keydown", onKey);
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
