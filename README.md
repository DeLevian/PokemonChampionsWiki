# Pokémon Champions Wiki

Pokédex personale e non ufficiale dedicato a **Pokémon Champions**, pubblicato come sito statico tramite GitHub Pages.

Il progetto raccoglie informazioni specifiche del gioco e del regolamento corrente:

- Pokémon e forme disponibili;
- statistiche base, tipi e abilità;
- learnset e dettagli delle mosse;
- strumenti;
- catene evolutive e forme regionali;
- confronto Pokémon;
- calcolatore del danno di base per Pokémon Champions;
- Team Builder salvato localmente nel browser;
- pagina **Novità** con storico dei regolamenti e classificazione delle modifiche;
- badge automatici della release corrente nelle sezioni principali;
- filtri per regolamento e tipo di modifica.

> Questo è un progetto fan-made, non ufficiale e non affiliato a Nintendo, The Pokémon Company o Game Freak. Pokémon e i relativi nomi e marchi appartengono ai rispettivi titolari.

## Avvio locale

Non sono richiesti framework o dipendenze JavaScript. È sufficiente Python 3.

### Windows

Eseguire:

```text
start_server.bat
```

### Tutti i sistemi

Dalla directory del progetto:

```bash
python -m http.server 8080
```

Aprire quindi:

```text
http://localhost:8080
```

Non aprire direttamente `index.html` con il protocollo `file://`: il browser potrebbe impedire il caricamento dei JSON locali.

## Struttura principale

```text
index.html                         Pagina principale
src/main.js                        Caricamento e normalizzazione dei dati
src/components/                    Viste dell'applicazione
src/services/                      Servizi condivisi, inclusi gli asset
src/styles/                        Fogli di stile
data/database/current/             Database pubblicato
data/locales/it/                   Localizzazioni italiane
data/sprites/                      Sprite e artwork
data/releases/current.json         Ultimo aggiornamento mostrato in Novità
data/releases/index.json           Indice cronologico dei regolamenti
data/releases/<id>.json            Manifest storico immutabile di una release
data/imports/                      Pacchetti degli aggiornamenti
data/imports/_template/            Modello per un nuovo aggiornamento
data/mappings/entity-aliases.json  Alias di nomi, asset ed evoluzioni
tools/                             Validazione e applicazione aggiornamenti
docs/STANDARD_AGGIORNAMENTI.md     Procedura completa di manutenzione
docs/CALCOLO_DANNI.md              Formula, fonti, limiti e test del calcolatore
```

## Validazione

Validare il database corrente:

```bash
python tools/validate_data.py
```

Validare un pacchetto prima di applicarlo:

```bash
python tools/validate_update.py data/imports/<id-aggiornamento>/update.json
```

Entrambi i comandi devono terminare con codice `0` e senza errori bloccanti.

Validare il motore del calcolatore del danno:

```bash
node --test tests/damage-calculator.test.mjs
```

Formula, fonti tecniche e limiti sono documentati in [`docs/CALCOLO_DANNI.md`](docs/CALCOLO_DANNI.md).

## Procedura per un nuovo aggiornamento

La specifica completa è disponibile in:

[`docs/STANDARD_AGGIORNAMENTI.md`](docs/STANDARD_AGGIORNAMENTI.md)

Flusso sintetico:

1. copiare `data/imports/_template/` in `data/imports/<id-aggiornamento>/`;
2. salvare scraping, TXT e materiale originale in `raw/`;
3. compilare `sources.json` e `update.json`;
4. validare il pacchetto;
5. leggere il report delle differenze e risolvere i conflitti;
6. eseguire un'anteprima;
7. applicare il pacchetto;
8. validare il database risultante;
9. provare il sito in locale;
10. eseguire commit e push.

Comandi principali:

```bash
python tools/validate_update.py data/imports/<id-aggiornamento>/update.json
python tools/apply_update.py data/imports/<id-aggiornamento>/update.json --dry-run
python tools/apply_update.py data/imports/<id-aggiornamento>/update.json
python tools/validate_data.py
```

Se il pacchetto contiene conflitti approvati, `apply_update.py` richiede esplicitamente `--approve-conflicts`.

L'applicazione aggiorna automaticamente `data/releases/current.json`, archivia il manifest come `data/releases/<id>.json` e registra la release in `data/releases/index.json`. La pagina **Novità** mostra il pacchetto corrente e permette di selezionare quelli precedenti. Nelle sezioni Pokémon, Mosse, Abilità e Oggetti viene mostrato automaticamente un badge con l'etichetta della release corrente; al prossimo aggiornamento il badge passerà alle nuove entità senza modifiche manuali alle schede. Le stesse sezioni possono essere filtrate per regolamento e per operazione (`add`, `update`, `verify`, `remove`). Lo storico verificato parte da M-C: i dati precedenti non vengono associati a release inventate.

## Aggiornamento tramite AI

Quando una nuova AI deve preparare un aggiornamento, indicarle di leggere integralmente:

```text
docs/STANDARD_AGGIORNAMENTI.md
```

Il documento contiene anche un prompt riutilizzabile, i modelli TXT, il formato JSON, le regole sulle fonti e i criteri di affidabilità.

## Pubblicazione

Il sito è compatibile con GitHub Pages. Il push su `main` attiva il workflow presente in:

```text
.github/workflows/static.yml
```

Prima del deploy vengono controllati database e pacchetti di aggiornamento.

## Rollback

Se un aggiornamento pubblicato presenta problemi, ripristinare il relativo commit:

```bash
git revert <commit-aggiornamento>
git push
```

Il database precedente rimane inoltre disponibile nella cronologia Git.
