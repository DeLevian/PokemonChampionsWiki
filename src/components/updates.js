import { getPokemonSpriteUrl } from '../services/assets.js';

const GROUPS = [
    { key: 'pokemon', title: 'Pokémon e forme', singular: 'Pokémon' },
    { key: 'moves', title: 'Mosse', singular: 'Mossa' },
    { key: 'abilities', title: 'Abilità', singular: 'Abilità' },
    { key: 'items', title: 'Strumenti', singular: 'Strumento' }
];

const OPERATION_LABELS = {
    add: 'Aggiunto',
    update: 'Modificato',
    verify: 'Confermato',
    remove: 'Rimosso'
};

const OPERATION_FILTER_LABELS = {
    add: 'Aggiunti',
    update: 'Modificati',
    verify: 'Confermati',
    remove: 'Rimossi'
};

export class UpdatesView {
    constructor(container) {
        this.container = container;
        this.releaseCache = new Map();
        this.selectedRelease = null;
        this.operationFilter = 'all';
    }

    resolveEntity(type, name) {
        if (type === 'pokemon') return window.pokemonList?.find(item => item.name === name);
        if (type === 'moves') return window.movesDb?.moves?.[name];
        if (type === 'abilities') return window.abilitiesDb?.abilities?.[name];
        if (type === 'items') return window.itemsData?.items?.[name];
        return null;
    }

    displayName(entity, fallback) {
        const italian = entity?.name_it || entity?.name || fallback;
        const english = entity?.name_en || entity?.name || fallback;
        return { italian, english, bilingual: italian !== english };
    }

    getEntries() {
        const entries = window.releaseIndex?.releases;
        if (Array.isArray(entries) && entries.length) return entries;
        if (!window.currentRelease) return [];
        return [{
            id: window.currentRelease.id,
            title: window.currentRelease.title,
            date: window.currentRelease.date,
            manifest: 'current.json',
            counts: window.currentRelease.counts
        }];
    }

    getOperation(release, type, name) {
        const operations = release.operations?.[type] || {};
        return Object.keys(OPERATION_LABELS).find(operation =>
            Array.isArray(operations[operation]) && operations[operation].includes(name)
        ) || null;
    }

    getFilteredNames(release, type) {
        const names = release.entities?.[type] || [];
        if (this.operationFilter === 'all') return names;
        return names.filter(name => this.getOperation(release, type, name) === this.operationFilter);
    }

    getOperationCounts(release) {
        const counts = Object.fromEntries(Object.keys(OPERATION_LABELS).map(operation => [operation, 0]));
        GROUPS.forEach(group => {
            (release.entities?.[group.key] || []).forEach(name => {
                const operation = this.getOperation(release, group.key, name);
                if (operation) counts[operation] += 1;
            });
        });
        return counts;
    }

    async loadRelease(releaseId) {
        if (this.releaseCache.has(releaseId)) return this.releaseCache.get(releaseId);
        if (window.currentRelease?.id === releaseId) {
            this.releaseCache.set(releaseId, window.currentRelease);
            return window.currentRelease;
        }

        const entry = this.getEntries().find(item => item.id === releaseId);
        if (!entry) throw new Error(`Release sconosciuta: ${releaseId}`);
        const response = await fetch(`data/releases/${entry.manifest}?t=${Date.now()}`);
        if (!response.ok) throw new Error(`Impossibile caricare ${entry.manifest}: HTTP ${response.status}`);
        const release = await response.json();
        this.releaseCache.set(releaseId, release);
        return release;
    }

    renderEntity(type, name, release) {
        const entity = this.resolveEntity(type, name);
        const display = this.displayName(entity, name);
        const operation = this.getOperation(release, type, name);
        let visual = '<span class="update-entity-symbol">◆</span>';
        let metadata = '';

        if (type === 'pokemon' && entity) {
            visual = `<img src="${getPokemonSpriteUrl(entity)}" alt="" loading="lazy">`;
            metadata = `#${String(entity.dexId || '').padStart(4, '0')} · ${(entity.types || []).join(' / ')}`;
        } else if (type === 'moves' && entity) {
            visual = `<span class="update-type-dot ${(entity.type || '').toLowerCase()}"></span>`;
            metadata = `${entity.type || ''} · ${entity.category || ''}`;
        } else if (type === 'abilities') {
            metadata = 'Abilità interessata da questo aggiornamento';
        } else if (type === 'items') {
            metadata = 'Strumento interessato da questo aggiornamento';
        }
        if (!entity) metadata = 'Non presente nel database corrente';

        return `
            <button type="button" class="update-entity ${!entity ? 'unavailable' : ''}"
                data-entity-type="${type}" data-entity-name="${name}" ${!entity ? 'disabled' : ''}>
                <span class="update-entity-visual">${visual}</span>
                <span class="update-entity-copy">
                    <span class="update-entity-title-row">
                        <strong>${display.italian}</strong>
                        ${operation ? `<em class="update-operation update-operation-${operation}">${OPERATION_LABELS[operation]}</em>` : ''}
                    </span>
                    ${display.bilingual ? `<small>${display.english}</small>` : ''}
                    <span>${metadata}</span>
                </span>
                <span class="update-entity-open" aria-hidden="true">›</span>
            </button>`;
    }

    showAbilityDetail(name) {
        const ability = this.resolveEntity('abilities', name);
        if (!ability) return;

        const display = this.displayName(ability, name);
        const description = ability.description_it || ability.effect_it || ability.description || 'Descrizione non disponibile.';
        const pokemonNames = window.relationsData?.abilities?.[name.toLowerCase()] || [];
        const associated = (window.pokemonList || []).filter(pokemon => pokemonNames.includes(pokemon.name));
        const modalsRoot = document.getElementById('modals-root');

        modalsRoot.innerHTML = `
            <div class="modal-backdrop" id="update-ability-backdrop">
                <div class="modal-content update-ability-modal">
                    <button class="modal-close" id="update-ability-close" aria-label="Chiudi">&times;</button>
                    <span class="updates-kicker">Abilità · ${this.selectedRelease?.title || 'aggiornamento'}</span>
                    <h2>${display.italian}</h2>
                    ${display.bilingual ? `<div class="update-detail-name-en">${display.english}</div>` : ''}
                    <p>${description}</p>
                    ${associated.length ? `
                        <div class="update-detail-associated">
                            <strong>Pokémon associati</strong>
                            <div>${associated.map(pokemon => `<span>${pokemon.name_it || pokemon.name}</span>`).join('')}</div>
                        </div>` : ''}
                </div>
            </div>`;

        const close = () => { modalsRoot.innerHTML = ''; };
        document.getElementById('update-ability-close').addEventListener('click', close);
        document.getElementById('update-ability-backdrop').addEventListener('click', event => {
            if (event.target.id === 'update-ability-backdrop') close();
        });
    }

    async selectRelease(releaseId) {
        this.container.classList.add('is-loading');
        try {
            this.selectedRelease = await this.loadRelease(releaseId);
            this.operationFilter = 'all';
            this.renderRelease();
        } catch (error) {
            console.error(error);
            this.container.innerHTML = '<div class="updates-empty">Impossibile caricare lo storico selezionato.</div>';
        } finally {
            this.container.classList.remove('is-loading');
        }
    }

    renderRelease() {
        const release = this.selectedRelease;
        if (!release?.entities) {
            this.container.innerHTML = '<div class="updates-empty">Nessun aggiornamento documentato.</div>';
            return;
        }

        const entries = [...this.getEntries()].reverse();
        const currentId = window.releaseIndex?.current || window.currentRelease?.id;
        const isCurrent = release.id === currentId;
        const operationCounts = this.getOperationCounts(release);
        const dateLabel = release.date
            ? new Intl.DateTimeFormat('it-IT', { dateStyle: 'long' }).format(new Date(`${release.date}T00:00:00`))
            : 'data non disponibile';

        this.container.innerHTML = `
            <div class="updates-history-toolbar">
                <label for="updates-release-select">Aggiornamento visualizzato</label>
                <select id="updates-release-select" class="game-select">
                    ${entries.map(entry => `
                        <option value="${entry.id}" ${entry.id === release.id ? 'selected' : ''}>
                            ${entry.title}${entry.id === currentId ? ' · corrente' : ''}
                        </option>`).join('')}
                </select>
            </div>

            <div class="updates-hero">
                <span class="updates-kicker">${isCurrent ? 'Ultimo aggiornamento' : 'Archivio aggiornamenti'}</span>
                <h2>${release.title}</h2>
                <p>${release.summary}</p>
                <time datetime="${release.date || ''}">${dateLabel}</time>
                <div class="updates-counts">
                    ${GROUPS.map(group => {
                        const count = this.getFilteredNames(release, group.key).length;
                        return `
                            <a href="#updates-${group.key}">
                                <strong>${count}</strong>
                                <span>${group.title}</span>
                            </a>`;
                    }).join('')}
                </div>
            </div>

            <div class="updates-operation-filters" aria-label="Filtra per tipo di modifica">
                <button type="button" data-operation="all" class="${this.operationFilter === 'all' ? 'active' : ''}">
                    Tutti <span>${Object.values(release.counts || {}).reduce((total, count) => total + count, 0)}</span>
                </button>
                ${Object.keys(OPERATION_LABELS).filter(operation => operationCounts[operation] > 0).map(operation => `
                    <button type="button" data-operation="${operation}" class="${this.operationFilter === operation ? 'active' : ''}">
                        ${OPERATION_FILTER_LABELS[operation]}
                        <span>${operationCounts[operation]}</span>
                    </button>`).join('')}
            </div>

            <div class="updates-groups">
                ${GROUPS.map(group => {
                    const names = this.getFilteredNames(release, group.key);
                    if (!names.length) return '';
                    return `
                        <section class="updates-group" id="updates-${group.key}">
                            <div class="updates-group-heading">
                                <h3>${group.title}</h3>
                                <span>${names.length}</span>
                            </div>
                            <div class="updates-entity-grid">
                                ${names.map(name => this.renderEntity(group.key, name, release)).join('')}
                            </div>
                        </section>`;
                }).join('')}
            </div>`;

        document.getElementById('updates-release-select')?.addEventListener('change', event => {
            this.selectRelease(event.target.value);
        });
        this.container.querySelectorAll('[data-operation]').forEach(button => {
            button.addEventListener('click', () => {
                this.operationFilter = button.dataset.operation;
                this.renderRelease();
            });
        });
        this.container.querySelectorAll('.update-entity:not(:disabled)').forEach(button => {
            button.addEventListener('click', () => {
                window.app.openReleaseEntity(button.dataset.entityType, button.dataset.entityName);
            });
        });
    }

    async render() {
        const entries = this.getEntries();
        if (!entries.length) {
            this.container.innerHTML = '<div class="updates-empty">Nessun aggiornamento documentato.</div>';
            return;
        }
        const initialId = window.releaseIndex?.current || window.currentRelease?.id || entries.at(-1).id;
        await this.selectRelease(initialId);
    }
}
