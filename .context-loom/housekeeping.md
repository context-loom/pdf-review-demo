# Housekeeping für agentische Bearbeitung

Diese Regeln beschreiben den Mindeststandard für das Aufräumen und Abschließen agentischer Änderungen in Context-Loom-Repositories.

Sie ergänzen die organisationsweiten Regeln in der Root-`AGENTS.md` des jeweiligen Repositories. Repo-spezifische Anweisungen können zusätzliche oder strengere Anforderungen festlegen.

## Ziel

Eine agentische Bearbeitung soll nicht nur fachlich funktionieren, sondern das Repository in einem **nachvollziehbaren, wartbaren und konsistenten Zustand** hinterlassen.

Insbesondere sollen keine zufälligen Nebenprodukte, parallelen Lösungswege, veralteten Verweise oder nur für die Bearbeitung benötigten Hilfsdateien zurückbleiben.

## Vor der Bearbeitung

Vor Änderungen:

1. Root-`AGENTS.md` und relevante Projekt-/Bereichsdokumentation lesen.
2. Bestehende Struktur, Konventionen und Architekturentscheidungen prüfen.
3. Vorhandene Änderungen oder bereits begonnene Arbeiten respektieren; nicht ungeprüft überschreiben oder zurücksetzen.
4. Prüfen, ob die gewünschte Funktion bereits an anderer Stelle existiert oder bewusst anders gelöst wurde.
5. Bei generierten oder veröffentlichten Artefakten klären, **welche Quelle führend ist**. Ausgabe-/Deploy-Artefakte nicht anstelle ihrer Quelle weiterentwickeln.

## Während der Bearbeitung

### Änderungen fokussiert halten

- Nur Dateien ändern, die für den Auftrag oder eine unmittelbar notwendige Konsistenzkorrektur relevant sind.
- Keine beiläufigen großflächigen Refactorings ohne fachlichen Grund.
- Bestehende Lösungen bevorzugt erweitern statt eine zweite parallele Implementierung anzulegen.
- Neue Abstraktionen, Verzeichnisse oder Hilfsschichten nur anlegen, wenn sie einen erkennbaren dauerhaften Zweck haben.

### Keine Bearbeitungsreste hinterlassen

Nicht dauerhaft ablegen, sofern nicht ausdrücklich Bestandteil des Projekts:

- temporäre Dateien;
- Debug-Ausgaben und Diagnose-Dumps;
- ad-hoc Testdateien;
- Screenshots oder Exporte zur persönlichen Zwischenprüfung;
- lokale Cache-, Build- oder Coverage-Artefakte;
- Sicherungskopien wie `*.bak`, `*.old`, `copy-of-*`;
- auskommentierte Altimplementierungen statt Versionshistorie;
- einmalige Migrations-/Hilfsskripte ohne dokumentierten weiteren Zweck.

Wenn solche Dateien für reproduzierbare Tests, Fixtures, Beispiele oder Betrieb benötigt werden, müssen Zweck und Ablage bewusst erkennbar sein.

### Quelle und generierte Ausgabe trennen

- Generierte Dateien nicht manuell so ändern, dass die Änderung bei der nächsten Generierung verloren geht.
- Wenn generierte Ergebnisse versioniert werden müssen, zuerst die Quelle ändern und danach reproduzierbar neu erzeugen.
- Deploy-/Demo-/Mirror-Repositories nur entsprechend ihrer ausdrücklich dokumentierten Rolle bearbeiten.

### Sicherheit und Datenhygiene

- Keine Secrets, Tokens, Passwörter, privaten Schlüssel oder produktiven Zugangsdaten committen.
- Keine unnötigen personenbezogenen, Kunden- oder Produktionsdaten als Testmaterial ablegen.
- Logs, Fixtures und Beispiele auf vertrauliche Inhalte prüfen.

## Vor Abschluss der Bearbeitung

Vor dem Abschluss einer Änderung aktiv prüfen:

### 1. Repository-Zustand

- Welche Dateien wurden tatsächlich geändert, angelegt, verschoben oder gelöscht?
- Gehören alle Änderungen zum Auftrag?
- Gibt es versehentliche Nebenänderungen?
- Gibt es neue unversionierte bzw. nicht berücksichtigte Dateien?
- Sind Umbenennungen und Löschungen vollständig nachvollzogen?

### 2. Veraltete und doppelte Inhalte

Prüfen, ob durch die Änderung etwas obsolet geworden ist:

- alte Implementierung;
- nicht mehr verwendete Datei;
- überholte Konfiguration;
- ungenutzte Abhängigkeit;
- doppelter Code oder doppelte Dokumentation;
- veralteter Link;
- überholte README-/Architektur-/ADR-Aussage;
- alter Workbench-Eintrag nach Auslagerung in ein Repository.

Obsolete Inhalte bewusst entfernen oder als weiterhin benötigt begründen. Nicht automatisch historische oder fachlich relevante Dokumentation löschen.

### 3. Qualitätssicherung

Soweit für das Repository vorhanden und sinnvoll:

- Tests ausführen;
- Linter/Formatter ausführen;
- Build durchführen;
- betroffene Start-, Import-, Migrations- oder Smoke-Pfade prüfen.

Fehlende oder nicht ausführbare Prüfungen transparent benennen; keinen erfolgreichen Check behaupten, der nicht durchgeführt wurde.

### 4. Dokumentation und Navigation

Prüfen, ob die Änderung Auswirkungen hat auf:

- lokales `README.md`;
- Architektur-/ADR-/Betriebsdokumentation;
- lokale `AGENTS.md`;
- Links innerhalb des Repositories;
- `context-loom/.github/INDEX.md`.

Strukturelle Änderungen gelten erst dann als vollständig, wenn die dazugehörige Navigation und Dokumentation nicht offensichtlich veraltet zurückbleibt.

### 5. Abschluss-Diff

Vor Übergabe den gesamten eigenen Änderungsumfang noch einmal als Einheit betrachten:

- Ist er kleiner und klarer als während der Bearbeitung?
- Gibt es Debug-Code, Platzhalter oder TODOs, die nur aus der Bearbeitung stammen?
- Sind Namen, Pfade und Kommentare konsistent?
- Ist erkennbar, welche Quelle bzw. welches Dokument führend ist?
- Würde ein anderer Agent die Arbeit ohne Chat-Kontext sinnvoll fortsetzen können?

## Grundsatz

> Agentische Bearbeitung endet nicht mit „funktioniert“, sondern mit einem Repository-Zustand, der ohne den Bearbeitungskontext verständlich und weiterbearbeitbar bleibt.

Housekeeping bedeutet dabei **nicht**, historische Informationen oder bewusst bestehende Varianten aggressiv zu löschen. Aufräumen erfolgt immer innerhalb des fachlichen Auftrags und unter Wahrung bestehender Entscheidungen.
