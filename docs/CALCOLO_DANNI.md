# Calcolatore del danno Pokémon Champions

## Stato

La webapp implementa un calcolatore di base per Pokémon Champions. Il risultato è affidabile per attacchi standard quando non intervengono effetti particolari di mosse, abilità o strumenti.

Il calcolatore dichiara esplicitamente i casi non ancora supportati invece di presentarli come risultati esatti.

## Fonti tecniche

- Motore open source NCP VGC Damage Calculator, modalità Champions: <https://github.com/nerd-of-now/NCP-VGC-Damage-Calculator>
- Implementazione open source PokeDD per Pokémon Champions: <https://github.com/Seancheey/PokeDD>
- Calcolatore Pokémon Showdown, modalità Champions: <https://calc.pokemonshowdown.com/champions.html?mode=champions>
- Descrizione generale della formula e degli arrotondamenti: <https://bulbapedia.bulbagarden.net/wiki/Damage>
- Sistema Stat Point di Champions: <https://bulbapedia.bulbagarden.net/wiki/Stat_point>

La prima fonte contiene funzioni dedicate a Champions per le statistiche e usa il percorso di calcolo moderno per il danno. Le formule sono state replicate localmente in forma ridotta e senza dipendenze esterne.

## Statistiche

Pokémon Champions usa:

- livello fisso 50;
- valore equivalente all'IV fissato a 31 nella formula;
- massimo 32 Stat Point per statistica;
- massimo 66 Stat Point complessivi;
- nature con moltiplicatore 1,1, 0,9 oppure 1.

PS:

```text
floor((2 × Base + 31) × 50 / 100) + 60 + SP
```

Altre statistiche:

```text
floor((floor((2 × Base + 31) × 50 / 100) + 5 + SP) × Natura)
```

Gli stadi da −6 a +6 vengono applicati dopo il calcolo della statistica. Un brutto colpo ignora gli stadi negativi dell'attaccante e quelli positivi del difensore.

## Danno

Danno base a livello 50:

```text
floor(floor(floor(22 × Potenza × Attacco / Difesa) / 50) + 2)
```

Prima del danno base vengono applicati i modificatori supportati di potenza, Attacco e Difesa derivanti da campo, abilità e strumenti. L'ordine successivo è:

1. riduzione ad area in doppio (`0,75`);
2. meteo (`1,5` oppure `0,5`);
3. brutto colpo (`1,5`);
4. valore casuale intero da 85 a 100;
5. STAB (`1,5`, oppure `2` con Adaptability);
6. efficacia dei tipi;
7. scottatura per mosse fisiche (`0,5`, ignorata da Guts);
8. Riflesso, Schermoluce o Velaurora (`0,5` in singolo, circa `2/3` in doppio);
9. modificatori finali supportati di abilità, strumenti, bacche e Campo Nebbioso.

Il calcolo conserva gli arrotondamenti intermedi usati dal motore di riferimento, incluso `pokeRound`, che arrotonda verso il basso quando la parte decimale è esattamente `0,5`.

## Funzioni supportate

- Pokémon, forme e statistiche del database corrente;
- mosse offensive realmente presenti nel learnset selezionato;
- natura dell'attaccante e del difensore;
- Stat Point offensivi, difensivi e PS;
- stadi di Attacco/Attacco Speciale e Difesa/Difesa Speciale;
- STAB;
- matrice dei tipi, incluse doppie debolezze, resistenze e immunità;
- sole e pioggia per Fuoco e Acqua;
- Campo Elettrico, Erboso, Psichico e Nebbioso per i modificatori diretti;
- abilità comuni che modificano direttamente potenza, statistiche, STAB o danno;
- strumenti offensivi di tipo, Life Orb, Expert Belt, Muscle Band e Wise Glasses;
- bacche che riducono il danno e Palloncino per l'interazione con i campi;
- brutto colpo;
- scottatura, inclusa l'interazione con Dentistretti;
- mosse ad area in doppio;
- schermi;
- tutti i 16 roll possibili;
- danno in PS, percentuale e stima dei colpi necessari al KO.

## Limiti

Non sono ancora applicati automaticamente:

- abilità, strumenti e campi diversi dall'insieme esplicitamente supportato nella UI;
- Teracristal;
- mosse multi-colpo;
- danni residui, recupero e precisione nella probabilità di KO;
- potenze dinamiche e formule speciali di singole mosse;
- effetti specifici introdotti o modificati da Champions non presenti nel nucleo base.

La UI segnala varie mosse note per usare statistiche o potenze speciali. Prima di estendere il calcolatore, ogni nuovo modificatore deve essere confrontato con una fonte tecnica e accompagnato da un test numerico.

## Test minimi obbligatori

Dopo modifiche al motore eseguire almeno:

```bash
node --test tests/damage-calculator.test.mjs
```

I test devono coprire statistiche, stadi, roll, STAB, immunità, meteo, area, scottatura, schermi, brutti colpi e modificatori finali di abilità o strumenti.
