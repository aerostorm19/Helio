(function () {
  "use strict";

  var cfg = window.HelioConfig || {};
  var businessId = cfg.businessId;
  var accent = cfg.accentColor || "#A6FF4D";
  var apiBase = cfg.apiBase || "https://api.tryhelio.com";

  if (!businessId) {
    console.warn("[Helio] HelioConfig.businessId is required");
    return;
  }

  // ── Styles ──────────────────────────────────────────────────────────────────
  var style = document.createElement("style");
  style.textContent = [
    "#helio-btn{position:fixed;bottom:24px;right:24px;z-index:99999;width:56px;height:56px;border-radius:50%;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(0,0,0,.3);transition:transform .15s}",
    "#helio-btn:hover{transform:scale(1.08)}",
    "#helio-btn svg{width:26px;height:26px}",
    "#helio-modal{position:fixed;bottom:96px;right:24px;z-index:99999;width:280px;background:#0F1510;border:1px solid #22291F;border-radius:16px;padding:20px;box-shadow:0 8px 40px rgba(0,0,0,.5);font-family:system-ui,sans-serif;display:none}",
    "#helio-modal.open{display:block}",
    "#helio-status{font-size:13px;color:#7A8C7A;margin-bottom:12px;min-height:18px}",
    "#helio-timer{font-size:22px;font-weight:600;color:#fff;letter-spacing:2px;margin-bottom:16px}",
    "#helio-end{width:100%;padding:10px;border:none;border-radius:8px;background:#ff4d4d;color:#fff;font-size:14px;cursor:pointer;font-weight:500}",
    "#helio-end:hover{background:#e03e3e}",
    "#helio-pulse{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px;vertical-align:middle}",
    "@keyframes helio-blink{0%,100%{opacity:1}50%{opacity:.3}}",
    ".helio-listening #helio-pulse{animation:helio-blink 1s ease-in-out infinite}",
  ].join("");
  document.head.appendChild(style);

  // ── Button ───────────────────────────────────────────────────────────────────
  var btn = document.createElement("button");
  btn.id = "helio-btn";
  btn.setAttribute("aria-label", "Call us");
  btn.style.background = accent;
  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10a19.79 19.79 0 01-3-8.57A2 2 0 012.05 1.4h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 9.09a16 16 0 006.36 6.36l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></svg>';
  document.body.appendChild(btn);

  // ── Modal ────────────────────────────────────────────────────────────────────
  var modal = document.createElement("div");
  modal.id = "helio-modal";
  modal.innerHTML = [
    '<div style="font-size:15px;font-weight:600;color:#fff;margin-bottom:4px">Helio Assistant</div>',
    '<div id="helio-status"><span id="helio-pulse" style="background:' + accent + '"></span>Connecting…</div>',
    '<div id="helio-timer">0:00</div>',
    '<button id="helio-end">End call</button>',
  ].join("");
  document.body.appendChild(modal);

  var statusEl = document.getElementById("helio-status");
  var timerEl  = document.getElementById("helio-timer");
  var pulseEl  = document.getElementById("helio-pulse");
  var endBtn   = document.getElementById("helio-end");

  // ── State ────────────────────────────────────────────────────────────────────
  var ws        = null;
  var stream    = null;
  var processor = null;
  var audioCtx  = null;
  var timerInt  = null;
  var seconds   = 0;
  var active    = false;

  function setStatus(text, listening) {
    statusEl.textContent = "";
    var dot = document.createElement("span");
    dot.id = "helio-pulse";
    dot.style.background = listening ? accent : "#7A8C7A";
    pulseEl = dot;
    statusEl.appendChild(dot);
    statusEl.appendChild(document.createTextNode(text));
    if (listening) {
      modal.classList.add("helio-listening");
    } else {
      modal.classList.remove("helio-listening");
    }
  }

  function startTimer() {
    seconds = 0;
    timerInt = setInterval(function () {
      seconds++;
      var m = Math.floor(seconds / 60);
      var s = seconds % 60;
      timerEl.textContent = m + ":" + (s < 10 ? "0" : "") + s;
    }, 1000);
  }

  function stopTimer() {
    clearInterval(timerInt);
  }

  // ── Audio playback ───────────────────────────────────────────────────────────
  var playQueue = Promise.resolve();

  function playAudioBytes(bytes) {
    playQueue = playQueue.then(function () {
      return new Promise(function (resolve) {
        if (!audioCtx) {
          audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        audioCtx.decodeAudioData(bytes.buffer, function (buf) {
          var src = audioCtx.createBufferSource();
          src.buffer = buf;
          src.connect(audioCtx.destination);
          src.onended = resolve;
          src.start(0);
          setStatus(" Helio is speaking…", false);
        }, function () {
          resolve();
        });
      }).then(function () {
        if (active) setStatus(" Listening…", true);
      });
    });
  }

  // ── Mic capture → WebSocket ──────────────────────────────────────────────────
  function float32ToInt16(buffer) {
    var l = buffer.length;
    var out = new Int16Array(l);
    for (var i = 0; i < l; i++) {
      var s = Math.max(-1, Math.min(1, buffer[i]));
      out[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return out;
  }

  function writeWavHeader(numSamples, sampleRate) {
    var buf = new ArrayBuffer(44);
    var view = new DataView(buf);
    var writeStr = function (off, str) {
      for (var i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i));
    };
    var dataLen = numSamples * 2;
    writeStr(0, "RIFF");
    view.setUint32(4, 36 + dataLen, true);
    writeStr(8, "WAVE");
    writeStr(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);   // PCM
    view.setUint16(22, 1, true);   // mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeStr(36, "data");
    view.setUint32(40, dataLen, true);
    return buf;
  }

  var micBuffer = [];
  var CHUNK_SAMPLES = 16000; // 1 second at 16kHz

  function flushMicBuffer() {
    if (!micBuffer.length || !ws || ws.readyState !== WebSocket.OPEN) return;
    var total = micBuffer.reduce(function (acc, b) { return acc + b.length; }, 0);
    var pcm = new Int16Array(total);
    var off = 0;
    micBuffer.forEach(function (b) { pcm.set(b, off); off += b.length; });
    micBuffer = [];
    var header = writeWavHeader(total, 16000);
    var wav = new Uint8Array(header.byteLength + pcm.byteLength);
    wav.set(new Uint8Array(header), 0);
    wav.set(new Uint8Array(pcm.buffer), header.byteLength);
    ws.send(wav);
  }

  async function startMic() {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { sampleRate: 16000, channelCount: 1 }, video: false });
    } catch (e) {
      setStatus(" Mic access denied", false);
      return false;
    }

    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
    var source = audioCtx.createMediaStreamSource(stream);

    processor = audioCtx.createScriptProcessor(4096, 1, 1);
    processor.onaudioprocess = function (e) {
      if (!active) return;
      var pcm = float32ToInt16(e.inputBuffer.getChannelData(0));
      micBuffer.push(pcm);
      if (micBuffer.reduce(function (acc, b) { return acc + b.length; }, 0) >= CHUNK_SAMPLES) {
        flushMicBuffer();
      }
    };
    source.connect(processor);
    processor.connect(audioCtx.destination);
    return true;
  }

  // ── WebSocket ────────────────────────────────────────────────────────────────
  function wsUrl() {
    var base = apiBase.replace(/^http/, "ws");
    return base + "/widget/stream/" + businessId;
  }

  function openCall() {
    if (active) return;
    active = true;
    modal.classList.add("open");
    btn.style.background = "#ff4d4d";
    btn.setAttribute("aria-label", "End call");
    setStatus(" Connecting…", false);

    ws = new WebSocket(wsUrl());
    ws.binaryType = "arraybuffer";

    ws.onopen = function () {
      setStatus(" Connected", false);
      startMic().then(function (ok) {
        if (ok) {
          setStatus(" Listening…", true);
          startTimer();
        } else {
          closeCall();
        }
      });
    };

    ws.onmessage = function (e) {
      if (e.data instanceof ArrayBuffer && e.data.byteLength > 0) {
        playAudioBytes(new Uint8Array(e.data));
      }
    };

    ws.onerror = function () {
      setStatus(" Connection error", false);
    };

    ws.onclose = function () {
      if (active) {
        setStatus(" Call ended", false);
        stopTimer();
        active = false;
        setTimeout(closeCall, 1500);
      }
    };
  }

  function closeCall() {
    active = false;
    stopTimer();
    playQueue = Promise.resolve();

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
    ws = null;

    if (processor) {
      processor.disconnect();
      processor = null;
    }
    if (stream) {
      stream.getTracks().forEach(function (t) { t.stop(); });
      stream = null;
    }

    modal.classList.remove("open");
    btn.style.background = accent;
    btn.setAttribute("aria-label", "Call us");
    timerEl.textContent = "0:00";
  }

  // ── Events ───────────────────────────────────────────────────────────────────
  btn.addEventListener("click", function () {
    if (active) closeCall();
    else openCall();
  });

  endBtn.addEventListener("click", closeCall);
})();
