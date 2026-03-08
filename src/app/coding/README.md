# Coding Module

Der Bereich `Coding` ist das dauerhafte Entwicklungs-Kontrollzentrum innerhalb des Dashboards.

## Zweck
- Multi-Agent-Steuerung für App-Weiterentwicklung
- persistente Wissensbasis aus Dateien, Sessions und Snapshots
- vorbereitete API-/Modell-Konfigurationen
- Freigabe-vor-Ausführung für echte App-Änderungen
- mobile Nutzung auf iPhone und kleinen Displays

## Hauptbereiche
- `Agent`: Agentenauswahl, Denkmodus, Qualitätsmodus, Freigabe-Workflow
- `API`: Provider, Modell, Endpoint, Health, Credits, Nutzung
- `Files`: Upload und Wissensindex für `.md`, Flows, Core-Dateien und Memory-Dateien
- `Sessions`: Snapshots, Autosave und wiederherstellbare Entwicklungs-Sessions

## Persistenz
Die zugehörigen UI-Daten werden über den Zustand in `src/store/index.ts` gespeichert.

## Hinweis
Die aktuelle Implementierung ist ein professionelles Frontend-Control-Center mit lokaler Persistenz. Reale automatische Dateischreib-, Browser- und Login-Aktionen sollten später über dedizierte Backend-APIs mit Audit- und Freigabe-Workflow ergänzt werden.
