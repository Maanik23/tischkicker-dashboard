# WAMOCON Kicker Arena

Die WAMOCON Kicker Arena ist eine moderne Webanwendung zur Verwaltung und Verfolgung von Tischkicker-Ergebnissen. Sie bietet eine globale Rangliste für alle Spieler sowie einen dedizierten Turniermodus, um strukturierte Wettbewerbe durchzuführen.

Das Dashboard ist mit React, Vite und Firebase erstellt und verwendet Tailwind CSS für ein ansprechendes, responsives Design.

![Turnier-Übersicht](https://i.imgur.com/your-screenshot-url.png) <!-- Fügen Sie hier einen Screenshot Ihrer App ein -->

## Features

Die Anwendung ist in zwei Hauptmodi unterteilt:

### 🌍 Globaler Modus

-   **Dashboard**: Bietet eine schnelle Übersicht über die wichtigsten Statistiken wie den Top-Spieler, Gesamtspieler- und Match-Anzahl.
-   **Umfassende Rangliste**: Sortiert alle Spieler nach Punkten, Siegen und Tordifferenz. Ränge (Bronze bis Meister) visualisieren den Spieler-Skill.
-   **Spieler-Verwaltung**: Einfaches Hinzufügen und Anzeigen von Spielern, die an den Matches teilnehmen.
-   **Match-Erfassung**: Ein intuitives Formular, um neue Spielergebnisse schnell und einfach zu speichern.
-   **Datenvisualisierung**: Interaktive Diagramme zeigen den Punkteverlauf der Top-Spieler sowie deren Sieg/Niederlage-Verhältnisse.

### 🏆 Turnier-Modus

-   **Turnier-Erstellung**: Erstellen Sie neue Turniere mit nur einem Klick.
-   **Flexibles Teilnehmer-Management**: Fügen Sie Teilnehmer aus der globalen Spielerliste über ein Dropdown-Menü hinzu oder entfernen Sie sie, solange das Turnier noch nicht gestartet ist.
-   **Automatisierte Spiel-Generierung**: Nach dem Starten eines Turniers wird automatisch ein Round-Robin-Spielplan erstellt (jeder spielt gegen jeden).
-   **Spiel-Erfassung**: Tragen Sie die Ergebnisse für jedes Turnierspiel ein.
-   **Turnier-Statistiken**: Eine dedizierte Rangliste und ein Punkte-Chart für jedes Turnier, um den Fortschritt zu verfolgen.
-   **Visueller Turnierbaum**: Eine an das Champions-League-Design angelehnte Visualisierung der Begegnungen der ersten Runde.

## Tech Stack

-   **Frontend**: React, Vite
-   **Backend & Datenbank**: Firebase (Realtime Database, Hosting)
-   **Styling**: Tailwind CSS
-   **Diagramme**: Recharts, Chart.js
-   **UI-Komponenten**: Lucide React (Icons), React Select

## Getting Started

Folgen Sie diesen Schritten, um das Projekt lokal einzurichten und auszuführen.

### Voraussetzungen

-   Node.js (v18 oder höher)
-   npm (wird mit Node.js installiert)
-   Ein Firebase-Projekt

### 1. Repository klonen

```bash
git clone https://github.com/your-username/kicker-dashboard.git
cd kicker-dashboard
```

### 2. Abhängigkeiten installieren

```bash
npm install
```

### 3. Firebase konfigurieren

1.  Erstellen Sie ein neues Projekt in der [Firebase Console](https://console.firebase.google.com/).
2.  Gehen Sie zu den Projekteinstellungen und fügen Sie eine neue Web-App hinzu.
3.  Kopieren Sie das `firebaseConfig`-Objekt.
4.  Erstellen Sie eine neue Datei unter `src/firebaseConfig.js`.
5.  Fügen Sie Ihre Konfiguration in die Datei ein und exportieren Sie die `db`-Instanz, wie unten gezeigt:

```javascript
// src/firebaseConfig.js

import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

// TODO: Ersetzen Sie dies mit Ihrer Firebase-Konfiguration
const firebaseConfig = {
  apiKey: "AIza....",
  authDomain: "your-project-id.firebaseapp.com",
  databaseURL: "https://your-project-id.firebaseio.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "...",
  appId: "..."
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
```

### 4. Anwendung starten

Um den lokalen Entwicklungsserver zu starten:

```bash
npm run dev
```

Die Anwendung ist nun unter `http://localhost:5173` (oder einem anderen Port, falls dieser besetzt ist) verfügbar.

### 5. Produktiv-Build erstellen

Um die Anwendung für die Produktion zu kompilieren:

```bash
npm run build
```

Die fertigen Dateien werden im `dist`-Ordner abgelegt.

## Deployment

Das Projekt ist für das Deployment mit Firebase Hosting vorkonfiguriert.

1.  **Firebase CLI installieren** (falls noch nicht geschehen):
    ```bash
    npm install -g firebase-tools
    ```
2.  **Einloggen**:
    ```bash
    firebase login
    ```
3.  **Deployment durchführen**:
    Stellen Sie sicher, dass Sie `npm run build` ausgeführt haben. Führen Sie dann den folgenden Befehl aus:
    ```bash
    firebase deploy --only hosting
    ```

## Lizenz

Dieses Projekt ist unter der MIT License lizenziert. Siehe die `LICENSE`-Datei für Details.
