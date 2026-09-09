import { getPokemonSpriteUrl } from '../services/assets.js';

const NATURE_DATA = {
    "Ardita / Hardy": { plus: null, minus: null },
    "Schiva / Lonely": { plus: "attack", minus: "defense" },
    "Audace / Brave": { plus: "attack", minus: "speed" },
    "Decisa / Adamant": { plus: "attack", minus: "special-attack" },
    "Birbona / Naughty": { plus: "attack", minus: "special-defense" },
    "Audace / Bold": { plus: "defense", minus: "attack" },
    "Docile / Docile": { plus: null, minus: null },
    "Placida / Relaxed": { plus: "defense", minus: "speed" },
    "Scaltra / Impish": { plus: "defense", minus: "special-attack" },
    "Fiacca / Lax": { plus: "defense", minus: "special-defense" },
    "Timida / Timid": { plus: "speed", minus: "attack" },
    "Lesta / Hasty": { plus: "speed", minus: "defense" },
    "Seria / Serious": { plus: null, minus: null },
    "Allegra / Jolly": { plus: "speed", minus: "special-attack" },
    "Ingenua / Naive": { plus: "speed", minus: "special-defense" },
    "Modesta / Modest": { plus: "special-attack", minus: "attack" },
    "Mite / Mild": { plus: "special-attack", minus: "defense" },
    "Quieta / Quiet": { plus: "special-attack", minus: "speed" },
    "Timorosa / Bashful": { plus: null, minus: null },
    "Ardente / Rash": { plus: "special-attack", minus: "special-defense" },
    "Calma / Calm": { plus: "special-defense", minus: "attack" },
    "Gentile / Gentle": { plus: "special-defense", minus: "defense" },
    "Vivace / Sassy": { plus: "special-defense", minus: "speed" },
    "Cauta / Careful": { plus: "special-defense", minus: "special-attack" },
    "Schiva / Quirky": { plus: null, minus: null }
};

export class TeamBuildingView {
    constructor(container) {
        this.container = container;
        this.teams = this.loadTeams();
        this.activeTeamId = this.loadActiveTeamId();
        
        // Ensure at least one team exists
        if (this.teams.length === 0) {
            this.teams.push(this.createNewTeam("Nuovo Team"));
            this.saveTeams();
        }

        this.team = this.getActiveTeam().pokemon;
        this.notes = this.getActiveTeam().notes || "";
        
        this.currentIndex = 0; // Current slot being edited
        this.selectedPokemon = null; // Pokemon currently selected in the grid
        this.filteredPokemon = [];



        this.filters = {
            query: '',
            type1: '',
            type2: '',
            move: '',
            ability: '',
            sortBy: 'id',
            sortOrder: 'asc',
            showMegas: false
        };
    }

    getSpriteUrl(pokemon, type = null) {
        return getPokemonSpriteUrl(pokemon, type || 'artwork');
    }

    loadTeams() {
        const saved = localStorage.getItem('pkm_champions_teams_list');
        if (saved) {
            let teams = JSON.parse(saved);
            let migrated = false;
            teams.forEach(t => {
                if (typeof t.id !== 'string' || !/^\d+$/.test(t.id)) {
                    const oldId = t.id;
                    t.id = Date.now().toString() + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
                    migrated = true;
                    
                    const activeId = localStorage.getItem('pkm_champions_active_id');
                    if (activeId === String(oldId)) {
                        localStorage.setItem('pkm_champions_active_id', t.id);
                    }
                } else if (typeof t.id === 'number') {
                    t.id = t.id.toString();
                    migrated = true;
                }
            });
            if (migrated) {
                localStorage.setItem('pkm_champions_teams_list', JSON.stringify(teams));
            }
            return teams;
        }
        
        // Migration from old single team format
        const oldTeam = localStorage.getItem('pkm_champions_team');
        if (oldTeam) {
            const teamData = JSON.parse(oldTeam);
            const migrated = [this.createNewTeam("Team Migrato", teamData)];
            localStorage.removeItem('pkm_champions_team');
            localStorage.setItem('pkm_champions_teams_list', JSON.stringify(migrated));
            return migrated;
        }
        
        return [];
    }

    loadActiveTeamId() {
        return localStorage.getItem('pkm_champions_active_id') || (this.teams[0]?.id || null);
    }

    saveTeams() {
        localStorage.setItem('pkm_champions_teams_list', JSON.stringify(this.teams));
        if (this.activeTeamId) {
            localStorage.setItem('pkm_champions_active_id', this.activeTeamId);
        }
    }

    createNewTeam(name, pokemon = null) {
        return {
            id: Date.now().toString() + Math.floor(Math.random() * 1000).toString().padStart(3, '0'),
            name: name,
            pokemon: pokemon || Array(6).fill(null),
            notes: "",
            createdAt: new Date().toISOString()
        };
    }

    getActiveTeam() {
        return this.teams.find(t => String(t.id) === String(this.activeTeamId)) || this.teams[0];
    }



    switchTeam(id) {
        const team = this.teams.find(t => String(t.id) === String(id));
        if (team) {
            this.activeTeamId = id;
            this.team = team.pokemon;
            this.notes = team.notes || "";
            this.saveTeams();
            this.render();
        }
    }

    async render() {
        this.container.innerHTML = `
            <div class="teambuilding-container">
                <header class="tb-header">
                    <div class="tb-header-main">
                        <div class="tb-brand">
                            <h1>Team Builder</h1>
                            <span class="active-team-name" id="active-team-name-display">${this.getActiveTeam().name}</span>
                        </div>
                        
                        <div class="tb-actions-group">
                            <button class="tb-action-btn" id="open-team-hub" title="Gestisci i tuoi team">I Miei Team</button>
                            <button class="tb-action-btn" id="open-team-notes" title="Note strategiche del team">Note Team</button>
                            <button class="tb-action-btn reset" id="reset-team-btn" title="Ripulisci il team attuale">Resetta</button>
                        </div>
                    </div>

                    <div class="tb-slots-row">
                        <div class="team-slots-bar">
                            ${this.team.map((p, i) => `
                                <div class="team-slot ${i === this.currentIndex ? 'active' : ''} ${p ? 'filled' : ''}" data-index="${i}">
                                    ${p ? `<img src="${this.getSpriteUrl(p, 'artwork')}" alt="${p.name_it}" onerror="this.src='assets/pokemon/placeholder.png'">` : `<span class="slot-num">${i + 1}</span>`}
                                </div>
                            `).join('')}
                        </div>
                        <button class="btn-summary" id="view-summary-btn">Tabelle Riepilogo</button>
                    </div>
                </header>

                <div class="tb-main">
                    <button class="mobile-filter-toggle" id="toggle-filters-btn">Filtri</button>
                    <aside class="tb-filters filters-collapsed">
                        <div class="filter-card">
                            <h3>Filtri Pokémon</h3>
                            <input type="text" id="pkm-search" placeholder="Cerca Pokémon..." value="${this.filters.query}">
                            
                            <div class="filter-group">
                                <label>Tipi</label>
                                <div class="type-selectors">
                                    <select id="type1-select">
                                        <option value="">Tutti (1° tipo)</option>
                                        ${this.getTypes().map(t => `<option value="${t}" ${this.filters.type1 === t ? 'selected' : ''}>${t.toUpperCase()}</option>`).join('')}
                                    </select>
                                    <select id="type2-select">
                                        <option value="">Tutti (2° tipo)</option>
                                        ${this.getTypes().map(t => `<option value="${t}" ${this.filters.type2 === t ? 'selected' : ''}>${t.toUpperCase()}</option>`).join('')}
                                    </select>
                                </div>
                            </div>

                            <div class="filter-group">
                                <label>Mossa</label>
                                <input type="text" id="move-filter" list="moves-list" placeholder="Filtra per mossa..." value="${this.filters.move}">
                                <datalist id="moves-list">
                                    ${Object.values(window.movesDb.moves)
                                        .filter(m => m.inChampions === true)
                                        .map(m => {
                                            const en = m.name_en || m.name;
                                            const it = m.name_it;
                                            const label = (it && it !== en) ? `${it} / ${en}` : (it || en);
                                            return `<option value="${label}">`;
                                        }).join('')}
                                </datalist>
                            </div>

                            <div class="filter-group">
                                <label>Abilità</label>
                                <input type="text" id="ability-filter" list="abilities-list" placeholder="Filtra per abilità..." value="${this.filters.ability}">
                                <datalist id="abilities-list">
                                    ${Object.values(window.abilitiesDb.abilities).map(a => {
                                        const en = a.name_en || a.name || a.identifier;
                                        const it = a.name_it;
                                        const label = (it && it !== en) ? `${it} / ${en}` : (it || en);
                                        return `<option value="${label}">`;
                                    }).join('')}
                                </datalist>
                            </div>

                            <div class="filter-group">
                                <label>Ordina</label>
                                <div class="sort-controls">
                                    <select id="sort-stat-select">
                                        <option value="id">ID</option>
                                        <option value="hp">HP</option>
                                        <option value="attack">ATK</option>
                                        <option value="defense">DEF</option>
                                        <option value="special-attack">SPA</option>
                                        <option value="special-defense">SPD</option>
                                        <option value="speed">SPE</option>
                                    </select>
                                    <select id="sort-order-select">
                                        <option value="asc">↑</option>
                                        <option value="desc">↓</option>
                                    </select>
                                </div>
                            </div>

                            <div class="filter-group mega-toggle-wrap">
                                <label class="mega-check-label">
                                    <input type="checkbox" id="mega-toggle-tb" ${this.filters.showMegas ? 'checked' : ''}>
                                    <span>Mostra Forme Mega</span>
                                </label>
                            </div>
                        </div>
                    </aside>

                    <section class="tb-grid-container">
                        <div class="pkm-mini-grid" id="tb-pkm-grid">
                            <!-- Pokémon cards injected here -->
                        </div>
                    </section>

                    <aside class="tb-editor-pane" id="tb-editor">
                        <div class="editor-placeholder">
                            <div class="placeholder-icon">?</div>
                            <p>Seleziona un Pokémon dalla lista per configurarlo nello Slot ${this.currentIndex + 1}</p>
                        </div>
                    </aside>
                </div>
            </div>
            <div id="summary-modal" class="modal hidden">
                <div class="modal-content large">
                    <div class="modal-header">
                        <h2>Riepilogo Team Strategico</h2>
                        <span class="close-modal">&times;</span>
                    </div>
                    <div id="summary-table-container"></div>
                </div>
            </div>
        `;

        this.applyFilters();
        this.addEventListeners();
        
        // If current slot has pokemon, open editor
        if (this.team[this.currentIndex]) {
            this.openEditor(this.team[this.currentIndex]);
        }
    }

    addEventListeners() {
        const toggleBtn = this.container.querySelector('#toggle-filters-btn');
        if (toggleBtn) {
            toggleBtn.onclick = () => {
                const filters = this.container.querySelector('.tb-filters');
                filters.classList.toggle('filters-collapsed');
                toggleBtn.textContent = filters.classList.contains('filters-collapsed') ? 'Mostra Filtri' : 'Nascondi Filtri';
            };
        }

        const queryInput = this.container.querySelector('#pkm-search');
        queryInput.addEventListener('input', (e) => {
            this.filters.query = e.target.value;
            this.applyFilters();
        });

        this.container.querySelector('#type1-select').addEventListener('change', (e) => {
            this.filters.type1 = e.target.value;
            this.applyFilters();
        });
        this.container.querySelector('#type2-select').addEventListener('change', (e) => {
            this.filters.type2 = e.target.value;
            this.applyFilters();
        });
        this.container.querySelector('#move-filter').addEventListener('input', (e) => {
            this.filters.move = e.target.value;
            this.applyFilters();
        });
        this.container.querySelector('#ability-filter').addEventListener('input', (e) => {
            this.filters.ability = e.target.value;
            this.applyFilters();
        });
        this.container.querySelector('#sort-stat-select').addEventListener('change', (e) => {
            this.filters.sortBy = e.target.value;
            this.applyFilters();
        });
        this.container.querySelector('#sort-order-select').addEventListener('change', (e) => {
            this.filters.sortOrder = e.target.value;
            this.applyFilters();
        });

        // Slot selection
        this.container.querySelectorAll('.team-slot').forEach(slot => {
            slot.addEventListener('click', () => {
                this.currentIndex = parseInt(slot.dataset.index);
                this.updateSlotUI();
                if (this.team[this.currentIndex]) {
                    this.openEditor(this.team[this.currentIndex]);
                } else {
                    this.clearEditor();
                }
            });
        });

        this.container.querySelector('#reset-team-btn').onclick = () => {
            if (confirm("Sei sicuro di voler ripulire completamente il team attuale?")) {
                this.getActiveTeam().pokemon = Array(6).fill(null);
                this.team = this.getActiveTeam().pokemon;
                this.saveTeams();
                this.render();
            }
        };

        this.container.querySelector('#open-team-hub').onclick = () => this.showTeamHub();
        this.container.querySelector('#open-team-notes').onclick = () => this.showTeamNotes();
        this.container.querySelector('#view-summary-btn').onclick = () => this.showSummary();
        
        this.container.querySelector('.close-modal').addEventListener('click', () => {
            this.container.querySelector('#summary-modal').classList.add('hidden');
        });

        // Mega Toggle
        const megaToggle = this.container.querySelector('#mega-toggle-tb');
        if (megaToggle) {
            megaToggle.onchange = (e) => {
                this.filters.showMegas = e.target.checked;
                this.applyFilters();
            };
        }
    }

    resetTeam() {
        this.team = Array(6).fill(null);
        this.saveTeam();
        this.render();
    }

    updateSlotUI() {
        this.container.querySelectorAll('.team-slot').forEach((s, i) => {
            s.classList.toggle('active', i === this.currentIndex);
        });
    }

    getTypes() {
        return ["normal", "fire", "water", "grass", "electric", "ice", "fighting", "poison", "ground", "flying", "psychic", "bug", "rock", "ghost", "dragon", "dark", "steel", "fairy"];
    }

    applyFilters() {
        let list = window.pokemonList || [];

        // 1. Season/Pokedex Filter (From global state in main.js)
        if (window._currentValidPokemonIds) {
            list = list.filter(p => {
                const isEligible = window._currentValidPokemonIds.has(p.name);
                
                // Optimized isMega/isGmax detection
                const pNameLower = (p.name || '').toLowerCase();
                const isMega = (pNameLower.startsWith('mega ') || pNameLower.includes('-mega')) && 
                               !['meganium', 'yanmega'].some(x => pNameLower === x);
                const isGmax = pNameLower.includes('-gmax');
                const isForm = !p.is_default && !isMega && !isGmax;

                // Toggle logic: Only show Mega/Gmax if toggle is ON
                if (!this.filters.showMegas && (isMega || isGmax)) return false;
                
                return isEligible;
            });
        } else {
            // National mode fallback
            if (!this.filters.showMegas) {
                list = list.filter(p => {
                    const pNameLower = (p.name || '').toLowerCase();
                    const isMega = (pNameLower.startsWith('mega ') || pNameLower.includes('-mega')) && 
                                   !['meganium', 'yanmega'].some(x => pNameLower.includes(x));
                    const isGmax = pNameLower.includes('-gmax');
                    return !isMega && !isGmax;
                });
            }
        }

        // 2. Search Query
        if (this.filters.query) {
            const q = this.filters.query.toLowerCase();
            list = list.filter(p => (p.name_it || p.name || "").toLowerCase().includes(q) || (p.name || "").toLowerCase().includes(q));
        }

        // 3. Types
        if (this.filters.type1) {
            const t1 = this.filters.type1.toLowerCase();
            list = list.filter(p => (p.types || []).some(t => t.toLowerCase() === t1));
        }
        if (this.filters.type2) {
            const t2 = this.filters.type2.toLowerCase();
            list = list.filter(p => (p.types || []).some(t => t.toLowerCase() === t2));
        }

        // 4. Move filter
        const moveInput = this.container.querySelector('#move-filter');
        if (this.filters.move) {
            const moveName = this.filters.move.toLowerCase();
            const move = Object.values(window.movesDb?.moves || {})
                .filter(m => m.inChampions === true)
                .find(m => {
                    const it = (m.name_it || "").toLowerCase();
                    const en = (m.name || "").toLowerCase();
                    const combined = (m.name_it && m.name_it !== m.name) ? `${m.name_it} / ${m.name}`.toLowerCase() : it || en;
                    return it === moveName || en === moveName || combined === moveName;
                });
            if (move) {
                const moveKey = move.name.toLowerCase();
                const validNames = window.relationsData?.moves?.[moveKey] || [];
                const validSet = new Set(validNames);
                list = list.filter(p => validSet.has(p.name));
                if (moveInput) moveInput.title = move.description_it || move.description || "Mossa riconosciuta";
            } else {
                list = []; 
                if (moveInput) moveInput.title = "Mossa non trovata";
            }
        } else if (moveInput) {
            moveInput.title = "Digita una mossa per filtrare e vedere la descrizione";
        }

        // 5. Ability filter
        const abilInput = this.container.querySelector('#ability-filter');
        if (this.filters.ability && list.length > 0) {
            const abilName = this.filters.ability.toLowerCase();
            const ability = Object.values(window.abilitiesDb?.abilities || {}).find(a => {
                const it = (a.name_it || "").toLowerCase();
                const en = (a.name || a.identifier || "").toLowerCase();
                const combined = (a.name_it && a.name_it !== a.name) ? `${a.name_it} / ${a.name}`.toLowerCase() : it || en;
                return it === abilName || en === abilName || combined === abilName;
            });
            
            if (ability) {
                const abilKey = ability.name.toLowerCase();
                const validNames = window.relationsData?.abilities?.[abilKey] || [];
                const validSet = new Set(validNames);
                list = list.filter(p => validSet.has(p.name));
                if (abilInput) abilInput.title = ability.description_it || ability.description || "Abilità riconosciuta";
            } else {
                list = [];
                if (abilInput) abilInput.title = "Abilità non trovata";
            }
        } else if (abilInput) {
            abilInput.title = "Digita un'abilità per filtrare e vedere la descrizione";
        }

        // 6. Sorting
        list.sort((a, b) => {
            let valA, valB;
            if (this.filters.sortBy === 'id') {
                valA = a.id;
                valB = b.id;
            } else {
                const statKey = this.filters.sortBy;
                valA = (a.stats || []).find(s => s.name === statKey)?.base_stat || 0;
                valB = (b.stats || []).find(s => s.name === statKey)?.base_stat || 0;
            }
            return this.filters.sortOrder === 'asc' ? valA - valB : valB - valA;
        });

        this.filteredPokemon = list; // Removed truncation limit (Fix)
        this.renderGrid();
    }

    renderGrid() {
        const grid = this.container.querySelector('#tb-pkm-grid');
        if (!grid) return;

        if (this.filteredPokemon.length === 0) {
            grid.innerHTML = `<div class="muted-notice" style="grid-column: 1/-1; text-align: center; padding: 2rem;">Nessun Pokémon trovato con questi filtri.</div>`;
            return;
        }

        grid.innerHTML = this.filteredPokemon.map(p => {
            const artworkUrl = this.getSpriteUrl(p, 'artwork');
            return `
                <div class="mini-pkm-card" data-id="${p.name}" title="${p.name_it || p.name}">
                    <img src="${artworkUrl}" 
                         alt="${p.name_it}" 
                         loading="lazy" 
                         onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MCIgZmlsbD0iI2UyZThlZiIvPjx0ZXh0IHg9IjUwIiB5PSI2NSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjQ1IiBmaWxsPSIjOTQzMzIyIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj4/PC90ZXh0Pjwvc3ZnPg=='">
                    <span class="name">${p.name_it || p.name}</span>
                </div>
            `;
        }).join('');

        // Event delegation for clicks (Replaces the individual card listeners)
        grid.addEventListener('click', (e) => {
            const card = e.target.closest('.mini-pkm-card');
            if (card) {
                const name = card.dataset.id;
                const pkm = window.pokemonList.find(p => p.name === name);
                if (pkm) {
                    this.selectPokemonForEditor(pkm);
                }
            }
        });
    }


    async selectPokemonForEditor(pkm) {
        // Find existing in team or create fresh
        const existing = this.team[this.currentIndex];
        if (existing && existing.name === pkm.name) {
            this.openEditor(existing);
        } else {
            // Check if this pokemon is already in another slot? (Maybe allowed)
            const fresh = {
                id: pkm.id,
                name: pkm.name,
                name_it: pkm.name_it || pkm.name,
                types: pkm.types || [],
                stats: pkm.stats || [],
                ability: null, // Full ability object
                nature: "Ardita / Hardy",
                evs: { hp: 0, attack: 0, defense: 0, "special-attack": 0, "special-defense": 0, speed: 0 },
                moves: [null, null, null, null], // Full move objects
                item: null,
                notes: "" // Tactical notes for this specific member
            };
            this.openEditor(fresh);
        }

        // Auto-scroll on mobile
        if (window.innerWidth < 1024) {
            setTimeout(() => {
                const editor = document.getElementById('tb-editor');
                if (editor) editor.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }
    }

    async openEditor(pkm) {
        this.selectedPokemon = pkm;
        this.renderEditorSummary();
    }

    renderEditorSummary() {
        const pkm = this.selectedPokemon;
        const editor = this.container.querySelector('#tb-editor');
        if (!editor) return;

        const nature = NATURE_DATA[pkm.nature] || { plus: null, minus: null };

        editor.innerHTML = `
            <div class="editor-summary-card">
                <div class="editor-header-mini">
                    <img src="${this.getSpriteUrl(pkm, 'artwork')}" alt="${pkm.name_it}" onerror="this.src='assets/pokemon/placeholder.png'">
                    <div class="info">
                        <h2>${pkm.name_it}</h2>
                        <div class="pkm-types">
                            ${(pkm.types || []).map(t => `
                                <span class="type-badge-editor ${t}" style="background: var(--type-${t})">
                                    <img src="assets/icons/types/${t}.svg" alt="${t}">
                                    ${t.toUpperCase()}
                                </span>
                            `).join('')}
                        </div>
                    </div>
                </div>

                <div class="clickable-slots">
                    <div class="interactive-slot ${pkm.ability ? 'has-selection' : ''}" id="slot-ability">
                        <label>Abilità</label>
                        <div class="value">${pkm.ability ? ((pkm.ability.name_it && pkm.ability.name_it !== pkm.ability.name) ? `${pkm.ability.name_it} / ${pkm.ability.name}` : (pkm.ability.name_it || pkm.ability.name)) : 'Seleziona Abilità...'}</div>
                        ${pkm.ability?.desc_it ? `<div class="desc">${pkm.ability.desc_it.substring(0, 80)}...</div>` : ''}
                    </div>

                    <div class="moves-selection-grid">
                        ${[0, 1, 2, 3].map(i => {
                            const m = pkm.moves[i];
                            const label = m ? ((m.name_it && m.name_it !== m.name) ? `${m.name_it} / ${m.name}` : (m.name_it || m.name)) : 'Vuoto';
                            return `
                                <div class="move-slot-btn ${m ? 'has-selection' : ''}" data-index="${i}">
                                    <span class="idx">Slot ${i + 1}</span>
                                    <span class="val">${label}</span>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>

                <div class="stat-summary-box">
                    <div class="ev-header" style="display:flex; justify-content:space-between; margin-bottom:1rem; font-size:0.8rem;">
                        <span style="font-weight:700; color:#3b82f6;">Statistiche & EVs</span>
                        <span class="${this.sumEvs(pkm.evs) >= 66 ? 'text-danger' : ''}" style="font-weight:700;">${this.sumEvs(pkm.evs)}/66 EV</span>
                    </div>
                    ${(pkm.stats || []).map(s => {
                        const base = s.base_stat;
                        const evs = pkm.evs[s.name] || 0;
                        const mult = nature.plus === s.name ? 1.1 : (nature.minus === s.name ? 0.9 : 1.0);
                        const final = Math.floor((base + evs) * mult);
                        const percent = Math.min(100, (final / 255) * 100);
                        
                        return `
                            <div class="stat-editor-row-wrap">
                                <div class="stat-summary-row ${mult > 1 ? 'plus' : (mult < 1 ? 'minus' : '')}" data-stat="${s.name}">
                                    <span class="label">${this.shortStat(s.name)}</span>
                                    <div class="bar-container">
                                        <div class="bar-fill" style="width: ${percent}%"></div>
                                    </div>
                                    <span class="val-final">${final}</span>
                                </div>
                                <div class="stat-slider-box hidden" id="slider-wrap-${s.name}">
                                    <div class="slider-meta">
                                        <span>Base: ${base}</span>
                                        <span>EV: <strong id="ev-display-${s.name}">${evs}</strong></span>
                                    </div>
                                    <input type="range" class="ev-inline-slider" data-stat="${s.name}" min="0" max="32" value="${evs}">
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>

                <div class="editor-sub-configs">
                     <div class="edit-group">
                        <label>Temperamento (Natura)</label>
                        <select id="edit-nature-sum" style="width:100%; padding:0.6rem; background:#2a2d3e; border:1px solid #3f445e; color:white; border-radius:6px; font-size:0.9rem;">
                            ${Object.keys(NATURE_DATA).map(n => {
                                const d = NATURE_DATA[n];
                                let label = n;
                                if (d.plus) {
                                    label += ` (+${this.shortStat(d.plus)} -${this.shortStat(d.minus)})`;
                                } else {
                                    label += " (Neutrale)";
                                }
                                return `<option value="${n}" ${pkm.nature === n ? 'selected' : ''}>${label}</option>`;
                            }).join('')}
                        </select>
                    </div>
                    <div class="interactive-slot ${pkm.item ? 'has-selection' : ''}" id="slot-item" style="margin-top:1rem;">
                        <label>Oggetto Equipaggiato</label>
                        <div class="value">${pkm.item || 'Seleziona Oggetto...'}</div>
                        ${pkm.item ? `<div class="desc">${Object.values(window.itemsData?.items || {}).find(it => it.name_it === pkm.item)?.effect_it || 'Strumento equipaggiato'}</div>` : ''}
                    </div>

                    <div class="edit-group" style="margin-top:1.5rem; padding-top:1rem; border-top:1px solid rgba(255,255,255,0.05);">
                        <label>Note Tattiche del Pokémon</label>
                        <textarea id="edit-pkm-notes" placeholder="Descrivi il ruolo di questo Pokémon, mosse chiave, etc..." style="width:100%; height:100px; padding:0.6rem; background:#1a1c23; border:1px solid #3f445e; color:white; border-radius:6px; resize:none; font-family:inherit; margin-top:0.5rem;">${pkm.notes || ""}</textarea>
                    </div>
                </div>

                <div class="editor-actions-tb">
                    <button class="btn-tb-confirm" id="save-team-pkm">Salva nel Team</button>
                </div>
            </div>
        `;

        this.addSummaryEventListeners();
    }

    addSummaryEventListeners() {
        const pkm = this.selectedPokemon;
        const editor = this.container.querySelector('#tb-editor');

        editor.querySelector('#slot-ability').onclick = () => this.showAbilitySelection();
        
        editor.querySelectorAll('.move-slot-btn').forEach(btn => {
            btn.onclick = () => this.showMoveSelection(parseInt(btn.dataset.index));
        });

        // Click on stat row to show slider
        editor.querySelectorAll('.stat-summary-row').forEach(row => {
            row.onclick = (e) => {
                e.stopPropagation();
                const stat = row.dataset.stat;
                const wrap = editor.querySelector(`#slider-wrap-${stat}`);
                const isHidden = wrap.classList.contains('hidden');
                
                // Close all others
                editor.querySelectorAll('.stat-slider-box').forEach(s => s.classList.add('hidden'));
                
                if (isHidden) wrap.classList.remove('hidden');
            };
        });

        // Click outside stat box to close all sliders
        const editorCard = editor.querySelector('.editor-summary-card');
        if (editorCard) {
            editorCard.onclick = (e) => {
                if (!e.target.closest('.stat-editor-row-wrap')) {
                    editor.querySelectorAll('.stat-slider-box').forEach(s => s.classList.add('hidden'));
                }
            };
        }

        // Slider input logic
        editor.querySelectorAll('.ev-inline-slider').forEach(slider => {
            slider.oninput = (e) => {
                const stat = e.target.dataset.stat;
                const oldVal = pkm.evs[stat] || 0;
                const newVal = parseInt(e.target.value);
                
                pkm.evs[stat] = newVal;
                if (this.sumEvs(pkm.evs) > 66) {
                    pkm.evs[stat] = oldVal;
                    e.target.value = oldVal;
                } else {
                    // Update visuals inline
                    editor.querySelector(`#ev-display-${stat}`).textContent = pkm.evs[stat];
                    this.updateSummaryRowVisuals(stat);
                    editor.querySelector('.ev-header span:last-child').textContent = `${this.sumEvs(pkm.evs)}/66 EV`;
                    editor.querySelector('.ev-header span:last-child').className = this.sumEvs(pkm.evs) >= 66 ? 'text-danger' : '';
                }
            };
        });

        editor.querySelector('#edit-nature-sum').onchange = (e) => {
            pkm.nature = e.target.value;
            this.renderEditorSummary();
        };

        editor.querySelector('#edit-pkm-notes').onblur = (e) => {
            pkm.notes = e.target.value;
            this.saveTeams();
        };

        editor.querySelector('#slot-item').onclick = () => this.showItemSelection();

        editor.querySelector('#save-team-pkm').onclick = () => {
            this.team[this.currentIndex] = JSON.parse(JSON.stringify(pkm));
            this.saveTeams();
            this.render(); 
        };
    }

    updateSummaryRowVisuals(statName) {
        const pkm = this.selectedPokemon;
        const s = pkm.stats.find(st => st.name === statName);
        if (!s) return;
        
        const nature = NATURE_DATA[pkm.nature] || { plus: null, minus: null };
        const base = s.base_stat;
        const evs = pkm.evs[statName] || 0;
        const mult = nature.plus === statName ? 1.1 : (nature.minus === statName ? 0.9 : 1.0);
        const final = Math.floor((base + evs) * mult);
        const percent = Math.min(100, (final / 255) * 100);

        const row = this.container.querySelector(`.stat-summary-row[data-stat="${statName}"]`);
        if (row) {
            row.querySelector('.val-final').textContent = final;
            row.querySelector('.bar-fill').style.width = `${percent}%`;
        }
    }

    showAbilitySelection() {
        const pkm = this.selectedPokemon;
        const editor = this.container.querySelector('#tb-editor');
        
        // Find abilities for this pokemon and include their ID
        const abilities = [];
        for (const [aid, pids] of Object.entries(window.abilitiesDb?.abilities || {})) {
            // Check if this pokemon is in the relations for this ability
            const pokemonWithThisAbil = window.relationsData.abilities[aid.toLowerCase()] || [];
            if (pokemonWithThisAbil.includes(pkm.name)) {
                abilities.push({ ...window.abilitiesDb.abilities[aid], id: aid });
            }
        }

        editor.innerHTML = `
            <div class="selection-list-view">
                <div class="selection-list-header">
                    <button class="btn-back-editor" id="btn-back-sum">← Back</button>
                    <h3>Seleziona Abilità</h3>
                </div>
                <div class="selection-grid-container">
                    ${abilities.map(a => {
                        const en = a.name || a.id;
                        const it = a.name_it;
                        const label = (it && it !== en) ? `${it} / ${en}` : (it || en);
                        return `
                            <div class="selection-item-card" data-aid="${a.id}">
                                <h4>${label}</h4>
                                <div class="desc">${a.desc_it || (a.effect || 'Nessuna descrizione disponibile.')}</div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;

        editor.querySelector('#btn-back-sum').onclick = () => this.renderEditorSummary();
        editor.querySelectorAll('.selection-item-card').forEach(card => {
            card.onclick = () => {
                const aid = card.dataset.aid;
                pkm.ability = window.abilitiesDb.abilities[aid];
                this.renderEditorSummary();
            };
        });
    }

    showMoveSelection(slotIndex) {
        const pkm = this.selectedPokemon;
        const editor = this.container.querySelector('#tb-editor');

        // Find moves for this pokemon
        const moves = [];
        for (const [mid, pids] of Object.entries(window.relationsData.moves || {})) {
            if (pids.includes(pkm.name)) {
                // Find move in movesDb case-insensitively
                const mv = Object.values(window.movesDb.moves).find(m => m.name.toLowerCase() === mid);
                if (mv) moves.push(mv);
            }
        }
        moves.sort((a, b) => (a.type || "").localeCompare(b.type || ""));

        editor.innerHTML = `
            <div class="selection-list-view">
                <div class="selection-list-header">
                    <button class="btn-back-editor" id="btn-back-sum">← Back</button>
                    <h3>Slot ${slotIndex + 1}: Mosse</h3>
                </div>
                <div class="selection-grid-container">
                    <input type="text" id="move-search-inner" placeholder="Cerca mossa..." style="width:100%; padding:0.6rem; background:#1a1c23; border:1px solid #3f445e; color:white; border-radius:6px; margin-bottom:1rem;">
                    <div id="inner-moves-grid">
                        ${this.renderMoveItems(moves)}
                    </div>
                </div>
            </div>
        `;

        const search = editor.querySelector('#move-search-inner');
        search.oninput = (e) => {
            const q = e.target.value.toLowerCase();
            const filtered = moves.filter(m => (m.name_it || "").toLowerCase().includes(q) || (m.name_en || "").toLowerCase().includes(q));
            editor.querySelector('#inner-moves-grid').innerHTML = this.renderMoveItems(filtered);
            this.bindMoveItems(slotIndex);
        };

        editor.querySelector('#btn-back-sum').onclick = () => this.renderEditorSummary();
        this.bindMoveItems(slotIndex);
    }

    renderMoveItems(moves) {
        return moves.map(m => {
            const en = m.name_en || m.name;
            const it = m.name_it;
            const label = (it && it !== en) ? `${it} / ${en}` : (it || en);
            return `
                <div class="selection-item-card" data-mname="${m.name}">
                    <h4>${label}</h4>
                    <div class="meta">
                        <span class="type-pill ${m.type || 'normal'}" style="background: var(--type-${m.type || 'normal'})">${(m.type || 'normal').toUpperCase()}</span>
                        <span>Pot: ${m.power || '—'}</span>
                        <span>Acc: ${m.accuracy || '—'}%</span>
                    </div>
                    <div class="desc">${m.description_it || '—'}</div>
                </div>
            `;
        }).join('');
    }

    bindMoveItems(slotIndex) {
        const editor = this.container.querySelector('#tb-editor');
        editor.querySelectorAll('.selection-item-card').forEach(card => {
            card.onclick = () => {
                const mname = card.dataset.mname;
                const moveData = window.movesDb.moves[mname];
                if (moveData) {
                    // Update the correct slot in the currently selected pokemon's move array
                    this.selectedPokemon.moves[slotIndex] = moveData;
                    this.saveTeams();
                    this.renderEditorSummary();
                }
            };
        });
    }

    showEvEditor() {
        const pkm = this.selectedPokemon;
        const editor = this.container.querySelector('#tb-editor');

        editor.innerHTML = `
            <div class="selection-list-view">
                <div class="selection-list-header">
                    <button class="btn-back-editor" id="btn-back-sum">← Back</button>
                    <h3>Allenamento EVs</h3>
                </div>
                <div class="ev-editor-box" style="background:#2a2d3e; padding:1.5rem; border-radius:12px;">
                    <p style="font-size:0.8rem; color:#94a3b8; margin-bottom:1.5rem;">Massimo 32 per statistica, 66 totali.</p>
                    ${pkm.stats.map(s => `
                        <div style="display:grid; grid-template-columns: 80px 1fr 50px; align-items:center; gap:1rem; margin-bottom:1rem;">
                            <span style="font-weight:600; font-size:0.8rem;">${this.shortStat(s.name)}</span>
                            <input type="range" class="ev-slider" data-stat="${s.name}" min="0" max="32" value="${pkm.evs[s.name] || 0}" style="width:100%;">
                            <span class="ev-val" style="font-family:monospace; text-align:right;">${pkm.evs[s.name] || 0}</span>
                        </div>
                    `).join('')}
                    <div style="margin-top:1.5rem; text-align:center; font-weight:bold; font-size:1.1rem;">
                        Totale: <span id="ev-total-sync">${this.sumEvs(pkm.evs)}</span> / 66
                    </div>
                </div>
            </div>
        `;

        editor.querySelector('#btn-back-sum').onclick = () => this.renderEditorSummary();
        
        editor.querySelectorAll('.ev-slider').forEach(slider => {
            slider.oninput = (e) => {
                const stat = e.target.dataset.stat;
                const oldVal = pkm.evs[stat];
                const newVal = parseInt(e.target.value);
                
                pkm.evs[stat] = newVal;
                if (this.sumEvs(pkm.evs) > 66) {
                    pkm.evs[stat] = oldVal;
                    e.target.value = oldVal;
                }
                
                slider.nextElementSibling.textContent = pkm.evs[stat];
                editor.querySelector('#ev-total-sync').textContent = this.sumEvs(pkm.evs);
            };
        });
    }

    shortStat(name) {
        const map = { hp: "PS", attack: "ATK", defense: "DEF", "special-attack": "SPA", "special-defense": "SPD", speed: "SPE" };
        return map[name] || name.substring(0, 3).toUpperCase();
    }

    sumEvs(evs) {
        return Object.values(evs || {}).reduce((a, b) => a + b, 0);
    }

    clearEditor() {
        this.container.querySelector('#tb-editor').innerHTML = `
            <div class="editor-placeholder">
                <div class="placeholder-icon"></div>
                <p>Seleziona un Pokémon dalla lista per configurarlo nello Slot ${this.currentIndex + 1}</p>
            </div>
        `;
    }

    showSummary() {
        const modal = this.container.querySelector('#summary-modal');
        const container = this.container.querySelector('#summary-table-container');
        
        modal.classList.remove('hidden');

        if (this.team.every(p => p === null)) {
            container.innerHTML = `<div class="empty-summary">Il team è vuoto. Seleziona i Pokémon per vedere il riepilogo.</div>`;
            return;
        }

        container.innerHTML = `
            <div class="summary-scroll">
                <table class="summary-table">
                    <thead>
                        <tr>
                            <th>POS</th>
                            <th>POKÉMON</th>
                            <th>ABILITÀ</th>
                            <th>NATURA</th>
                            <th>STATISTICHE FINALI</th>
                            <th>MOSSE</th>
                            <th>OGGETTO</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.team.map((p, i) => {
                            if (!p) return `
                                <tr class="empty-row">
                                    <td class="col-idx">#${i + 1}</td>
                                    <td colspan="6">Slot vuoto</td>
                                </tr>`;

                            // Lookup item description
                            const itemData = Object.values(window.itemsData?.items || {}).find(it => it.name_it === p.item);
                            const itemDesc = itemData ? (itemData.effect_it || itemData.effect_en || "Strumento riconosciuto") : "";

                            // Calculate stats
                            const nature = NATURE_DATA[p.nature] || { plus: null, minus: null };
                            const statsList = ["hp", "attack", "defense", "special-attack", "special-defense", "speed"];
                            const finalStatsHtml = statsList.map(s => {
                                const baseVal = p.stats.find(bs => bs.name === s)?.base_stat || 0;
                                const evVal = p.evs[s] || 0;
                                let mult = 1.0;
                                if (nature.plus === s) mult = 1.1;
                                if (nature.minus === s) mult = 0.9;
                                const finalVal = Math.floor((baseVal + evVal) * mult);
                                
                                let cls = '';
                                if (mult > 1) cls = 'stat-plus';
                                if (mult < 1) cls = 'stat-minus';

                                const evInfo = evVal > 0 ? `<span class="ev-val">+${evVal}</span>` : '';

                                return `<div class="stat-sum-item ${cls}">
                                    <span class="lbl">${this.shortStat(s)}</span>
                                    <div style="display:flex; flex-direction:column; align-items:flex-end;">
                                        <span class="val">${finalVal}</span>
                                        ${evInfo}
                                    </div>
                                </div>`;
                            }).join('');

                            return `
                                <tr>
                                    <td class="col-idx">#${i + 1}</td>
                                    <td class="col-pkm">
                                        <div class="pkm-sum-info">
                                            <img src="${this.getSpriteUrl(p, 'artwork')}" onerror="this.src='/assets/pokemon/placeholder.png'">
                                            <strong>${p.name_it}</strong>
                                        </div>
                                    </td>
                                    <td>
                                        <span class="sum-badge ability" title="${p.ability?.desc_it || p.ability?.effect || 'Nessuna descrizione'}">
                                            ${p.ability ? ((p.ability.name_it && p.ability.name_it !== p.ability.name) ? `${p.ability.name_it} / ${p.ability.name}` : (p.ability.name_it || p.ability.name)) : '—'}
                                        </span>
                                    </td>
                                    <td>
                                        <span class="sum-badge nature" title="Effetto natura applicato alle statistiche">
                                            ${p.nature.split(' / ')[0]}
                                        </span>
                                    </td>
                                    <td class="col-stats">
                                        <div class="stats-sum-grid">
                                            ${finalStatsHtml}
                                        </div>
                                    </td>
                                    <td class="col-moves">
                                        <div class="moves-list-sum">
                                            ${p.moves.filter(m => m).map(m => {
                                                const label = (m.name_it && m.name_it !== m.name) ? `${m.name_it} / ${m.name}` : (m.name_it || m.name);
                                                return `
                                                <span class="move-item" title="${m.description_it || 'Nessuna descrizione'}">
                                                    ${label}
                                                </span>`;
                                            }).join('') || '—'}
                                        </div>
                                    </td>
                                    <td>
                                        <span class="sum-badge item" title="${itemDesc}">
                                            ${(itemData && itemData.name_it !== itemData.name) ? `${itemData.name_it} / ${itemData.name}` : (p.item || '—')}
                                        </span>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>

                <div class="summary-strategy-section">
                    <div class="strategy-header-sum">
                        <h3>Strategia Generale del Team</h3>
                    </div>
                    <div class="strategy-content-sum">
                        ${this.getActiveTeam().notes ? this.getActiveTeam().notes.replace(/\n/g, '<br>') : '<span class="muted">Nessuna nota strategica generale inserita.</span>'}
                    </div>

                    <div class="member-notes-sum">
                        <h3>Dettagli Tattici Membri</h3>
                        <div class="member-notes-grid">
                            ${this.team.filter(p => p).map(p => `
                                <div class="member-note-card">
                                    <div class="m-note-header">
                                        <img src="${this.getSpriteUrl(p, 'artwork')}" onerror="this.src='/assets/pokemon/placeholder.png'">
                                        <strong>${p.name_it}</strong>
                                    </div>
                                    <div class="m-note-body">
                                        ${p.notes ? p.notes.replace(/\n/g, '<br>') : '<span class="muted">Nessuna nota specifica.</span>'}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // --- Team Hub & Management ---

    showTeamHub() {
        const existing = document.getElementById('team-hub-overlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'team-hub-overlay';
        overlay.className = 'sub-modal-backdrop';
        overlay.innerHTML = `
            <div class="sub-modal-content team-hub-content">
                <button class="sub-modal-close" onclick="this.closest('.sub-modal-backdrop').remove()">×</button>
                <div class="hub-header">
                    <h2>Gestione Team</h2>
                    <div class="hub-actions">
                        <button class="btn-primary" id="hub-new-team">+ Crea Nuovo Team</button>
                    </div>
                </div>
                <div class="team-list-grid">
                    ${this.teams.map(t => `
                        <div class="team-hub-item ${t.id === this.activeTeamId ? 'active' : ''}" data-id="${t.id}">
                            <div class="team-info">
                                <span class="team-name">${t.name}</span>
                                <span class="team-date">Creato: ${new Date(t.createdAt).toLocaleDateString()}</span>
                                <div class="team-mini-preview">
                                    ${t.pokemon.map(p => p ? `<img src="${this.getSpriteUrl(p, 'artwork')}" onerror="this.src='assets/pokemon/placeholder.png'">` : `<div class="empty"></div>`).join('')}
                                </div>
                            </div>
                            <div class="team-item-actions">
                                <button class="btn-icon load" title="Carica Team">Load</button>
                                <button class="btn-icon rename" title="Rinomina">Edit</button>
                                <button class="btn-icon delete" title="Elimina">Del</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        const grid = overlay.querySelector('.team-list-grid');
        grid.querySelectorAll('.team-hub-item').forEach(item => {
            const id = item.dataset.id;
            item.querySelector('.load').onclick = () => {
                this.switchTeam(id);
                overlay.remove();
            };
            item.querySelector('.rename').onclick = (e) => {
                e.stopPropagation();
                const newName = prompt("Inserisci il nuovo nome per il team:", this.teams.find(t => String(t.id) === String(id)).name);
                if (newName) {
                    this.teams.find(t => String(t.id) === String(id)).name = newName;
                    this.saveTeams();
                    this.showTeamHub();
                    this.render();
                }
            };
            item.querySelector('.delete').onclick = (e) => {
                e.stopPropagation();
                if (this.teams.length === 1) {
                    alert("Non puoi eliminare l'ultimo team rimasto!");
                    return;
                }
                if (confirm("Eliminare definitivamente questo team?")) {
                    this.teams = this.teams.filter(t => String(t.id) !== String(id));
                    if (String(this.activeTeamId) === String(id)) this.activeTeamId = String(this.teams[0].id);
                    this.saveTeams();
                    this.switchTeam(this.activeTeamId);
                    this.showTeamHub();
                }
            };
        });



        overlay.querySelector('#hub-new-team').onclick = () => {
            const name = prompt("Nome del nuovo team:", "Nuovo Team");
            if (name) {
                const nt = this.createNewTeam(name);
                this.teams.push(nt);
                this.activeTeamId = nt.id;
                this.saveTeams();
                this.switchTeam(nt.id);
                overlay.remove();
            }
        };
    }

    showTeamNotes() {
        const team = this.getActiveTeam();
        const existing = document.getElementById('team-notes-overlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'team-notes-overlay';
        overlay.className = 'sub-modal-backdrop';
        overlay.innerHTML = `
            <div class="sub-modal-content team-notes-content">
                <button class="sub-modal-close" onclick="this.closest('.sub-modal-backdrop').remove()">×</button>
                <h2>Strategia del Team: ${team.name}</h2>
                <p class="muted" style="margin-bottom:1rem;">Scrivi qui matchup, consigli di gioco e strategie generali.</p>
                <textarea id="team-strategy-edit" placeholder="Es: Contro team pioggia, guidare con Raichu..." style="width:100%; height:300px; padding:1rem; background:#1a1c23; border:1px solid #3f445e; color:white; border-radius:8px; resize:none; font-family:inherit; font-size:1rem; line-height:1.5;">${team.notes || ""}</textarea>
                <div class="notes-actions" style="margin-top:1.5rem; text-align:right;">
                    <button class="btn-primary" id="save-notes-btn">Salva Note</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        overlay.querySelector('#save-notes-btn').onclick = () => {
            team.notes = overlay.querySelector('#team-strategy-edit').value;
            this.notes = team.notes; // Sync local state
            this.saveTeams();
            overlay.remove();
        };
    }

    showItemSelection() {
        const pkm = this.selectedPokemon;
        const editor = this.container.querySelector('#tb-editor');
        
        const items = Object.values(window.itemsData?.items || {}).filter(it => it.name_it);
        items.sort((a, b) => a.name_it.localeCompare(b.name_it));

        editor.innerHTML = `
            <div class="selection-list-view">
                <div class="selection-list-header">
                    <button class="btn-back-editor" id="btn-back-sum">← Back</button>
                    <h3>Seleziona Strumento</h3>
                </div>
                <div class="selection-grid-container">
                    <input type="text" id="item-search-inner" placeholder="Cerca strumento..." style="width:100%; padding:0.6rem; background:#1a1c23; border:1px solid #3f445e; color:white; border-radius:6px; margin-bottom:1rem;">
                    <div id="inner-items-grid">
                        ${this.renderItemItems(items)}
                    </div>
                </div>
            </div>
        `;

        const search = editor.querySelector('#item-search-inner');
        search.oninput = (e) => {
            const q = e.target.value.toLowerCase();
            const filtered = items.filter(it => it.name_it.toLowerCase().includes(q) || (it.name_en || "").toLowerCase().includes(q));
            editor.querySelector('#inner-items-grid').innerHTML = this.renderItemItems(filtered);
            this.bindItemItems();
        };

        editor.querySelector('#btn-back-sum').onclick = () => this.renderEditorSummary();
        this.bindItemItems();
    }

    renderItemItems(items) {
        return items.map(it => {
            const name = it.name_it;
            const desc = it.effect_it || it.effect_en || "Nessun effetto registrato.";
            return `
                <div class="selection-item-card" data-iname="${name}">
                    <h4>${name}</h4>
                    <div class="desc">${desc}</div>
                </div>
            `;
        }).join('');
    }

    bindItemItems() {
        const editor = this.container.querySelector('#tb-editor');
        editor.querySelectorAll('.selection-item-card').forEach(card => {
            card.onclick = () => {
                const iname = card.dataset.iname;
                this.selectedPokemon.item = iname;
                this.saveTeams();
                this.renderEditorSummary();
            };
        });
    }
}
