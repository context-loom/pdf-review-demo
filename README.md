# PDF Review Demo

Dieses Repository ist **ausschließlich Deploy-/Ausgabe-Repository** für die statische GitHub-Pages-Demo.

## Verbindliche Regel

- **Keine Entwicklung und keine manuellen Codeänderungen in diesem Repository.**
- Dateien wie `index.html`, `app.mjs`, Styles, Module, Test-PDF und `vendor/` werden ausschließlich aus dem erzeugten `dist/` des Entwicklungs-Repositories `context-loom/pdf-review` übernommen.
- Änderungen erfolgen immer zuerst im Quellcode von `context-loom/pdf-review`, werden dort getestet und gebaut und anschließend als vollständiger `dist/`-Stand hierher veröffentlicht.
- Der Inhalt dieses Repositories darf daher jederzeit durch einen neuen Build vollständig ersetzt werden.
- Ein Stand hier ist nur dann reproduzierbar, wenn er auf einen konkreten Commit des Entwicklungs-Repositories verweist.

## Aktueller veröffentlichter Stand

Letzter reproduzierbarer Build vor der erneuten Quellcode-Integration:

`context-loom/pdf-review@dc164f4fe2b99e5b4706470b0502b9b2e89adc64`

GitHub Pages veröffentlicht `main` aus `/ (root)`.

PDF.js und gebündelte Fonts behalten ihre jeweiligen Lizenzen unter `vendor/`.
