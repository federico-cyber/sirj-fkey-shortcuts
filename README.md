# SIRJ F-key shortcuts

Userscript Tampermonkey che ripristina gli shortcut **F1–F12** della webapp
gestionale **SIRJ** (framework Unify NXJ su JBoss) quando viene aperta in
**Chrome moderno senza IE Mode**, permettendone l'uso su **macOS / Linux**
senza più dover passare per Windows.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Installazione (1 click, con auto-update)

1. Installa [Tampermonkey](https://www.tampermonkey.net/) su Chrome
2. Apri questo link nel browser dove vuoi installarlo:
   <https://raw.githubusercontent.com/federico-cyber/sirj-fkey-shortcuts/main/sirj-fkeys.user.js>
3. Tampermonkey intercetta il file `.user.js` e mostra la schermata di
   installazione → click **"Installa"**
4. Ricarica le tab SIRJ già aperte (Cmd+R / Ctrl+R)

Da qui in poi Tampermonkey controlla automaticamente l'URL ogni ~24h e applica
ogni nuova versione pushata su `main`. Per forzare un check manuale: dashboard
Tampermonkey → click sullo script → tab "Settings" → "Check for updates".

## Problema risolto

SIRJ è una webapp IE-era (HTML4 + `<input type="image">` con handler attaccati
dal framework NXJ via `_nxjonclickset`). Il suo JavaScript di gestione tastiera
usa pattern compatibili solo con il vecchio motore Trident di IE
(`window.event`, `attachEvent`, listener su `keypress` per tasti F):

- Chrome (e Safari/Firefox) **carica e visualizza SIRJ correttamente**
- I tasti F (F1–F12) vengono ignorati dalla pagina perché i listener IE-only
  non scattano sui browser moderni
- IE Mode di Microsoft Edge **non è disponibile su macOS / Linux** (richiede
  `mshtml.dll` / `ieframe.dll`, componenti Windows-only)

Quindi prima di questo userscript, l'unica via per usare SIRJ su Mac era
una VM Windows o un RDP a un PC Windows. Adesso: Chrome + Tampermonkey + questo
userscript.

## Scenario diagnostico

Tre scenari possibili quando una webapp IE Mode viene aperta in Chrome:

| Scenario | Cosa si rompe | Recuperabile via estensione? |
|---|---|---|
| **A** — IE Mode serve per il rendering (ActiveX/Trident) | tutto: layout, login, AJAX | no, serve il motore Trident |
| **B** — SIRJ va, ma Chrome intercetta gli F-key | solo l'input F-key | parziale |
| **C** — SIRJ va, JS è IE-only e ignora gli F-key | F-key inerti | sì, con userscript che intercetta e clicca i bottoni |

**SIRJ ricade nello scenario C.** Test eseguito con:

```js
document.addEventListener('keydown', e => {
  if (/^F\d+$/.test(e.key)) console.log(e.key);
}, true);
```

Premendo F1–F10 fisicamente: **tutti gli eventi arrivano alla pagina**
(Chrome non li intercetta) ma SIRJ non reagisce → diagnosi C confermata.

## Soluzione

Lo userscript:

1. Intercetta `keydown` su tutto il documento (capture phase)
2. Per ogni combinazione F-key mappata, fa `preventDefault` + `stopPropagation`
3. Cerca nel DOM il bottone NXJ corrispondente via attributo `title=`
4. Chiama `.click()` su quel bottone — l'handler NXJ scatena l'azione
5. Se il bottone è in stato `disabled`, emette **beep** (Web Audio API) +
   **toast giallo** per 1.5s come feedback "azione non disponibile qui"

I bottoni SIRJ hanno `title` che include il suffisso shortcut (es. `Trova (F3)`,
`Salva (F9)`), quindi il selettore fa prefix matching:
`title === base` OPPURE `title.startsWith(base + ' (')`.

## Mapping F-key → azione

| Combinazione | Azione SIRJ | Title nel DOM |
|---|---|---|
| F1 | Maschera precedente | `Maschera precedente` |
| F2 | Maschera successiva | `Maschera successiva` |
| F3 | Trova | `Trova (F3)` |
| F4 | Record successivo | `Record successivo (F4)` |
| F5 | Help | `Help (F5)` |
| F6 | Record precedente | `Record precedente (F6)` |
| F7 | Aggiungi | `Aggiungi (F7)` |
| F9 | Salva | `Salva (F9)` |
| Shift+F3 | Modalità ricerca | `Modalità ricerca (shift-F3)` |
| Shift+F7 | Vai all'ultimo record | `Vai al'ultimo record (shift-F7)` |
| Shift+F8 | Elimina | `Elimina (shift-F8)` |
| Shift+F9 | Annulla zoom | `Annulla zoom (shift-F9)` |
| Shift+F10 | Zoom | `Zoom (shift-F10)` |
| Shift+F12 | Stampa | `Stampa` |

## Limiti

- **F12 da solo** non è intercettabile in Chrome (riservato a DevTools).
  SIRJ usa solo `Shift+F12` per Stampa, quindi non è un problema.
- **F11 da solo** in alcuni OS/browser è riservato al fullscreen. SIRJ non lo usa.
- I bottoni in stato `disabled` non reagiscono al click programmatico
  (comportamento identico al click col mouse). Lo userscript fornisce feedback
  beep + toast in questi casi.
- Sul **Mac**, di default i tasti F1–F12 sono media keys (luminosità, volume,
  ecc.). Se non funzionano: **Impostazioni di sistema → Tastiera → Tasti
  funzione** → attivare **"Usa i tasti F1, F2, ecc. come tasti funzione
  standard"**. Da quel momento per luminosità/volume serve `Fn+F1`, `Fn+F12`.

## Personalizzazione URL SIRJ

Lo userscript ha `@match http://192.168.0.121:8180/*` configurato per il
server SIRJ di AR AUTO. Se il vostro server è su un altro IP/porta, fork
della repo e modificare la riga `@match` di conseguenza. Esempi:

```
@match http://sirj.azienda.local/*
@match *://192.168.x.y:8180/*
```

## Architettura SIRJ rilevante per il fix

- **Server:** JBoss / Tomcat (verificato su porta 8180)
- **Framework:** Unify NXJ (Net-IT) — i bottoni sono renderizzati come
  `<input type="image">` con `name="<azione>"`, `title="<descrizione (Fkey)>"`,
  e attributo custom `_nxjonclickset="true"` che indica handler attaccato dal
  framework
- **Routing:** path `/SJLogistica/`, `/SJCicloAttivo/`, etc. — startform JSP
  che redirige a `*.nxj?managerId=...`
- **Session:** il `managerId` nell'URL è la sessione SIRJ; quando scade,
  SIRJ apre automaticamente una nuova tab con un manager fresco


## F2 contestuale (Dialog lookup)

In SIRJ, F2 ha **due significati a seconda del focus**:

- **Globale** (focus fuori da un campo lookup): apre la maschera successiva
  (toolbar)
- **Contestuale** (focus su un campo con icona Zoom adiacente,
  es. `Cliente_cui_sped`): apre il **dialog di lookup** del campo
  (es. dettaglio/ricerca cliente)

L'`@v1.4.0`+ replica entrambi i comportamenti: lo userscript controlla se
`document.activeElement` ha un fratello/cugino `input[type=image][src*="Zoom_icon"]`
nei prossimi 6 livelli di parent. Se sì, F2 clicca quell'icona (NXJ apre il
dialog). Altrimenti fallback su "Maschera successiva".

## Roadmap

- [ ] Mappare anche Shift+F1, Shift+F2, Shift+F11 (se SIRJ li usa altrove)
- [ ] Toggle per disattivare il beep (preferenze utente in `localStorage`)
- [ ] Statistiche d'uso opzionali (quale F-key viene premuto più spesso)
- [ ] Test su altre installazioni SIRJ con configurazioni diverse

## Licenza

MIT — vedi [LICENSE](./LICENSE).

## Contesto

Sviluppato per AR AUTO (Melegnano, MI) per dismettere il PC Windows
dedicato a SIRJ. Il fornitore SIRJ non aveva (al 2026-05-26) una versione
browser-moderno disponibile; questo shim sblocca l'uso macOS-native.
