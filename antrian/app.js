(() => {
  const STORAGE_KEY = "rsQueueDemoStateV1";
  const SERVICES = {
    cs: { name: "Customer Service", prefix: "A", icon: "♧", counter: "Loket 1" },
    payment: { name: "Pembayaran", prefix: "B", icon: "▤", counter: "Loket 2" },
    pharmacy: { name: "Pengambilan Obat", prefix: "C", icon: "✚", counter: "Loket 3" },
    doctor: { name: "Layanan Dokter", prefix: "D", icon: "✚", counter: "Poli / Loket 4" }
  };

  const defaultState = () => ({
    hospital: "RS SEHAT SENTOSA",
    tagline: "PELAYANAN CEPAT • RAMAH • PROFESIONAL",
    logo: "RS",
    caption: "Sehat bersama, pelayanan sepenuh hati.",
    counters: { cs: 0, payment: 0, pharmacy: 0, doctor: 0 },
    current: {},
    history: []
  });

  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? { ...defaultState(), ...JSON.parse(saved) } : defaultState();
    } catch {
      return defaultState();
    }
  }
  let state = loadState();

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    renderAll();
  }
  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, ch => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    }[ch]));
  }
  function makeNumber(serviceKey, number) {
    return `${SERVICES[serviceKey].prefix}-${String(number).padStart(3, "0")}`;
  }
  function timeLabel(iso) {
    try { return new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }); }
    catch { return "--:--"; }
  }
  function latestCall() {
    return state.history.length ? state.history[0] : null;
  }

  function renderMonitor() {
    const name = document.getElementById("hospitalName");
    if (!name) return;
    name.textContent = state.hospital;
    document.getElementById("hospitalTagline").textContent = state.tagline;
    document.getElementById("logoMark").textContent = state.logo || "RS";
    document.getElementById("footerHospital").textContent = state.hospital;
    document.getElementById("videoCaption").textContent = state.caption;

    const call = latestCall();
    document.getElementById("mainNumber").textContent = call ? call.number : "---";
    document.getElementById("mainPatient").textContent = call ? (call.patient || "Pasien") : "Belum ada panggilan";
    document.getElementById("mainService").textContent = call ? call.serviceName : "Silakan menunggu panggilan";
    document.getElementById("mainCounter").textContent = call ? call.counter.toUpperCase() : "LOKET —";

    const grid = document.getElementById("serviceGrid");
    grid.innerHTML = Object.entries(SERVICES).map(([key, service]) => {
      const item = state.current[key];
      return `<article class="service-card">
        <div class="service-card-top"><div class="service-icon">${service.icon}</div>
          <div><div class="service-name">${service.name}</div><div class="service-sub">Informasi antrean</div></div>
        </div>
        <div class="service-number">${item ? escapeHTML(item.number) : "— — —"}</div>
        <div class="service-patient">${item ? escapeHTML(item.patient || "Pasien") : "Belum ada panggilan"}</div>
        <div class="service-counter">${item ? escapeHTML(item.counter) : service.counter}</div>
      </article>`;
    }).join("");
  }

  function renderAdmin() {
    const list = document.getElementById("adminServiceStatus");
    if (!list) return;
    list.innerHTML = Object.entries(SERVICES).map(([key, service]) => {
      const item = state.current[key];
      const count = state.counters[key] || 0;
      return `<div class="admin-status-item">
        <div class="admin-status-icon">${service.icon}</div>
        <div><div class="admin-status-name">${service.name}</div>
          <div class="admin-status-meta">Total nomor dibuat: ${count}</div></div>
        <div class="admin-status-number">${item ? escapeHTML(item.number) : "—"}</div>
      </div>`;
    }).join("");

    const body = document.getElementById("historyBody");
    body.innerHTML = state.history.length ? state.history.slice(0, 10).map(item =>
      `<tr><td>${timeLabel(item.time)}</td><td><strong>${escapeHTML(item.number)}</strong></td>
      <td>${escapeHTML(item.patient || "—")}</td><td>${escapeHTML(item.serviceName)}</td>
      <td>${escapeHTML(item.counter)}</td></tr>`
    ).join("") : '<tr><td colspan="5" class="empty-cell">Belum ada pemanggilan.</td></tr>';

    const select = document.getElementById("serviceSelect");
    const numberInput = document.getElementById("queueNumber");
    if (select && numberInput && !numberInput.dataset.userEdited) {
      numberInput.value = makeNumber(select.value, (state.counters[select.value] || 0) + 1);
    }
    const hospitalInput = document.getElementById("settingHospital");
    if (hospitalInput && !hospitalInput.dataset.loaded) {
      hospitalInput.value = state.hospital;
      document.getElementById("settingTagline").value = state.tagline;
      document.getElementById("settingLogo").value = state.logo;
      document.getElementById("settingCaption").value = state.caption;
      hospitalInput.dataset.loaded = "true";
    }
  }

  function renderAll() {
    renderMonitor();
    renderAdmin();
  }

  function speakCall(item) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(
      `Nomor antrean ${item.number.replace("-", " ")}. ${item.patient ? "Atas nama " + item.patient + "." : ""} Silakan menuju ${item.counter}, layanan ${item.serviceName}.`
    );
    utterance.lang = "id-ID";
    utterance.rate = 0.88;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  }

  function callQueue(repeat = false) {
    const select = document.getElementById("serviceSelect");
    if (!select) return;
    const key = select.value;
    const service = SERVICES[key];
    const nameInput = document.getElementById("patientName");
    const numberInput = document.getElementById("queueNumber");
    const counterInput = document.getElementById("counterName");
    let number = numberInput.value.trim().toUpperCase();
    if (!number) number = makeNumber(key, (state.counters[key] || 0) + 1);

    let item;
    if (repeat) {
      item = state.current[key] || latestCall();
      if (!item) {
        alert("Belum ada nomor yang bisa dipanggil ulang.");
        return;
      }
    } else {
      const patient = nameInput.value.trim();
      const counter = counterInput.value.trim() || service.counter;
      item = {
        key, number, patient, counter, serviceName: service.name,
        time: new Date().toISOString()
      };
      const match = number.match(/(\d+)$/);
      if (match) state.counters[key] = Math.max(state.counters[key] || 0, Number(match[1]));
      state.current[key] = item;
      state.history.unshift(item);
      state.history = state.history.slice(0, 100);
      numberInput.dataset.userEdited = "";
      nameInput.value = "";
      state.lastCallKey = key;
      numberInput.value = makeNumber(key, (state.counters[key] || 0) + 1);
      saveState();
    }
    speakCall(item);
  }

  function initAdmin() {
    const select = document.getElementById("serviceSelect");
    if (!select) return;
    select.addEventListener("change", () => {
      const input = document.getElementById("queueNumber");
      input.dataset.userEdited = "";
      input.value = makeNumber(select.value, (state.counters[select.value] || 0) + 1);
      document.getElementById("counterName").value = SERVICES[select.value].counter;
    });
    document.getElementById("queueNumber").addEventListener("input", event => {
      event.target.dataset.userEdited = "true";
    });
    document.getElementById("nextNumberBtn").addEventListener("click", () => {
      const key = select.value;
      const input = document.getElementById("queueNumber");
      input.value = makeNumber(key, (state.counters[key] || 0) + 1);
      input.dataset.userEdited = "";
    });
    document.getElementById("callBtn").addEventListener("click", () => callQueue(false));
    document.getElementById("repeatBtn").addEventListener("click", () => callQueue(true));
    document.getElementById("resetBtn").addEventListener("click", () => {
      if (!confirm("Yakin ingin mereset semua nomor dan riwayat antrean?")) return;
      const keep = { hospital: state.hospital, tagline: state.tagline, logo: state.logo, caption: state.caption };
      state = { ...defaultState(), ...keep };
      saveState();
      document.getElementById("queueNumber").dataset.userEdited = "";
    });
    document.getElementById("saveSettingsBtn").addEventListener("click", () => {
      state.hospital = document.getElementById("settingHospital").value.trim() || "RS SEHAT SENTOSA";
      state.tagline = document.getElementById("settingTagline").value.trim();
      state.logo = document.getElementById("settingLogo").value.trim() || "RS";
      state.caption = document.getElementById("settingCaption").value.trim();
      document.getElementById("settingHospital").dataset.loaded = "";
      saveState();
      alert("Identitas monitor berhasil disimpan di browser ini.");
    });
    document.getElementById("counterName").value = SERVICES[select.value].counter;
  }

  function updateClock() {
    const now = new Date();
    const clock = document.getElementById("clock");
    if (clock) {
      clock.textContent = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      document.getElementById("dateText").textContent = now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    }
    const adminClock = document.getElementById("adminClock");
    if (adminClock) adminClock.textContent = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  }

  window.addEventListener("storage", event => {
    if (event.key === STORAGE_KEY) {
      state = loadState();
      renderAll();
    }
  });

  initAdmin();
  renderAll();
  updateClock();
  setInterval(updateClock, 1000);
})(); 
