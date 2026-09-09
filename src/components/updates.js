import { getPokemonSpriteUrl } from '../services/assets.js';

const GROUPS = [
    { key: 'pokemon', title: 'Pokémon e forme', singular: 'Pokémon' },
    { key: 'moves', title: 'Mosse', singular: 'Mossa' },
    { key: 'abilities', title: 'Abilità', singular: 'Abilità' },
    { key: 'items', title: 'Strumenti', singular: 'Strumento' }
];

export class UpdatesView {
    constructor(container) {
        this.container = container;
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

    renderEntity(type, name) {
        const entity = this.resolveEntity(type, name);
        const display = this.displayName(entity, name);
        let visual = '<span class="update-entity-symbol">◆</span>';
        let metadata = '';

        if (type === 'pokemon' && entity) {
            visual = `<img src="${getPokemonSpriteUrl(entity)}" alt="" loading="lazy">`;
            metadata = `#${String(entity.dexId || '').padStart(4, '0')} · ${(entity.types || []).join(' / ')}`;
        } else if (type === 'moves' && entity) {
            visual = `<span class="update-type-dot ${(entity.type || '').toLowerCase()}"></span>`;
            metadata = `${entity.type || ''} · ${entity.category || ''}`;
        } else if (type === 'abilities') {
            metadata = 'Abilità disponibile con questo aggiornamento';
        } else if (type === 'items') {
            metadata = 'Strumento disponibile con questo aggiornamento';
        }

        return `
            <button type="button" class="update-entity" data-entity-type="${type}" data-entity-name="${name}">
                <span class="update-entity-visual">${visual}</span>
                <span class="update-entity-copy">
                    <strong>${display.italian}</strong>
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
                    <span class="updates-kicker">Abilità · ${window.currentRelease?.title || 'ultimo aggiornamento'}</span>
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

    async render() {
        const release = window.currentRelease;
        if (!release?.entities) {
            this.container.innerHTML = '<div class="updates-empty">Nessun aggiornamento documentato.</div>';
            return;
        }

        const dateLabel = release.date
            ? new Intl.DateTimeFormat('it-IT', { dateStyle: 'long' }).format(new Date(`${release.date}T00:00:00`))
            : 'data non disponibile';

        this.container.innerHTML = `
            <div class="updates-hero">
                <span class="updates-kicker">Ultimo aggiornamento</span>
                <h2>${release.title}</h2>
                <p>${release.summary}</p>
                <time datetime="${release.date || ''}">${dateLabel}</time>
                <div class="updates-counts">
                    ${GROUPS.map(group => `
                        <a href="#updates-${group.key}">
                            <strong>${release.counts?.[group.key] ?? release.entities[group.key]?.length ?? 0}</strong>
                            <span>${group.title}</span>
                        </a>`).join('')}
                </div>
            </div>

            <div class="updates-groups">
                ${GROUPS.map(group => `
                    <section class="updates-group" id="updates-${group.key}">
                        <div class="updates-group-heading">
                            <h3>${group.title}</h3>
                            <span>${release.entities[group.key]?.length || 0}</span>
                        </div>
                        <div class="updates-entity-grid">
                            ${(release.entities[group.key] || []).map(name => this.renderEntity(group.key, name)).join('')}
                        </div>
                    </section>`).join('')}
            </div>`;

        this.container.querySelectorAll('.update-entity').forEach(button => {
            button.addEventListener('click', () => {
                window.app.openReleaseEntity(button.dataset.entityType, button.dataset.entityName);
            });
        });
    }
}
