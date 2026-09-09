import { PokedexView } from './components/pokedex.js';
import { ItemsView } from './components/items.js';
import { MovesView } from './components/moves.js';
import { AbilitiesView } from './components/abilities.js';
import { TeamBuildingView } from './components/teambuilding.js';
import { UpdatesView } from './components/updates.js';

class App {
    constructor() {
        this.currentView = 'pokedex-view';
        window.app = this;
        this.initTabbing();
    }

    async init() {
        const loader = document.getElementById('global-loader');
        if (loader) loader.classList.remove('hidden');

        try {
            const defaultDbGame = 'pokemon-champions';
            window._currentDbGame = defaultDbGame;

            // Load static/global data
            const loadJson = async (url, fallback = null) => {
                try {
                    const res = await fetch(`${url}?t=${Date.now()}`);
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    return await res.json();
                } catch (e) {
                    console.warn(`Failed to load ${url}:`, e);
                    return fallback;
                }
            };

             // Helper logic for localizing keys via English Name
             const mapLocaleNames = (listStr, dbListKey, localeDict) => {
                 const target = dbListKey ? window[listStr]?.[dbListKey] : window[listStr];
                 if (Array.isArray(target)) {
                     target.forEach(item => {
                         const enName = item.name;
                         if (!enName) return;

                         item.name_en = enName;
                         const localized = localeDict?.[enName];
                         item.name_it = localized?.name || enName;
                         item.effect_it = localized?.description || item.description || "";
                         item.description_it = localized?.description || item.description || "";
                         item.effect = item.effect_it;
                     });
                 }
             };
            
            // Load official database files + static old files + Locales
            const [
                rosterData, statsData, learnsetsData, speciesMetaData,
                evolutionData, aliasesData, typeChartData, versionData, releaseData,
                itemsData, abilitiesData, movesData, naturesData, 
                locAbilities, locMoves, locItems, locPokemon, locNatures
            ] = await Promise.all([
                loadJson('data/database/current/pokemon/roster.json', []),
                loadJson('data/database/current/pokemon/base-stats.json', []),
                loadJson('data/database/current/learnsets/learnsets.json', {}),
                loadJson('data/database/current/pokemon/species-data.json', {}),
                loadJson('data/evolution_chains.json', { chains: {}, species_to_chain: {} }),
                loadJson('data/mappings/entity-aliases.json', { pokemon: {}, pokemonArtwork: {} }),
                loadJson('data/database/current/type-chart/effectiveness.json', { chart: {} }),
                loadJson('data/database/current/meta/version.json', {}),
                loadJson('data/releases/current.json', null),
                loadJson('data/database/current/items/items.json', []),
                loadJson('data/database/current/abilities/abilities.json', []),
                loadJson('data/database/current/moves/moves.json', []),
                loadJson('data/database/current/natures/natures.json', []),
                loadJson('data/locales/it/abilities.json', {}),
                loadJson('data/locales/it/moves.json', {}),
                loadJson('data/locales/it/items.json', {}),
                loadJson('data/locales/it/pokemon.json', {}),
                loadJson('data/locales/it/natures.json', {})
            ]);

            // 1. Construct pokemonList dynamically
            const statsMap = {};
            statsData.forEach(s => statsMap[s.name] = s);
            
            const pokemonList = rosterData.map(p => {
                const s = statsMap[p.name] || {};
                return {
                    id: p.name, // Use name as primary unique ID
                    dexId: p.dexNumber,
                    species_id: p.species_id || p.dexNumber, // Add species_id for evolution grouping
                    name: p.name,
                    types: p.types,
                    form: p.form,
                    abilities: Object.values(p.abilities || {}),
                    hidden_ability: p.abilities && p.abilities["H"] ? p.abilities["H"] : null,
                    stats: [
                        { name: "hp", base_stat: s.hp || 0 },
                        { name: "attack", base_stat: s.atk || 0 },
                        { name: "defense", base_stat: s.def || 0 },
                        { name: "special-attack", base_stat: s.spa || 0 },
                        { name: "special-defense", base_stat: s.spd || 0 },
                        { name: "speed", base_stat: s.spe || 0 }
                    ]
                };
            });
            window.pokemonList = pokemonList;

            // 2. Construct relationsData dynamically (Normalized to lowercase)
            const relationsData = { moves: {}, abilities: {} };
            rosterData.forEach(p => {
                Object.values(p.abilities || {}).forEach(ab => {
                    const key = ab.toLowerCase();
                    if (!relationsData.abilities[key]) relationsData.abilities[key] = [];
                    if (!relationsData.abilities[key].includes(p.name)) {
                       relationsData.abilities[key].push(p.name);
                    }
                });
            });
            Object.keys(learnsetsData).forEach(pName => {
                const ls = learnsetsData[pName];
                (ls.moves || []).forEach(m => {
                    const moveKey = (m.name || "").toLowerCase();
                    if (!relationsData.moves[moveKey]) relationsData.moves[moveKey] = [];
                    
                    // Add the base pokemon
                    if (!relationsData.moves[moveKey].includes(pName)) {
                        relationsData.moves[moveKey].push(pName);
                    }
                    
                    // Also add any forms associated with this pokemon from roster
                    rosterData.forEach(p => {
                        if (p.name.includes(pName) && !relationsData.moves[moveKey].includes(p.name)) {
                            relationsData.moves[moveKey].push(p.name);
                        }
                    });
                });
            });
            window.relationsData = relationsData;

            // 3. Construct pokedexData (nazionale)
            window.pokedexData = {
                nazionale: [...new Set(pokemonList.map(p => p.name))], // Use names for uniqueness across forms
                regolamenti: [] // Legacy, keep empty to fallback to nazionale
            };
            window.evolutionData = evolutionData;
            window.entityAliases = aliasesData;
            const supportedTypes = new Set(
                (typeChartData.types || []).map(type => type.toLowerCase())
            );
            window.typeChart = Object.fromEntries(
                Object.entries(typeChartData.chart || {})
                    .filter(([attackType]) => supportedTypes.has(attackType.toLowerCase()))
                    .map(([attackType, defenses]) => [
                        attackType.toLowerCase(),
                        Object.fromEntries(
                            Object.entries(defenses)
                                .filter(([defenseType]) => supportedTypes.has(defenseType.toLowerCase()))
                                .map(([defenseType, multiplier]) => [
                                    defenseType.toLowerCase(),
                                    multiplier
                                ])
                        )
                    ])
            );
            window.dataVersion = versionData;
            window.currentRelease = releaseData;
            window.speciesMetaData = speciesMetaData;
            window.learnsetsData = learnsetsData;

            window.machinesMap = {}; // No longer needed
            window.itemsData = { items: itemsData };
            window.abilitiesDb = { abilities: abilitiesData }; 
            window.movesDb = { moves: movesData }; 
            window.naturesData = naturesData;

            const versionLabel = document.getElementById('data-version');
            if (versionLabel) {
                const regulation = versionData.regulation || versionData.version || 'versione sconosciuta';
                const updated = versionData.lastUpdated ? ` · dati ${versionData.lastUpdated}` : '';
                versionLabel.textContent = `${regulation}${updated}`;
            }

            // Merge Localizations!
            mapLocaleNames('itemsData', 'items', locItems);
            mapLocaleNames('abilitiesDb', 'abilities', locAbilities);
            mapLocaleNames('movesDb', 'moves', locMoves);
            mapLocaleNames('naturesData', null, locNatures);

            // POST-PROCESS: Convert arrays to objects for faster O(1) lookup by Name
            const listToMap = (list) => {
                const map = {};
                if (Array.isArray(list)) {
                    list.forEach(item => { if (item.name) map[item.name] = item; });
                }
                return map;
            };

            window.itemsData.items = listToMap(window.itemsData.items);
            window.abilitiesDb.abilities = listToMap(window.abilitiesDb.abilities);
            window.movesDb.moves = listToMap(window.movesDb.moves);

            // Pokemon Name Merge is handled above directly on pokemonList

            // Populate list-mode selector
            const modeSelect = document.getElementById('list-mode-select');
            if (modeSelect && pokedexData.regolamenti) {
                modeSelect.innerHTML = '';
                pokedexData.regolamenti.forEach((reg, idx) => {
                    const opt = document.createElement('option');
                    opt.value = reg.id;
                    opt.textContent = reg.nome;
                    if (idx === 0) opt.selected = true;
                    modeSelect.appendChild(opt);
                });
                
                // Add National option at the end
                const natOpt = document.createElement('option');
                natOpt.value = 'nazionale';
                natOpt.textContent = 'Pokedex Nazionale';
                modeSelect.appendChild(natOpt);
            }

            // Set valid IDs for filtering (default to first season)
            const currentSeason = pokedexData.regolamenti && pokedexData.regolamenti.length > 0 ? pokedexData.regolamenti[0] : null;
            window._currentSeasonIds = currentSeason ? new Set(currentSeason.pokemon_ids.map(id => String(id))) : null;
            window._nationalIds = new Set(pokedexData.nazionale.map(id => String(id)));
            window._currentDbGame = 'pokemon-champions'; // Ensure global game state for data resolution
            
            // Initial state based on the current selection in the dropdown
            const activeMode = modeSelect ? modeSelect.value : 'nazionale';
            if (activeMode === 'nazionale') {
                window._currentValidPokemonIds = window._nationalIds;
            } else {
                const season = pokedexData.regolamenti.find(r => r.id === activeMode);
                window._currentValidPokemonIds = season ? new Set(season.pokemon_ids.map(id => String(id))) : window._nationalIds;
            }

            // Define is_default mapping based on form
            window.pokemonList.forEach(p => {
                p.is_default = (p.form === 'Base');
                // Ensure name_it mapping is applied via mapLocaleNames manually for pokemon
                // We did it for items, abilities etc, but pokemon needs a similar loop if not covered by the old logic.
                const enName = p.name;
                if (enName && locPokemon && locPokemon[enName]) {
                    p.name_it = locPokemon[enName].name;
                } else if (!p.name_it) {
                    p.name_it = p.name; // fallback
                }
            });

            // Initialize views
            const viewConfigs = [
                { id: 'pokedex-view', class: PokedexView, key: 'pokedexView' },
                { id: 'items-root', class: ItemsView, key: 'itemsView' },
                { id: 'moves-root', class: MovesView, key: 'movesView' },
                { id: 'abilities-root', class: AbilitiesView, key: 'abilitiesView' },
                { id: 'teambuilding-root', class: TeamBuildingView, key: 'teamBuildingView' },
                { id: 'updates-root', class: UpdatesView, key: 'updatesView' }
            ];

            for (const cfg of viewConfigs) {
                const el = document.getElementById(cfg.id);
                if (el) {
                    try {
                        this[cfg.key] = new cfg.class(el);
                        window[cfg.key] = this[cfg.key];
                        await this[cfg.key].render();
                    } catch (err) {
                        console.error(`Error rendering ${cfg.id}:`, err);
                    }
                }
            }

        } catch (error) {
            console.error('Critical failure in App.init:', error);
        } finally {
            if (loader) loader.classList.add('hidden');
        }
    }

    activateView(target) {
        document.querySelectorAll('.tab-btn').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.target === target);
        });
        document.querySelectorAll('.view-section').forEach(section => {
            section.classList.toggle('active', section.id === target);
        });
        this.currentView = target;
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    navigateTo(view, options = {}) {
        const viewMap = {
            pokedex: 'pokedex-view',
            updates: 'updates-view',
            moves: 'moves-view',
            abilities: 'abilities-view',
            items: 'items-view',
            teambuilding: 'teambuilding-view'
        };
        const target = viewMap[view] || view;
        this.activateView(target);
        if (view === 'pokedex' && options.pokemon) {
            this.pokedexView?.openDetails(options.pokemon);
        }
    }

    openReleaseEntity(type, name) {
        // Release details are opened as overlays: the active Novità tab never changes.
        if (type === 'pokemon') {
            this.pokedexView?.openDetails(name);
        } else if (type === 'moves') {
            this.pokedexView?.openMoveDetails(name);
        } else if (type === 'abilities') {
            this.updatesView?.showAbilityDetail(name);
        } else if (type === 'items') {
            this.itemsView?.showItemDetail(name);
        }
    }

    initTabbing() {
        document.querySelectorAll('.tab-btn').forEach(tab => {
            tab.addEventListener('click', () => this.activateView(tab.dataset.target));
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();
});
