export class AbilitiesView {
    constructor(container) {
        this.container = container;
        this.abilityList = [];
        this.visibleCount = 80;
        this.searchQuery = '';
    }

    async render() {
        this.container.innerHTML = `
            <div class="toolbar">
                <input type="text" id="abilities-search" placeholder="Cerca Abilità..." class="search-box">
            </div>
            <div id="abilities-count" class="pokemon-count"></div>
            <div class="abilities-container" id="abilities-grid" style="margin-top: 1rem; max-width: 1000px; margin-left: auto; margin-right: auto;"></div>
        `;

        this.grid = document.getElementById('abilities-grid');
        this.countDisplay = document.getElementById('abilities-count');

        if (!window.abilitiesDb || (!window.abilitiesDb.abilities && !Array.isArray(window.abilitiesDb))) {
            this.grid.innerHTML = `<div class="muted" style="text-align: center; padding: 2rem;">
                <i class="icon" style="font-size: 3rem; display: block; margin-bottom: 1rem;">📂</i>
                Dati delle abilità non caricati. Verifica i file locali.
            </div>`;
            return;
        }

        // Ensure abilities are an array
        const abs = window.abilitiesDb.abilities || window.abilitiesDb;
        if (Array.isArray(abs)) {
            this.abilityList = [...abs];
        } else {
            this.abilityList = Object.entries(abs).map(([id, data]) => ({ ...data, id, pokeapi_id: data.pokeapi_id || id }));
        }

        // Map data for sorting and searching
        this.abilityList = this.abilityList.map(ad => {
            const it = (ad.names && ad.names.it) ? ad.names.it : ad.name_it;
            const en = ad.identifier || ad.name_en || ad.name || '';
            const itName = (it && it !== en) ? `${it} / ${en}` : (it || en);
            
            let extended = '';
            if (ad.mechanics_nodes && Array.isArray(ad.mechanics_nodes)) {
                // For Champions, we use the default mechanics node or the first one
                const mech = ad.mechanics_nodes.find(mn => mn.mechanics_ref === 'default') || ad.mechanics_nodes[0];
                extended = mech ? (mech.effect_it || "") : "";
            } else if (ad.mechanics_nodes && typeof ad.mechanics_nodes === 'object') {
                const mech = ad.mechanics_nodes['default'] || Object.values(ad.mechanics_nodes)[0];
                extended = mech ? (mech.effect_it || "") : "";
            } else {
                extended = ad.effect_technical || ad.effect || "";
            }

            const flavor = (ad.flavor_text && ad.flavor_text.default_it) ? ad.flavor_text.default_it : (ad.effect || "Nessuna descrizione.");

            return {
                ...ad,
                _itName: itName,
                _flavor: flavor,
                _extended: extended
            };
        });

        // Ensure sorted alphabetically
        this.abilityList.sort((a, b) => a._itName.localeCompare(b._itName));

        document.getElementById('abilities-search').addEventListener('input', (e) => {
            this.searchQuery = e.target.value.toLowerCase();
            this.visibleCount = 80;
            this.renderGrid();
        });

        // Infinite scroll for this container
        this._scrollHandler = () => {
            const view = document.getElementById('abilities-view');
            if (!view || !view.classList.contains('active')) return;

            if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 400) {
                if (this.visibleCount < this.filteredList.length) {
                    this.visibleCount += 60;
                    this.renderGrid(true);
                }
            }
        };
        window.addEventListener('scroll', this._scrollHandler);

        this.renderGrid();
    }

    renderGrid(append = false) {
        if (!append) {
            this.filteredList = this.abilityList.filter(a => {
                if (this.searchQuery && !a._itName.toLowerCase().includes(this.searchQuery) && !a._flavor.toLowerCase().includes(this.searchQuery)) return false;
                return true;
            });

            if (this.countDisplay) {
                this.countDisplay.textContent = `${this.filteredList.length} Abilità trovate`;
            }
        }

        const sliced = this.filteredList.slice(0, this.visibleCount);

        const html = sliced.map(a => {
            return `
                <div class="ability-card" data-id="${a.name}">
                    <div class="ability-header">
                        <div class="ability-title-row">
                            <span class="ability-name">${a._itName}</span>
                        </div>
                        <i class="icon-chevron" style="opacity:0.5;">▼</i>
                    </div>
                    <div class="ability-flavor">${a._flavor}</div>
                    <div class="ability-details" style="display:none; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.1);">

                        <div class="ability-pokemon-list" id="ability-pokemon-${a.name.replace(/\s+/g, '-')}">
                            <!-- Populated dynamically -->
                        </div>
                    </div>
                    <div class="ability-expand-tip">Toccare per vedere i Pokémon</div>
                </div>
            `;
        }).join('');

        if (append) {
            this.grid.innerHTML += html;
        } else {
            this.grid.innerHTML = html;
        }

        if (this.filteredList.length === 0) {
            this.grid.innerHTML = `<div class="muted" style="text-align: center; padding: 2rem;">Nessuna abilità trovata con questi filtri.</div>`;
        }

        // Attach click handlers iteratively
        const lastCards = this.grid.querySelectorAll('.ability-card:not(.bound)');
        lastCards.forEach(card => {
            card.classList.add('bound');
            card.addEventListener('click', () => {
                const details = card.querySelector('.ability-details');
                if (details) {
                    const isVisible = details.style.display === 'block';
                    details.style.display = isVisible ? 'none' : 'block';
                    card.classList.toggle('expanded', !isVisible);
                    const tip = card.querySelector('.ability-expand-tip');
                    if (tip) tip.style.display = isVisible ? 'block' : 'none';

                    // Load pokemon on click if not loaded yet
                    if (!isVisible) {
                        this.loadPokemonForAbility(card.dataset.id, card.querySelector('.ability-pokemon-list'));
                    }
                }
            });
        });
    }

    loadPokemonForAbility(abilityName, container) {
        if (container.dataset.loaded) return;
        
        if (!window.relationsData || !window.relationsData.abilities) {
            container.innerHTML = '<div class="muted">Dati relazioni non disponibili.</div>';
            return;
        }

        const pkmnNames = window.relationsData.abilities[abilityName.toLowerCase()] || [];
        if (pkmnNames.length === 0) {
            container.innerHTML = '<div class="muted">Nessun Pokémon noto possiede questa abilità.</div>';
            return;
        }

        const matchingPkmn = (window.pokemonList || []).filter(p => 
            pkmnNames.includes(p.name)
        );

        matchingPkmn.sort((a, b) => (a.dexNumber || 0) - (b.dexNumber || 0));


        let html = `<div style="margin-bottom: 0.5rem; font-weight: bold; font-size: 0.9rem;">Pokémon che hanno questa abilità (${matchingPkmn.length}):</div>`;
        html += '<div class="assoc-pkmn-grid">';
        
        matchingPkmn.forEach(p => {
            const sprite = window.pokedexView ? window.pokedexView.getSpriteUrl(p.name, 'artwork') : '';
            const name = p.name_it || p.name;
            html += `
                <div class="assoc-pkmn-icon" title="${name}" onclick="event.stopPropagation(); window.app.navigateTo('pokedex', { pokemon: '${p.name}' })">
                    <img src="${sprite}" alt="${name}" onerror="this.src='data/sprites/pokemon/artwork/0.png'">
                    <span class="assoc-pkmn-name-tiny">${name}</span>
                </div>
            `;
        });
        html += '</div>';

        container.innerHTML = html;
        container.dataset.loaded = "true";
    }
}
