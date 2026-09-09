# Standard per gli aggiornamenti di Pokémon Champions Wiki

**Versione del documento:** 1.0  
**Ambito:** aggiornamenti manuali dei dati pubblicati dalla webapp  
**Destinatari:** manutentore del progetto, ChatGPT o altra AI incaricata della ricerca e dell'integrazione

## 1. Scopo

Questo documento definisce il formato e la procedura obbligatoria per preparare, verificare e integrare un aggiornamento di Pokémon Champions Wiki.

L'obiettivo è fare in modo che ogni aggiornamento sia:

- riconducibile a fonti dichiarate;
- comprensibile anche a distanza di tempo;
- convertibile in modo deterministico nei JSON della webapp;
- verificabile prima della pubblicazione;
- reversibile tramite Git.

La procedura è manuale: il manutentore avvia la ricerca, controlla il risultato, prova il sito in locale e pubblica tramite GitHub. L'AI può cercare e strutturare i dati, ma non deve inventare informazioni mancanti né pubblicare autonomamente.

---

## 2. Regole fondamentali per persone e AI

1. **Non modificare subito `data/database/current/`.** Preparare prima un pacchetto di aggiornamento separato.
2. **Non considerare l'AI una fonte.** Ogni informazione deve rimandare a una pagina, repository o documento esterno.
3. **Distinguere assenza e valore nullo.** Un dato non trovato è `unknown`; un valore tecnicamente non applicabile può essere `null`.
4. **Non dedurre dati specifici di Champions dai giochi principali.** Possono essere usati solo come riferimento secondario e devono essere dichiarati.
5. **Non sovrascrivere silenziosamente un conflitto.** Se due fonti riportano valori differenti, registrare il conflitto in `review.required`.
6. **Usare nomi inglesi canonici come chiavi.** I nomi italiani sono localizzazioni, non identificatori.
7. **Salvare tutti i file di testo e JSON in UTF-8 senza BOM.** Correggere caratteri corrotti come `Farfetch�d` prima della normalizzazione.
8. **Usare apostrofo ASCII nei nomi canonici**, per esempio `Farfetch'd`; gli apostrofi tipografici possono comparire solo nei testi mostrati all'utente.
9. **Non usare la presenza della traduzione per decidere la disponibilità.** Un elemento disponibile deve poter comparire anche con fallback inglese.
10. **La validazione deve riuscire prima del commit destinato a `main`.**

---

## 3. Flusso completo

```text
Ricerca o scraping assistito da AI
              ↓
File grezzi e fonti
              ↓
Normalizzazione in update.json
              ↓
Report di differenze e conflitti
              ↓
Revisione umana
              ↓
Applicazione al database candidato
              ↓
Validazione automatica
              ↓
Test della webapp in locale
              ↓
Commit, push e GitHub Pages
```

---

## 4. Struttura obbligatoria di un pacchetto

Ogni aggiornamento deve avere una directory autonoma. Copiare `data/imports/_template/` come punto di partenza e seguire lo schema `schemas/update.schema.json`:

```text
data/imports/<id-aggiornamento>/
├── README.md
├── sources.json
├── update.json
├── report.md
└── raw/
    ├── 00_INDICE.txt
    ├── 00_LEGGIMI_E_FONTI.txt
    ├── pokemon/
    ├── moves/
    ├── abilities/
    ├── items/
    └── other/
```

Esempi di `<id-aggiornamento>`:

```text
regulation-m-c
version-1.3.0
patch-2026-09-09
```

Usare solo lettere minuscole ASCII, numeri e trattini.

### 4.1 `raw/`

Contiene il materiale raccolto senza trasformazioni sostanziali:

- esportazioni TXT;
- copie di tabelle;
- estratti delle patch note;
- risultati dello scraping;
- eventuali immagini o allegati utili alla verifica.

I file grezzi servono come prova e contesto. Non vengono letti dalla webapp e non devono essere modificati per adattarli al database.

### 4.2 `README.md`

Deve spiegare in linguaggio naturale:

- quale aggiornamento è stato analizzato;
- quando è stata svolta la ricerca;
- cosa introduce;
- quali sezioni sono complete;
- quali dati sono dubbi o mancanti;
- chi o quale AI ha preparato il pacchetto.

### 4.3 `sources.json`

Contiene l'elenco strutturato delle fonti.

### 4.4 `update.json`

È la patch normalizzata e costituisce l'unico input per l'applicazione automatica dell'aggiornamento.

### 4.5 `report.md`

È generato confrontando `update.json` con il database corrente. Deve elencare aggiunte, modifiche, rimozioni, warning e conflitti.

Dopo l'applicazione, `tools/apply_update.py` genera anche `data/releases/current.json`. Questo manifest compatto alimenta automaticamente la scheda **Novità** della webapp: non deve essere compilato manualmente.

---

## 5. Convenzioni per i file grezzi

Quando si producono file separati, usare questa struttura:

```text
raw/pokemon/001_Cinderace.txt
raw/pokemon/002_Mega_Baxcalibur.txt
raw/moves/001_Pyro_Ball.txt
raw/abilities/001_Thermal_Exchange.txt
raw/items/001_Baxcalibrite.txt
```

Regole per i nomi file:

- prefisso numerico a tre cifre;
- nome inglese dopo il numero;
- spazi sostituiti da `_`;
- niente accenti nel nome file;
- estensione `.txt`;
- un'entità per file.

## 5.1 Modello TXT per un Pokémon o una forma

```text
POKÉMON CHAMPIONS — <NOME AGGIORNAMENTO>
Nome italiano: <nome o UNKNOWN>
Nome inglese canonico: <nome>
Numero Pokédex: <numero>
Forma: Base | Mega | Regional | Other
Specie base: <nome inglese canonico>

TIPI
- <tipo inglese canonico>
- <eventuale secondo tipo>

STATISTICHE BASE
HP: <numero>
Attack: <numero>
Defense: <numero>
Special Attack: <numero>
Special Defense: <numero>
Speed: <numero>
Total: <numero>

ABILITÀ
- Slot 0: <nome inglese>
- Slot 1: <nome inglese oppure NONE>
- Hidden: <nome inglese oppure NONE>

LEARNSET
- <nome inglese canonico della mossa>
- <nome inglese canonico della mossa>

ASSET
Artwork suggerito: <nome file oppure UNKNOWN>

FONTI
- <source-id>: <nota su cosa conferma>

NOTE
- <note, differenze o UNKNOWN>
```

Per una Mega che eredita il learnset è preferibile indicare:

```text
LEARNSET
Eredita da: Baxcalibur
```

Non duplicare centinaia di mosse se l'ereditarietà è confermata e il formato normalizzato può rappresentarla.

## 5.2 Modello TXT per una mossa

```text
POKÉMON CHAMPIONS — MOSSA
Nome italiano: <nome o UNKNOWN>
Nome inglese canonico: <nome>
Tipo: <tipo inglese>
Categoria: Physical | Special | Status
Potenza: <numero | null | unknown>
Precisione: <numero | null | unknown>
PP: <numero | unknown>
Priorità: <numero | unknown>
Bersaglio: <codice target | unknown>
Contatto: true | false | unknown
Mossa sonora: true | false | unknown
Disponibile in Champions: true | false

Descrizione inglese: <testo o UNKNOWN>
Descrizione italiana: <testo o UNKNOWN>

FONTI
- <source-id>: <nota>

NOTE
- <eventuali differenze rispetto ai giochi principali>
```

`null` per potenza o precisione significa “non applicabile”, non “dato non trovato”.

## 5.3 Modello TXT per un'abilità

```text
POKÉMON CHAMPIONS — ABILITÀ
Nome italiano: <nome o UNKNOWN>
Nome inglese canonico: <nome>
Disponibile in Champions: true | false
Descrizione inglese: <testo o UNKNOWN>
Descrizione italiana: <testo o UNKNOWN>
Pokémon associati:
- <nome inglese canonico>

FONTI
- <source-id>: <nota>

NOTE
- <note oppure NONE>
```

## 5.4 Modello TXT per uno strumento

```text
POKÉMON CHAMPIONS — STRUMENTO
Nome italiano: <nome o UNKNOWN>
Nome inglese canonico: <nome>
Categoria: <categoria o unknown>
Disponibile in Champions: true | false
Consumabile: true | false | unknown
Descrizione inglese: <testo o UNKNOWN>
Descrizione italiana: <testo o UNKNOWN>
Artwork suggerito: <nome file oppure UNKNOWN>

FONTI
- <source-id>: <nota>

NOTE
- <note oppure NONE>
```

---

## 6. Formato di `sources.json`

Esempio valido:

```json
{
  "researchCompletedAt": "2026-09-09",
  "sources": [
    {
      "id": "official-regulation-m-c",
      "title": "Annuncio ufficiale Regolamento M-C",
      "url": "https://www.pokemon.com/it/novita/esempio",
      "type": "official-announcement",
      "official": true,
      "accessedAt": "2026-09-09",
      "appliesTo": ["availability", "release"],
      "notes": "Conferma gli elementi introdotti nel regolamento."
    },
    {
      "id": "showdown-champions-data",
      "title": "Pokémon Showdown Champions mod",
      "url": "https://github.com/smogon/pokemon-showdown/tree/master/data/mods/champions",
      "type": "technical-dataset",
      "official": false,
      "accessedAt": "2026-09-09",
      "appliesTo": ["pokemon", "stats", "abilities", "learnsets"],
      "notes": "Fonte tecnica; confrontare le modifiche specifiche di Champions."
    }
  ]
}
```

Campi obbligatori per ogni fonte:

- `id`: identificatore univoco nel pacchetto;
- `title`;
- `url`;
- `type`;
- `official`;
- `accessedAt` in formato `YYYY-MM-DD`;
- `appliesTo`;
- `notes`.

Tipi consigliati:

- `official-announcement`;
- `official-documentation`;
- `technical-dataset`;
- `community-database`;
- `localization-dataset`;
- `asset-source`.

---

## 7. Formato normativo di `update.json`

## 7.1 Struttura principale

```json
{
  "schemaVersion": 1,
  "release": {
    "id": "regulation-m-c",
    "title": "Regolamento M-C",
    "gameVersion": "Pokemon Champions",
    "announcedAt": "2026-09-02",
    "effectiveAt": null,
    "researchCompletedAt": "2026-09-09",
    "summary": "Nuovi Pokémon, mosse, abilità e strumenti del regolamento M-C."
  },
  "sourceRefs": [
    "official-regulation-m-c",
    "showdown-champions-data"
  ],
  "changes": {
    "pokemon": [],
    "moves": [],
    "abilities": [],
    "items": []
  },
  "review": {
    "required": [],
    "warnings": [],
    "notes": []
  }
}
```

Campi obbligatori:

- `schemaVersion`;
- tutti i campi di `release`, anche se alcuni sono `null`;
- `sourceRefs`;
- le quattro collezioni di `changes`;
- le tre collezioni di `review`.

## 7.2 Operazioni ammesse

Ogni entità deve indicare una delle operazioni:

- `add`: entità assente dal database;
- `update`: entità già presente da modificare;
- `remove`: entità da rendere non disponibile o rimuovere;
- `verify`: nessun cambiamento previsto, ma dati nuovamente verificati.

Una rimozione fisica deve essere usata con cautela. Per mosse e strumenti generali è normalmente preferibile impostare `inChampions: false`.

## 7.3 Pokémon

```json
{
  "operation": "add",
  "canonicalName": "Cinderace",
  "aliases": [],
  "roster": {
    "name": "Cinderace",
    "dexNumber": 815,
    "types": ["Fire"],
    "form": "Base",
    "abilities": {
      "0": "Blaze",
      "H": "Libero"
    },
    "championsVerified": true
  },
  "baseStats": {
    "name": "Cinderace",
    "dexNumber": 815,
    "form": "Base",
    "hp": 80,
    "atk": 116,
    "def": 75,
    "spa": 65,
    "spd": 75,
    "spe": 119,
    "total": 530,
    "championsVerified": true
  },
  "learnset": {
    "inheritFrom": null,
    "moves": ["Acrobatics", "Agility", "Pyro Ball"],
    "source": "showdown-champions-data",
    "championsVerified": true
  },
  "localization": {
    "it": {
      "name": "Cinderace"
    }
  },
  "assets": {
    "artworkFile": "Cinderace.png"
  },
  "sourceRefs": ["official-regulation-m-c", "showdown-champions-data"],
  "confidence": "verified",
  "notes": []
}
```

Regole:

- `canonicalName` e `roster.name` devono coincidere;
- `total` deve essere la somma delle sei statistiche;
- `form` usa normalmente `Base`, `Mega` o `Regional`;
- gli slot abilità ammessi sono `0`, `1`, `H` e `S`; `S` è riservato ad abilità o forme speciali, per esempio Battle Bond;
- ogni abilità deve esistere nel database finale;
- ogni mossa deve esistere nel database finale;
- `inheritFrom` deve essere `null` oppure il nome canonico di un Pokémon;
- se `inheritFrom` non è `null`, `moves` deve essere vuoto salvo eccezioni documentate;
- `assets.artworkFile` deve rispettare esattamente maiuscole e minuscole del file.

## 7.4 Mosse

```json
{
  "operation": "update",
  "canonicalName": "Pyro Ball",
  "data": {
    "name": "Pyro Ball",
    "type": "Fire",
    "category": "Physical",
    "description": "The user attacks by igniting a small stone.",
    "target": "normal",
    "inChampions": true,
    "championsVerified": true,
    "power": 120,
    "accuracy": 90,
    "pp": 8,
    "priority": 0
  },
  "localization": {
    "it": {
      "name": "Palla Infuocata",
      "description": "Infligge danno e può scottare il bersaglio."
    }
  },
  "sourceRefs": ["showdown-champions-data"],
  "confidence": "verified",
  "notes": ["I PP di Champions differiscono dal valore generale precedente."]
}
```

Valori ammessi per `type`:

`Bug`, `Dark`, `Dragon`, `Electric`, `Fairy`, `Fighting`, `Fire`, `Flying`, `Ghost`, `Grass`, `Ground`, `Ice`, `Normal`, `Poison`, `Psychic`, `Rock`, `Steel`, `Water`.

Valori ammessi per `category`:

`Physical`, `Special`, `Status`.

Valori target attualmente supportati:

`adjacentAlly`, `adjacentAllyOrSelf`, `adjacentFoe`, `all`, `allAdjacent`, `allAdjacentFoes`, `allies`, `allySide`, `allyTeam`, `any`, `foeSide`, `normal`, `randomNormal`, `scripted`, `self`.

Se la fonte usa una descrizione naturale del bersaglio, l'AI deve convertirla nel codice appropriato e annotare eventuali dubbi.

## 7.5 Abilità

```json
{
  "operation": "add",
  "canonicalName": "Thermal Exchange",
  "data": {
    "name": "Thermal Exchange",
    "description": "Boosts Attack when hit by a Fire-type move and prevents burns.",
    "championsVerified": true
  },
  "localization": {
    "it": {
      "name": "Termoscambio",
      "description": "Aumenta l'Attacco se il Pokémon subisce una mossa di tipo Fuoco e impedisce le scottature."
    }
  },
  "associatedPokemon": ["Baxcalibur", "Mega Baxcalibur"],
  "sourceRefs": ["showdown-champions-data"],
  "confidence": "verified",
  "notes": []
}
```

`associatedPokemon` serve alla validazione e non deve necessariamente essere copiato nel database finale, perché le relazioni vengono ricavate dal roster.

## 7.6 Strumenti

```json
{
  "operation": "update",
  "canonicalName": "Rocky Helmet",
  "data": {
    "name": "Rocky Helmet",
    "description": "Damages an attacker that makes contact.",
    "inChampions": true
  },
  "localization": {
    "it": {
      "name": "Bitorzolelmo",
      "description": "Danneggia chi colpisce il possessore con una mossa che effettua contatto."
    }
  },
  "metadata": {
    "category": "held-item",
    "consumable": false
  },
  "assets": {
    "spriteFile": "rocky-helmet.png"
  },
  "sourceRefs": ["official-regulation-m-c"],
  "confidence": "verified",
  "notes": []
}
```

Fino a quando il database degli strumenti non supporta tutti i campi, `metadata` resta nel pacchetto e non deve essere eliminato. Potrà essere usato dal successivo refactoring.

---

## 8. Livelli di affidabilità

Ogni modifica deve usare uno di questi valori:

- `verified`: confermata da una fonte ufficiale o da almeno due fonti tecniche coerenti;
- `probable`: presente in una sola fonte tecnica attendibile;
- `uncertain`: inferita, in conflitto o incompleta.

Regole di pubblicazione:

- `verified`: pubblicabile;
- `probable`: pubblicabile solo dopo approvazione esplicita del manutentore;
- `uncertain`: non pubblicabile finché non risolta o esplicitamente accettata.

Esempio di conflitto:

```json
{
  "entityType": "move",
  "entity": "Pyro Ball",
  "field": "pp",
  "values": [
    {
      "value": 5,
      "sourceRef": "general-dataset"
    },
    {
      "value": 8,
      "sourceRef": "showdown-champions-data"
    }
  ],
  "recommendedValue": 8,
  "reason": "La seconda fonte è specifica per Pokémon Champions."
}
```

Questo oggetto va inserito in `review.required` fino all'approvazione.

---

## 9. Regole di localizzazione

1. Salvare la chiave usando il nome inglese canonico.
2. Fornire almeno `name` e, quando disponibile, `description`.
3. Preferire traduzioni ufficiali italiane.
4. Se la traduzione ufficiale non è disponibile, usare il fallback inglese.
5. Una traduzione AI non ufficiale deve essere indicata nelle note.
6. Non tradurre nomi propri o termini tecnici arbitrariamente.
7. Non usare `�`, sequenze illeggibili o stringhe vuote.
8. Non usare `"UNKNOWN"` nei file finali della webapp: serve soltanto nei materiali grezzi e deve diventare assenza del campo o warning.

Comportamento frontend atteso:

```text
nome italiano, se valido
altrimenti nome inglese
```

---

## 10. Regole per nomi, forme e asset

### Nome canonico

Il nome canonico deve essere quello inglese usato dal database del progetto. Prima di creare una nuova entità, effettuare sempre un confronto:

1. corrispondenza esatta;
2. confronto senza differenze tra maiuscole/minuscole;
3. confronto rimuovendo parentesi e punteggiatura;
4. ricerca negli alias;
5. revisione umana se rimane ambiguo.

### Forme

Non accorpare forme con statistiche, tipi o abilità differenti. Ogni forma visualizzabile deve avere un identificatore canonico distinto.

### Evoluzioni e forme regionali

Per ogni Pokémon o forma aggiunta verificare la sua ascendenza, non soltanto l'identificatore della specie. Le evoluzioni ramificate sono percorsi alternativi, non sequenze consecutive: per esempio Persian e Perrserker condividono Meowth come specie di origine, ma uno non evolve nell'altro.

Quando una forma regionale richiede un antenato regionale, registrarlo in `data/mappings/entity-aliases.json` sotto `evolutionStageOverrides`. Se cambia anche la condizione evolutiva, usare `evolutionTriggerOverrides`. Esempi: Meowth di Alola → Persian di Alola e Farfetch’d di Galar → Sirfetch’d.

Dopo ogni aggiornamento controllare automaticamente che:

- la specie finale appartenga alla catena dichiarata;
- ogni `evolves_from` punti a uno stadio della stessa catena;
- il frontend segua solo il percorso degli antenati della specie selezionata;
- forme regionali e ramificazioni non mostrino evoluzioni sorelle come stadi successivi;
- gli artwork dichiarati dagli override esistano.

### Asset

Non dedurre il nome dello sprite in più componenti JavaScript. Il pacchetto deve indicare il file esatto oppure richiedere l'aggiunta di un alias centralizzato.

Lo script di validazione deve verificare i nomi dei file in modo case-sensitive, anche su Windows.

---

## 11. Contenuto minimo di `report.md`

```markdown
# Report aggiornamento <titolo>

## Riepilogo
- Pokémon aggiunti: 0
- Pokémon aggiornati: 0
- Mosse rese disponibili: 0
- Abilità aggiunte: 0
- Strumenti resi disponibili: 0
- Traduzioni aggiunte: 0

## Modifiche
- ...

## Conflitti da approvare
- ...

## Warning
- ...

## Asset mancanti
- ...

## Esito validazione
- pending | passed | failed
```

Il report deve essere generato nuovamente dopo ogni modifica a `update.json`.

---

## 12. Validazioni obbligatorie

### Errori bloccanti

- JSON non valido;
- campo obbligatorio assente;
- identificatore duplicato;
- tipo, categoria, forma o target non supportato;
- statistica mancante o non numerica;
- totale statistiche errato;
- Pokémon senza roster, statistiche o learnset;
- abilità del roster inesistente;
- mossa del learnset inesistente;
- `sourceRef` inesistente;
- entità `uncertain` non approvata;
- file asset dichiarato ma inesistente;
- conteggi di versione incoerenti.

### Warning non bloccanti

- traduzione italiana assente;
- descrizione italiana assente;
- fallback inglese utilizzato;
- una sola fonte tecnica;
- sprite generico esplicitamente dichiarato;
- alias aggiunto per compatibilità.

---

## 13. Procedura operativa del manutentore

### 13.1 Creare il branch

```bash
git switch main
git pull
git switch -c data/<id-aggiornamento>
```

### 13.2 Preparare il pacchetto

1. Creare `data/imports/<id-aggiornamento>/`.
2. Copiare le fonti grezze in `raw/`.
3. Compilare `README.md`.
4. Compilare `sources.json`.
5. Generare `update.json` seguendo questo documento.
6. Validare il pacchetto con `python tools/validate_update.py data/imports/<id-aggiornamento>/update.json`.
7. Generare e leggere `report.md`.

### 13.3 Anteprima e applicazione

Eseguire:

```bash
python tools/apply_update.py data/imports/<id-aggiornamento>/update.json --dry-run
python tools/apply_update.py data/imports/<id-aggiornamento>/update.json
python tools/validate_data.py
```

Se `review.required` contiene conflitti già esaminati e approvati dal manutentore, aggiungere `--approve-conflicts` sia all'anteprima sia all'applicazione. Non usare questa opzione senza aver letto `report.md`.

L'applicazione aggiorna anche `data/releases/current.json`, rendendo il pacchetto appena applicato visibile nella scheda **Novità**.

L'applicazione deve essere atomica: se la validazione fallisce, il database corrente non deve essere sostituito.

### 13.4 Test locale

```bash
python -m http.server 8080
```

Controllare:

- assenza di errori nella console;
- conteggi;
- ricerca e filtri;
- nuove entità;
- dettagli di Pokémon e Mega;
- mosse e abilità;
- strumenti;
- team builder;
- immagini;
- fallback inglese;
- visualizzazione mobile.

### 13.5 Commit

```bash
git status
git diff --stat
git add .
git commit -m "data: aggiorna Pokémon Champions a <id-aggiornamento>"
git push -u origin data/<id-aggiornamento>
```

Aprire una pull request, controllare il diff e unire in `main` solo dopo il superamento della validazione.

---

## 14. Istruzioni pronte per una futura AI

Il seguente testo può essere copiato in una nuova richiesta:

```text
Leggi integralmente docs/STANDARD_AGGIORNAMENTI.md e rispettalo come specifica normativa.

Devi preparare l'aggiornamento <NOME AGGIORNAMENTO> di Pokémon Champions.

1. Non modificare direttamente data/database/current.
2. Se è necessaria una ricerca online, usa fonti ufficiali e fonti tecniche aggiornate.
3. Crea data/imports/<ID-AGGIORNAMENTO>/ con README.md, sources.json, update.json, report.md e raw/.
4. Conserva in raw/ le informazioni raccolte e le fonti.
5. Usa i nomi inglesi canonici come identificatori.
6. Normalizza traduzioni, forme, statistiche, abilità, learnset e asset.
7. Confronta ogni entità con il database attuale prima di scegliere add, update, remove o verify.
8. Non inventare dati mancanti: registrali nei warning.
9. Registra i conflitti in review.required e non risolverli silenziosamente.
10. Genera un report chiaro delle differenze.
11. Fermati prima dell'applicazione se esistono dati uncertain o conflitti non approvati.
12. Dopo approvazione, applica la patch, valida il database e riporta tutti i file modificati.
```

Se il materiale è già stato scaricato, aggiungere:

```text
Usa come input grezzo la cartella <PERCORSO>. Non effettuare una nuova ricerca salvo dati mancanti o conflittuali.
```

Se si desidera una nuova ricerca online, aggiungere:

```text
Effettua una ricerca aggiornata alla data odierna e registra URL e data di accesso per ogni fonte.
```

---

## 15. Checklist finale del pacchetto

- [ ] La directory segue il nome standard.
- [ ] I file sono UTF-8 senza caratteri corrotti.
- [ ] `README.md` descrive aggiornamento e limiti.
- [ ] `sources.json` contiene tutte le fonti.
- [ ] Ogni `sourceRef` è valido.
- [ ] `update.json` usa `schemaVersion: 1`.
- [ ] Ogni entità ha un'operazione.
- [ ] I nomi inglesi sono canonici.
- [ ] Tipi, categorie, forme e target sono validi.
- [ ] Le statistiche totali sono corrette.
- [ ] Abilità e mosse referenziate esistono nella patch o nel database.
- [ ] Le traduzioni ufficiali sono preferite.
- [ ] I fallback inglesi sono accettati e segnalati.
- [ ] Gli asset sono presenti o mappati.
- [ ] I conflitti sono riportati.
- [ ] Non esistono elementi `uncertain` non approvati.
- [ ] `report.md` corrisponde all'ultima versione della patch.
- [ ] La validazione automatica è riuscita.
- [ ] Il test locale è stato completato.
- [ ] Il diff Git è stato revisionato.

---

## 16. Criterio di completamento

Un aggiornamento è completo quando:

1. il pacchetto conserva fonti e materiale grezzo;
2. `update.json` descrive tutte le modifiche senza ambiguità;
3. conflitti e dati mancanti sono espliciti;
4. il database candidato supera la validazione;
5. il sito funziona in locale;
6. il diff è stato approvato dal manutentore;
7. GitHub Pages pubblica il commit validato;
8. il rollback è possibile tramite `git revert`.
