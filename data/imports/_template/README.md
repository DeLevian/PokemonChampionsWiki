# Template aggiornamento Pokémon Champions

1. Copiare questa directory in `data/imports/<id-aggiornamento>/`.
2. Sostituire tutti i valori `TODO` in `sources.json` e `update.json`.
3. Conservare in `raw/` i TXT e le fonti raccolte.
4. Aggiungere le modifiche nelle quattro collezioni di `changes`.
5. Validare con:

```bash
python tools/validate_update.py data/imports/<id-aggiornamento>/update.json
```

6. Generare il report e usare `tools/apply_update.py` soltanto dopo la revisione.

La specifica completa è in `docs/STANDARD_AGGIORNAMENTI.md`.
