# Importazione Regolamento M-C

Pacchetto dati preparato per integrare nella webapp le novità del Regolamento M-C di Pokémon Champions.

## Copertura

- 35 Pokémon o forme;
- 15 mosse introdotte o rese disponibili;
- 15 abilità introdotte o rese disponibili;
- 18 strumenti introdotti o resi disponibili.

## Materiale grezzo

I file ricevuti sono conservati senza modifiche sostanziali in `raw/` e includono nomi bilingui, statistiche, learnset, descrizioni e fonti.

## Normalizzazione

`update.json` viene generato da `tools/prepare_mc_update.py`. Durante la normalizzazione vengono:

- convertiti i nomi delle forme nei nomi canonici usati dal progetto;
- associati i numeri Pokédex;
- convertiti tipi e categorie nei valori del database;
- confrontate mosse, abilità e strumenti con il database corrente;
- risolti i nomi degli artwork tramite `data/mappings/entity-aliases.json`;
- registrate differenze e dati da revisionare in `report.md` e nella sezione `review`.

## Stato

Il pacchetto è un candidato di aggiornamento. La sua presenza non implica che sia già stato applicato a `data/database/current/`.
