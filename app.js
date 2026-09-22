// ============================================================
// Moj Trening - glavna logika aplikacije
// ============================================================

let fbReady = false;
try {
  if (!firebaseConfig.apiKey.startsWith("UPIŠI")) {
    firebase.initializeApp(firebaseConfig);
    fbReady = true;
  }
} catch (e) {
  console.error(e);
}

if (!fbReady) {
  alert("Firebase konfiguracija nije postavljena. Otvori firebase-config.js i upiši svoje podatke (vidi UPUTE.md).");
  window.location.href = "index.html";
}

const auth = fbReady ? firebase.auth() : null;
const db = fbReady ? firebase.firestore() : null;

let currentUser = null; // { uid, name, email, role }
let trainings = [];
let unsubscribers = [];
let subListenersSet = new Set();
let currentView = "treninziView";

// ---------- Auth guard ----------
if (fbReady) {
  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      window.location.href = "index.html";
      return;
    }
    try {
      const doc = await db.collection("users").doc(user.uid).get();
      if (!doc.exists) {
        // korisnik postoji u Auth ali nema profil - odjavi ga
        await auth.signOut();
        window.location.href = "index.html";
        return;
      }
      const data = doc.data();
      currentUser = {
        uid: user.uid,
        name: data.name || user.email,
        email: data.email || user.email,
        role: data.role || "klijent"
      };
      initAppUI();
      startListening();
    } catch (e) {
      console.error(e);
      showToast("Greška pri učitavanju profila.");
    }
  });
}

function initAppUI() {
  document.getElementById("loadingScreen").style.display = "none";
  document.getElementById("appRoot").style.display = "block";
  document.getElementById("roleBadge").textContent = currentUser.role === "trener" ? "Trener" : "Klijent";
  document.getElementById("profileName").textContent = currentUser.name;
  document.getElementById("profileEmail").textContent = currentUser.email;
  document.getElementById("profileRole").textContent = currentUser.role === "trener" ? "Trener" : "Klijent";

  if (currentUser.role === "trener") {
    document.getElementById("addTrainingFab").style.display = "block";
    document.getElementById("trenerTools").style.display = "block";
  }

  document.getElementById("logoutBtn").addEventListener("click", logout);
  document.getElementById("logoutBtn2").addEventListener("click", logout);

  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => switchView(btn.dataset.view));
  });

  document.getElementById("addTrainingFab").addEventListener("click", () => openTrainingModal());
  document.getElementById("seedBtn").addEventListener("click", seedInitialData);

  // Modal buttons
  document.getElementById("trainingModalCancel").addEventListener("click", closeTrainingModal);
  document.getElementById("trainingModalSave").addEventListener("click", saveTrainingModal);
  document.getElementById("exerciseModalCancel").addEventListener("click", closeExerciseModal);
  document.getElementById("exerciseModalSave").addEventListener("click", saveExerciseModal);

  document.getElementById("trainingsList").addEventListener("click", handleListClick);
  document.getElementById("trainingsList").addEventListener("change", handleListChange);
}

function switchView(viewId) {
  currentView = viewId;
  document.getElementById("treninziView").style.display = viewId === "treninziView" ? "block" : "none";
  document.getElementById("profilView").style.display = viewId === "profilView" ? "block" : "none";
  document.querySelectorAll(".nav-btn").forEach((b) => b.classList.toggle("active", b.dataset.view === viewId));
  document.getElementById("addTrainingFab").style.display = viewId === "treninziView" && currentUser.role === "trener" ? "block" : "none";
}

function logout() {
  cleanupListeners();
  auth.signOut().then(() => (window.location.href = "index.html"));
}

// ---------- Firestore realtime listeners ----------
function cleanupListeners() {
  unsubscribers.forEach((u) => u());
  unsubscribers = [];
  subListenersSet = new Set();
}

function startListening() {
  cleanupListeners();
  const unsubTrainings = db
    .collection("trainings")
    .orderBy("order")
    .onSnapshot(
      (snap) => {
        const existingById = {};
        trainings.forEach((t) => (existingById[t.id] = t));
        const newTrainings = [];
        snap.forEach((doc) => {
          const data = doc.data();
          const existing = existingById[doc.id];
          newTrainings.push({
            id: doc.id,
            name: data.name || "",
            warmup: data.warmup || "",
            order: typeof data.order === "number" ? data.order : 0,
            collapsed: existing ? existing.collapsed : false,
            core: existing ? existing.core : [],
            main: existing ? existing.main : []
          });
        });
        trainings = newTrainings;
        render();
        trainings.forEach((t) => ensureSubListeners(t.id));
      },
      (err) => {
        console.error(err);
        showToast("Greška pri učitavanju treninga.");
      }
    );
  unsubscribers.push(unsubTrainings);
}

function ensureSubListeners(trainingId) {
  if (subListenersSet.has(trainingId)) return;
  subListenersSet.add(trainingId);

  const unsubCore = db
    .collection("trainings")
    .doc(trainingId)
    .collection("coreExercises")
    .orderBy("order")
    .onSnapshot((snap) => {
      const t = trainings.find((x) => x.id === trainingId);
      if (!t) return;
      t.core = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      render();
    });

  const unsubMain = db
    .collection("trainings")
    .doc(trainingId)
    .collection("mainExercises")
    .orderBy("order")
    .onSnapshot((snap) => {
      const t = trainings.find((x) => x.id === trainingId);
      if (!t) return;
      t.main = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      render();
    });

  unsubscribers.push(unsubCore, unsubMain);
}

// ---------- Render ----------
function render() {
  const list = document.getElementById("trainingsList");
  const empty = document.getElementById("emptyState");
  const isTrener = currentUser.role === "trener";

  if (trainings.length === 0) {
    list.innerHTML = "";
    empty.style.display = "block";
    document.getElementById("emptyStateText").textContent = isTrener
      ? "Dodaj prvi trening pomoću + gumba, ili učitaj početni raspored u Profilu."
      : "Trener još nije unio treninge.";
    return;
  }
  empty.style.display = "none";
  list.innerHTML = trainings.map((t) => trainingCardHtml(t, isTrener)).join("");
}

function esc(str) {
  const div = document.createElement("div");
  div.textContent = str == null ? "" : String(str);
  return div.innerHTML;
}

function trainingCardHtml(t, isTrener) {
  const collapsedClass = t.collapsed ? "collapsed" : "";
  const arrow = t.collapsed ? "▸" : "▾";

  const coreRows = t.core
    .map(
      (ex) => `
    <tr>
      <td>${isTrener ? `<input type="text" class="ex-input" data-field="name" data-section="core" data-training="${t.id}" data-ex="${ex.id}" value="${esc(ex.name)}" />` : esc(ex.name)}</td>
      <td>${isTrener ? `<input type="text" class="ex-input" data-field="sets" data-section="core" data-training="${t.id}" data-ex="${ex.id}" value="${esc(ex.sets)}" />` : esc(ex.sets)}</td>
      ${isTrener ? `<td><button class="icon-action del" data-action="del-ex" data-section="core" data-training="${t.id}" data-ex="${ex.id}">🗑️</button></td>` : ""}
    </tr>`
    )
    .join("");

  const mainRows = t.main
    .map(
      (ex) => `
    <tr>
      <td>${isTrener ? `<input type="text" class="ex-input" data-field="name" data-section="main" data-training="${t.id}" data-ex="${ex.id}" value="${esc(ex.name)}" />` : esc(ex.name)}</td>
      <td><input type="text" class="weight-input" data-field="weight" data-section="main" data-training="${t.id}" data-ex="${ex.id}" value="${esc(ex.weight)}" placeholder="-" /></td>
      <td>${isTrener ? `<input type="text" class="ex-input" data-field="setsReps" data-section="main" data-training="${t.id}" data-ex="${ex.id}" value="${esc(ex.setsReps)}" />` : esc(ex.setsReps)}</td>
      ${isTrener ? `<td><button class="icon-action del" data-action="del-ex" data-section="main" data-training="${t.id}" data-ex="${ex.id}">🗑️</button></td>` : ""}
    </tr>`
    )
    .join("");

  return `
  <div class="training-card">
    <div class="training-header" data-action="toggle" data-training="${t.id}">
      <div>
        <h3>${arrow} ${esc(t.name)}</h3>
        <div class="warmup">Zagrijavanje: ${esc(t.warmup) || "-"}</div>
      </div>
      ${
        isTrener
          ? `<div class="row-actions">
               <button class="icon-action" data-action="edit-training" data-training="${t.id}" title="Uredi">✏️</button>
               <button class="icon-action del" data-action="del-training" data-training="${t.id}" title="Obriši">🗑️</button>
             </div>`
          : ""
      }
    </div>
    <div class="training-body ${collapsedClass}">
      <div class="section-title">Core (uvodni dio)</div>
      <div class="table-scroll">
        <table class="${isTrener ? "table-wide" : ""}">
          <thead><tr><th>Vježba</th><th>Serije</th>${isTrener ? "<th></th>" : ""}</tr></thead>
          <tbody>${coreRows || `<tr><td colspan="3" class="muted">Nema unesenih vježbi.</td></tr>`}</tbody>
        </table>
      </div>
      ${isTrener ? `<button class="btn secondary small add-row-btn" data-action="add-ex" data-section="core" data-training="${t.id}">+ Dodaj vježbu (core)</button>` : ""}

      <div class="section-title">Glavni dio treninga</div>
      <div class="table-scroll">
        <table class="${isTrener ? "table-wide" : ""}">
          <thead><tr><th>Vježba</th><th>Težina</th><th>Serije × ponavljanja</th>${isTrener ? "<th></th>" : ""}</tr></thead>
          <tbody>${mainRows || `<tr><td colspan="4" class="muted">Nema unesenih vježbi.</td></tr>`}</tbody>
        </table>
      </div>
      ${isTrener ? `<button class="btn secondary small add-row-btn" data-action="add-ex" data-section="main" data-training="${t.id}">+ Dodaj vježbu (glavni dio)</button>` : ""}
    </div>
  </div>`;
}

// ---------- Event delegation ----------
function handleListClick(e) {
  const el = e.target.closest("[data-action]");
  if (!el) return;
  const action = el.dataset.action;

  if (action === "toggle") {
    const t = trainings.find((x) => x.id === el.dataset.training);
    if (t) {
      t.collapsed = !t.collapsed;
      render();
    }
  } else if (action === "edit-training") {
    openTrainingModal(el.dataset.training);
  } else if (action === "del-training") {
    deleteTraining(el.dataset.training);
  } else if (action === "add-ex") {
    openExerciseModal(el.dataset.training, el.dataset.section);
  } else if (action === "del-ex") {
    deleteExercise(el.dataset.training, el.dataset.section, el.dataset.ex);
  }
}

function handleListChange(e) {
  const el = e.target;
  if (!el.matches(".ex-input, .weight-input")) return;
  const trainingId = el.dataset.training;
  const section = el.dataset.section;
  const exId = el.dataset.ex;
  const field = el.dataset.field;
  const value = el.value;

  // Sigurnosna provjera na klijentskoj strani: klijent smije mijenjati samo weight
  if (currentUser.role !== "trener" && field !== "weight") return;

  const coll = section === "core" ? "coreExercises" : "mainExercises";
  db.collection("trainings")
    .doc(trainingId)
    .collection(coll)
    .doc(exId)
    .update({ [field]: value })
    .then(() => showToast("Spremljeno ✓"))
    .catch((err) => {
      console.error(err);
      showToast("Greška pri spremanju.");
    });
}

// ---------- Training modal (add/edit) ----------
let editingTrainingId = null;

function openTrainingModal(trainingId) {
  editingTrainingId = trainingId || null;
  document.getElementById("trainingModalTitle").textContent = trainingId ? "Uredi trening" : "Novi trening";
  if (trainingId) {
    const t = trainings.find((x) => x.id === trainingId);
    document.getElementById("trainingName").value = t ? t.name : "";
    document.getElementById("trainingWarmup").value = t ? t.warmup : "";
  } else {
    document.getElementById("trainingName").value = "";
    document.getElementById("trainingWarmup").value = "";
  }
  document.getElementById("trainingModal").classList.remove("hidden");
}

function closeTrainingModal() {
  document.getElementById("trainingModal").classList.add("hidden");
}

async function saveTrainingModal() {
  const name = document.getElementById("trainingName").value.trim();
  const warmup = document.getElementById("trainingWarmup").value.trim();
  if (!name) {
    showToast("Upiši naziv treninga.");
    return;
  }
  try {
    if (editingTrainingId) {
      await db.collection("trainings").doc(editingTrainingId).update({ name, warmup });
    } else {
      const order = trainings.length ? Math.max(...trainings.map((t) => t.order)) + 1 : 0;
      await db.collection("trainings").add({ name, warmup, order });
    }
    closeTrainingModal();
    showToast("Spremljeno ✓");
  } catch (e) {
    console.error(e);
    showToast("Greška pri spremanju treninga.");
  }
}

async function deleteTraining(trainingId) {
  if (!confirm("Obrisati ovaj trening i sve njegove vježbe?")) return;
  try {
    await cascadeDeleteTraining(trainingId);
    showToast("Trening obrisan.");
  } catch (e) {
    console.error(e);
    showToast("Greška pri brisanju.");
  }
}

async function cascadeDeleteTraining(trainingId) {
  const trainingRef = db.collection("trainings").doc(trainingId);
  const coreSnap = await trainingRef.collection("coreExercises").get();
  const mainSnap = await trainingRef.collection("mainExercises").get();
  const batch = db.batch();
  coreSnap.forEach((d) => batch.delete(d.ref));
  mainSnap.forEach((d) => batch.delete(d.ref));
  batch.delete(trainingRef);
  await batch.commit();
}

// ---------- Exercise modal (add) ----------
let exerciseModalTrainingId = null;
let exerciseModalSection = null;

function openExerciseModal(trainingId, section) {
  exerciseModalTrainingId = trainingId;
  exerciseModalSection = section;
  document.getElementById("exerciseModalTitle").textContent =
    section === "core" ? "Nova vježba (core)" : "Nova vježba (glavni dio)";
  document.getElementById("exName").value = "";
  document.getElementById("exWeight").value = "";
  document.getElementById("exSetsReps").value = "";
  document.getElementById("exSets").value = "";
  document.getElementById("exMainFields").style.display = section === "main" ? "block" : "none";
  document.getElementById("exCoreFields").style.display = section === "core" ? "block" : "none";
  document.getElementById("exerciseModal").classList.remove("hidden");
}

function closeExerciseModal() {
  document.getElementById("exerciseModal").classList.add("hidden");
}

async function saveExerciseModal() {
  const name = document.getElementById("exName").value.trim();
  if (!name) {
    showToast("Upiši naziv vježbe.");
    return;
  }
  const t = trainings.find((x) => x.id === exerciseModalTrainingId);
  try {
    if (exerciseModalSection === "core") {
      const sets = document.getElementById("exSets").value.trim();
      const order = t && t.core.length ? Math.max(...t.core.map((e) => e.order || 0)) + 1 : 0;
      await db
        .collection("trainings")
        .doc(exerciseModalTrainingId)
        .collection("coreExercises")
        .add({ name, sets, order });
    } else {
      const weight = document.getElementById("exWeight").value.trim();
      const setsReps = document.getElementById("exSetsReps").value.trim();
      const order = t && t.main.length ? Math.max(...t.main.map((e) => e.order || 0)) + 1 : 0;
      await db
        .collection("trainings")
        .doc(exerciseModalTrainingId)
        .collection("mainExercises")
        .add({ name, weight, setsReps, order });
    }
    closeExerciseModal();
    showToast("Vježba dodana ✓");
  } catch (e) {
    console.error(e);
    showToast("Greška pri dodavanju vježbe.");
  }
}

async function deleteExercise(trainingId, section, exId) {
  if (!confirm("Obrisati ovu vježbu?")) return;
  const coll = section === "core" ? "coreExercises" : "mainExercises";
  try {
    await db.collection("trainings").doc(trainingId).collection(coll).doc(exId).delete();
    showToast("Vježba obrisana.");
  } catch (e) {
    console.error(e);
    showToast("Greška pri brisanju.");
  }
}

// ---------- Seed initial data ----------
const SEED_TRAININGS = [
  {
    name: "Trening 1 – Donji dio + Core",
    warmup: "Stepenice – 10 katova",
    order: 0,
    core: [
      { name: "Suprotna ruka + noga 6+6", sets: "3 kruga" },
      { name: "Ruski twist 5 kg", sets: "3×10+10" },
      { name: "Bočni plank 30 s", sets: "3 serije" }
    ],
    main: [
      { name: "Leg Press", weight: "40/50/50 kg", setsReps: "3×10-12" },
      { name: "Čučanj", weight: "12 kg", setsReps: "3×12" },
      { name: "Bugarski iskoraci", weight: "-", setsReps: "3×8" },
      { name: "Leg Curl", weight: "22.5/25/27.5 kg", setsReps: "3×10-12" },
      { name: "Leg Extension", weight: "12.5/12.5/15 kg", setsReps: "3×12" },
      { name: "Leg Abduction", weight: "30 kg", setsReps: "3×12" }
    ]
  },
  {
    name: "Trening 2 – Gornji dio + Core",
    warmup: "Veslanje 500 m + Traka 10 min",
    order: 1,
    core: [
      { name: "Spuštanje ravnih nogu", sets: "3×10" },
      { name: "Premještanje girje 4 kg", sets: "3×8+8" },
      { name: "Dodirivanje medicinke u planku", sets: "3×10+10" }
    ],
    main: [
      { name: "Vertical Traction", weight: "25/30/32.5 kg", setsReps: "3×10-12" },
      { name: "Veslanje na spravi", weight: "25 kg", setsReps: "3×12" },
      { name: "Chest Press", weight: "12.5/12.5/15 kg", setsReps: "3×10-12" },
      { name: "Rameni potisak bučicama", weight: "5 kg", setsReps: "3×10-12" },
      { name: "Reverse Fly", weight: "5/7.5/7.5 kg", setsReps: "3×10" },
      { name: "Biceps sajla", weight: "12.5 kg", setsReps: "3×10" },
      { name: "Triceps ekstenzija", weight: "12.5 kg", setsReps: "3×10" }
    ]
  },
  {
    name: "Trening 3 – Full Body",
    warmup: "Veslanje 500 m + Traka 10 min",
    order: 2,
    core: [],
    main: [
      { name: "Bugarski iskoraci", weight: "-", setsReps: "3×8" },
      { name: "Lat srednja", weight: "20/25/25 kg", setsReps: "3×10-12" },
      { name: "Pectoral", weight: "7.5/7.5/10 kg", setsReps: "3×10" },
      { name: "Military Press", weight: "10/15/15 kg", setsReps: "3×8-10" },
      { name: "Pregib kuka", weight: "4/8/8 kg", setsReps: "3×10-12" },
      { name: "Leg Adduction", weight: "20 kg", setsReps: "3×12" },
      { name: "Reverse Fly", weight: "5/7.5/7.5 kg", setsReps: "3×10" }
    ]
  }
];

async function seedInitialData() {
  if (currentUser.role !== "trener") return;

  if (trainings.length > 0) {
    const ok = confirm(
      "Baza već sadrži " + trainings.length + " trening(a). Želiš li ih obrisati i zamijeniti početnim rasporedom (Trening 1-3)?"
    );
    if (!ok) return;
    showToast("Brišem postojeće treninge...");
    for (const t of trainings) {
      await cascadeDeleteTraining(t.id);
    }
  }

  showToast("Učitavam početni raspored...");
  try {
    for (const training of SEED_TRAININGS) {
      const ref = await db.collection("trainings").add({
        name: training.name,
        warmup: training.warmup,
        order: training.order
      });
      let order = 0;
      for (const ex of training.core) {
        await ref.collection("coreExercises").add({ ...ex, order: order++ });
      }
      order = 0;
      for (const ex of training.main) {
        await ref.collection("mainExercises").add({ ...ex, order: order++ });
      }
    }
    showToast("Početni raspored učitan ✓");
    switchView("treninziView");
  } catch (e) {
    console.error(e);
    showToast("Greška pri učitavanju početnih podataka.");
  }
}

// ---------- Toast ----------
let toastTimer = null;
function showToast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 1800);
}

// ---------- Service worker (PWA) ----------
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch((e) => console.warn("SW reg failed", e));
  });
}
