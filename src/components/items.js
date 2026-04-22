export class ItemsView {
    constructor(container) {
        this.container = container;
        this.itemsList = [];
        this.searchQuery = '';
        this.visibleCount = 80;
        this.filteredItems = [];
    }

    async render() {
        this.container.innerHTML = `
            <div class="items-header" style="text-align: center; margin-bottom: 2.5rem;">
                <h2 style="font-family: 'Outfit', sans-serif; font-size: 2.5rem; margin-bottom: 0.5rem; background: linear-gradient(135deg, #fbbf24, #f59e0b); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">🎒 Oggetti</h2>
                <p class="muted" style="font-size: 1.1rem; max-width: 600px; margin: 0 auto;">Sfoglia il database completo degli strumenti, delle bacche e degli equipaggiamenti di Pokémon Champions.</p>
            </div>
            
            <div class="toolbar" style="margin-bottom: 2rem; max-width: 800px; margin-left: auto; margin-right: auto;">
                <div style="position: relative; flex: 1;">
                    <input type="text" id="items-search" placeholder="Cerca oggetto per nome..." class="search-box" style="width: 100%; padding-left: 3rem;">
                    <i class="icon" style="position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); opacity: 0.5;">🔍</i>
                </div>
                <div id="items-count-label" class="total-badge" style="display: flex; align-items: center; justify-content: center; min-width: 140px;">0 Oggetti</div>
            </div>

            <div id="items-grid" class="items-grid"></div>

            <div id="items-load-more" class="load-more-container" style="text-align: center; padding: 3rem 1rem; display: none;">
                <button class="view-switch-btn active" id="items-load-more-btn" style="margin: 0 auto; padding: 0.8rem 2.5rem;">
                    Carica Altri Oggetti
                </button>
            </div>
        `;

        this.grid = document.getElementById('items-grid');
        this.searchInput = document.getElementById('items-search');
        this.countLabel = document.getElementById('items-count-label');
        this.loadMoreContainer = document.getElementById('items-load-more');
        this.loadMoreBtn = document.getElementById('items-load-more-btn');

        let rawData = window.itemsData;
        let itemsMap = {};

        if (rawData && rawData.items) {
            itemsMap = rawData.items;
        } else if (rawData && typeof rawData === 'object' && !Array.isArray(rawData)) {
            itemsMap = rawData;
        }

        // Convert object to array: show ALL items from database
        this.itemsList = Object.entries(itemsMap)
            .map(([id, data]) => ({
                id: id,
                ...data
            }));

        if (this.itemsList.length === 0) {
            this.grid.innerHTML = `<div class="grouped-section" style="grid-column: 1/-1; text-align: center; padding: 4rem 2rem;">
                <i class="icon" style="font-size: 4rem; display: block; margin-bottom: 1.5rem; opacity: 0.3;">📦</i>
                <p class="muted">Nessun oggetto trovato nel database.</p>
            </div>`;
            return;
        }

        this.searchInput.addEventListener('input', () => {
            this.searchQuery = this.searchInput.value.toLowerCase();
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
            if (!this.searchQuery) return true;
            const nameIt = (item.name_it || '').toLowerCase();
            const nameEn = (item.name_en || '').toLowerCase();
            return nameIt.includes(this.searchQuery) || nameEn.includes(this.searchQuery);
        });

        const sliced = this.filteredItems.slice(0, this.visibleCount);
        this.countLabel.textContent = `${this.filteredItems.length} Oggetti`;

        if (sliced.length === 0) {
            this.grid.innerHTML = `<div class="muted" style="grid-column: 1/-1; text-align: center; padding: 4rem;">Nessun oggetto trovato per "${this.searchQuery}".</div>`;
            this.loadMoreContainer.style.display = 'none';
            return;
        }

        this.grid.innerHTML = sliced.map(item => {
            const it = item.name_it;
            const en = item.id || item.name;
            const displayName = (it && it !== en) ? `${it} / ${en}` : (it || en || `Oggetto #${item.id}`);
            
            const effectText = item.effect_it || item.description || item.effect_en || 'Effetto non disponibile.';
            const shortEffect = effectText.slice(0, 85);
            
            // Format sprite URL: use the English key (id), lowercase, space to hyphen
            const spriteName = String(item.id || item.name || '')
                .toLowerCase()
                .trim()
                .replace(/\s+/g, '-')
                .replace(/[']/g, '');
            const spriteUrl = `data/sprites/items/${spriteName}.png`;

            return `
                <div class="item-card" data-item-id="${item.id}">
                    <div class="item-card-inner">
                        <div class="item-image-wrapper">
                            <img src="${spriteUrl}" alt="${displayName}" loading="lazy" onerror="this.src='assets/icons/unknown.png'; this.onerror=null;">
                        </div>
                        <div class="item-info">
                            <h4 class="item-name">${displayName}</h4>
                            <p class="item-desc-short">${shortEffect}${effectText.length >= 85 ? '...' : ''}</p>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        this.loadMoreContainer.style.display = this.visibleCount < this.filteredItems.length ? 'block' : 'none';

        this.grid.querySelectorAll('.item-card').forEach(card => {
            card.addEventListener('click', () => this.showItemDetail(card.dataset.itemId));
        });
    }

    async showItemDetail(itemId) {
        const item = this.itemsList.find(i => i.id === itemId);
        if (!item) return;

        const it = item.name_it;
        const en = item.id || item.name;
        const displayName = (it && it !== en) ? `${it} / ${en}` : (it || en);
        
        const effect = (item.effect_it || item.description || 'Nessuna descrizione disponibile.').replace(/\n/g, '<br>');
        
        const spriteName = String(item.id || item.name || '')
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '-')
            .replace(/[']/g, '');
        const spriteUrl = `data/sprites/items/${spriteName}.png`;

        const modalsRoot = document.getElementById('modals-root');
        modalsRoot.innerHTML = `
            <div class="modal-backdrop" id="modal-backdrop">
                <div class="modal-content item-detail-modal" style="max-width: 550px;">
                    <button class="modal-close" id="modal-close">&times;</button>
                    
                    <div class="modal-header" style="border-bottom: none; padding-bottom: 0;">
                        <span class="dex-num" style="font-size: 1rem; opacity: 0.4;">ID #${item.id}</span>
                        <h2 style="margin-top: 0.25rem;">${displayName}</h2>
                        ${item.name_en !== item.name_it ? `<div class="muted" style="font-size: 0.9rem;">${item.name_en}</div>` : ''}
                    </div>

                    <div class="modal-body" style="background: transparent;">
                        <div class="modal-hero" style="background: rgba(255,255,255,0.03); border: 1px solid var(--border); margin-bottom: 2rem; padding: 2rem;">
                            <img src="${spriteUrl}" alt="${displayName}" style="width: 120px; height: 120px; filter: drop-shadow(0 10px 20px rgba(0,0,0,0.5));" onerror="this.src='assets/icons/unknown.png'">
                        </div>

                        <div class="grouped-section section-moves" style="border-left-color: var(--accent); background: rgba(15, 23, 42, 0.4);">
                            <h3 style="color: var(--accent);"><i class="icon">✨</i> Effetto</h3>
                            <p style="font-size: 1.05rem; line-height: 1.7; color: var(--fg); font-style: italic;">
                                "${effect}"
                            </p>
                        </div>
                        
                        <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                            <div class="total-badge" style="flex: 1; text-align: center; font-size: 0.75rem; background: rgba(255,255,255,0.05); color: var(--muted);">
                                CATEGORIA: STRUMENTO
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const closeModal = () => modalsRoot.innerHTML = '';
        document.getElementById('modal-close').addEventListener('click', closeModal);
        document.getElementById('modal-backdrop').addEventListener('click', (e) => {
            if (e.target.id === 'modal-backdrop') closeModal();
        });
    }
}
