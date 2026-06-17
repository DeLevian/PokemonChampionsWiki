const TYPE_CHART = {
    normal: { rock: 0.5, ghost: 0, steel: 0.5 },
    fire: { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
    water: { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
    grass: { fire: 0.5, water: 2, grass: 0.5, poison: 0.5, ground: 2, flying: 0.5, bug: 0.5, rock: 2, dragon: 0.5, steel: 0.5 },
    electric: { water: 2, grass: 0.5, electric: 0.5, ground: 0, flying: 2, dragon: 0.5 },
    ice: { fire: 0.5, water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5 },
    fighting: { normal: 2, ice: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2, ghost: 0, dark: 2, steel: 2, fairy: 0.5 },
    poison: { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, fairy: 2 },
    ground: { fire: 2, grass: 0.5, electric: 2, poison: 2, flying: 0, bug: 0.5, rock: 2, steel: 2 },
    flying: { grass: 2, electric: 0.5, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
    psychic: { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
    bug: { fire: 0.5, grass: 2, fighting: 0.5, poison: 0.5, flying: 0.5, psychic: 2, ghost: 0.5, dark: 2, steel: 0.5, fairy: 0.5 },
    rock: { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
    ghost: { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
    dragon: { dragon: 2, steel: 0.5, fairy: 0 },
    dark: { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, fairy: 0.5 },
    steel: { fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5, fairy: 2 },
    fairy: { fighting: 2, poison: 0.5, dragon: 2, dark: 2, steel: 0.5 }
};

const TYPE_NAMES = {
    normal: 'Normale', fire: 'Fuoco', water: 'Acqua', grass: 'Erba', electric: 'Elettro',
    ice: 'Ghiaccio', fighting: 'Lotta', poison: 'Veleno', ground: 'Terra', flying: 'Volante',
    psychic: 'Psico', bug: 'Coleottero', rock: 'Roccia', ghost: 'Spettro', dragon: 'Drago',
    dark: 'Buio', steel: 'Acciaio', fairy: 'Folletto'
};

const CATEGORY_LABELS = { 
    physical: 'Fisico', 
    special: 'Speciale', 
    status: 'Stato' 
};

const TYPE_LABELS = {
    normal: 'Normale', fire: 'Fuoco', water: 'Acqua', grass: 'Erba', electric: 'Elettro',
    ice: 'Ghiaccio', fighting: 'Lotta', poison: 'Veleno', ground: 'Terra', flying: 'Volante',
    psychic: 'Psico', bug: 'Coleottero', rock: 'Roccia', ghost: 'Spettro', dragon: 'Drago',
    dark: 'Buio', steel: 'Acciaio', fairy: 'Folletto', stellar: 'Stellare', unknown: '???'
};

export class PokedexView {
    constructor(container) {
        this.container = container;
        this.pokemonList = [];
        this.selectedGame = 'all';
        this.selectedType = 'all';
        this.selectedForm = 'all';
        this.detailCache = {};
        this.visibleCount = 80;
        this.filteredList = [];
        this.listMode = 'champions';
        this.activeSection = 'all'; // 'all' (Pokedex) or 'mega' (Mega only)
        this.compareModeActive = false;
        this.selectedForCompare = [];
    }

    getSpriteUrl(pokemon, type = null) {
        if (!pokemon) return 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MCIgZmlsbD0iI2UyZThlZiIvPjx0ZXh0IHg9IjUwIiB5PSI2NSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjQ1IiBmaWxsPSIjOTQzMzIyIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj4/PC90ZXh0Pjwvc3ZnPg==';
        
        const id = typeof pokemon === 'object' ? pokemon.id : pokemon;
        const name = typeof pokemon === 'object' ? (pokemon.name || id) : id;

        // Priorità assoluta agli 'artwork' come richiesto dall'utente
        const style = type || 'artwork';

        let fileName = (typeof pokemon === 'object' && pokemon.name) ? pokemon.name : id;

        // Mappature per sprite con discrepanze di nome
        if (fileName === "Kommo-o") fileName = "Kommo O";
        else if (fileName === "Pyroar") fileName = "Pyroar Male";


        // Gestione dei nuovi file sprite delle Mega Evoluzioni (es. "Sceptile Mega" invece di "Mega Sceptile")
        const flippedMegas = [
            "Sceptile", "Blaziken", "Swampert", "Mawile", "Metagross",
            "Staraptor", "Scolipede", "Scrafty", "Eelektross", "Pyroar",
            "Malamar", "Barbaracle", "Dragalge", "Falinks", "Raichu"
        ];
        if (fileName.startsWith("Mega ")) {
            const base = fileName.substring(5); // e.g. "Sceptile" o "Raichu X"
            const match = flippedMegas.find(m => base.startsWith(m));
            if (match) {
                if (base.endsWith(" X") || base.endsWith(" Y")) {
                    const suffix = base.slice(-2); // " X" or " Y"
                    const mainName = base.slice(0, -2);
                    fileName = `${mainName} Mega${suffix}`; // "Raichu Mega X"
                } else {
                    fileName = `${base} Mega`; // "Sceptile Mega"
                }
            }
        }

        const paths = {
            'artwork': `data/sprites/pokemon/artwork/${fileName}.png`,
            'standard': `data/sprites/pokemon/standard/${id}.png`,
            'animated': `data/sprites/pokemon/animated/${id}.gif`
        };

        return paths[style] || paths['artwork'];
    }

    handleImageError(img, id, type) {
        // Fallback semplificato pro-artwork
        if (type === 'artwork') {
            const standardFallback = `data/sprites/pokemon/standard/${id}.png`;
            if (img.src.indexOf(standardFallback) === -1) {
                img.src = standardFallback;
                return;
            }
        }
        const unknownBase64 = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MCIgZmlsbD0iI2UyZThlZiIvPjx0ZXh0IHg9IjUwIiB5PSI2NSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjQ1IiBmaWxsPSIjOTQzMzIyIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj4/PC90ZXh0Pjwvc3ZnPg==';
        
        if (img.src.indexOf('data:image/svg+xml') === -1) {
            img.src = unknownBase64;
            this.logMissingAsset(id, 'all forms');
        }
    }

    logMissingAsset(id, type) {
        if (!window._missingAssets) window._missingAssets = new Set();
        const entry = `${type.toUpperCase()} #${id}`;
        if (!window._missingAssets.has(entry)) {
            window._missingAssets.add(entry);
            console.warn(`[Pokedex] Asset mancante: ${entry}`);
        }
    }


    calculateEffectiveness(types) {
        const effectiveness = {};
        const allTypes = Object.keys(TYPE_CHART);
        
        allTypes.forEach(t => effectiveness[t] = 1);

        types.forEach(pType => {
            allTypes.forEach(attackType => {
                const multiplier = TYPE_CHART[attackType][pType];
                if (multiplier !== undefined) {
                    effectiveness[attackType] *= multiplier;
                }
            });
        });

        return effectiveness;
    }

    renderEffectiveness(types) {
        const eff = this.calculateEffectiveness(types);
        const results = Object.entries(eff).filter(([_, val]) => val !== 1);

        if (results.length === 0) return '';

        const groups = {
            weak4: results.filter(([_, v]) => v >= 4),
            weak2: results.filter(([_, v]) => v === 2),
            res: results.filter(([_, v]) => v === 0.5 || v === 0.25),
            immune: results.filter(([_, v]) => v === 0)
        };

        const renderGroup = (label, list, colorClass) => {
            if (list.length === 0) return '';
            const badges = list.map(([type, val]) => {
                const typeName = TYPE_LABELS[type] || type;
                let multiplierLabel = `x${val}`;
                if (val === 0.25) multiplierLabel = 'x¼';
                if (val === 0.5) multiplierLabel = 'x½';

                let description = `Prende danni ${val > 1 ? 'maggiori' : 'ridotti'} (${multiplierLabel}) dal tipo ${typeName}`;
                if (val === 0) description = `Immune al tipo ${typeName}`;

                return `
                    <div class="eff-badge-compact ${colorClass}" data-tooltip="${typeName.toUpperCase()}: ${description}">
                        <span class="type-icon-only ${type}"><i style="-webkit-mask-image: url('assets/icons/types/${type}.svg'); mask-image: url('assets/icons/types/${type}.svg');"></i></span>
                    </div>
                `;
            }).join('');

            return `
                <div class="eff-group">
                    <div class="eff-group-label ${colorClass}">${label}</div>
                    <div class="effectiveness-grid">${badges}</div>
                </div>
            `;
        };

        return `
            <div class="grouped-section section-effectiveness">
                <h3><i class="icon"></i> Difesa e Debolezze</h3>
                <div class="eff-grid-layout">
                    <div class="eff-column">
                        ${renderGroup('Debolezze Critiche (x4)', groups.weak4, 'eff-weak-critical')}
                        ${renderGroup('Debolezze (x2)', groups.weak2, 'eff-weak')}
                    </div>
                    <div class="eff-column">
                        ${renderGroup('Resistenze', groups.res, 'eff-res')}
                        ${renderGroup('Immunità', groups.immune, 'eff-immune')}
                    </div>
                </div>
            </div>
        `;
    }

    async render() {
        this.pokemonList = window.pokemonList || [];
        
        // Create a lookup map for abilities by Name
        this.abilityMap = {};
        if (window.abilitiesDb && window.abilitiesDb.abilities) {
            this.abilityMap = window.abilitiesDb.abilities;
            // Support lookup by old numeric ID if still needed during migration
            Object.values(this.abilityMap).forEach(a => {
                if (a.pokeapi_id) this.abilityMap[String(a.pokeapi_id)] = a;
            });
        }

        // Build a base species map (name -> id) to link Megas to their base form
        this.baseSpeciesMap = {};
        this.pokemonList.forEach(p => {
            if (p.is_default || p.id < 10000) {
                // Map the common name (it) to the standard ID
                const nameKey = (p.name_it || p.name || '').toLowerCase();
                if (nameKey && !this.baseSpeciesMap[nameKey]) {
                    this.baseSpeciesMap[nameKey] = p.id;
                }
            }
        });
        
        this.grid = document.getElementById('pokedex-grid');
        this.countDisplay = document.getElementById('pokemon-count');
        this.searchInput = document.getElementById('search-input');
        this.typeSelect = document.getElementById('type-select');

        this.typeSelect.addEventListener('change', (e) => {
            this.selectedType = e.target.value;
            this.visibleCount = 80;
            this.renderGrid();
        });

        this.viewModeSelect = document.getElementById('view-mode-select');
        this.viewMode = 'grid'; // default view mode
        this.listSortKey = 'id';
        this.listSortOrder = 'asc';

        if (this.viewModeSelect) {
            this.viewModeSelect.addEventListener('change', (e) => {
                this.viewMode = e.target.value;
                this.visibleCount = 80;

                if (this.grid) {
                    this.grid.className = 'pokemon-grid';
                    if (this.viewMode === 'compact') {
                        this.grid.classList.add('compact');
                    } else if (this.viewMode === 'list') {
                        this.grid.classList.add('list-view');
                    }
                }

                this.renderGrid();
            });
        }

        this.modeSelect = document.getElementById('list-mode-select');
        if (this.modeSelect) {
            this.modeSelect.addEventListener('change', (e) => {
                this.listMode = e.target.value;
                this.visibleCount = 80;
                
                // Update specific valid IDs based on mode
                if (this.listMode === 'nazionale') {
                    window._currentValidPokemonIds = window._nationalIds;
                } else {
                    const season = (window.pokedexData && window.pokedexData.regolamenti) ? 
                                    window.pokedexData.regolamenti.find(r => r.id === this.listMode) : null;
                    // If season uses numeric IDs, we need to be careful. But our system is transitioning to names.
                    // For now, if season has numeric IDs, map them or use as is if names are already used.
                    window._currentValidPokemonIds = season ? new Set(season.pokemon_ids.map(id => String(id))) : window._nationalIds;
                }
                
                this.renderGrid();
            });
        }

        // View switch buttons (Pokedex/Mega)
        this.viewSwitchBtns = document.querySelectorAll('.view-switch-btn');
        this.viewSwitchBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.viewSwitchBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.activeSection = btn.dataset.view;
                this.visibleCount = 80;
                this.renderGrid();
            });
        });

        if (this.searchInput) {
            this.searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value.toLowerCase();
                this.visibleCount = 80;
                this.renderGrid();
            });
        }

        // Infinite scroll
        this._scrollHandler = () => {
            const view = document.getElementById('pokedex-view');
            if (!view || !view.classList.contains('active')) return;

            if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 500) {
                if (this.visibleCount < this.filteredList.length) {
                    this.visibleCount += 40;
                    this.renderGrid(true);
                }
            }
        };
        window.addEventListener('scroll', this._scrollHandler);

        const initCompareBtn = document.getElementById('init-compare-btn');
        if (initCompareBtn) {
            initCompareBtn.addEventListener('click', () => {
                this.toggleCompareMode();
            });
        }

        // Initial render
        this.renderGrid();
    }



    buildDynamicChips() {
        const chipRow = document.getElementById('dynamic-chip-row');
        if (!chipRow) return;

        let html = `<label class="chip"><input type="radio" name="formType" value="base" checked><span>Pokémon</span></label>`;
        
        const availableForms = new Set();
        this.pokemonList.forEach(p => {
            const hasPk = window._currentValidPokemonIds && window._currentValidPokemonIds.has(p.name);
            if (!p.is_default && hasPk) {
                const n = p.name;
                if (n.includes('-mega')) availableForms.add('mega');
                if (n.includes('-gmax')) availableForms.add('gmax');
                if (n.includes('-alola')) availableForms.add('alola');
                if (n.includes('-galar')) availableForms.add('galar');
                if (n.includes('-hisui')) availableForms.add('hisui');
                if (n.includes('-paldea')) availableForms.add('paldea');
            }
        });

        if (availableForms.size > 0) {
            html += `<label class="chip"><input type="radio" name="formType" value="altro"><span>Altro...</span></label>`;
            
            let subOptions = `<option value="all_altro">Tutte le forme speciali</option>`;
            if (availableForms.has('mega')) subOptions += `<option value="mega">MegaEvoluzioni</option>`;
            if (availableForms.has('gmax')) subOptions += `<option value="gmax">Gigamax</option>`;
            
            const hasRegional = ['alola', 'galar', 'hisui', 'paldea'].some(r => availableForms.has(r));
            if (hasRegional) {
                subOptions += `<option value="regionali_all">Tutte le Forme Regionali</option>`;
            }

            if (availableForms.has('alola')) subOptions += `<option value="alola">Forme Alola</option>`;
            if (availableForms.has('galar')) subOptions += `<option value="galar">Forme Galar</option>`;
            if (availableForms.has('hisui')) subOptions += `<option value="hisui">Forme Hisui</option>`;
            if (availableForms.has('paldea')) subOptions += `<option value="paldea">Forme Paldea</option>`;
            
            html += `<select id="altro-form-select" class="game-select" style="display:none; margin-left:10px; width:auto; font-size:0.85rem;">
                ${subOptions}
            </select>`;
        }

        chipRow.innerHTML = html;

        this.formChips = document.querySelectorAll('input[name="formType"]');
        const altroSelect = document.getElementById('altro-form-select');
        
        this.selectedForm = 'base';
        this.selectedSubForm = 'all_altro';

        this.formChips.forEach(chip => {
            chip.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.selectedForm = e.target.value;
                    if (altroSelect) {
                        altroSelect.style.display = this.selectedForm === 'altro' ? 'inline-block' : 'none';
                    }
                    this.visibleCount = 80;
                    this.renderGrid();
                }
            });
        });

        if (altroSelect) {
            altroSelect.addEventListener('change', (e) => {
                this.selectedSubForm = e.target.value;
                this.visibleCount = 80;
                this.renderGrid();
            });
        }
    }

    normalizeString(str) {
        if (!str) return '';
        return str.toLowerCase().replace(/[^a-z0-9]/g, '');
    }

    renderGrid(append = false) {
        const query = (this.searchInput ? this.searchInput.value : '').toLowerCase();
        
        if (!append) {
            this.filteredList = this.pokemonList.filter(p => {
                const pTypes = (p.types || []).map(t => t.toLowerCase());
                const isDefault = p.is_default !== undefined ? p.is_default : true;
                const pNameLower = (p.name || '').toLowerCase();
                const displayNameLower = (p.name_it || p.name || '').toLowerCase();
                
                // Optimized isMega and isGmax detection
                const isMega = (pNameLower.startsWith('mega ') || pNameLower.includes('-mega')) && 
                               !['meganium', 'yanmega'].some(x => pNameLower === x);
                const isGmax = pNameLower.includes('-gmax');
                
                // Strict Eligibility check logic: Only NAMES explicitly in the roster appear
                const isEligible = window._currentValidPokemonIds ? window._currentValidPokemonIds.has(p.name) : true;
                if (!isEligible) return false;

                // Tab separation logic
                if (this.activeSection === 'mega') {
                    if (!isMega) return false;
                } else {
                    // Standard Pokemon view
                    if (isMega) return false;
                }

                if (query && !displayNameLower.includes(query) && !pNameLower.includes(query) && 
                    String(p.species_id || '') !== query && String(p.dexId || '') !== query) return false;
                if (this.selectedType !== 'all' && !pTypes.includes(this.selectedType.toLowerCase())) return false;

                if (this.selectedForm !== 'all') {
                    if (this.selectedForm === 'base') {
                        if (isMega || isGmax) return false;
                    } else if (this.selectedForm === 'altro') {
                        if (!isMega && !isGmax && isDefault) return false;
                        if (this.selectedSubForm === 'mega' && !isMega) return false;
                        if (this.selectedSubForm === 'gmax' && !isGmax) return false;
                        if (this.selectedSubForm === 'regionali_all') {
                            const isReg = ['-alola', '-galar', '-hisui', '-paldea'].some(r => pNameLower.includes(r));
                            if (!isReg) return false;
                        }
                    }
                }
                
                p._cachedTypes = (p.types || []).map(t => t.toLowerCase());
                return true;
            });

            if (this.viewMode === 'list' && this.listSortKey) {
                const getStat = (p, statName) => {
                    const s = p.stats ? p.stats.find(st => st.name === statName) : null;
                    return s ? s.base_stat : 0;
                };
                const getBst = (p) => {
                    return p.stats ? p.stats.reduce((acc, st) => acc + (st.base_stat || 0), 0) : 0;
                };

                this.filteredList.sort((a, b) => {
                    let valA, valB;
                    if (this.listSortKey === 'id') {
                        valA = a.dexId || a.id || 0;
                        valB = b.dexId || b.id || 0;
                    } else if (this.listSortKey === 'name') {
                        valA = a.name_it || a.name || '';
                        valB = b.name_it || b.name || '';
                    } else if (this.listSortKey === 'bst') {
                        valA = getBst(a);
                        valB = getBst(b);
                    } else {
                        valA = getStat(a, this.listSortKey);
                        valB = getStat(b, this.listSortKey);
                    }

                    let comp = 0;
                    if (typeof valA === 'string') {
                        comp = valA.localeCompare(valB);
                    } else {
                        comp = valA - valB;
                    }
                    return this.listSortOrder === 'asc' ? comp : -comp;
                });
            } else {
                this.filteredList.sort((a, b) => {
                    const specA = a.dexId || a.id || 0;
                    const specB = b.dexId || b.id || 0;
                    if (specA !== specB) return specA - specB;
                    return (a.name || "").localeCompare(b.name || "");
                });
            }

            if (this.countDisplay) {
                this.countDisplay.textContent = `${this.filteredList.length} Pokemon trovati`;
            }
        }

        if (this.viewMode === 'list') {
            const getStat = (p, statName) => {
                const s = p.stats ? p.stats.find(st => st.name === statName) : null;
                return s ? s.base_stat : 0;
            };
            const getBst = (p) => {
                return p.stats ? p.stats.reduce((acc, st) => acc + (st.base_stat || 0), 0) : 0;
            };

            const sortClass = (key) => {
                if (this.listSortKey !== key) return 'class="sortable"';
                return `class="sortable active-sort ${this.listSortOrder}"`;
            };

            let tableHtml = `
                <table class="pokedex-list-table">
                    <thead>
                        <tr>
                            <th ${sortClass('id')} data-sort="id">ID</th>
                            <th>Sprite</th>
                            <th ${sortClass('name')} data-sort="name">Nome</th>
                            <th>Tipi</th>
                            <th ${sortClass('hp')} data-sort="hp" class="col-stat">HP</th>
                            <th ${sortClass('attack')} data-sort="attack" class="col-stat">Att</th>
                            <th ${sortClass('defense')} data-sort="defense" class="col-stat">Dif</th>
                            <th ${sortClass('special-attack')} data-sort="special-attack" class="col-stat">SpA</th>
                            <th ${sortClass('special-defense')} data-sort="special-defense" class="col-stat">SpD</th>
                            <th ${sortClass('speed')} data-sort="speed" class="col-stat">Vel</th>
                            <th ${sortClass('bst')} data-sort="bst" class="col-bst">BST</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            const sliced = this.filteredList.slice(0, this.visibleCount);
            tableHtml += sliced.map(p => {
                const spriteStr = this.getSpriteUrl(p, 'artwork');
                const displayName = p.name_it || (p.name ? p.name.charAt(0).toUpperCase() + p.name.slice(1).replace(/-/g, ' ') : `Pokémon #${p.id}`);
                const typesHTML = (p._cachedTypes || []).map(t => `<span class="type ${t}" title="${TYPE_LABELS[t] || t.toUpperCase()}">${TYPE_LABELS[t] || t.toUpperCase()}</span>`).join('');
                
                const hp = getStat(p, 'hp');
                const atk = getStat(p, 'attack');
                const def = getStat(p, 'defense');
                const spa = getStat(p, 'special-attack');
                const spd = getStat(p, 'special-defense');
                const spe = getStat(p, 'speed');
                const bst = getBst(p);

                return `
                    <tr data-name="${p.name}">
                        <td class="col-id">#${String(p.dexId || p.id).padStart(4, '0')}</td>
                        <td><img src="${spriteStr}" class="table-sprite" onerror="window.pokedexView.handleImageError(this, '${p.name}', 'standard')"></td>
                        <td><strong>${displayName}</strong></td>
                        <td><div class="pokemon-types">${typesHTML}</div></td>
                        <td class="col-stat">${hp}</td>
                        <td class="col-stat">${atk}</td>
                        <td class="col-stat">${def}</td>
                        <td class="col-stat">${spa}</td>
                        <td class="col-stat">${spd}</td>
                        <td class="col-stat ${spe >= 100 ? 'high-speed' : ''}"><strong>${spe}</strong></td>
                        <td class="col-bst">${bst}</td>
                    </tr>
                `;
            }).join('');

            tableHtml += `
                    </tbody>
                </table>
            `;

            if (this.filteredList.length === 0) {
                this.grid.innerHTML = `<div class="muted" style="text-align: center; padding: 2rem;">Nessun Pokémon trovato con questi filtri.</div>`;
            } else {
                this.grid.innerHTML = tableHtml;
            }

            // Click handler on table rows
            const rows = this.grid.querySelectorAll('tbody tr');
            rows.forEach(row => {
                row.addEventListener('click', () => {
                    const name = row.dataset.name;
                    if (name) this.handlePokemonClick(name, row);
                });
            });

            // Sort handler on column headers
            const headers = this.grid.querySelectorAll('thead th[data-sort]');
            headers.forEach(th => {
                th.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const sortKey = th.dataset.sort;
                    if (this.listSortKey === sortKey) {
                        this.listSortOrder = this.listSortOrder === 'asc' ? 'desc' : 'asc';
                    } else {
                        this.listSortKey = sortKey;
                        this.listSortOrder = ['id', 'name'].includes(sortKey) ? 'asc' : 'desc';
                    }
                    this.renderGrid();
                });
            });

        } else {
            const renderCard = (p) => {
                const typesHTML = (p._cachedTypes || []).map(t => `<span class="type ${t}" title="${TYPE_LABELS[t] || t.toUpperCase()}">${TYPE_LABELS[t] || t.toUpperCase()}</span>`).join('');
                const spriteStr = this.getSpriteUrl(p, 'artwork');
                const displayName = p.name_it || (p.name ? p.name.charAt(0).toUpperCase() + p.name.slice(1).replace(/-/g, ' ') : `Pokémon #${p.id}`);
                
                return `
                    <div class="pokemon-card" data-name="${p.name}">
                        <img src="${spriteStr}" alt="${displayName}" loading="lazy" onerror="window.pokedexView.handleImageError(this, '${p.name}', 'standard')">
                        <div class="pokemon-meta">
                            <span class="pokemon-id">#${String(p.species_id || p.id).padStart(4, '0')}</span>
                            <h3 class="pokemon-name">${displayName}</h3>
                            <div class="pokemon-types">${typesHTML}</div>
                        </div>
                    </div>
                `;
            };

            const sliced = this.filteredList.slice(0, this.visibleCount);
            let finalHtml = sliced.map(renderCard).join('');

            if (this.filteredList.length === 0) {
                this.grid.innerHTML = `<div class="muted" style="grid-column: 1/-1; text-align: center; padding: 2rem;">Nessun Pokémon trovato con questi filtri.</div>`;
            } else {
                this.grid.innerHTML = finalHtml;
            }

            const cards = this.grid.querySelectorAll('.pokemon-card');
            cards.forEach(card => {
                card.addEventListener('click', () => {
                    const name = card.dataset.name;
                    if (name) this.handlePokemonClick(name, card);
                });
            });
        }
    }

    async openDetails(id) {
        // 'id' is now the Pokemon Name
        const loader = document.getElementById('global-loader');
        if (loader) loader.classList.remove('hidden');

        try {
            const name = String(id);
            if (this.detailCache[name]) {
                this.showModal(this.detailCache[name]);
                return;
            }

            // 1. Find basic data in pokemonList
            const baseData = (window.pokemonList || []).find(p => p.name === name);
            if (!baseData) {
                alert(`Il Pokémon "${name}" non è disponibile in questa versione del gioco.`);
                if (loader) loader.classList.add('hidden');
                return;
            }

            // 2. Get Species Meta Data (cosmetic)
            const speciesMeta = (window.speciesMetaData && window.speciesMetaData[name]) || {};

            // 3. Get Moves
            const learnsetData = (window.learnsetsData && window.learnsetsData[name]) || { moves: [] };

            // 4. Build details object
            const details = {
                ...baseData,
                speciesMetaData: speciesMeta,
                // Mock PokeAPI legacy structure for compatibility if needed
                species: {
                    name_it: baseData.name_it || name,
                    genus: speciesMeta.genus || '',
                    flavor_text: speciesMeta.flavor_text || 'Dati Pokédex non disponibili.',
                    gender_rate: speciesMeta.gender_rate ?? -1,
                    capture_rate: speciesMeta.capture_rate || 0,
                    base_happiness: speciesMeta.base_happiness || 0,
                    growth_rate: speciesMeta.growth_rate || 'medium'
                },
                height: speciesMeta.height || 0,
                weight: speciesMeta.weight || 0,
                base_experience: speciesMeta.base_experience || 0,
                abilities: (baseData.abilities || []).map(abName => ({
                    id: abName,
                    name: abName,
                    is_hidden: abName === baseData.hidden_ability
                })),
                moves: {
                    'pokemon-champions': (learnsetData.moves || []).map(m => ({
                        id: m.name,
                        name: m.name,
                        level: m.level || 0,
                        method: m.method || 'level-up'
                    }))
                }
            };

            this.detailCache[name] = details;
            this.showModal(details);
        } catch (e) {
            console.error(e);
            alert('Errore nel caricamento dei dati del Pokémon.');
        } finally {
            if (loader) loader.classList.add('hidden');
        }
    }

    renderMovesForModal(data, gameTarget) {
        const gameMoves = data.moves[gameTarget] || [];
        const totalCount = gameMoves.length;
        
        const groups = {
            'level-up': { icon: 'assets/icons/methods/level-up.svg', label: 'Per Livello', items: [] },
            'machine': { icon: 'assets/icons/methods/machine.svg', label: 'Macchine (MT/MN)', items: [] },
            'egg': { icon: 'assets/icons/methods/egg.svg', label: 'Mosse Uovo', items: [] },
            'tutor': { icon: 'assets/icons/methods/tutor.svg', label: 'Esperto Mosse', items: [] },
            'other': { icon: 'assets/icons/methods/tm.svg', label: 'Altro', items: [] }
        };

        gameMoves.forEach(m => {
            const mid = m.id || m.name || (typeof m === 'number' ? String(m) : null);
            if (!mid) return;
            const moveData = window.movesDb?.moves?.[mid];
            if (!moveData) return;

            let method = m.method || 'level-up';
            if (method.includes('machine')) method = 'machine';
            else if (method.includes('egg')) method = 'egg';
            else if (method.includes('tutor')) method = 'tutor';
            else if (method !== 'level-up') method = 'other';
            
            groups[method].items.push({ 
                id: mid,
                level: m.level || 0,
                method: method,
                detail: moveData 
            });
        });

        const sections = Object.entries(groups)
            .filter(([_, g]) => g.items.length > 0)
            .map(([key, group]) => {
                // Ordina per Tipo
                group.items.sort((a, b) => (a.detail.type || '').localeCompare(b.detail.type || ''));

                const rows = group.items.map(mi => {
                    const md = mi.detail;
                    const it = md.name_it;
                    const en = md.name_en || md.name || md.slug || "---";
                    const itName = (it && it !== en) ? `${it} / ${en}` : en;
                    
                    const typeSlug = (md.type || 'normal').toLowerCase();
                    const typeLabel = TYPE_LABELS[typeSlug] || typeSlug.toUpperCase();
                    const dmgLabel = CATEGORY_LABELS[md.category || md.damage_class] || md.category || '';
                    const dmgHtml = (md.category || md.damage_class) ? `<span class="cat-icon cat-${md.category || md.damage_class}" title="${dmgLabel}"></span>` : '';
                    
                    let badgeText = `Lv. ${mi.level}`;
                    if (key === 'machine') badgeText = this.getMachineName(mi.id, gameTarget);
                    else if (key === 'egg') badgeText = 'Uovo';
                    else if (key === 'tutor') badgeText = 'Esperto';
                    else if (mi.level === 0) badgeText = 'Base';

                    return `
                        <div class="move-card clickable-move-card" onclick="window.pokedexView.openMoveDetails('${mi.id}')" style="--move-color: var(--type-${typeSlug});">
                            <div class="move-card-top">
                                <span class="move-lvl-badge">${badgeText}</span>
                                <span class="move-name-main">${itName}</span>
                                <div class="move-cat-wrap">${dmgHtml}</div>
                                <span class="type-mini ${typeSlug}">${typeLabel}</span>
                            </div>
                            <div class="move-card-details-preview">
                                <div class="move-stat-mini">
                                    <span class="label">POT:</span>
                                    <span class="value">${md.power || md.power_raw || '--'}</span>
                                </div>
                                <div class="move-stat-mini">
                                    <span class="label">PREC:</span>
                                    <span class="value">${md.accuracy ? md.accuracy + '%' : (md.accuracy_raw === 101 ? '---' : '--')}</span>
                                </div>
                                <div class="move-stat-mini">
                                    <span class="label">PP:</span>
                                    <span class="value">${md.pp || '--'}</span>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');

                if (key === 'level-up') {
                    return `<div class="move-method-grid no-header">${rows}</div>`;
                }

                return `
                    <div class="move-method-section">
                        <div class="move-method-header">
                            <span><i class="icon-svg method-icon" style="-webkit-mask-image: url('${group.icon}'); mask-image: url('${group.icon}');"></i> ${group.label}</span>
                            <span class="count-badge">${group.items.length}</span>
                        </div>
                        <div class="move-method-grid">${rows}</div>
                    </div>
                `;
            }).join('');

        return { html: sections, count: totalCount };
    }

    showModal(data) {
        const modalsRoot = document.getElementById('modals-root');
        if (!modalsRoot) return;

        let activeModalGame = window._currentDbGame || 'pokemon-champions';
        
        const spriteStr = this.getSpriteUrl(data, 'artwork');
        
        // Modal title logic - safe initialization
        const dataName = data.name || 'Unknown';
        const baseSpeciesName = data.species?.name_it || '';
        
        const isMegaOrGmax = dataName.toLowerCase().includes('mega') || dataName.toLowerCase().includes('gmax');
        let targetTitle = isMegaOrGmax ? dataName : (baseSpeciesName || dataName);
        if (!targetTitle) targetTitle = 'Pokémon #' + data.id;

        const genusText = data.species?.genus || '';
        const flavorText = data.species?.flavor_text || 'Dati Pokédex non disponibili.';
        
        // Helper for Gender Ratio
        let genderHtml = 'Senza Genere';
        if (data.species && data.species.gender_rate !== -1) {
            const femaleChance = (data.species.gender_rate / 8) * 100;
            const maleChance = 100 - femaleChance;
            genderHtml = `<span style="color:#60a5fa;"> ${maleChance}%</span> / <span style="color:#f472b6;"> ${femaleChance}%</span>`;
        }

        const bst = (data.stats || []).reduce((acc, s) => acc + s.base_stat, 0);

        const getStatColor = (val) => {
            if (val < 50) return '#f87171'; // Red
            if (val < 70) return '#fb923c'; // Orange
            if (val < 90) return '#facc15'; // Yellow
            if (val < 120) return '#4ade80'; // Green
            if (val < 150) return '#22d3ee'; // Cyan
            return '#a78bfa'; // Purple
        };

        const statsEntriesHtml = (data.stats || []).map(s => {
            const statKey = s.name.toLowerCase()
                .replace('-', '')
                .replace('specialattack', 'spa')
                .replace('specialdefense', 'spd')
                .replace('attack', 'atk')
                .replace('defense', 'def')
                .replace('speed', 'spe');
            
            const color = getStatColor(s.base_stat);
            const percent = Math.min(100, (s.base_stat / 200) * 100); // 200 is a good baseline for "maxed" visibility

            return `
                <div class="stat-row-premium">
                    <div class="stat-info">
                        <span class="stat-label-mini">${s.name.toUpperCase().replace('SPECIAL-', 'SP. ')}</span>
                        <span class="stat-value-bold">${s.base_stat}</span>
                    </div>
                    <div class="stat-bar-container">
                        <div class="stat-bar-fill" style="width: ${percent}%; background: ${color}; box-shadow: 0 0 8px ${color}44;"></div>
                    </div>
                </div>
            `;
        }).join('');

        const statsHtml = `
            <div class="stats-grid-premium">
                ${statsEntriesHtml}
            </div>
            <div class="bst-row-premium">
                <span class="bst-label">TOTALE BASE STATS (BST)</span>
                <span class="bst-value">${bst}</span>
            </div>
        `;

        const movesResult = this.renderMovesForModal(data, activeModalGame);

        const abilitiesHtml = (data.abilities || []).map(a => {
            const aid = typeof a === 'number' ? a : a.id;
            const ad = this.abilityMap[aid] || { name_it: `Abilità #${aid}`, description_it: 'Descrizione non disponibile.' };
            
            const it = ad.name_it;
            const en = ad.name_en || ad.name || ad.slug || '';
            const itName = (it && it !== en) ? `${it} / ${en}` : en;
            
            const flavor = ad.description_it || ad.description || ad.effect || "Nessuna descrizione.";
            
            // Resolve technical effect
            let extended = '';
            const versionNode = (ad.version_matrix || {})[activeModalGame] || {};
            
            if (ad.mechanics_nodes && Array.isArray(ad.mechanics_nodes)) {
                const mechRef = versionNode.mechanics_ref || ad.current_mechanics_ref || (ad.mechanics_nodes[0] ? ad.mechanics_nodes[0].mechanics_ref : null);
                const mech = ad.mechanics_nodes.find(mn => mn.mechanics_ref === mechRef) || ad.mechanics_nodes[0];
                extended = mech ? (mech.effect_it || "") : "";
            } else {
                extended = ad.effect_technical || ad.effect || "";
            }

            return `
                <div class="ability-card ${a.is_hidden ? 'hidden-ability' : ''}" data-ability-id="${aid}">
                    <div class="ability-header">
                        <div class="ability-title-row">
                            <span class="ability-name">${itName}</span>
                            ${a.is_hidden ? '<span class="hidden-badge">Nascosta</span>' : ''}
                        </div>
                        <i class="icon-chevron" style="opacity:0.5;">▼</i>
                    </div>
                    <div class="ability-flavor">${flavor}</div>

                </div>
            `;
        }).join('');

        const evolutionHtml = this.renderEvolutionChain(data);

        // Build form label for the title only if not already in targetTitle
        let formLabel = '';
        const nameLower = data.name.toLowerCase();
        const targetLower = targetTitle.toLowerCase();
        
        if (!targetLower.includes('mega') && nameLower.includes('-mega')) formLabel = ' (Mega)';
        else if (!targetLower.includes('gigamax') && nameLower.includes('-gmax')) formLabel = ' (Gigamax)';
        else if (!targetLower.includes('alola') && nameLower.includes('-alola')) formLabel = ' (Alola)';
        else if (!targetLower.includes('galar') && nameLower.includes('-galar')) formLabel = ' (Galar)';
        else if (!targetLower.includes('hisui') && nameLower.includes('-hisui')) formLabel = ' (Hisui)';
        else if (!targetLower.includes('paldea') && nameLower.includes('-paldea')) formLabel = ' (Paldea)';

        modalsRoot.innerHTML = `
            <div class="modal-backdrop" id="modal-backdrop">
                <div class="modal-content">
                    <button class="modal-close" id="modal-close">&times;</button>
                    <div class="modal-header">
                        <div class="header-titles" style="display: flex; justify-content: space-between; align-items: flex-start; width: 100%;">
                            <div style="display:flex; flex-direction:column; gap:6px;">
                                <h2 style="text-transform: capitalize; margin: 0; line-height: 1.1;">${targetTitle.replace(/-/g, ' ')}</h2>
                                <div class="pokemon-types" style="margin-top:0; display: flex; gap: 0.5rem;">${(data.types || []).map(t => {
                                    const typeLower = t.toLowerCase();
                                    const typeLocal = (typeof TYPE_LABELS !== 'undefined' && TYPE_LABELS[typeLower]) ? TYPE_LABELS[typeLower] : (window.typeTranslations ? window.typeTranslations[typeLower] || t : t);
                                    return `<span class="type ${typeLower}" title="${typeLocal}">${typeLocal}</span>`;
                                }).join('')}</div>
                            </div>
                            <span class="muted dex-num" style="margin-left: auto;">#${String(data.id).padStart(4, '0')}</span>
                        </div>
                        <div class="muted genus">${genusText}</div>
                    </div>
                    <div class="modal-body">
                        <div class="modal-hero">
                            <img src="${spriteStr}" class="modal-art" alt="${targetTitle}" onerror="window.pokedexView.handleImageError(this, ${data.id}, 'artwork')">
                        </div>
                        <div class="pokedex-entry-box">${flavorText}</div>
                        
                        ${this.renderEffectiveness(data.types || [])}

                        <div class="grouped-section section-stats">
                            <h3><i class="icon"></i> Statistiche Base</h3>
                            <div class="stats-container">${statsHtml}</div>
                        </div>

                        <div class="grouped-section section-bio">
                            <h3><i class="icon"></i> Biometria</h3>
                            <div class="bio-grid">
                                <div><span class="muted">Altezza: </span><strong>${data.height ? (data.height / 10).toFixed(1) + ' m' : '--'}</strong></div>
                                <div><span class="muted">Peso: </span><strong>${data.weight ? (data.weight / 10).toFixed(1) + ' kg' : '--'}</strong></div>
                                <div><span class="muted">Genere: </span><strong>${genderHtml}</strong></div>
                                <div><span class="muted">Exp Base: </span><strong>${data.base_experience || '--'}</strong></div>
                            </div>
                        </div>

                        ${evolutionHtml}

                        <div class="grouped-section section-abilities">
                            <h3><i class="icon"></i> Abilità</h3>
                            <div class="abilities-container">${abilitiesHtml}</div>
                        </div>

                        <div class="grouped-section section-moves">
                            <div class="section-header-row">
                                <div class="title-inline-wrap">
                                    <h3><i class="icon"></i> Mosse Disponibili</h3>
                                    <span class="total-badge">${movesResult.count} mosse</span>
                                </div>
                            </div>
                            <div class="moves-container">${movesResult.html || '<div class="muted">Nessuna mossa trovata per questa versione.</div>'}</div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Setup ability expansions
        modalsRoot.querySelectorAll('.ability-card').forEach(card => {
            card.addEventListener('click', () => {
                const details = card.querySelector('.ability-details');
                if (details) {
                    const isVisible = details.style.display === 'block';
                    details.style.display = isVisible ? 'none' : 'block';
                    card.classList.toggle('expanded', !isVisible);
                    const tip = card.querySelector('.ability-expand-tip');
                    if (tip) tip.style.display = isVisible ? 'block' : 'none';
                }
            });
        });

        // Setup comparison button removed (initiated from home screen instead)

        document.getElementById('modal-close').onclick = () => modalsRoot.innerHTML = '';
        document.getElementById('modal-backdrop').onclick = (e) => { if (e.target.id === 'modal-backdrop') modalsRoot.innerHTML = ''; };

        // Click on evolution stages
        modalsRoot.querySelectorAll('.evo-stage[data-pokemon-id]').forEach(stage => {
            stage.addEventListener('click', () => {
                const targetId = stage.dataset.pokemonId;
                if (targetId && String(targetId) !== String(data.id)) {
                    modalsRoot.innerHTML = '';
                    this.openDetails(targetId);
                }
            });
        });
    }

    renderEvolutionChain(data) {
        const evoData = window.evolutionData;
        if (!evoData || !evoData.species_to_chain) return '';
        
        const speciesId = data.species?.id || data.species_id || data.id;
        const chainId = evoData.species_to_chain[String(speciesId)];
        if (!chainId) return '';
        
        const chain = evoData.chains[chainId] || [];
        
        // Build the visual chain for BASE forms
        let chainHtml = '';
        if (chain.length > 1) {
            for (let i = 0; i < chain.length; i++) {
                const sp = chain[i];
                // Use Name comparison for "current" to distinguish between Base and Mega
                const isCurrent = String(sp.name) === String(data.id);
                
                let triggerText = '';
                if (sp.evolution_details && sp.evolution_details.length > 0) {
                    const det = sp.evolution_details[0];
                    triggerText = det.text_it || '';
                    if (!triggerText) {
                        if (det.min_level) triggerText = `Lv. ${det.min_level}`;
                        else if (det.item) triggerText = det.item.replace(/-/g, ' ');
                        else if (det.trigger === 'trade') triggerText = 'Scambio';
                        else if (det.trigger === 'use-item') triggerText = det.item ? det.item.replace(/-/g, ' ') : 'Oggetto';
                        else if (det.trigger) triggerText = det.trigger.replace(/-/g, ' ');
                    }
                }
                
                if (i > 0) chainHtml += `<span class="evo-arrow">→</span>`;
                
                // Check if this pokemon is in the roster (case-insensitive)
                const rosterPk = (window.pokemonList || []).find(p => p.name.toLowerCase() === sp.name.toLowerCase());
                const existsInRoster = !!rosterPk;
                const fallbackName = sp.name.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                const rosterName = rosterPk ? rosterPk.name : fallbackName;

                const displayName = sp.name_it || sp.name;
                const sprite = this.getSpriteUrl(rosterName, 'artwork');
                const statusClass = !existsInRoster ? 'not-in-roster' : (isCurrent ? 'current' : '');
                const tooltipText = !existsInRoster ? `Non presente nel roster` : `Apri scheda ${displayName}`;

                chainHtml += `
                    <div class="evo-stage ${statusClass}" data-pokemon-id="${existsInRoster ? rosterName : ''}" title="${tooltipText}">
                        <img src="${sprite}" alt="${displayName}" loading="lazy" onerror="window.pokedexView.handleImageError(this, '${rosterName}', 'artwork')">
                        <span class="evo-name">${displayName}</span>
                        ${triggerText ? `<span class="evo-trigger">${triggerText}</span>` : ''}
                    </div>
                `;
            }
        }
        
        // Check for alternate forms (Mega, GMax, etc.) of all species in this chain
        const chainSpeciesIds = chain.length > 0 ? chain.map(s => s.species_id) : [speciesId];
        
        // Get localized names of all species in the chain to match forms
        const chainSpeciesNames = chain.map(s => (s.name_it || '').toLowerCase()).filter(n => n !== '');
        
        const alternateForms = (window.pokemonList || []).filter(p => {
            // Link by species_id OR by localized name matching (more robust for forms)
            const pNameIt = (p.name_it || '').toLowerCase();
            const pNameFull = (p.name || '').toLowerCase();
            
            const isRelated = (p.species_id && chainSpeciesIds.includes(p.species_id)) || 
                              chainSpeciesNames.some(cn => pNameIt.includes(cn) || pNameFull.includes(cn));
                              
            if (!isRelated) return false;
            
            // Do NOT show the base form here anymore, user will use the Evolution Chain to go back
            if (p.is_default) return false;

            // Strict Roster Check for Forms
            const hasPk = window._currentValidPokemonIds && window._currentValidPokemonIds.has(p.name);
            if (!hasPk) return false;

            // Forms we want to show: ONLY Megas and GMax (Regionals are now standard in the grid)
            return (pNameFull.includes('mega') || pNameFull.includes('gmax'));
        });

        alternateForms.sort((a, b) => a.id - b.id);
        
        let formsHtml = '';
        if (alternateForms.length > 0) {
            formsHtml = `<div style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid var(--border);">
                <div style="font-size: 0.8rem; color: var(--muted); margin-bottom: 0.5rem; text-align: center;">Forme Alternative</div>
                <div class="evo-chain">` + 
                alternateForms.map(f => {
                    const sprite = this.getSpriteUrl(f.name, 'artwork');
                    const baseName = f.name_it || f.name.charAt(0).toUpperCase() + f.name.slice(1).replace(/-/g, ' ');
                    const isCurrent = f.name === data.name;
                    
                    let formTypeLabel = '';
                    const n = f.name.toLowerCase();
                    if (f.is_default) formTypeLabel = 'Base';
                    else if (n.includes('-mega-x')) formTypeLabel = 'Mega X';
                    else if (n.includes('-mega-y')) formTypeLabel = 'Mega Y';
                    else if (n.includes('mega')) formTypeLabel = 'Mega';
                    else if (n.includes('gmax')) formTypeLabel = 'Gigamax';
                    else if (n.includes('alola')) formTypeLabel = 'Forma Alola';
                    else if (n.includes('galar')) formTypeLabel = 'Forma Galar';
                    else if (n.includes('hisui')) formTypeLabel = 'Forma Hisui';
                    else if (n.includes('paldea')) formTypeLabel = 'Forma Paldea';
                    else formTypeLabel = 'Alternativa';
                    
                    return `
                        <div class="evo-stage ${isCurrent ? 'current' : ''}" data-pokemon-id="${f.name}" title="Apri ${baseName}">
                            <img src="${sprite}" alt="${baseName}" loading="lazy" onerror="window.pokedexView.handleImageError(this, '${f.name}', 'artwork')">
                            <span class="evo-name">${baseName}</span>
                            <span class="evo-form-label">${formTypeLabel}</span>
                        </div>
                    `;
                }).join('') +
            `</div></div>`;
        }

        if (!chainHtml && !formsHtml) return '';
        
        return `
            <div class="grouped-section section-evolutions">
                <h3><i class="icon"></i> Catena Evolutiva / Forme</h3>
                ${chainHtml ? `<div class="evo-chain">${chainHtml}</div>` : ''}
                ${formsHtml}
            </div>
        `;
    }





    openMoveDetails(moveName) {
        const moveData = window.movesDb.moves[moveName];
        if (!moveData) return;

        // Clean existing move-detail modals
        const existing = document.getElementById('move-detail-modal');
        if (existing) existing.remove();

        // Resolve mechanics
        let mech = {};
        
        if (moveData.mechanics_nodes) {
            // For Champions, we use the default mechanics node or the first one
            mech = moveData.mechanics_nodes['default'] || Object.values(moveData.mechanics_nodes)[0] || {};
        } else {
            // Support for Flat Champions DB
            mech = {
                type_it: moveData.type || 'normale',
                damage_class: moveData.category || 'status',
                power: moveData.power || null,
                accuracy: moveData.accuracy || null,
                pp: moveData.pp || null,
                effect_it: moveData.description_it || moveData.description_en || null
            };
        }
        
        const typeSlug = (mech.type || mech.type_it || 'normal').toLowerCase();
        const typeLabel = TYPE_LABELS[typeSlug] || typeSlug.toUpperCase();
        const it = moveData.name_it;
        const en = moveData.name || moveData.slug || "---";
        const itName = (it && it !== en) ? `${it} / ${en}` : (it || en);

        // Resolve description
        let itDesc = moveData.current_game_description_it || moveData.description_it || "Nessuna descrizione.";

        const modal = document.createElement('div');
        modal.id = 'move-detail-modal';
        modal.className = 'sub-modal-backdrop';
        modal.innerHTML = `
            <div class="sub-modal-content move-detail-content" style="border-top: 4px solid var(--type-${typeSlug});">
                <button class="sub-modal-close" onclick="this.closest('.sub-modal-backdrop').remove()">×</button>
                <div class="move-detail-header">
                    <span class="type-mini ${typeSlug}">${typeLabel}</span>
                    <h3>${itName}</h3>
                </div>
                
                <div class="sub-modal-body">
                    <div class="move-detail-stats">
                        <div class="m-stat">
                            <span class="m-label">Potenza</span>
                            <span class="m-value">${mech.power || '--'}</span>
                        </div>
                        <div class="m-stat">
                            <span class="m-label">Precisione</span>
                            <span class="m-value">${mech.accuracy ? mech.accuracy + '%' : '--'}</span>
                        </div>
                        <div class="m-stat">
                            <span class="m-label">PP</span>
                            <span class="m-value">${mech.pp || '--'}</span>
                        </div>
                        <div class="m-stat">
                            <span class="m-label">Categoria</span>
                            <span class="m-value" style="display:flex; align-items:center; gap:5px;">
                                ${mech.damage_class ? `<span class="cat-icon cat-${mech.damage_class}" title="${CATEGORY_LABELS[mech.damage_class] || mech.damage_class}"></span>` : '--'}
                            </span>
                        </div>
                    </div>

                    <div class="move-detail-flavor">
                        <p>${itDesc}</p>
                    </div>

                    <div id="sub-modal-extra-content">
                        <div class="assoc-pkmn-section" style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid var(--border);">
                            <h4>Pokémon che imparano questa mossa:</h4>
                            <div class="assoc-pkmn-grid" id="move-pokemon-list">
                                <!-- Populated dynamically -->
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        
        // Populate Pokemon List
        const pListContainer = modal.querySelector('#move-pokemon-list');
        if (window.relationsData && window.relationsData.moves) {
            const pkmnNames = window.relationsData.moves[moveName] || [];
            if (pkmnNames.length > 0) {
                const matchingPkmn = (window.pokemonList || []).filter(p => pkmnNames.includes(p.name));
                matchingPkmn.sort((a, b) => (a.dexNumber || 0) - (b.dexNumber || 0));

                let html = '';
                matchingPkmn.forEach(p => {
                    const sprite = this.getSpriteUrl(p.name, 'artwork');
                    const itName = p.name_it || p.name;
                    html += `
                        <div class="assoc-pkmn-icon" title="${itName}" onclick="window.app.navigateTo('pokedex', { pokemon: '${p.name}' }); document.getElementById('move-detail-modal').remove();">
                            <img src="${sprite}" alt="${itName}" onerror="this.src='data/sprites/pokemon/artwork/0.png'">
                            <span class="assoc-pkmn-name-tiny">${itName}</span>
                        </div>
                    `;
                });
                pListContainer.innerHTML = html;
            } else {
                pListContainer.innerHTML = '<div class="muted">Nessun Pokémon noto impara questa mossa.</div>';
            }
        } else {
            pListContainer.innerHTML = '<div class="muted">Dati relazioni non disponibili.</div>';
        }

        modal.querySelector('.sub-modal-close').onclick = () => modal.remove();
        modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    }

    handlePokemonClick(name, element) {
        if (this.compareModeActive) {
            const pkm = this.pokemonList.find(p => p.name === name);
            if (!pkm) return;

            const index = this.selectedForCompare.findIndex(p => p.name === name);
            if (index > -1) {
                // Deselect
                this.selectedForCompare.splice(index, 1);
                element.classList.remove('card-compare-selected');
                element.removeAttribute('data-compare-index');
            } else {
                // Select
                if (this.selectedForCompare.length < 2) {
                    this.selectedForCompare.push(pkm);
                    element.classList.add('card-compare-selected');
                    element.setAttribute('data-compare-index', this.selectedForCompare.length);
                }
                
                if (this.selectedForCompare.length === 2) {
                    const [p1, p2] = this.selectedForCompare;
                    
                    // Exit comparison mode on Home page first to clean up UI
                    this.toggleCompareMode(false);
                    
                    // Open the comparison modal
                    this.openComparisonModal(p1, p2);
                }
            }
        } else {
            this.openDetails(name);
        }
    }

    toggleCompareMode(forceState) {
        const btn = document.getElementById('init-compare-btn');
        
        this.compareModeActive = forceState !== undefined ? forceState : !this.compareModeActive;
        
        let banner = document.getElementById('compare-selection-banner');
        if (!banner) {
            banner = document.createElement('div');
            banner.id = 'compare-selection-banner';
            banner.className = 'compare-banner-info hidden';
            banner.textContent = 'Modalità Confronto: seleziona 2 Pokémon dalla griglia per iniziare';
            const countDiv = document.getElementById('pokemon-count');
            if (countDiv) {
                countDiv.parentNode.insertBefore(banner, countDiv.nextSibling);
            }
        }
        
        if (this.compareModeActive) {
            this.selectedForCompare = [];
            if (btn) {
                btn.textContent = 'Annulla';
                btn.classList.add('active');
            }
            if (banner) {
                banner.classList.remove('hidden');
            }
            if (this.grid) {
                this.grid.classList.add('compare-selection-mode');
            }
        } else {
            this.selectedForCompare = [];
            if (btn) {
                btn.textContent = 'Confronta';
                btn.classList.remove('active');
            }
            if (banner) {
                banner.classList.add('hidden');
            }
            if (this.grid) {
                this.grid.classList.remove('compare-selection-mode');
                this.grid.querySelectorAll('.card-compare-selected').forEach(el => {
                    el.classList.remove('card-compare-selected');
                    el.removeAttribute('data-compare-index');
                });
            }
        }
    }

    openComparisonModal(pkm1, pkm2) {
        const modalsRoot = document.getElementById('modals-root');
        if (!modalsRoot) return;

        // Sort all Pokémon alphabetically for selector dropdowns
        const sortedList = [...this.pokemonList].sort((a, b) => {
            const nameA = a.name_it || a.name || '';
            const nameB = b.name_it || b.name || '';
            return nameA.localeCompare(nameB);
        });

        // Helper to generate options with selection
        const makeOptions = (selectedPkm) => {
            return sortedList.map(p => {
                const isSelected = selectedPkm && p.name === selectedPkm.name ? 'selected' : '';
                return `<option value="${p.name}" ${isSelected}>${p.name_it || p.name}</option>`;
            }).join('');
        };

        // Header and selectors HTML
        let modalHtml = `
            <div class="modal-backdrop" id="compare-modal-backdrop">
                <div class="modal-content" style="max-width: 750px; padding: 1.5rem;">
                    <button class="modal-close" id="compare-modal-close">&times;</button>
                    
                    <div class="modal-header" style="padding: 0 0 1rem 0; border-bottom: 1px solid var(--border);">
                        <h2 style="margin: 0;"> Confronto Pokémon</h2>
                        <div class="muted">Champions Regulation M-B</div>
                    </div>

                    <div class="modal-body" style="padding: 1rem 0 0 0; background: transparent;">
                        
                        <!-- Selectors -->
                        <div class="compare-selectors" style="display: flex; gap: 1rem; align-items: center; justify-content: center; margin-bottom: 1.5rem; flex-wrap: wrap; background: rgba(255,255,255,0.02); padding: 1rem; border-radius: 12px; border: 1px solid var(--border);">
                            <div style="flex: 1; min-width: 200px; display: flex; flex-direction: column; gap: 0.5rem;">
                                <label style="font-size: 0.85rem; color: var(--muted); font-weight: 500;">Pokémon 1</label>
                                <select id="compare-select-1" class="game-select" style="width: 100%;">
                                    <option value="">Seleziona...</option>
                                    ${makeOptions(pkm1)}
                                </select>
                            </div>
                            <div style="font-weight: bold; color: var(--accent); font-size: 1.2rem; margin-top: 1.2rem;">VS</div>
                            <div style="flex: 1; min-width: 200px; display: flex; flex-direction: column; gap: 0.5rem;">
                                <label style="font-size: 0.85rem; color: var(--muted); font-weight: 500;">Pokémon 2</label>
                                <select id="compare-select-2" class="game-select" style="width: 100%;">
                                    <option value="">Seleziona...</option>
                                    ${makeOptions(pkm2)}
                                </select>
                            </div>
                        </div>
        `;

        if (!pkm1 || !pkm2) {
            // Placeholder view
            modalHtml += `
                        <div class="compare-placeholder" style="text-align: center; padding: 3rem 1rem; color: var(--muted);">
                            <div style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.3;">
                                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="display: inline-block;">
                                    <circle cx="12" cy="12" r="10"/>
                                    <path d="M8 12h8"/>
                                    <path d="M12 8v8"/>
                                </svg>
                            </div>
                            <p style="margin: 0; font-size: 1.1rem; font-weight: 500;">Seleziona due Pokémon dai menu a tendina per confrontare le loro statistiche e velocità.</p>
                        </div>
                    </div>
                </div>
            </div>
            `;
            modalsRoot.innerHTML = modalHtml;

            // Close modal event listeners
            const closeModal = () => modalsRoot.innerHTML = '';
            document.getElementById('compare-modal-close').onclick = closeModal;
            document.getElementById('compare-modal-backdrop').onclick = (e) => {
                if (e.target.id === 'compare-modal-backdrop') closeModal();
            };

            // Setup select dropdown listeners
            document.getElementById('compare-select-1').addEventListener('change', (e) => {
                const val = e.target.value;
                const nextPkm1 = val ? this.pokemonList.find(p => p.name === val) : null;
                this.openComparisonModal(nextPkm1, pkm2);
            });
            document.getElementById('compare-select-2').addEventListener('change', (e) => {
                const val = e.target.value;
                const nextPkm2 = val ? this.pokemonList.find(p => p.name === val) : null;
                this.openComparisonModal(pkm1, nextPkm2);
            });

            return;
        }

        // Full Comparison Layout (both selected)
        const sprite1 = this.getSpriteUrl(pkm1, 'artwork');
        const sprite2 = this.getSpriteUrl(pkm2, 'artwork');

        const name1 = pkm1.name_it || pkm1.name;
        const name2 = pkm2.name_it || pkm2.name;

        const types1HTML = (pkm1.types || []).map(t => `<span class="type ${t}">${TYPE_LABELS[t] || t.toUpperCase()}</span>`).join('');
        const types2HTML = (pkm2.types || []).map(t => `<span class="type ${t}">${TYPE_LABELS[t] || t.toUpperCase()}</span>`).join('');

        const getStat = (p, statName) => {
            const s = p.stats ? p.stats.find(st => st.name === statName) : null;
            return s ? s.base_stat : 0;
        };

        const hp1 = getStat(pkm1, 'hp');
        const hp2 = getStat(pkm2, 'hp');
        const atk1 = getStat(pkm1, 'attack');
        const atk2 = getStat(pkm2, 'attack');
        const def1 = getStat(pkm1, 'defense');
        const def2 = getStat(pkm2, 'defense');
        const spa1 = getStat(pkm1, 'special-attack');
        const spa2 = getStat(pkm2, 'special-attack');
        const spd1 = getStat(pkm1, 'special-defense');
        const spd2 = getStat(pkm2, 'special-defense');
        const spe1 = getStat(pkm1, 'speed');
        const spe2 = getStat(pkm2, 'speed');

        const bst1 = hp1 + atk1 + def1 + spa1 + spd1 + spe1;
        const bst2 = hp2 + atk2 + def2 + spa2 + spd2 + spe2;

        const statCompareRow = (label, val1, val2) => {
            const pct1 = Math.min(100, (val1 / 160) * 100);
            const pct2 = Math.min(100, (val2 / 160) * 100);
            const class1 = val1 > val2 ? 'better' : (val1 < val2 ? 'worse' : '');
            const class2 = val2 > val1 ? 'better' : (val2 < val1 ? 'worse' : '');

            return `
                <div class="compare-stat-row">
                    <span class="compare-stat-val ${class1}">${val1}</span>
                    <div class="compare-bar-container">
                        <div class="compare-bar left" style="width: ${pct1}%"></div>
                    </div>
                    <span class="compare-stat-lbl">${label}</span>
                    <div class="compare-bar-container">
                        <div class="compare-bar right" style="width: ${pct2}%"></div>
                    </div>
                    <span class="compare-stat-val ${class2}">${val2}</span>
                </div>
            `;
        };

        const bstCompareRow = (val1, val2) => {
            const pct1 = Math.min(100, (val1 / 720) * 100);
            const pct2 = Math.min(100, (val2 / 720) * 100);
            const class1 = val1 > val2 ? 'better' : (val1 < val2 ? 'worse' : '');
            const class2 = val2 > val1 ? 'better' : (val2 < val1 ? 'worse' : '');

            return `
                <div class="compare-stat-row" style="margin-top: 1rem; border-top: 1px dashed var(--border); padding-top: 0.75rem;">
                    <span class="compare-stat-val ${class1}" style="color:var(--accent);">${val1}</span>
                    <div class="compare-bar-container" style="height: 12px;">
                        <div class="compare-bar left" style="width: ${pct1}%; background:var(--accent);"></div>
                    </div>
                    <span class="compare-stat-lbl" style="color:var(--accent); font-size: 0.9rem;">BST</span>
                    <div class="compare-bar-container" style="height: 12px;">
                        <div class="compare-bar right" style="width: ${pct2}%; background:#3b82f6;"></div>
                    </div>
                    <span class="compare-stat-val ${class2}" style="color:#3b82f6;">${val2}</span>
                </div>
            `;
        };

        modalHtml += `
                        <div class="compare-grid">
                            <div class="compare-col">
                                <img src="${sprite1}" class="compare-art" onerror="this.src='data/sprites/pokemon/artwork/0.png'">
                                <h3>${name1}</h3>
                                <div class="pokemon-types">${types1HTML}</div>
                            </div>
                            <div class="compare-col">
                                <img src="${sprite2}" class="compare-art" onerror="this.src='data/sprites/pokemon/artwork/0.png'">
                                <h3>${name2}</h3>
                                <div class="pokemon-types">${types2HTML}</div>
                            </div>
                        </div>

                        <div class="compare-stats-table">
                            ${statCompareRow('HP', hp1, hp2)}
                            ${statCompareRow('Att', atk1, atk2)}
                            ${statCompareRow('Dif', def1, def2)}
                            ${statCompareRow('SpA', spa1, spa2)}
                            ${statCompareRow('SpD', spd1, spd2)}
                            ${statCompareRow('Vel', spe1, spe2)}
                            ${bstCompareRow(bst1, bst2)}
                        </div>

                        <!-- VGC Speed Calculator -->
                        <div class="calc-section">
                            <h4 style="margin-top: 0; font-size: 1rem;"><i class="icon"></i> Calcolatore Velocità VGC (Lv. 50)</h4>
                            <div class="calc-inputs-grid">
                                <div class="calc-col">
                                    <div class="calc-row flex-row-align">
                                        <label>EVs Vel: <span id="calc-ev-val-1" style="color: var(--accent); font-weight: bold; min-width: 28px; display: inline-block;">0</span></label>
                                        <input type="range" id="calc-ev-1" min="0" max="252" step="4" value="0" style="flex: 1; accent-color: var(--accent);">
                                    </div>
                                    <div class="calc-row">
                                        <label>Natura</label>
                                        <select id="calc-nature-1">
                                            <option value="1">Neutrale</option>
                                            <option value="1.1">Favorevole (+10%)</option>
                                            <option value="0.9">Sfavorevole (-10%)</option>
                                        </select>
                                    </div>
                                    <div class="calc-row">
                                        <label>Strumento</label>
                                        <select id="calc-item-1">
                                            <option value="1">Nessuno</option>
                                            <option value="1.5">Stolascelta (Scarf)</option>
                                            <option value="0.5">Ferropalla (Iron Ball)</option>
                                        </select>
                                    </div>
                                    <div class="calc-row">
                                        <label>Effetti</label>
                                        <select id="calc-effect-1">
                                            <option value="1">Nessuno</option>
                                            <option value="2">Ventoincoda (Tailwind)</option>
                                            <option value="1.5">Abilità (+50%)</option>
                                            <option value="2">Abilità (Raddoppia)</option>
                                        </select>
                                    </div>
                                    <div class="calc-row">
                                        <label>Mod. Stadio</label>
                                        <select id="calc-stage-1">
                                            <option value="0">0 (Normale)</option>
                                            <option value="6">+6</option>
                                            <option value="5">+5</option>
                                            <option value="4">+4</option>
                                            <option value="3">+3</option>
                                            <option value="2">+2</option>
                                            <option value="1">+1</option>
                                            <option value="-1">-1</option>
                                            <option value="-2">-2</option>
                                            <option value="-3">-3</option>
                                            <option value="-4">-4</option>
                                            <option value="-5">-5</option>
                                            <option value="-6">-6</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="calc-col">
                                    <div class="calc-row flex-row-align">
                                        <label>EVs Vel: <span id="calc-ev-val-2" style="color: #3b82f6; font-weight: bold; min-width: 28px; display: inline-block;">0</span></label>
                                        <input type="range" id="calc-ev-2" min="0" max="252" step="4" value="0" style="flex: 1; accent-color: #3b82f6;">
                                    </div>
                                    <div class="calc-row">
                                        <label>Natura</label>
                                        <select id="calc-nature-2">
                                            <option value="1">Neutrale</option>
                                            <option value="1.1">Favorevole (+10%)</option>
                                            <option value="0.9">Sfavorevole (-10%)</option>
                                        </select>
                                    </div>
                                    <div class="calc-row">
                                        <label>Strumento</label>
                                        <select id="calc-item-2">
                                            <option value="1">Nessuno</option>
                                            <option value="1.5">Stolascelta (Scarf)</option>
                                            <option value="0.5">Ferropalla (Iron Ball)</option>
                                        </select>
                                    </div>
                                    <div class="calc-row">
                                        <label>Effetti</label>
                                        <select id="calc-effect-2">
                                            <option value="1">Nessuno</option>
                                            <option value="2">Ventoincoda (Tailwind)</option>
                                            <option value="1.5">Abilità (+50%)</option>
                                            <option value="2">Abilità (Raddoppia)</option>
                                        </select>
                                    </div>
                                    <div class="calc-row">
                                        <label>Mod. Stadio</label>
                                        <select id="calc-stage-2">
                                            <option value="0">0 (Normale)</option>
                                            <option value="6">+6</option>
                                            <option value="5">+5</option>
                                            <option value="4">+4</option>
                                            <option value="3">+3</option>
                                            <option value="2">+2</option>
                                            <option value="1">+1</option>
                                            <option value="-1">-1</option>
                                            <option value="-2">-2</option>
                                            <option value="-3">-3</option>
                                            <option value="-4">-4</option>
                                            <option value="-5">-5</option>
                                            <option value="-6">-6</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div class="calc-result-banner" id="calc-speed-result">
                                Velocità Finale: -- VS --
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        modalsRoot.innerHTML = modalHtml;

        const closeModal = () => modalsRoot.innerHTML = '';
        document.getElementById('compare-modal-close').onclick = closeModal;
        document.getElementById('compare-modal-backdrop').onclick = (e) => {
            if (e.target.id === 'compare-modal-backdrop') closeModal();
        };

        // Setup select dropdown listeners
        document.getElementById('compare-select-1').addEventListener('change', (e) => {
            const val = e.target.value;
            const nextPkm1 = val ? this.pokemonList.find(p => p.name === val) : null;
            this.openComparisonModal(nextPkm1, pkm2);
        });
        document.getElementById('compare-select-2').addEventListener('change', (e) => {
            const val = e.target.value;
            const nextPkm2 = val ? this.pokemonList.find(p => p.name === val) : null;
            this.openComparisonModal(pkm1, nextPkm2);
        });

        const calculateSpeed = () => {
            const calculateSingle = (baseSpeed, evVal, natureVal, itemVal, effectVal, stageVal) => {
                const statBase = Math.floor((31 + 2 * baseSpeed + Math.floor(evVal / 4)) * 50 / 100 + 5);
                let finalStat = Math.floor(statBase * natureVal);
                
                if (stageVal > 0) {
                    finalStat = Math.floor(finalStat * (2 + stageVal) / 2);
                } else if (stageVal < 0) {
                    finalStat = Math.floor(finalStat * 2 / (2 - stageVal));
                }

                finalStat = Math.floor(finalStat * itemVal);
                finalStat = Math.floor(finalStat * effectVal);

                return finalStat;
            };

            const ev1 = parseInt(document.getElementById('calc-ev-1').value) || 0;
            const ev2 = parseInt(document.getElementById('calc-ev-2').value) || 0;
            const nat1 = parseFloat(document.getElementById('calc-nature-1').value);
            const nat2 = parseFloat(document.getElementById('calc-nature-2').value);
            const it1 = parseFloat(document.getElementById('calc-item-1').value);
            const it2 = parseFloat(document.getElementById('calc-item-2').value);
            const eff1 = parseFloat(document.getElementById('calc-effect-1').value);
            const eff2 = parseFloat(document.getElementById('calc-effect-2').value);
            const stg1 = parseInt(document.getElementById('calc-stage-1').value) || 0;
            const stg2 = parseInt(document.getElementById('calc-stage-2').value) || 0;

            // Update range value labels
            document.getElementById('calc-ev-val-1').textContent = ev1;
            document.getElementById('calc-ev-val-2').textContent = ev2;

            const finalSpe1 = calculateSingle(spe1, ev1, nat1, it1, eff1, stg1);
            const finalSpe2 = calculateSingle(spe2, ev2, nat2, it2, eff2, stg2);

            const banner = document.getElementById('calc-speed-result');
            if (banner) {
                if (finalSpe1 > finalSpe2) {
                    banner.innerHTML = `<strong>${name1}</strong> agisce prima! (Velocità: <span style="color:#10b981;">${finalSpe1}</span> VS ${finalSpe2})`;
                } else if (finalSpe2 > finalSpe1) {
                    banner.innerHTML = `<strong>${name2}</strong> agisce prima! (Velocità: ${finalSpe1} VS <span style="color:#10b981;">${finalSpe2}</span>)`;
                } else {
                    banner.innerHTML = `Pareggio di Velocità (Speed Tie)! Entrambi hanno <span style="color:#f59e0b;">${finalSpe1}</span>`;
                }
            }
        };

        const inputs = [
            'calc-ev-1', 'calc-ev-2', 'calc-nature-1', 'calc-nature-2',
            'calc-item-1', 'calc-item-2', 'calc-effect-1', 'calc-effect-2',
            'calc-stage-1', 'calc-stage-2'
        ];
        inputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', calculateSpeed);
                el.addEventListener('change', calculateSpeed);
            }
        });

        calculateSpeed();
    }
}
