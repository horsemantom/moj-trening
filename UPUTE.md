# Moj Trening – upute za postavljanje

Ovo je mobilna web-aplikacija (PWA) koja omogućuje treneru i klijentu da dijele
raspored treninga. Trener unosi/uređuje sve podatke (vježbe, serije, težine),
a klijent može mijenjati samo polje **težina**, u realnom vremenu, sa svog telefona.

Aplikacija radi u pregledniku i instalira se na početni ekran telefona pa izgleda
i ponaša se kao prava app – bez potrebe za App Storeom ili Google Playem.

Sadržaj:
1. Kreiranje besplatnog Firebase projekta
2. Uključivanje prijave (Authentication)
3. Kreiranje baze podataka (Firestore)
4. Postavljanje sigurnosnih pravila
5. Povezivanje aplikacije s Firebaseom
6. Objava aplikacije (hosting)
7. Instalacija na mobitel
8. Prvo korištenje

---

## 1. Kreiranje besplatnog Firebase projekta

1. Idi na [console.firebase.google.com](https://console.firebase.google.com) i prijavi se Google računom.
2. Klikni **"Add project" / "Dodaj projekt"**.
3. Upiši ime projekta, npr. `moj-trening` i klikni dalje. Google Analytics nije potreban, možeš ga isključiti.
4. Klikni **"Create project"** i pričekaj da se projekt izradi.

Ovo je potpuno besplatno za ovakvu malu aplikaciju (Firebase ima velikodušan besplatni plan).

## 2. Uključivanje prijave (Authentication)

1. U lijevom izborniku klikni **Build → Authentication**.
2. Klikni **"Get started"**.
3. Na popisu providera odaberi **"Email/Password"**, uključi prvi prekidač (Enable) i spremi.

## 3. Kreiranje baze podataka (Firestore)

1. U lijevom izborniku klikni **Build → Firestore Database**.
2. Klikni **"Create database"**.
3. Odaberi lokaciju servera (bilo koja europska, npr. `eur3`) i klikni dalje.
4. Odaberi **"Start in production mode"** i klikni **Create**.

## 4. Postavljanje sigurnosnih pravila

Ovo je važan korak koji osigurava da klijent stvarno može mijenjati **samo težine**.

1. U Firestore Database otvori karticu **"Rules"**.
2. Obriši postojeći sadržaj i zalijepi cijeli sadržaj datoteke **`firestore.rules`** (nalazi se uz ovu aplikaciju).
3. Klikni **"Publish"**.

## 5. Povezivanje aplikacije s Firebaseom

1. U Firebase konzoli klikni na ikonu zupčanika gore lijevo → **Project settings**.
2. U sekciji **"Your apps"** klikni na ikonu **`</>`** (Web).
3. Upiši nadimak aplikacije (npr. `trening-web`) i klikni **"Register app"**. Hosting checkbox možeš ostaviti isključen.
4. Firebase će ti prikazati objekt `firebaseConfig` koji izgleda ovako:

```js
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "moj-trening.firebaseapp.com",
  projectId: "moj-trening",
  storageBucket: "moj-trening.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

5. Otvori datoteku **`firebase-config.js`** u ovoj aplikaciji i zamijeni placeholder vrijednosti stvarnima iz koraka 4.
6. U istoj datoteci možeš promijeniti i `TRENER_PRISTUPNI_KOD` (npr. u nešto što samo ti znaš) – taj kod sprječava da se netko slučajno registrira kao trener.

## 6. Objava aplikacije (hosting)

Da bi i trener i klijent mogli pristupiti istoj aplikaciji sa svojih telefona, potrebno je
postaviti je na internet. Najjednostavniji besplatni način je **Firebase Hosting**:

1. Instaliraj Node.js ako ga nemaš (https://nodejs.org).
2. Otvori terminal u mapi aplikacije i pokreni:

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
```

   - Kad pita koji Firestore/projekt koristiti, odaberi projekt koji si stvorio u koraku 1.
   - Kad pita "What do you want to use as your public directory?" upiši `.` (točka, znači trenutna mapa).
   - Kad pita "Configure as a single-page app?" odgovori **No**.
   - Ako pita da prepiše `index.html`, odgovori **No**.

3. Objavi aplikaciju:

```bash
firebase deploy --only hosting
```

4. Na kraju ćeš dobiti link poput `https://moj-trening.web.app` – to je adresa tvoje aplikacije.
   Pošalji taj link i treneru i klijentu.

Alternativa: ako ne želiš koristiti terminal, isti rezultat možeš postići i drag&drop uploadom
mape na neki drugi besplatni statički hosting (npr. Netlify Drop), sve dok su svi fileovi
(`index.html`, `app.html`, `app.js`, `style.css`, `firebase-config.js`, `manifest.json`, `sw.js`, `icons/`) zajedno u istoj mapi.

## 7. Instalacija na mobitel

Kad je aplikacija objavljena na internetu (korak 6), na telefonu:

**Android (Chrome):**
1. Otvori link u Chromeu.
2. Dodirni izbornik (tri točkice gore desno) → **"Dodaj na početni zaslon" / "Install app"**.

**iPhone (Safari):**
1. Otvori link u Safariju (mora biti Safari, ne Chrome).
2. Dodirni ikonu dijeljenja (kvadratić sa strelicom) → **"Dodaj na Home Screen"**.

Nakon toga na početnom ekranu telefona pojavljuje se ikona aplikacije koja se otvara
kao prava app, bez adresne trake preglednika.

## 8. Prvo korištenje

1. Trener prvi otvara aplikaciju i klikne **"Registriraj se"**, odabire ulogu **Trener**,
   upisuje pristupni kod (postavljen u `firebase-config.js`), ime, email i lozinku.
2. Nakon prijave, trener ide na **Profil → "Učitaj početni raspored (Trening 1–3)"** –
   time se u aplikaciju jednim klikom unosi cijeli raspored (Trening 1, 2 i 3) sa svim
   vježbama, serijama i trenutnim težinama.
3. Klijent otvara isti link, registrira se s ulogom **Klijent** (bez potrebe za kodom) i
   odmah vidi sve treninge koje je trener unio.
4. Klijent može dodirnuti polje **"Težina"** kraj bilo koje vježbe, upisati novu vrijednost
   i ta promjena se odmah sprema i vidljiva je i treneru.
5. Trener u svakom trenutku može dodavati nove treninge (gumb **+** dolje desno), dodavati/
   uređivati/brisati vježbe, mijenjati zagrijavanje, serije i ponavljanja.

## Napomene

- Sve promjene se sinkroniziraju automatski i u stvarnom vremenu – nije potrebno ručno
  osvježavanje stranice.
- Ako više klijenata treba koristiti istu aplikaciju sa svojim vlastitim rasporedima,
  potrebna je dodatna nadogradnja podatkovnog modela (trenutna verzija je napravljena
  za jednog trenera i jednog klijenta koji dijele isti raspored).
- Ako se pojavi greška vezana za "permission-denied", provjeri da su Firestore pravila
  iz koraka 4 objavljena (Publish), te da si prijavljen s ispravnom ulogom.
