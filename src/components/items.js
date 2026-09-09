import {
    bindReleaseFilterControls,
    matchesReleaseFilter,
    renderCurrentReleaseBadge,
    renderReleaseFilterControls
} from '../services/releases.js';

const CATEGORY_LABELS = {
    all: 'Tutte le categorie',
    mega: 'Megapietre',
    berry: 'Bacche',
    consumable: 'Consumabili',
    held: 'Strumenti tenuti'
};

export class ItemsView {
    constructor(container) {
        this.container = container;
        this.itemsList = [];
        this.searchQuery = '';
        this.selectedCategory = 'all';
        this.visibleCount = 80;
        this.filteredItems = [];
        this.releaseFilter = 'all';
        this.releaseOperation = 'all';
    }

    classifyItem(item) {
        const name = item.name || '';
        const description = `${item.description || ''} ${item.description_it || ''}`.toLowerCase();
        if (description.includes('mega evolve') || description.includes('megaevol')) return 'mega';
        if (/ berry$/i.test(name)) return 'berry';
        if (/single use|consum|si perde dopo|dopo l.attivazione/i.test(description)) return 'consumable';
        return 'held';
    }

    getSpriteUrl(item) {
        const aliases = window.entityAliases?.itemSprites || {};
        const spriteName = aliases[item.name] || `${String(item.name || item.id || '')
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '-')
            .replace(/[']/g, '')}.png`;
        return `data/sprites/items/${spriteName}`;
    }

    renderIcon(item, extraClass = '') {
        const fallbackSymbol = item._category === 'mega' ? '◆' : '◈';
        return `
            <span class="item-icon-fallback ${extraClass}" aria-hidden="true">${fallbackSymbol}</span>
            <img src="${this.getSpriteUrl(item)}" alt="" loading="lazy"
                 onerror="this.hidden=true; this.previousElementSibling.classList.add('visible')">
        `;
    }

    async render() {
        this.container.innerHTML = `
            <div class="items-header">
                <h2>Oggetti</h2>
                <p class="muted">Strumenti disponibili in Pokémon Champions. Cerca per nome o filtra per categoria.</p>
            </div>

            <div class="toolbar items-toolbar">
                <input type="search" id="items-search" placeholder="Cerca in italiano o inglese…" class="search-box">
                <select id="items-category-select" class="game-select" aria-label="Categoria strumenti">
                    ${Object.entries(CATEGORY_LABELS).map(([value, label]) =>
                        `<option value="${value}">${label}</option>`
                    ).join('')}
                </select>
                ${renderReleaseFilterControls('items')}
                <div id="items-count-label" class="total-badge">0 oggetti</div>
            </div>

            <div id="items-grid" class="items-grid"></div>

            <div id="items-load-more" class="load-more-container">
                <button class="view-switch-btn active" id="items-load-more-btn">Mostra altri oggetti</button>
            </div>
        `;

        this.grid = document.getElementById('items-grid');
        this.searchInput = document.getElementById('items-search');
        this.categorySelect = document.getElementById('items-category-select');
        this.countLabel = document.getElementById('items-count-label');
        this.loadMoreContainer = document.getElementById('items-load-more');
        this.loadMoreBtn = document.getElementById('items-load-more-btn');

        const itemsMap = window.itemsData?.items || {};
        this.itemsList = Object.entries(itemsMap)
            .map(([id, data]) => {
                const item = { id, ...data };
                item._category = this.classifyItem(item);
                return item;
            })
            .filter(item => item.inChampions === true)
            .sort((a, b) => (a.name_it || a.name).localeCompare(b.name_it || b.name, 'it'));

        this.searchInput.addEventListener('input', event => {
            this.searchQuery = event.target.value.trim().toLowerCase();
            this.visibleCount = 80;
            this.renderGrid();
        });
        this.categorySelect.addEventListener('change', event => {
            this.selectedCategory = event.target.value;
            this.visibleCount = 80;
            this.renderGrid();
        });
        bindReleaseFilterControls('items', this, () => {
            this.visibleCount = 80;
            this.renderGrid();
        });
        this.loadMoreBtn.addEventListener('click', () => {
            this.visibleCount += 80;
            this.renderGrid();
        });

        this.renderGrid();
    }

    renderGrid() {
        this.filteredItems = this.itemsList.filter(item => {
            if (this.selectedCategory !== 'all' && item._category !== this.selectedCategory) return false;
            if (!matchesReleaseFilter('items', item.name, this.releaseFilter, this.releaseOperation)) return false;
            if (!this.searchQuery) return true;
            const searchable = [item.name_it, item.name_en, item.name]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();
            return searchable.includes(this.searchQuery);
        });

        const visibleItems = this.filteredItems.slice(0, this.visibleCount);
        this.countLabel.textContent = `${this.filteredItems.length} oggetti`;

        if (visibleItems.length === 0) {
            this.grid.innerHTML = `
                <div class="items-empty">
                    <strong>Nessun oggetto trovato</strong>
                    <span>Prova a cambiare ricerca o categoria.</span>
                </div>`;
            this.loadMoreContainer.style.display = 'none';
            return;
        }

        this.grid.innerHTML = visibleItems.map((item, index) => {
            const italianName = item.name_it || item.name;
            const englishName = item.name_en || item.name;
            const showEnglish = italianName !== englishName;
            const description = item.effect_it || item.description || 'Descrizione non disponibile.';
            return `
                <button type="button" class="item-card" data-item-id="${item.id}" style="--item-index:${index}">
                    <span class="item-image-wrapper">${this.renderIcon(item)}</span>
                    <span class="item-info">
                        <span class="item-card-heading">
                            <span class="entity-name-with-release"><strong class="item-name">${italianName}</strong>${renderCurrentReleaseBadge('items', item.name)}</span>
                            <span class="item-category item-category-${item._category}">${CATEGORY_LABELS[item._category]}</span>
                        </span>
                        ${showEnglish ? `<span class="item-name-en">${englishName}</span>` : ''}
                        <span class="item-desc-short">${description}</span>
                    </span>
                    <span class="item-open-indicator" aria-hidden="true">›</span>
                </button>`;
        }).join('');

        this.loadMoreContainer.style.display = this.visibleCount < this.filteredItems.length ? 'block' : 'none';
        this.grid.querySelectorAll('.item-card').forEach(card => {
            card.addEventListener('click', () => this.showItemDetail(card.dataset.itemId));
        });
    }

    showItemDetail(itemId) {
        const item = this.itemsList.find(candidate => candidate.id === itemId);
        if (!item) return;

        const italianName = item.name_it || item.name;
        const englishName = item.name_en || item.name;
        const showEnglish = italianName !== englishName;
        const description = item.effect_it || item.description || 'Nessuna descrizione disponibile.';
        const modalsRoot = document.getElementById('modals-root');

        modalsRoot.innerHTML = `
            <div class="modal-backdrop" id="modal-backdrop">
                <div class="modal-content item-detail-modal">
                    <button class="modal-close" id="modal-close" aria-label="Chiudi">&times;</button>
                    <div class="item-detail-layout">
                        <div class="item-detail-icon">${this.renderIcon(item, 'item-icon-fallback-large')}</div>
                        <div class="item-detail-copy">
                            <span class="item-category item-category-${item._category}">${CATEGORY_LABELS[item._category]}</span>
                            <h2>${italianName}</h2>
                            ${showEnglish ? `<div class="item-detail-name-en">${englishName}</div>` : ''}
                            <p>${description}</p>
                        </div>
                    </div>
                </div>
            </div>`;

        const closeModal = () => { modalsRoot.innerHTML = ''; };
        document.getElementById('modal-close').addEventListener('click', closeModal);
        document.getElementById('modal-backdrop').addEventListener('click', event => {
            if (event.target.id === 'modal-backdrop') closeModal();
        });
    }
}
