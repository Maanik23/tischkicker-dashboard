# Tischkicker Dashboard

Ein modernes Dashboard für die Verwaltung von Tischkicker-Turnieren mit React, Firebase und Tailwind CSS.

## Features

- 📊 **Dashboard**: Übersicht über Statistiken und Punkteverlauf
- 🏆 **Rangliste**: Aktuelle Spieler-Rangliste mit detaillierten Statistiken
- 👥 **Spieler-Verwaltung**: Hinzufügen und Verwalten von Spielern
- ⚽ **Spiel-Eingabe**: Neue Matches eintragen (Best of 3)
- 📈 **Live-Updates**: Echtzeit-Updates über Firebase
- 🎨 **Modernes Design**: Responsive UI mit Tailwind CSS

## Voraussetzungen

- Node.js (LTS Version)
- npm oder yarn
- Firebase-Projekt

## Installation

1. **Repository klonen oder Dateien herunterladen**

2. **Abhängigkeiten installieren**
   ```bash
   npm install
   ```

3. **Firebase-Konfiguration einrichten**
   
   Kopiere die Datei `env.example` zu `.env.local`:
   ```bash
   cp env.example .env.local
   ```
   
   Bearbeite `.env.local` und füge deine Firebase-Konfiguration ein:
   ```env
   VITE_FIREBASE_API_KEY="dein-api-key"
   VITE_FIREBASE_AUTH_DOMAIN="dein-projekt.firebaseapp.com"
   VITE_FIREBASE_PROJECT_ID="dein-projekt-id"
   VITE_FIREBASE_STORAGE_BUCKET="dein-projekt.appspot.com"
   VITE_FIREBASE_MESSAGING_SENDER_ID="123456789"
   VITE_FIREBASE_APP_ID="1:123456789:web:abcdef123456"
   ```

4. **Entwicklungsserver starten**
   ```bash
   npm run dev
   ```

5. **Anwendung öffnen**
   
   Öffne [http://localhost:5173](http://localhost:5173) in deinem Browser.

## Firebase-Setup

1. **Firebase-Projekt erstellen**
   - Gehe zu [Firebase Console](https://console.firebase.google.com/)
   - Erstelle ein neues Projekt oder verwende ein bestehendes

2. **Firestore Database aktivieren**
   - Gehe zu "Firestore Database" im Firebase Console
   - Klicke auf "Datenbank erstellen"
   - Wähle "Testmodus starten" für die Entwicklung

3. **Web-App hinzufügen**
   - Gehe zu "Projekteinstellungen" (Zahnrad-Symbol)
   - Unter "Deine Apps" klicke auf das Web-Symbol
   - Registriere die App und kopiere die Konfiguration

4. **Sicherheitsregeln (optional)**
   
   Für die Produktion solltest du Firestore-Sicherheitsregeln konfigurieren:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /artifacts/{appId}/public/data/{document=**} {
         allow read, write: if true; // Für Entwicklung
       }
     }
   }
   ```

## Verwendung

### Spieler hinzufügen
1. Gehe zur "Spieler"-Seite
2. Gib den Namen des Spielers ein
3. Klicke auf "Hinzufügen"

### Neues Spiel eintragen
1. Gehe zur "Neues Spiel"-Seite
2. Wähle zwei verschiedene Spieler aus
3. Gib die Punkte ein (0-3 für jeden Spieler)
4. Klicke auf "Spiel eintragen"

### Rangliste anzeigen
- Die Rangliste wird automatisch basierend auf den gespielten Matches berechnet
- Punkte: 3 für Sieg, 1 für Teilnahme
- Bei gleichen Punkten entscheidet die Tordifferenz

## Projektstruktur

```
kicker-dashboard/
├── src/
│   ├── App.jsx          # Hauptkomponente
│   ├── main.jsx         # Einstiegspunkt
│   └── index.css        # Tailwind CSS
├── public/              # Statische Dateien
├── package.json         # Abhängigkeiten
├── vite.config.js       # Vite-Konfiguration
├── tailwind.config.js   # Tailwind-Konfiguration
├── postcss.config.js    # PostCSS-Konfiguration
├── .env.local           # Firebase-Konfiguration (nicht im Git)
└── README.md           # Diese Datei
```

## Technologien

- **React 18**: Moderne React-Features und Hooks
- **Vite**: Schneller Build-Tool und Dev-Server
- **Firebase**: Backend-as-a-Service (Auth, Firestore)
- **Tailwind CSS**: Utility-first CSS Framework
- **Lucide React**: Moderne Icons
- **Recharts**: React-Charting-Bibliothek

## Entwicklung

### Verfügbare Scripts

- `npm run dev` - Startet den Entwicklungsserver
- `npm run build` - Erstellt eine Produktions-Build
- `npm run preview` - Zeigt die Produktions-Build lokal an
- `npm run lint` - Führt ESLint aus

### Anpassungen

- **Styling**: Bearbeite `src/index.css` oder `tailwind.config.js`
- **Komponenten**: Alle Komponenten sind in `src/App.jsx` definiert
- **Firebase-Pfade**: Ändere `appId` in `src/App.jsx` für verschiedene Umgebungen

## Deployment

### Vercel (Empfohlen)
1. Verbinde dein GitHub-Repository mit Vercel
2. Setze die Umgebungsvariablen in Vercel
3. Deploy automatisch bei jedem Push

### Netlify
1. Verbinde dein Repository mit Netlify
2. Build-Kommando: `npm run build`
3. Publish-Directory: `dist`

### Firebase Hosting
1. Installiere Firebase CLI: `npm install -g firebase-tools`
2. Login: `firebase login`
3. Initialisiere: `firebase init hosting`
4. Deploy: `firebase deploy`

## Support

Bei Fragen oder Problemen:
1. Überprüfe die Firebase-Konfiguration
2. Schaue in die Browser-Konsole für Fehlermeldungen
3. Stelle sicher, dass alle Abhängigkeiten installiert sind

## Lizenz

MIT License - siehe LICENSE-Datei für Details. 