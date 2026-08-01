/* ============================================================
   FIREBASE-KONFIGURATION
   ------------------------------------------------------------
   So verbindest du die Seite mit deiner eigenen Datenbank:

   1. Gehe auf https://console.firebase.google.com und lege ein
      neues Projekt an (kostenlos).
   2. Klicke auf "Web-App hinzufügen" (</>). Firebase zeigt dir
      dann ein "firebaseConfig"-Objekt an.
   3. Kopiere die Werte unten hinein (apiKey, databaseURL usw.).
   4. Aktiviere links im Menü die "Realtime Database".
      Region z. B. "europe-west1".
   5. Setze für den Testbetrieb die Regeln auf (Achtung: offen!):
        { "rules": { ".read": true, ".write": true } }
      Für den Livebetrieb solltest du das später einschränken.

   Solange hier die Platzhalter stehen, läuft die Seite im
   DEMO-MODUS: Alles funktioniert, aber nichts wird dauerhaft
   gespeichert oder mit anderen geteilt.
   ============================================================ */

window.FIREBASE_CONFIG = {
  apiKey:            "DEIN_API_KEY",
  authDomain:        "DEIN_PROJEKT.firebaseapp.com",
  databaseURL:       "https://DEIN_PROJEKT-default-rtdb.europe-west1.firebasedatabase.app",
  projectId:         "DEIN_PROJEKT",
  storageBucket:     "DEIN_PROJEKT.appspot.com",
  messagingSenderId: "000000000000",
  appId:             "1:000000000000:web:xxxxxxxxxxxx"
};
