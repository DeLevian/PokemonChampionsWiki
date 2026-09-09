const OPERATION_LABELS = {
    add: 'aggiunto',
    update: 'modificato',
    verify: 'confermato',
    remove: 'rimosso'
};

const OPERATION_FILTER_LABELS = {
    all: 'Tutte le modifiche',
    add: 'Aggiunti',
    update: 'Modificati',
    verify: 'Confermati',
    remove: 'Rimossi'
};

export function getCurrentReleaseMark(entityType, canonicalName) {
    const release = window.currentRelease;
    if (!release?.entities?.[entityType]?.includes(canonicalName)) return null;

    const operations = release.operations?.[entityType] || {};
    const operation = Object.keys(OPERATION_LABELS).find(key =>
        Array.isArray(operations[key]) && operations[key].includes(canonicalName)
    ) || null;

    return {
        label: release.label || release.title || release.id,
        title: `${release.title}${operation ? ` · ${OPERATION_LABELS[operation]}` : ''}`,
        operation
    };
}

export function renderCurrentReleaseBadge(entityType, canonicalName) {
    const mark = getCurrentReleaseMark(entityType, canonicalName);
    if (!mark) return '';
    return `<span class="release-badge" title="${mark.title}" aria-label="${mark.title}">${mark.label}</span>`;
}

export function renderReleaseFilterControls(prefix) {
    const releases = [...(window.releaseHistory || [])].reverse();
    if (!releases.length) return '';
    const currentId = window.releaseIndex?.current || window.currentRelease?.id;

    return `
        <select id="${prefix}-release-filter" class="game-select release-filter-select" aria-label="Filtra per aggiornamento">
            <option value="all">Tutti gli aggiornamenti</option>
            ${releases.map(release => `
                <option value="${release.id}">${release.title}${release.id === currentId ? ' · corrente' : ''}</option>
            `).join('')}
        </select>
        <select id="${prefix}-operation-filter" class="game-select release-operation-select" aria-label="Filtra per tipo di modifica">
            ${Object.entries(OPERATION_FILTER_LABELS).map(([value, label]) =>
                `<option value="${value}">${label}</option>`
            ).join('')}
        </select>`;
}

export function bindReleaseFilterControls(prefix, state, onChange) {
    const releaseSelect = document.getElementById(`${prefix}-release-filter`);
    const operationSelect = document.getElementById(`${prefix}-operation-filter`);
    if (!releaseSelect || !operationSelect) return;

    const releases = [...(window.releaseHistory || [])].reverse();
    const currentId = window.releaseIndex?.current || window.currentRelease?.id;
    releaseSelect.innerHTML = `
        <option value="all">Tutti gli aggiornamenti</option>
        ${releases.map(release => `
            <option value="${release.id}">${release.title}${release.id === currentId ? ' · corrente' : ''}</option>
        `).join('')}`;
    operationSelect.innerHTML = Object.entries(OPERATION_FILTER_LABELS).map(([value, label]) =>
        `<option value="${value}">${label}</option>`
    ).join('');
    releaseSelect.value = state.releaseFilter || 'all';
    operationSelect.value = state.releaseOperation || 'all';
    releaseSelect.addEventListener('change', event => {
        state.releaseFilter = event.target.value;
        onChange();
    });
    operationSelect.addEventListener('change', event => {
        state.releaseOperation = event.target.value;
        onChange();
    });
}

export function matchesReleaseFilter(entityType, canonicalName, releaseId = 'all', operation = 'all') {
    if (releaseId === 'all' && operation === 'all') return true;
    const releases = window.releaseHistory || [];
    return releases.some(release => {
        if (releaseId !== 'all' && release.id !== releaseId) return false;
        if (operation === 'all') return release.entities?.[entityType]?.includes(canonicalName) === true;
        return release.operations?.[entityType]?.[operation]?.includes(canonicalName) === true;
    });
}
