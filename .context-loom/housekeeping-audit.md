# Housekeeping Review und Audit

Diese Datei beschreibt die Prüfmethode für gezielte Housekeeping-Reviews und umfassendere Repository-Audits in Context Loom.

Sie ergänzt:

- die Root-`AGENTS.md` des jeweiligen Repositories – organisationsweite und repo-spezifische Arbeitsregeln;
- `housekeeping.md` im selben `.context-loom/`-Verzeichnis – laufende Housekeeping-Vorgaben für jeden Arbeitsauftrag.

Housekeeping Review und Audit sind **Prüfaufträge**. Sie verändern nicht automatisch Dateien. Zunächst werden Findings mit Evidenz und Empfehlung erzeugt. Änderungen erfolgen anschließend bewusst in einem eigenen oder ausdrücklich erweiterten Arbeitsauftrag.

## Betriebsarten

### Review – change-scoped

Ein Housekeeping Review betrachtet eine konkrete Änderung, einen Branch, einen Merge-/Release-Kandidaten oder einen abgegrenzten Arbeitsauftrag.

Ziel:

> Prüfen, ob die Änderung fachlich und technisch sauber abgeschlossen ist und keine vermeidbaren Altlasten oder Inkonsistenzen hinterlässt.

Mindestens prüfen:

- vollständigen Diff und neue/verschobene/gelöschte Dateien;
- Bearbeitungsreste, Debug-Code, temporäre Dateien und lokale Artefakte;
- doppelte oder durch die Änderung überholte Implementierungen;
- unnötig gewordene Abhängigkeiten, Konfigurationen oder Hilfsskripte;
- Source-vs-generated Inkonsistenzen;
- README, ADRs, Architektur- und Betriebsdokumentation;
- interne Links und Pfade;
- Root-`AGENTS.md`, lokale `.context-loom/`-Dateien und ggf. zentralen `INDEX.md`;
- Tests, Lint, Build und relevante Smoke-Pfade;
- TODOs/Platzhalter, die nur aus der aktuellen Bearbeitung stammen.

### Audit – repository-scoped

Ein Housekeeping Audit betrachtet das Repository als Ganzes, unabhängig von einer einzelnen Änderung.

Ziel:

> Strukturelle Altlasten, Drift und überholte Inhalte sichtbar machen, die durch viele einzelne Änderungen entstanden sein können.

Mindestens prüfen:

#### Struktur
- verwaiste Dateien oder Verzeichnisse;
- parallele oder konkurrierende Implementierungswege;
- historische PoCs oder Demos ohne klaren aktuellen Zweck;
- generierte Artefakte an falscher Stelle;
- unklare Source-of-Truth-Situationen;
- inkonsistente Namensgebung und Pfadstruktur.

#### Code und Abhängigkeiten
- nicht mehr verwendeter Code;
- tote Feature-Flags, alte Adapter oder Kompatibilitätsschichten;
- ungenutzte Dependencies;
- doppelte Hilfsfunktionen oder Komponenten;
- nicht mehr erreichbare Migrations-/Setup-Pfade;
- veraltete Konfigurationen.

#### Dokumentation
- README ↔ Code ↔ Konfiguration Konsistenz;
- widersprüchliche oder überholte Architektur-/ADR-Aussagen;
- tote oder falsche Links;
- doppelte Dokumentation ohne klare Führungsrolle;
- undokumentierte zentrale Komponenten oder Betriebswege.

#### Agentische Arbeitsgrundlage
- Root-`AGENTS.md` vorhanden und plausibel;
- synchronisierter Shared-Block aktuell;
- `.context-loom/housekeeping.md` und `.context-loom/housekeeping-audit.md` vorhanden und aktuell;
- repo-spezifische Agentenregeln nicht versehentlich im synchronisierten Block abgelegt.

#### Context-Loom-Navigation
- Eintrag in `context-loom/.github/INDEX.md` korrekt;
- Repo-Zweck im Index noch zutreffend;
- Links/Namen aktuell;
- ggf. ausgelagerte Workbench-Themen dort nicht doppelt weitergeführt.

#### Lebenszyklus
Für Workbench-Themen zusätzlich prüfen:
- noch sinnvoll in `_workbench`;
- auslagerungsreif in eigenes Repository;
- mit anderem Thema zusammenzuführen;
- obsolet oder nur noch historische Referenz.

Für eigenständige Repositories zusätzlich prüfen:
- weiterhin aktiv bzw. sinnvoll eigenständig;
- durch ein anderes Repo ersetzt;
- zusammenführungs- oder archivierungsreif;
- Demo-/Mirror-/Deploy-Rolle weiterhin korrekt abgegrenzt.

### Audit – organisation-scoped

Ein organisationsweiter Housekeeping Audit betrachtet **Context Loom als zusammenhängenden Bestand**: alle Repositories, die `_workbench`, den zentralen Index und die organisationsweiten Vorgaben.

Ziel:

> Übergreifende Drift, Redundanzen, Lücken und unklare Zuständigkeiten sichtbar machen, die innerhalb eines einzelnen Repositories nicht erkennbar sind.

Mindestens prüfen:

#### Repository-Landschaft
- sind alle aktiven Repositories im zentralen `INDEX.md` erfasst;
- stimmen Name, Zweck und fachliche Gruppierung noch;
- gibt es Repositories mit stark überlappendem oder inzwischen identischem Zweck;
- gibt es verwaiste, ersetzte, experimentelle oder nur noch historische Repositories;
- sind Demo-, Deploy-, Mirror-, Infrastruktur- und Quell-Repositories klar voneinander abgegrenzt;
- gibt es sinnvolle Kandidaten für Zusammenführung, Archivierung oder Aufteilung.

#### Workbench und Lebenszyklus
- sind wesentliche Themen aus `_workbench` im Index auffindbar;
- liegen Themen noch sinnvoll in `_workbench` oder sind sie auslagerungsreif;
- existieren Workbench-Themen parallel zu bereits ausgelagerten Repositories;
- gibt es thematisch doppelte oder stark überlappende Workbench-Dateien;
- sind veraltete, aufgegebene oder rein historische Ansätze entsprechend erkennbar;
- fehlen für erkennbare Themen geeignete Ziel-Repositories oder Zusammenführungen.

#### Übergreifende Architektur und Standards
- widersprechen sich Architekturentscheidungen zwischen verwandten Repositories ohne erkennbare Begründung;
- werden gemeinsame Standards aus `software-engineering-standards` angewendet oder Abweichungen bewusst dokumentiert;
- entstehen gleiche technische Grundbausteine mehrfach ohne bewusste Wiederverwendungsentscheidung;
- gibt es wiederkehrende Muster, die als gemeinsamer Standard, Template, Tool oder Bibliothek zentralisiert werden sollten;
- sind organisationsweite Namens-, Struktur- und Dokumentationskonventionen noch zweckmäßig.

#### Agentische Governance
- Root-`AGENTS.md` in allen relevanten Repositories vorhanden;
- Shared-Block organisationsweit aktuell und konsistent;
- `.context-loom/housekeeping.md` und `.context-loom/housekeeping-audit.md` überall synchron;
- organisationsweite Regeln stehen in `.github`, repo-spezifische Regeln lokal;
- lokale Regeln widersprechen organisationsweiten Vorgaben nicht unbeabsichtigt;
- Sync-Skript und Governance-Dokumentation entsprechen dem tatsächlich verwendeten Verteilungsmodell.

#### Wissen und Dokumentation
- ist relevantes Wissen auffindbar oder über mehrere Repositories/Workbench-Dateien unnötig fragmentiert;
- existieren widersprüchliche Beschreibungen desselben Systems oder Konzepts;
- gibt es mehrfach gepflegte Listen, Übersichten oder Architekturabbildungen ohne klare Source of Truth;
- sind zentrale Querverweise zwischen eng verwandten Projekten vorhanden;
- ist der zentrale Index knapp genug für Navigation und vollständig genug zum Entdecken.

#### Gemeinsame technische Abhängigkeiten
- werden dieselben externen Dienste, Bibliotheken oder Infrastrukturkomponenten in vielen Repositories unterschiedlich und womöglich veraltet beschrieben;
- gibt es organisationsweit bekannte abgekündigte oder ersetzte Komponenten;
- sind gemeinsam genutzte Integrationen, Gateways oder Betriebswege konsistent dokumentiert;
- entstehen unnötige parallele Betriebs- oder Deployment-Muster.

#### Audit-Ergebnis auf Organisationsebene

Zusätzlich zu einzelnen Findings sollte ein organisationsweiter Audit eine kompakte **Portfolio-Sicht** liefern:

- Repositories: `keep | merge | split | archive | investigate`;
- Workbench-Themen: `keep | promote | merge | archive | investigate`;
- organisationsweite Vorgaben: `current | update needed`;
- erkannte gemeinsame Standards oder Komponenten mit Zentralisierungspotenzial.

Ein organisationsweiter Audit darf Repositories oder Workbench-Themen **nicht allein aufgrund geringer Aktivität** als obsolet einstufen. Zweck, fachlicher Wert, Historie und Abhängigkeiten sind mit zu berücksichtigen.

## Finding-Format

Findings möglichst in folgender Struktur dokumentieren:

```text
ID:
Bereich:
Finding:
Evidenz:
Auswirkung/Risiko:
Empfehlung:
Aktion: remove | merge | archive | keep | update | investigate
Priorität: low | medium | high
```

Bei kleinen Reviews darf die Darstellung kompakter sein, solange **Finding, Evidenz und Empfehlung** eindeutig bleiben.

## Bewertungsgrundsätze

- Nicht alles Alte ist automatisch überflüssig.
- Historische Entscheidungen und Dokumentation können weiterhin wertvoll sein.
- Ein Audit soll Unsicherheit sichtbar machen statt ungeprüft zu löschen.
- Redundanz ist nur dann ein Finding, wenn Führungsrolle oder Zweck unklar sind oder Pflegeaufwand/Fehlerrisiko entsteht.
- Abweichungen von heutigen Standards sind nicht automatisch Fehler, wenn sie bewusst begründet oder durch Bestand/Anforderungen erforderlich sind.
- Sicherheits-, Datenverlust- und Source-of-Truth-Probleme haben Vorrang vor kosmetischen Strukturfragen.

## Ergebnis eines Audits

Ein Audit endet grundsätzlich mit:

1. kurzer Zustandsbewertung;
2. priorisierter Finding-Liste;
3. empfohlenen Maßnahmen;
4. expliziten Punkten, die **nicht** automatisch geändert werden sollen;
5. optionalem Folgeauftrag für die Umsetzung.

Erst wenn der Auftrag ausdrücklich auch die Bereinigung umfasst, dürfen unstrittige Findings direkt umgesetzt werden. Destruktive oder fachlich mehrdeutige Maßnahmen bleiben getrennte Entscheidungen.
