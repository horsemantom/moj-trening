// ============================================================
// FIREBASE KONFIGURACIJA
// ============================================================
// Ovdje zalijepi svoj firebaseConfig objekt koji dobiješ kad
// napraviš web aplikaciju unutar svog Firebase projekta.
// Detaljne upute korak-po-korak nalaze se u UPUTE.md
//
// Firebase Console -> Project settings -> General ->
// "Your apps" -> Web app -> SDK setup and configuration -> Config
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSyCV30-lWu-dCIVrSqZe8LXnztoiNNcb-Oc",
  authDomain: "gym-master-6028f.firebaseapp.com",
  projectId: "gym-master-6028f",
  storageBucket: "gym-master-6028f.firebasestorage.app",
  messagingSenderId: "8791292422",
  appId: "1:8791292422:web:5bcc80edd2ef07f3722187"
};

// Jednostavan pristupni kod koji sprječava da se netko slučajno
// registrira kao "trener". Promijeni ga u nešto svoje ako želiš.
const TRENER_PRISTUPNI_KOD = "trener2026";
