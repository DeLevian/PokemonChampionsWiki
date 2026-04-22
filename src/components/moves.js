const CATEGORY_LABELS = { physical: 'Fisico', special: 'Speciale', status: 'Stato' };
const TYPE_LABELS = {
    normal: 'Normale', fire: 'Fuoco', water: 'Acqua', grass: 'Erba', electric: 'Elettro',
    ice: 'Ghiaccio', fighting: 'Lotta', poison: 'Veleno', ground: 'Terra', flying: 'Volante',
    psychic: 'Psico', bug: 'Coleottero', rock: 'Roccia', ghost: 'Spettro', dragon: 'Drago',
    dark: 'Buio', steel: 'Acciaio', fairy: 'Folletto', stellar: 'Stellare', unknown: '???'
};

export class MovesView {
    constructor(container) {
        this.container = container;
        this.movesList = [];
        this.visibleCount = 80;
        this.selectedType = 'all';
        this.selectedCategory = 'all';
        this.searchQuery = '';
    }

    async render() {
        this.container.innerHTML = `
            <div class="toolbar">
                <input type="text" id="moves-search" placeholder="Cerca Mossa..." class="search-box">
                <select id="moves-type-select" class="game-select">
                    <option value="all">Tutti i Tipi</option>
                    <option value="normal">Normale</option>
                    <option value="fire">Fuoco</option>
                    <option value="water">Acqua</option>
                    <option value="grass">Erba</option>
                    <option value="electric">Elettro</option>
                    <option value="ice">Ghiaccio</option>
                    <option value="fighting">Lotta</option>
                    <option value="poison">Veleno</option>
                    <option value="ground">Terra</option>
                    <option value="flying">Volante</option>
                    <option value="psychic">Psico</option>
                    <option value="bug">Coleottero</option>
                    <option value="rock">Roccia</option>
                    <option value="ghost">Spettro</option>
                    <option value="dragon">Drago</option>
                    <option value="dark">Buio</option>
                    <option value="steel">Acciaio</option>
                    <option value="fairy">Folletto</option>
                </select>
                <select id="moves-cat-select" class="game-select">
                    <option value="all">Tutte le Categorie</option>
                    <option value="physical">Fisico</option>
                    <option value="special">Speciale</option>
                    <option value="status">Stato</option>
                </select>
            </div>
            <div id="moves-count" class="pokemon-count"></div>
            <div class="move-method-grid" id="moves-grid" style="margin-top: 1rem;"></div>
        `;

        this.grid = document.getElementById('moves-grid');
        this.countDisplay = document.getElementById('moves-count');

        if (!window.movesDb || !window.movesDb.moves) {
            this.grid.innerHTML = `<div class="muted" style="grid-column: 1/-1; text-align: center; padding: 2rem;">
                <i class="icon" style="font-size: 3rem; display: block; margin-bottom: 1rem;">📂</i>
                Dati delle mosse non caricati correttamente.
            </div>`;
            return;
        }

        this.movesList = Object.values(window.movesDb.moves).filter(md => md.inChampions === true);

        // Map mechanics logic directly
        this.movesList = this.movesList.map(md => {
            const it = md.name_it;
            const en = md.name || md.slug || String(md.id);
            const itName = (it && it !== en) ? `${it} / ${en}` : (it || en);
            const typeS = (md.type || 'normal').toLowerCase();
            const catS = (md.category || md.damage_class || 'status').toLowerCase();

            return {
                ...md,
                _nameIt: itName,
                _typeIt: typeS,
                _dmgClass: catS
            };
        });

        this.movesList.sort((a, b) => a._nameIt.localeCompare(b._nameIt));

        document.getElementById('moves-search').addEventListener('input', (e) => {
            this.searchQuery = e.target.value.toLowerCase();
            this.visibleCount = 80;
            this.renderGrid();
        });

        document.getElementById('moves-type-select').addEventListener('change', (e) => {
            this.selectedType = e.target.value;
            this.visibleCount = 80;
            this.renderGrid();
        });

        document.getElementById('moves-cat-select').addEventListener('change', (e) => {
            this.selectedCategory = e.target.value;
            this.visibleCount = 80;
            this.renderGrid();
        });

        this._scrollHandler = () => {
            const view = document.getElementById('moves-view');
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
            this.filteredList = this.movesList.filter(m => {
                if (this.searchQuery) {
                    const q = this.searchQuery;
                    const desc = (m.current_game_description_it || m.description_it || m.description || "").toLowerCase();
                    if (!m._nameIt.toLowerCase().includes(q) && !desc.includes(q)) return false;
                }
                if (this.selectedType !== 'all' && m._typeIt !== this.selectedType) return false;
                if (this.selectedCategory !== 'all' && m._dmgClass !== this.selectedCategory) return false;
                return true;
            });

            if (this.countDisplay) {
                this.countDisplay.textContent = `${this.filteredList.length} Mosse trovate`;
            }
        }

        const sliced = this.filteredList.slice(0, this.visibleCount);

        const html = sliced.map(m => {
            let desc = m.current_game_description_it || m.description_it || m.description || "Nessuna descrizione.";
            desc = desc.replace(/\n/g, ' ');
            const shortDesc = desc.length > 85 ? desc.substring(0, 82) + '...' : desc;

            const dmgLabel = CATEGORY_LABELS[m._dmgClass] || m._dmgClass || '';
            const dmgHtml = m._dmgClass ? `<span class="cat-icon cat-${m._dmgClass}" title="${dmgLabel}"></span>` : '';
            const dmgCss = m._dmgClass ? `background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); padding: 0.15rem 0.4rem; border-radius: 6px; display: flex; align-items: center; gap: 4px;` : `display:none;`;

            const typeLabel = TYPE_LABELS[m._typeIt] || m._typeIt.toUpperCase();
            const powerVal = m.power || m.power_raw || '--';
            const accVal = m.accuracy ? m.accuracy + '%' : (m.accuracy_raw === 101 ? '---' : '--');
            const ppVal = m.pp || '--';

            return `
                <div class="move-card clickable-move-card premium-card" 
                     onclick="window.movesView.openMoveDetails('${m.name}')"
                     style="--move-color: var(--type-${m._typeIt});">
                    <div class="move-card-top">
                        <div class="move-title-area">
                            <span class="move-name-main">${m._nameIt}</span>
                            <div class="move-types-wrap">
                                <span class="type-mini ${m._typeIt}">${typeLabel}</span>
                                <div class="move-dmg-cat">${dmgHtml}</div>
                            </div>
                        </div>
                    </div>
                    <div class="move-card-body">
                        <p class="move-card-desc-short">${shortDesc}</p>
                    </div>
                    <div class="move-card-stats-row">
                        <div class="m-stat-item">
                            <span class="stat-label">POT</span>
                            <span class="stat-value">${powerVal}</span>
                        </div>
                        <div class="m-stat-item">
                            <span class="stat-label">ACC</span>
                            <span class="stat-value">${accVal}</span>
                        </div>
                        <div class="m-stat-item">
                            <span class="stat-label">PP</span>
                            <span class="stat-value">${ppVal}</span>
                        </div>
                    </div>
                    <div class="card-glow"></div>
                </div>
            `;
        }).join('');

        if (append) {
            this.grid.innerHTML += html;
        } else {
            this.grid.innerHTML = html;
        }

        if (this.filteredList.length === 0) {
            this.grid.innerHTML = `<div class="muted" style="grid-column: 1/-1; text-align: center; padding: 2rem;">Nessuna mossa trovata con questi filtri.</div>`;
        }
    }

    openMoveDetails(moveId) {
        if (window.pokedexView) {
            window.pokedexView.openMoveDetails(moveId);
        }
    }
}
