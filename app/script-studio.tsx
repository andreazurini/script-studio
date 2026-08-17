"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createScript as createScriptAction, updateScript as updateScriptAction } from "@/app/actions/scripts";

type Page = "library" | "editor" | "connections";
type Format = "Reel" | "Video lungo" | "Lezione";
type Status = "Bozza" | "Da rivedere" | "Pronto";
type Script = {
  id: string;
  title: string;
  body: string;
  format: Format;
  status: Status;
  source: string;
  updatedAt: string;
  tags: string[];
};

const navItems: Array<{ page: Page; icon: string; label: string }> = [
  { page: "library", icon: "▦", label: "Libreria" },
  { page: "editor", icon: "✎", label: "Editor" },
  { page: "connections", icon: "⌁", label: "Connessioni" },
];

function cue(line: string) {
  return /^\[[^\]]+\]$/.test(line.trim());
}

function words(body: string) {
  return body.split(/\s+/).filter((word) => word && !/^\[[^\]]+\]$/.test(word)).length;
}

function duration(body: string) {
  const seconds = Math.max(1, Math.round((words(body) / 135) * 60));
  return seconds < 60 ? `${seconds} sec` : `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")} min`;
}

function shortPreview(body: string) {
  return body.split("\n").filter((line) => line.trim() && !cue(line)).slice(0, 3).join(" ");
}

function statusClass(status: Status) {
  if (status === "Pronto") return "ready";
  if (status === "Da rivedere") return "review";
  return "draft";
}

function formatForVoice(body: string) {
  return body
    .split("\n")
    .flatMap((line) => {
      if (!line.trim() || cue(line)) return [line];
      return line.replace(/([.!?])\s+/g, "$1\n").split("\n").map((part) => part.trim()).filter(Boolean);
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");
}

function formatUpdated(iso: string) {
  return new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" }).format(new Date(iso));
}

export function ScriptStudio({ initialScripts }: { initialScripts: Script[] }) {
  const [scripts, setScripts] = useState<Script[]>(initialScripts);
  const [page, setPage] = useState<Page>("library");
  const [activeId, setActiveId] = useState(initialScripts[0]?.id ?? "");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"Tutti" | Format>("Tutti");
  const [teleprompter, setTeleprompter] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(118);
  const [fontSize, setFontSize] = useState(58);
  const [mirrored, setMirrored] = useState(false);
  const [showCues, setShowCues] = useState(true);
  const [progress, setProgress] = useState(0);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<"user" | "environment">("user");
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordingUrl, setRecordingUrl] = useState("");
  const [recordingMime, setRecordingMime] = useState("video/webm");
  const [countdown, setCountdown] = useState<number | null>(null);
  const [portraitView, setPortraitView] = useState(true);
  const [preferencesReady, setPreferencesReady] = useState(false);
  const [toast, setToast] = useState("");
  const [installEvent, setInstallEvent] = useState<Event | null>(null);
  const readerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunks = useRef<Blob[]>([]);
  const recordingStartedAt = useRef(0);
  const recordingUrlRef = useRef("");
  const countdownRun = useRef(0);
  const frameRef = useRef<number | null>(null);
  const lastTime = useRef<number | null>(null);
  const wakeLock = useRef<{ release: () => Promise<void> } | null>(null);

  const active = scripts.find((script) => script.id === activeId) ?? scripts[0];
  const filtered = useMemo(() => {
    const query = search.toLocaleLowerCase("it").trim();
    return scripts.filter((script) => {
      const formatMatch = filter === "Tutti" || script.format === filter;
      const queryMatch = !query || [script.title, script.source, ...script.tags].join(" ").toLocaleLowerCase("it").includes(query);
      return formatMatch && queryMatch;
    });
  }, [filter, scripts, search]);

  useEffect(() => {
    const savedPreferences = localStorage.getItem("script-studio-teleprompter-v1");
    const preferenceTimer = window.setTimeout(() => {
      if (savedPreferences) {
        try {
          const preferences = JSON.parse(savedPreferences) as { fontSize?: number; speed?: number; showCues?: boolean; mirrored?: boolean };
          if (typeof preferences.fontSize === "number") setFontSize(Math.min(112, Math.max(30, preferences.fontSize)));
          if (typeof preferences.speed === "number") setSpeed(Math.min(220, Math.max(55, preferences.speed)));
          if (typeof preferences.showCues === "boolean") setShowCues(preferences.showCues);
          if (typeof preferences.mirrored === "boolean") setMirrored(preferences.mirrored);
        } catch { /* Ignore malformed preferences. */ }
      }
      setPreferencesReady(true);
    }, 0);
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    const onInstall = (event: Event) => { event.preventDefault(); setInstallEvent(event); };
    window.addEventListener("beforeinstallprompt", onInstall);
    return () => {
      window.clearTimeout(preferenceTimer);
      window.removeEventListener("beforeinstallprompt", onInstall);
    };
  }, []);

  useEffect(() => {
    if (!preferencesReady) return;
    localStorage.setItem("script-studio-teleprompter-v1", JSON.stringify({ fontSize, speed, showCues, mirrored }));
  }, [fontSize, mirrored, preferencesReady, showCues, speed]);
  useEffect(() => { window.scrollTo(0, 0); }, [page]);
  useEffect(() => {
    const query = window.matchMedia("(orientation: portrait)");
    const update = () => setPortraitView(query.matches);
    update();
    query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, []);
  useEffect(() => {
    if (!teleprompter) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [teleprompter]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!recording) return;
    const timer = window.setInterval(() => {
      setRecordingSeconds(Math.max(0, Math.floor((Date.now() - recordingStartedAt.current) / 1000)));
    }, 250);
    return () => window.clearInterval(timer);
  }, [recording]);

  useEffect(() => () => {
    countdownRun.current += 1;
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.ondataavailable = null;
      recorder.onstop = null;
      recorder.stop();
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    if (recordingUrlRef.current) URL.revokeObjectURL(recordingUrlRef.current);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!teleprompter) return;
      if (event.code === "Space") { event.preventDefault(); setPlaying((value) => !value); }
      if (event.key === "ArrowUp") setSpeed((value) => Math.min(220, value + 5));
      if (event.key === "ArrowDown") setSpeed((value) => Math.max(55, value - 5));
      if (event.key.toLowerCase() === "m") setMirrored((value) => !value);
      if (event.key.toLowerCase() === "f") document.documentElement.requestFullscreen?.().catch(() => undefined);
      if (event.key === "Escape") {
        if (recording) {
          setPlaying(false);
          const recorder = recorderRef.current;
          if (recorder && recorder.state !== "inactive") recorder.stop();
          setToast("Registrazione fermata. Salva il video prima di uscire.");
          return;
        }
        countdownRun.current += 1;
        setCountdown(null);
        setPlaying(false);
        setTeleprompter(false);
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setCameraOn(false);
        if (document.fullscreenElement) document.exitFullscreen?.().catch(() => undefined);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [recording, teleprompter]);

  useEffect(() => {
    const onSearchShortcut = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.code !== "KeyK") return;
      if (event.repeat) return;
      if (teleprompter) return; // don't hijack focus out of the modal
      event.preventDefault();
      setPage("library");
      window.setTimeout(() => searchInputRef.current?.focus(), 0);
    };
    window.addEventListener("keydown", onSearchShortcut);
    return () => window.removeEventListener("keydown", onSearchShortcut);
  }, [teleprompter]);

  useEffect(() => {
    const nav = navigator as Navigator & { wakeLock?: { request: (type: "screen") => Promise<{ release: () => Promise<void> }> } };
    if (playing && teleprompter && nav.wakeLock) {
      nav.wakeLock.request("screen").then((lock) => { wakeLock.current = lock; }).catch(() => undefined);
    } else if (wakeLock.current) {
      wakeLock.current.release().catch(() => undefined);
      wakeLock.current = null;
    }
    return () => { wakeLock.current?.release().catch(() => undefined); wakeLock.current = null; };
  }, [playing, teleprompter]);

  useEffect(() => {
    const reader = readerRef.current;
    if (!playing || !teleprompter || !reader) {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
      lastTime.current = null;
      return;
    }
    const step = (time: number) => {
      if (lastTime.current === null) lastTime.current = time;
      const delta = Math.min(50, time - lastTime.current);
      lastTime.current = time;
      reader.scrollLeft = 0;
      reader.scrollTop += (delta / 1000) * speed * 0.34;
      const available = Math.max(1, reader.scrollHeight - reader.clientHeight);
      setProgress(Math.min(100, (reader.scrollTop / available) * 100));
      if (reader.scrollTop >= available - 1) { setPlaying(false); return; }
      frameRef.current = requestAnimationFrame(step);
    };
    frameRef.current = requestAnimationFrame(step);
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, [playing, speed, teleprompter]);

  function updateActive(patch: Partial<Script>) {
    const current = active;
    const optimisticUpdatedAt = new Date().toISOString();
    setScripts((items) => items.map((script) => script.id === current.id ? { ...script, ...patch, updatedAt: optimisticUpdatedAt } : script));
    updateScriptAction(current.id, patch)
      .then((row) => {
        setScripts((items) => items.map((script) => script.id === row.id ? { ...script, updatedAt: new Date(row.updatedAt).toISOString() } : script));
      })
      .catch(() => setToast("Salvataggio non riuscito. Riprova."));
  }

  function openEditor(script: Script) { setActiveId(script.id); setPage("editor"); }
  function openTeleprompter(script: Script) {
    setActiveId(script.id); setProgress(0); setPlaying(false); setTeleprompter(true);
    window.setTimeout(() => {
      if (!readerRef.current) return;
      readerRef.current.scrollTop = 0;
      readerRef.current.scrollLeft = 0;
    }, 0);
  }
  function closeTeleprompter() {
    if (recording) {
      stopRecording();
      setToast("Registrazione fermata. Salva il video prima di uscire.");
      return;
    }
    countdownRun.current += 1;
    setCountdown(null);
    setPlaying(false); setTeleprompter(false);
    stopCamera();
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => undefined);
  }
  function createScript() {
    const id = crypto.randomUUID();
    const draft = { id, title: "Nuovo copione", body: "Scrivi qui la prima frase.\n\n[PAUSA BREVE]\n\nContinua il tuo copione…", format: "Reel" as Format, status: "Bozza" as Status, source: "Scritto in Script Studio", tags: [] as string[] };
    setScripts((items) => [{ ...draft, updatedAt: new Date().toISOString() }, ...items]);
    setActiveId(id);
    setPage("editor");
    createScriptAction(draft)
      .then((row) => {
        setScripts((items) => items.map((item) => item.id === row.id ? { ...item, updatedAt: new Date(row.updatedAt).toISOString() } : item));
      })
      .catch(() => {
        setScripts((items) => items.filter((item) => item.id !== id));
        setToast("Creazione non riuscita. Riprova.");
      });
  }
  async function installApp() {
    if (!installEvent) { setToast("Dal menu del browser scegli “Installa app” o “Aggiungi alla schermata Home”."); return; }
    await (installEvent as Event & { prompt: () => Promise<void> }).prompt();
    setInstallEvent(null);
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
  }

  async function startCamera(facing: "user" | "environment" = cameraFacing) {
    if (!navigator.mediaDevices?.getUserMedia) {
      setToast("Questo browser non consente l’accesso diretto a fotocamera e microfono.");
      return null;
    }
    try {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      const portrait = active.format === "Reel";
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: {
          facingMode: { ideal: facing },
          width: { ideal: portrait ? 1080 : 1920 },
          height: { ideal: portrait ? 1920 : 1080 },
          aspectRatio: { ideal: portrait ? 9 / 16 : 16 / 9 },
        },
      });
      streamRef.current = stream;
      setCameraFacing(facing);
      setCameraOn(true);
      window.setTimeout(() => {
        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => undefined);
      }, 0);
      return stream;
    } catch (error) {
      const name = error instanceof DOMException ? error.name : "";
      if (name === "NotAllowedError") setToast("Autorizza fotocamera e microfono per registrare il video.");
      else if (name === "NotFoundError") setToast("Non trovo una fotocamera o un microfono disponibili.");
      else setToast("Non riesco ad avviare la videocamera su questo dispositivo.");
      stopCamera();
      return null;
    }
  }

  function clearRecording() {
    if (recordingUrlRef.current) URL.revokeObjectURL(recordingUrlRef.current);
    recordingUrlRef.current = "";
    setRecordingUrl("");
    setRecordingSeconds(0);
    recordingChunks.current = [];
  }

  async function beginRecording() {
    if (recording || countdown !== null) return;
    const stream = streamRef.current ?? await startCamera();
    if (!stream) return;
    if (typeof MediaRecorder === "undefined") {
      setToast("La registrazione non è supportata da questo browser. Puoi comunque usare il teleprompter.");
      return;
    }
    clearRecording();
    const run = ++countdownRun.current;
    for (let value = 3; value > 0; value -= 1) {
      if (run !== countdownRun.current) return;
      setCountdown(value);
      await new Promise<void>((resolve) => window.setTimeout(resolve, 1000));
    }
    if (run !== countdownRun.current || !streamRef.current) return;
    setCountdown(null);
    try {
      const candidates = [
        "video/mp4;codecs=h264,aac",
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm",
      ];
      const mimeType = candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate));
      const recorder = new MediaRecorder(streamRef.current, mimeType ? { mimeType, videoBitsPerSecond: 6_000_000 } : undefined);
      recordingChunks.current = [];
      recorder.ondataavailable = (event) => { if (event.data.size) recordingChunks.current.push(event.data); };
      recorder.onstop = () => {
        if (!recordingChunks.current.length) {
          setToast("La registrazione non contiene dati utilizzabili. Riprova.");
          setRecording(false);
          return;
        }
        const finalMime = recorder.mimeType || mimeType || "video/webm";
        const blob = new Blob(recordingChunks.current, { type: finalMime });
        const url = URL.createObjectURL(blob);
        recordingUrlRef.current = url;
        setRecordingMime(finalMime);
        setRecordingUrl(url);
        setRecording(false);
        setPlaying(false);
      };
      recorder.onerror = () => {
        setRecording(false);
        setPlaying(false);
        setToast("La registrazione si è interrotta. Riprova.");
      };
      recorderRef.current = recorder;
      recordingStartedAt.current = Date.now();
      setRecordingSeconds(0);
      recorder.start(1000);
      setRecording(true);
      setPlaying(true);
    } catch {
      setRecording(false);
      setPlaying(false);
      setToast("Questo dispositivo non riesce ad avviare la registrazione video.");
    }
  }

  function stopRecording() {
    countdownRun.current += 1;
    setCountdown(null);
    setPlaying(false);
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
    else setRecording(false);
  }

  async function switchCamera() {
    if (recording || countdown !== null) return;
    await startCamera(cameraFacing === "user" ? "environment" : "user");
  }

  function recordingClock(seconds: number) {
    return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  }

  function recordingFilename() {
    const safeTitle = active.title.toLocaleLowerCase("it").replace(/[^a-z0-9àèéìòù]+/gi, "-").replace(/^-|-$/g, "");
    return `${safeTitle || "script-studio"}-${new Date().toISOString().slice(0, 10)}.${recordingMime.includes("mp4") ? "mp4" : "webm"}`;
  }

  if (!active) {
    return (
      <main className="app-shell">
        <section className="workspace">
          <div className="page library-page">
            <p className="empty">Nessuno script ancora.</p>
            <button className="primary" onClick={createScript}><span>＋</span><b>Nuovo script</b></button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <button className="brand" onClick={() => setPage("library")} aria-label="Script Studio, vai alla libreria"><span className="brand-mark">S</span><span>Script<strong>Studio</strong></span></button>
        <nav className="side-nav" aria-label="Navigazione principale">
          {navItems.map((item) => <button key={item.page} className={page === item.page ? "active" : ""} aria-current={page === item.page ? "page" : undefined} onClick={() => setPage(item.page)}><i>{item.icon}</i><span>{item.label}</span></button>)}
        </nav>
        <div className="sidebar-bottom">
          <article className="mcp-mini"><header><i/><strong>MCP</strong><small>DESIGN TARGET</small></header><p>Claude e altri agenti possono consegnare nuove bozze.</p><button onClick={() => setPage("connections")}>Apri ingressi <span>→</span></button></article>
          <button className="install" onClick={installApp}>↓ <span>Installa l’app</span></button>
          <div className="profile"><span>AZ</span><div><strong>Andrea Zurini</strong><small>Workspace personale</small></div><i>⚙</i></div>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <button className="mobile-logo" onClick={() => setPage("library")}>S</button>
          <div><small>SCRIPT STUDIO</small><h1>{page === "library" ? "La tua voce, pronta." : page === "editor" ? "Editor di recitazione" : "Connessioni e automazioni"}</h1></div>
          <div className="top-actions">
            {page === "library" && <label className="search"><span>⌕</span><input ref={searchInputRef} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cerca uno script…"/><kbd>⌘K</kbd></label>}
            <button className="primary" onClick={createScript}><span>＋</span><b>Nuovo script</b></button>
          </div>
        </header>

        {page === "library" && <div className="page library-page">
          <section className="hero-grid">
            <article className="featured">
              <header><span><i/> PRONTO DA REGISTRARE</span><button>•••</button></header>
              <div className="featured-copy"><small>{active.format}</small><h2>{active.title}</h2><p>{shortPreview(active.body)}</p><div><span>◷ {duration(active.body)}</span><span>{words(active.body)} parole</span><span>135 parole/min</span></div></div>
              <footer><button className="play-main" onClick={() => openTeleprompter(active)}><i>▶</i>Apri teleprompter</button><button className="secondary dark" onClick={() => openEditor(active)}>✎ Modifica</button></footer>
            </article>
            <aside className="inbox-card">
              <header><div><small>▣ IN ARRIVO VIA MCP</small><h3>Una bozza aspetta te</h3></div><b>1</b></header>
              <div className="incoming"><span className="claude">C</span><div><small>CLAUDE · 4 MIN FA</small><strong>Perché l’AI locale cambia il vantaggio delle PMI</strong><p>Reel · 184 parole · Richiesta revisione</p></div></div>
              <div className="route"><span>Claude</span><i>→</i><span>Bozza</span><i>→</i><strong>Revisione umana</strong></div>
              <button className="review-button" onClick={() => setPage("connections")}>Rivedi la bozza <span>›</span></button>
            </aside>
          </section>

          <section className="archive">
            <header className="section-head"><div><small>ARCHIVIO</small><h2>I tuoi script</h2></div><div className="filters">{(["Tutti", "Reel", "Video lungo", "Lezione"] as const).map((item) => <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>{item}{item === "Tutti" && <span>{scripts.length}</span>}</button>)}</div></header>
            <div className="script-list">
              <div className="list-head"><span>Copione</span><span>Stato</span><span>Durata</span><span>Aggiornato</span><span/></div>
              {filtered.map((script) => <button className={`script-row ${activeId === script.id ? "selected" : ""}`} key={script.id} onClick={() => setActiveId(script.id)} onDoubleClick={() => openEditor(script)}>
                <span className="script-name"><i className={script.format === "Lezione" ? "lesson" : ""}>{script.format === "Reel" ? "9:16" : script.format === "Video lungo" ? "16:9" : "▤"}</i><span><strong>{script.title}</strong><small>{script.source} · {script.tags.slice(0, 2).join(" · ")}</small></span></span>
                <span><b className={`status ${statusClass(script.status)}`}><i/>{script.status}</b></span>
                <span className="duration">{duration(script.body)}<small>{words(script.body)} parole</small></span><span className="updated">{formatUpdated(script.updatedAt)}</span>
                <span className="row-actions"><i onClick={(event) => { event.stopPropagation(); openTeleprompter(script); }}>▶</i><i onClick={(event) => { event.stopPropagation(); openEditor(script); }}>✎</i></span>
              </button>)}
              {!filtered.length && <p className="empty">Nessuno script corrisponde alla ricerca.</p>}
            </div>
          </section>
        </div>}

        {page === "editor" && <div className="page editor-page">
          <div className="editor-bar"><button onClick={() => setPage("library")}>← <span>Libreria</span></button><p>☁ Salvato su Postgres</p><div><button className="secondary" onClick={() => { updateActive({ status: "Pronto" }); setToast("Copione segnato come pronto."); }}>✓ Segna pronto</button><button className="primary" onClick={() => openTeleprompter(active)}>▶ Prova</button></div></div>
          <div className="editor-grid">
            <section className="document">
              <div className="doc-meta"><div><select value={active.format} onChange={(event) => updateActive({ format: event.target.value as Format })}><option>Reel</option><option>Video lungo</option><option>Lezione</option></select><b className={`status ${statusClass(active.status)}`}><i/>{active.status}</b></div><button>•••</button></div>
              <input className="title-field" value={active.title} onChange={(event) => updateActive({ title: event.target.value })}/>
              <div className="doc-stats"><span>{words(active.body)} parole</span><i/><span>{duration(active.body)} a 135 parole/min</span><i/><span>Postgres</span></div>
              <textarea value={active.body} onChange={(event) => updateActive({ body: event.target.value })} spellCheck/>
              <footer><span>☁ Salvataggio automatico</span><span>Le righe tra [parentesi] sono cue e non vengono recitate.</span></footer>
            </section>
            <aside className="assistant-panel">
              <header><span>✦</span><div><small>ASSISTENTE</small><h3>Rifinisci senza perdere la voce</h3></div></header>
              <p>Le trasformazioni AI useranno il provider scelto. La formattazione per la voce avviene in locale.</p>
              <section><small>PREPARA PER LA RECITAZIONE</small><button onClick={() => { updateActive({ body: formatForVoice(active.body) }); setToast("Testo disposto in frasi brevi."); }}><i>◉</i><span><strong>Formatta per la voce</strong><small>Frasi brevi e respiri naturali</small></span><b>›</b></button><button onClick={() => { updateActive({ body: `${active.body}\n\n[PAUSA LUNGA]` }); setToast("Cue aggiunta in fondo al testo."); }}><i>Ⅱ</i><span><strong>Aggiungi una pausa</strong><small>Inserisce un cue strutturato</small></span><b>›</b></button></section>
              <section><small>CON IL TUO MODELLO AI</small>{[["Più naturale e orale", "Mantiene argomenti e tono"], ["Riduci del 20%", "Taglia ripetizioni, non le idee"], ["Crea tre aperture", "Hook alternativi da confrontare"]].map(([title, note]) => <button className="ai-action" key={title} onClick={() => setToast("Prima collega Claude, OpenAI o un provider compatibile.")}><i>✦</i><span><strong>{title}</strong><small>{note}</small></span></button>)}</section>
              <article className="provider-mini"><div><b>AI</b><span><strong>Nessun provider attivo</strong><small>Le chiavi restano lato server</small></span></div><button onClick={() => setPage("connections")}>Configura provider →</button></article>
            </aside>
          </div>
        </div>}

        {page === "connections" && <div className="page connections-page">
          <section className="connections-hero"><div><small>ARCHITETTURA APERTA</small><h2>Uno studio, qualunque modello.</h2><p>Le API portano l’intelligenza nell’editor. MCP porta nell’archivio ciò che scrivi altrove. Sono due ingressi diversi, progettati per lavorare insieme.</p></div><div className="model-flow"><span><b>C</b>Claude</span><i>＋</i><span><b>O</b>OpenAI</span><i>＋</i><span><b>···</b>Altri</span><em>→</em><strong><b>S</b>Script Studio</strong></div></section>
          <div className="connection-grid">
            <article className="connection-card">
              <header><i className="yellow">⌁</i><div><small>INGRESSO MCP</small><h3>Consegna da Claude e agenti</h3></div><b>DA ATTIVARE</b></header>
              <p>Script Studio espone un server MCP remoto. Da Claude puoi dire “crea questa bozza in Script Studio” senza copiare e incollare il testo.</p>
              <div className="endpoint"><span>Endpoint previsto</span><code>https://tuo-dominio.it/mcp</code><button onClick={() => setToast("Endpoint di esempio: sarà reale dopo l’attivazione del backend.")}>▣</button></div>
              <div className="tools"><header><span>Superficie minima degli strumenti</span><b>4 tool</b></header>{[["script_create_draft", "Crea una bozza e restituisce ID + link"], ["script_list", "Trova copioni e filtra per stato"], ["script_get", "Legge contenuto e metadati"], ["script_create_revision", "Aggiunge una versione senza sovrascrivere"]].map(([name, note]) => <div key={name}><code>{name}</code><span>{note}</span><b>✓</b></div>)}</div>
              <aside className="safety">✓ <p><strong>Controllo umano obbligatorio.</strong> MCP non può pubblicare né cancellare. Ogni consegna entra come bozza e ogni modifica crea una versione.</p></aside>
            </article>
            <article className="connection-card api-card">
              <header><i>✦</i><div><small>PROVIDER API</small><h3>AI dentro l’editor</h3></div></header>
              <p>Scegli il modello per riscrivere, tagliare, creare hook o trasformare un testo in copione mantenendo il tuo profilo di voce.</p>
              <div className="providers">{[["C", "Claude API", "Non configurato"], ["◉", "OpenAI API", "Non configurato"], ["＋", "Endpoint compatibile", "Base URL + modello"]].map(([icon, name, note]) => <button key={name} onClick={() => setToast("La configurazione richiede il backend e un vault per le chiavi.")}><i>{icon}</i><span><strong>{name}</strong><small>{note}</small></span><b>›</b></button>)}</div>
              <aside className="secret">⚙ <p><strong>Chiavi protette</strong><span>Mai nel browser o nel testo dello script; soltanto nel vault del backend.</span></p></aside>
            </article>
          </div>
          <section className="delivery"><header className="section-head"><div><small>INBOX MCP</small><h2>Consegne da rivedere</h2></div><b>1 nuova</b></header><article><span className="claude">C</span><div><small>CLAUDE · VIA MCP · 4 MIN FA</small><strong>Perché l’AI locale cambia il vantaggio delle PMI</strong><p>Richiesto: Reel, 60–90 secondi, tono critico e concreto.</p></div><aside><small>VERSIONE</small><strong>Bozza 1</strong></aside><footer><button className="secondary" onClick={() => setToast("Bozza archiviata nella simulazione.")}>Archivia</button><button className="primary" onClick={() => setToast("L’inbox diventerà operativa con il server MCP.")}>Apri e rivedi →</button></footer></article></section>
        </div>}
      </section>

      <nav className="mobile-nav">{navItems.map((item) => <button key={item.page} className={page === item.page ? "active" : ""} aria-current={page === item.page ? "page" : undefined} onClick={() => setPage(item.page)}><i>{item.icon}</i><span>{item.label === "Connessioni" ? "Ingressi" : item.label}</span></button>)}<button className="new-mobile" onClick={createScript}>＋</button></nav>

      {teleprompter && <div className="teleprompter" role="dialog" aria-modal="true" aria-label={`Teleprompter: ${active.title}`}>
        <header className="tele-bar">
          <div><button onClick={closeTeleprompter} aria-label={recording ? "Ferma la registrazione" : "Chiudi teleprompter"}>×</button><span><small>{recording ? "● REGISTRAZIONE" : "IN LETTURA"}</small><strong>{active.title}</strong></span></div>
          <section>
            <label><span>Velocità</span><input aria-label="Velocità di scorrimento" type="range" min="55" max="220" value={speed} onChange={(event) => setSpeed(Number(event.target.value))}/><b>{speed}</b><small>ppm</small></label>
            <div className="size-control" role="group" aria-label="Dimensione del testo"><button onClick={() => setFontSize((value) => Math.max(30, value - 6))} aria-label="Riduci il testo">A−</button><input aria-label="Dimensione del testo" type="range" min="30" max="112" step="2" value={fontSize} onChange={(event) => setFontSize(Number(event.target.value))}/><output>{fontSize}px</output><button onClick={() => setFontSize((value) => Math.min(112, value + 6))} aria-label="Ingrandisci il testo">A＋</button></div>
            <button className={cameraOn ? "active" : ""} onClick={() => cameraOn ? stopCamera() : startCamera()} disabled={recording || countdown !== null}>◉ <span>{cameraOn ? "Camera attiva" : "Attiva camera"}</span></button>
            {cameraOn && <button onClick={switchCamera} disabled={recording || countdown !== null}>↻ <span>Inverti camera</span></button>}
            <button className={mirrored ? "active" : ""} onClick={() => setMirrored((value) => !value)}>⇋ <span>Specchio</span></button>
            <button className={showCues ? "active" : ""} onClick={() => setShowCues((value) => !value)}>◉ <span>Cue</span></button>
            <button onClick={() => document.documentElement.requestFullscreen?.().catch(() => undefined)}>⛶ <span>Fullscreen</span></button>
          </section>
        </header>
        <div className="tele-progress"><i style={{ width: `${progress}%` }}/></div>
        <div className={`reader-frame ${cameraOn ? "camera-active" : ""}`}>
          <video ref={videoRef} className={`camera-preview ${cameraFacing === "user" ? "front" : ""}`} autoPlay muted playsInline/>
          {cameraOn && <div className="camera-scrim"/>}
          {cameraOn && <span className="camera-badge">{cameraFacing === "user" ? "CAMERA FRONTALE" : "CAMERA POSTERIORE"} · {active.format === "Reel" ? "9:16" : "16:9"}</span>}
          {recording && <span className="recording-badge"><i/> REC {recordingClock(recordingSeconds)}</span>}
          {cameraOn && !playing && !recording && ((active.format === "Reel" && !portraitView) || (active.format !== "Reel" && portraitView)) && <span className="orientation-hint">↻ {active.format === "Reel" ? "Ruota il telefono in verticale per il 9:16" : "Ruota il telefono in orizzontale per il 16:9"}</span>}
          {countdown !== null && <div className="record-countdown"><small>REGISTRAZIONE TRA</small><strong>{countdown}</strong></div>}
          <i className="focus top"/><i className="focus bottom"/>
          <div className="reader" ref={readerRef} onClick={() => setPlaying((value) => !value)}><div className={`reader-copy ${mirrored ? "mirrored" : ""}`} style={{ fontSize }}><div className="reader-space"/>{active.body.split("\n").map((line, index) => { if (!line.trim()) return <div className="reader-gap" key={index}/>; if (cue(line)) return showCues ? <span className="reader-cue" key={index}>{line.replace(/[\[\]]/g, "")}</span> : null; return <p key={index}>{line}</p>; })}<div className="reader-end"><small>FINE</small><strong>{active.title}</strong></div><div className="reader-space"/></div></div>
        </div>
        <footer className="tele-footer">
          <div><span><kbd>Spazio</kbd> Play/Pausa</span><span><kbd>↑ ↓</kbd> Velocità</span><span><kbd>M</kbd> Specchio</span><span><kbd>F</kbd> Fullscreen</span></div>
          <section className="transport"><button className="play-control" onClick={() => setPlaying((value) => !value)} aria-label={playing ? "Metti in pausa" : "Avvia scorrimento"}>{playing ? "Ⅱ" : "▶"}</button><button className={`record-control ${recording ? "is-recording" : ""}`} onClick={recording ? stopRecording : beginRecording} disabled={countdown !== null}><i/>{recording ? "Ferma" : "Registra"}</button></section>
          <aside><strong>{recording ? recordingClock(recordingSeconds) : `${Math.round(progress)}%`}</strong><small>{recording ? "REGISTRAZIONE ATTIVA" : cameraOn ? "CAMERA PRONTA" : playing ? "SCORRIMENTO ATTIVO" : "IN PAUSA"}</small></aside>
        </footer>
        {recordingUrl && <div className="recording-review" role="dialog" aria-modal="true" aria-label="Registrazione completata"><article><header><div><small>RIPRESA COMPLETATA</small><h2>Il video è pronto</h2></div><button onClick={() => { clearRecording(); stopCamera(); }}>×</button></header><video src={recordingUrl} controls playsInline/><footer><button className="secondary" onClick={clearRecording}>↻ Nuova ripresa</button><a className="primary" href={recordingUrl} download={recordingFilename()}>↓ Scarica video</a></footer><p>Il file resta su questo dispositivo finché non lo scarichi o avvii una nuova ripresa.</p></article></div>}
      </div>}
      {toast && <div className="toast">✓ <span>{toast}</span></div>}
    </main>
  );
}
