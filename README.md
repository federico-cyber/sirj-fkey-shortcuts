# SIRJ F-key shortcuts

Userscript Tampermonkey che ripristina gli shortcut **F1–F12** della webapp
gestionale **SIRJ** (framework Unify NXJ su JBoss) quando viene aperta in
**Chrome moderno senza IE Mode**, permettendone l'uso su **macOS / Linux**
senza più dover passare per Windows.

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
- I bottoni in stato `disabled` (es. "Maschera successiva" quando sei
  nell'ultima maschera) non reagiscono al click programmatico — comportamento
  identico al click col mouse. Lo userscript emette un **beep + toast** di
  feedback per indicare "azione non disponibile qui".

## Installazione

### Prerequisiti

- Chrome (testato su macOS, funziona anche Windows/Linux)
- Estensione [Tampermonkey](https://www.tampermonkey.net/)

### Installazione userscript

1. Click sull'icona Tampermonkey → **Dashboard**
2. Click **"+"** (Crea nuovo userscript)
3. **Cancella tutto** il template di default (Cmd+A → Delete)
4. **Copia e incolla** il contenuto di [`sirj-fkeys.user.js`](./sirj-fkeys.user.js)
5. **Cmd+S** (o Ctrl+S) per salvare
6. Verifica che lo switch a fianco dello script in Dashboard sia **verde**
7. **Ricarica** ogni tab SIRJ già aperta (Cmd+R) — Tampermonkey inietta gli
   userscript solo al caricamento, non su tab già aperte

### Personalizzazione URL SIRJ

Lo userscript ha `@match http://192.168.0.121:8180/*` configurato per il
server SIRJ di AR AUTO. Se il vostro server è su un altro IP/porta, modificare
la riga `@match` di conseguenza. Esempi:

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
