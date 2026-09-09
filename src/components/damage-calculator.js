import { getPokemonSpriteUrl } from '../services/assets.js';
import {
    applyChainedModifier,
    applyStatStage,
    calculateChampionDamage,
    calculateChampionStat,
    getTypeEffectiveness,
    pokeRound
} from '../services/damage-calculator.js';

const STAT_KEYS = {
    Physical: { attack: 'attack', defense: 'defense' },
    Special: { attack: 'special-attack', defense: 'special-defense' }
};
const NATURE_KEYS = {
    attack: 'attack', defense: 'defense', speed: 'speed',
    sp_attack: 'special-attack', sp_defense: 'special-defense'
};
const SPREAD_TARGETS = new Set(['allAdjacent', 'allAdjacentFoes', 'all']);
const TYPE_ITEMS = {
    'Black Belt': 'fighting', 'Black Glasses': 'dark', Charcoal: 'fire',
    'Dragon Fang': 'dragon', 'Fairy Feather': 'fairy', 'Hard Stone': 'rock',
    Magnet: 'electric', 'Metal Coat': 'steel', 'Miracle Seed': 'grass',
    'Mystic Water': 'water', 'Never-Melt Ice': 'ice', 'Poison Barb': 'poison',
    'Sharp Beak': 'flying', 'Silk Scarf': 'normal', 'Silver Powder': 'bug',
    'Soft Sand': 'ground', 'Spell Tag': 'ghost', 'Twisted Spoon': 'psychic'
};
const RESIST_BERRIES = {
    'Babiri Berry': 'steel', 'Charti Berry': 'rock', 'Chople Berry': 'fighting',
    'Coba Berry': 'flying', 'Colbur Berry': 'dark', 'Haban Berry': 'dragon',
    'Kasib Berry': 'ghost', 'Kebia Berry': 'poison', 'Occa Berry': 'fire',
    'Passho Berry': 'water', 'Payapa Berry': 'psychic', 'Rindo Berry': 'grass',
    'Roseli Berry': 'fairy', 'Shuca Berry': 'ground', 'Tanga Berry': 'bug',
    'Wacan Berry': 'electric', 'Yache Berry': 'ice'
};
const SUPPORTED_ITEMS = new Set([
    ...Object.keys(TYPE_ITEMS), ...Object.keys(RESIST_BERRIES),
    'Air Balloon', 'Chilan Berry', 'Expert Belt', 'Life Orb', 'Muscle Band', 'Wise Glasses'
]);
const SPECIAL_CASES = new Set([
    'Body Press', 'Foul Play', 'Psyshock', 'Psystrike', 'Secret Sword',
    'Stored Power', 'Power Trip', 'Electro Ball', 'Gyro Ball', 'Grass Knot',
    'Low Kick', 'Heavy Slam', 'Heat Crash', 'Facade', 'Brine', 'Hex',
    'Reversal', 'Flail', 'Eruption', 'Water Spout', 'Crush Grip', 'Wring Out',
    'Tera Blast', 'Photon Geyser', 'Shell Side Arm'
]);

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character]);
}

export class DamageCalculatorView {
    constructor(container) {
        this.container = container;
    }

    getPokemon(name) {
        return (window.pokemonList || []).find(pokemon => pokemon.name === name);
    }

    getStat(pokemon, key) {
        return pokemon?.stats?.find(stat => stat.name === key)?.base_stat || 1;
    }

    natureMultiplier(natureName, statKey) {
        const nature = (window.naturesData || []).find(item => item.name === natureName);
        if (!nature) return 1;
        const increased = NATURE_KEYS[nature.increasedStat] || nature.increasedStat;
        const decreased = NATURE_KEYS[nature.decreasedStat] || nature.decreasedStat;
        if (increased === statKey) return 1.1;
        if (decreased === statKey) return 0.9;
        return 1;
    }

    pokemonLabel(pokemon) {
        const localized = pokemon.name_it || pokemon.name;
        if (pokemon.form === 'Mega' && !localized.toLowerCase().includes('mega')) {
            return `Mega ${localized} (${pokemon.name})`;
        }
        if (localized !== pokemon.name) return `${localized} (${pokemon.name})`;
        return localized;
    }

    pokemonOptions() {
        return [...(window.pokemonList || [])]
            .sort((a, b) => this.pokemonLabel(a).localeCompare(this.pokemonLabel(b), 'it'))
            .map(pokemon => `<option value="${escapeHtml(pokemon.name)}">${escapeHtml(this.pokemonLabel(pokemon))} · #${pokemon.dexId}</option>`)
            .join('');
    }

    renderPokemonPreview(side) {
        const pokemon = this.getPokemon(document.getElementById(`damage-${side}`).value);
        const preview = document.getElementById(`damage-${side}-preview`);
        if (!preview) return;
        if (!pokemon) {
            preview.innerHTML = '<span>Scrivi o seleziona un nome valido.</span>';
            return;
        }
        preview.innerHTML = `
            <img src="${getPokemonSpriteUrl(pokemon)}" alt="" loading="lazy">
            <span><strong>${escapeHtml(this.pokemonLabel(pokemon))}</strong><small>#${String(pokemon.dexId).padStart(4, '0')} · ${(pokemon.types || []).join(' / ')}</small></span>`;
    }

    itemOptions() {
        const items = Object.values(window.itemsData?.items || {})
            .filter(item => item.inChampions && SUPPORTED_ITEMS.has(item.name))
            .sort((a, b) => (a.name_it || a.name).localeCompare(b.name_it || b.name, 'it'));
        return '<option value="">Nessuno / ignora</option>' + items.map(item =>
            `<option value="${escapeHtml(item.name)}">${escapeHtml(item.name_it || item.name)}</option>`
        ).join('');
    }

    populateAbilities(side) {
        const pokemon = this.getPokemon(document.getElementById(`damage-${side}`).value);
        const select = document.getElementById(`damage-${side}-ability`);
        const abilities = pokemon?.abilities || [];
        select.innerHTML = '<option value="">Nessuna / ignora</option>' + abilities.map(name => {
            const ability = window.abilitiesDb?.abilities?.[name];
            return `<option value="${escapeHtml(name)}">${escapeHtml(ability?.name_it || name)}</option>`;
        }).join('');
    }

    natureOptions() {
        return (window.naturesData || []).map(nature =>
            `<option value="${escapeHtml(nature.name)}" ${nature.name === 'Hardy' ? 'selected' : ''}>${escapeHtml(nature.name_it || nature.name)}</option>`
        ).join('');
    }

    stageOptions() {
        return Array.from({ length: 13 }, (_, index) => index - 6).map(stage =>
            `<option value="${stage}" ${stage === 0 ? 'selected' : ''}>${stage > 0 ? '+' : ''}${stage}</option>`
        ).join('');
    }

    async render() {
        const pokemonOptions = this.pokemonOptions();
        this.container.innerHTML = `
            <div class="damage-header">
                <span class="updates-kicker">Strumento sperimentale verificabile</span>
                <h2>Calcolatore del danno</h2>
                <p>Formula Pokémon Champions a livello 50. Il risultato considera i 16 roll possibili dall'85% al 100%.</p>
            </div>

            <datalist id="damage-pokemon-options">${pokemonOptions}</datalist>
            <div class="damage-layout">
                <section class="damage-panel">
                    <h3>Attaccante</h3>
                    <label>Pokémon
                        <input id="damage-attacker" class="damage-pokemon-search" type="search" list="damage-pokemon-options" autocomplete="off" placeholder="Cerca per nome…">
                    </label>
                    <div id="damage-attacker-preview" class="damage-pokemon-preview"></div>
                    <label>Abilità<select id="damage-attacker-ability" class="game-select"></select></label>
                    <label>Oggetto rilevante al danno<select id="damage-attacker-item" class="game-select">${this.itemOptions()}</select></label>
                    <label>Natura<select id="damage-attacker-nature" class="game-select">${this.natureOptions()}</select></label>
                    <div class="damage-field-row">
                        <label>SP offensivi <span class="damage-help" title="Gli Stat Point sono il sistema equivalente agli EV in Pokémon Champions. Massimo 32 per statistica e 66 totali.">EV Champions ?</span><input id="damage-attacker-sp" type="number" min="0" max="32" value="0"></label>
                        <label>Stadio<select id="damage-attack-stage" class="game-select">${this.stageOptions()}</select></label>
                    </div>
                    <label>Mossa<select id="damage-move" class="game-select"></select></label>
                    <div id="damage-move-info" class="damage-inline-info"></div>
                </section>

                <section class="damage-panel">
                    <h3>Difensore</h3>
                    <label>Pokémon
                        <input id="damage-defender" class="damage-pokemon-search" type="search" list="damage-pokemon-options" autocomplete="off" placeholder="Cerca per nome…">
                    </label>
                    <div id="damage-defender-preview" class="damage-pokemon-preview"></div>
                    <label>Abilità<select id="damage-defender-ability" class="game-select"></select></label>
                    <label>Oggetto rilevante al danno<select id="damage-defender-item" class="game-select">${this.itemOptions()}</select></label>
                    <label>Natura<select id="damage-defender-nature" class="game-select">${this.natureOptions()}</select></label>
                    <div class="damage-field-row">
                        <label>SP difensivi <span class="damage-help" title="Gli Stat Point sostituiscono gli EV: ogni punto aumenta direttamente la statistica prima della natura.">EV Champions ?</span><input id="damage-defender-sp" type="number" min="0" max="32" value="0"></label>
                        <label>Stadio<select id="damage-defense-stage" class="game-select">${this.stageOptions()}</select></label>
                    </div>
                    <label>SP PS <span class="damage-help" title="Stat Point assegnati ai PS, da 0 a 32.">?</span><input id="damage-hp-sp" type="number" min="0" max="32" value="0"></label>
                </section>

                <section class="damage-panel damage-conditions">
                    <h3>Condizioni</h3>
                    <label>Meteo
                        <select id="damage-weather" class="game-select">
                            <option value="none">Nessuno</option>
                            <option value="sun">Sole</option>
                            <option value="rain">Pioggia</option>
                        </select>
                    </label>
                    <label>Campo
                        <select id="damage-terrain" class="game-select">
                            <option value="none">Nessuno</option>
                            <option value="electric">Campo Elettrico</option>
                            <option value="grassy">Campo Erboso</option>
                            <option value="psychic">Campo Psichico</option>
                            <option value="misty">Campo Nebbioso</option>
                        </select>
                    </label>
                    <label class="damage-check"><input id="damage-doubles" type="checkbox" checked> Lotta in doppio</label>
                    <label class="damage-check"><input id="damage-spread" type="checkbox"> Mossa ad area su più bersagli</label>
                    <label class="damage-check"><input id="damage-critical" type="checkbox"> Brutto colpo</label>
                    <label class="damage-check"><input id="damage-burn" type="checkbox"> Attaccante scottato <span class="damage-help" title="Dimezza il danno fisico, salvo eccezioni come Dentistretti.">?</span></label>
                    <label class="damage-check"><input id="damage-screen" type="checkbox"> Riflesso / Schermoluce / Velaurora</label>
                </section>
            </div>

            <section id="damage-result" class="damage-result" aria-live="polite"></section>
            <div class="damage-disclaimer">
                <strong>Limiti della versione attuale</strong>
                <p>Sono applicati gli strumenti, le abilità e i campi più comuni che modificano direttamente il danno. Gli effetti non riconosciuti vengono ignorati. Non sono ancora modellati Teracristal, mosse multi-colpo o effetti condizionali specifici; le mosse note per usare formule speciali vengono segnalate. Le probabilità di KO non includono recupero, danni residui o precisione.</p>
            </div>`;

        this.attackerSelect = document.getElementById('damage-attacker');
        this.defenderSelect = document.getElementById('damage-defender');
        this.moveSelect = document.getElementById('damage-move');
        const defaults = window.pokemonList || [];
        this.attackerSelect.value = defaults[0]?.name || '';
        this.defenderSelect.value = defaults[1]?.name || defaults[0]?.name || '';

        this.attackerSelect.addEventListener('change', () => {
            this.renderPokemonPreview('attacker');
            this.populateAbilities('attacker');
            this.populateMoves();
            this.calculate();
        });
        this.attackerSelect.addEventListener('input', () => this.renderPokemonPreview('attacker'));
        this.defenderSelect.addEventListener('change', () => {
            this.renderPokemonPreview('defender');
            this.populateAbilities('defender');
            this.calculate();
        });
        this.defenderSelect.addEventListener('input', () => this.renderPokemonPreview('defender'));
        this.moveSelect.addEventListener('change', () => this.calculate());
        this.container.querySelectorAll('select:not(#damage-move), input:not(.damage-pokemon-search)').forEach(control => {
            control.addEventListener('input', () => this.calculate());
            control.addEventListener('change', () => this.calculate());
        });
        this.renderPokemonPreview('attacker');
        this.renderPokemonPreview('defender');
        this.populateAbilities('attacker');
        this.populateAbilities('defender');
        this.populateMoves();
        this.calculate();
    }

    populateMoves() {
        const learnset = window.learnsetsData?.[this.attackerSelect.value]?.moves || [];
        const learnedNames = new Set(learnset.map(entry => entry.name));
        const moves = Object.values(window.movesDb?.moves || {})
            .filter(move => move.inChampions && move.power > 0 && ['Physical', 'Special'].includes(move.category))
            .filter(move => !learnedNames.size || learnedNames.has(move.name))
            .sort((a, b) => (a.name_it || a.name).localeCompare(b.name_it || b.name, 'it'));
        this.moveSelect.innerHTML = moves.length
            ? moves.map(move =>
                `<option value="${escapeHtml(move.name)}">${escapeHtml(move.name_it || move.name)} · ${move.power}</option>`
            ).join('')
            : '<option value="">Nessuna mossa offensiva standard</option>';
        this.moveSelect.disabled = moves.length === 0;
    }

    calculate() {
        const attacker = this.getPokemon(this.attackerSelect.value);
        const defender = this.getPokemon(this.defenderSelect.value);
        const move = window.movesDb?.moves?.[this.moveSelect.value];
        const result = document.getElementById('damage-result');
        if (!attacker || !defender || !move) {
            result.innerHTML = '<p>Seleziona attaccante, difensore e mossa.</p>';
            return;
        }

        const keys = STAT_KEYS[move.category];
        const critical = document.getElementById('damage-critical').checked;
        const attackStage = Number(document.getElementById('damage-attack-stage').value);
        const defenseStage = Number(document.getElementById('damage-defense-stage').value);
        const attackBase = this.getStat(attacker, keys.attack);
        const defenseBase = this.getStat(defender, keys.defense);
        let attack = applyStatStage(calculateChampionStat(
            attackBase,
            document.getElementById('damage-attacker-sp').value,
            this.natureMultiplier(document.getElementById('damage-attacker-nature').value, keys.attack)
        ), critical ? Math.max(0, attackStage) : attackStage);
        let defense = applyStatStage(calculateChampionStat(
            defenseBase,
            document.getElementById('damage-defender-sp').value,
            this.natureMultiplier(document.getElementById('damage-defender-nature').value, keys.defense)
        ), critical ? Math.min(0, defenseStage) : defenseStage);
        const hp = calculateChampionStat(
            this.getStat(defender, 'hp'),
            document.getElementById('damage-hp-sp').value,
            1,
            true
        );

        const moveType = String(move.type || '').toLowerCase();
        const defenderTypes = (defender.types || []).map(type => type.toLowerCase());
        const effectiveness = getTypeEffectiveness(moveType, defenderTypes, window.typeChart);
        const weatherValue = document.getElementById('damage-weather').value;
        const terrain = document.getElementById('damage-terrain').value;
        const attackerAbility = document.getElementById('damage-attacker-ability').value;
        const defenderAbility = document.getElementById('damage-defender-ability').value;
        const attackerItem = document.getElementById('damage-attacker-item').value;
        const defenderItem = document.getElementById('damage-defender-item').value;
        const attackerGrounded = !(attacker.types || []).includes('Flying') && attackerAbility !== 'Levitate' && attackerItem !== 'Air Balloon';
        const defenderGrounded = !(defender.types || []).includes('Flying') && defenderAbility !== 'Levitate' && defenderItem !== 'Air Balloon';
        const modifiers = [];
        let weather = 'none';
        const powerModifiers = [];
        const finalModifiers = [];
        let stabMultiplier = attackerAbility === 'Adaptability' ? 2 : 1.5;

        if ((weatherValue === 'sun' && moveType === 'fire') || (weatherValue === 'rain' && moveType === 'water')) weather = 'boost';
        if ((weatherValue === 'sun' && moveType === 'water') || (weatherValue === 'rain' && moveType === 'fire')) weather = 'reduce';
        if (weather !== 'none') modifiers.push(`Meteo ×${weather === 'boost' ? '1,5' : '0,5'}`);

        if (attackerGrounded && terrain === moveType && ['electric', 'grassy', 'psychic'].includes(terrain)) {
            powerModifiers.push(1.3);
            modifiers.push('Campo ×1,3');
        }
        if (terrain === 'grassy' && defenderGrounded && ['Earthquake', 'Bulldoze', 'Magnitude'].includes(move.name)) {
            powerModifiers.push(0.5);
            modifiers.push('Campo Erboso ×0,5');
        }
        if (terrain === 'misty' && defenderGrounded && moveType === 'dragon') {
            finalModifiers.push(0.5);
            modifiers.push('Campo Nebbioso ×0,5');
        }
        if (attackerAbility === 'Technician' && move.power <= 60) {
            powerModifiers.push(1.5);
            modifiers.push('Tecnico ×1,5 potenza');
        }
        if (attackerAbility === 'Water Bubble' && moveType === 'water') {
            powerModifiers.push(2);
            modifiers.push('Bolladacqua ×2 potenza');
        }
        if (move.category === 'Physical' && ['Huge Power', 'Pure Power'].includes(attackerAbility)) {
            attack = pokeRound(attack * 2);
            modifiers.push(`${attackerAbility} ×2 Attacco`);
        }
        const burnInput = document.getElementById('damage-burn');
        burnInput.disabled = move.category !== 'Physical';
        const hasGuts = attackerAbility === 'Guts' && burnInput.checked && move.category === 'Physical';
        if (hasGuts) {
            attack = pokeRound(attack * 1.5);
            modifiers.push('Dentistretti ×1,5; penalità scottatura ignorata');
        } else if (attackerAbility === 'Water Bubble' && burnInput.checked) {
            modifiers.push('Bolladacqua: scottatura ignorata');
        }
        if (attackerAbility === 'Solar Power' && weatherValue === 'sun' && move.category === 'Special') {
            attack = pokeRound(attack * 1.5);
            modifiers.push('Solarpotere ×1,5 Attacco Speciale');
        }
        if (defenderAbility === 'Fur Coat' && move.category === 'Physical') {
            defense = pokeRound(defense * 2);
            modifiers.push('Foltopelo ×2 Difesa');
        }
        if (attackerAbility === 'Tinted Lens' && effectiveness > 0 && effectiveness < 1) {
            finalModifiers.push(2);
            modifiers.push('Lentifumé ×2');
        }
        if (attackerAbility === 'Sniper' && critical) {
            finalModifiers.push(1.5);
            modifiers.push('Cecchino ×1,5');
        }
        if (['Filter', 'Solid Rock', 'Prism Armor'].includes(defenderAbility) && effectiveness > 1) {
            finalModifiers.push(0.75);
            modifiers.push(`${defenderAbility} ×0,75`);
        }
        if (defenderAbility === 'Thick Fat' && ['fire', 'ice'].includes(moveType)) {
            finalModifiers.push(0.5);
            modifiers.push('Grassospesso ×0,5');
        }
        if (defenderAbility === 'Ice Scales' && move.category === 'Special') {
            finalModifiers.push(0.5);
            modifiers.push('Geloscaglie ×0,5');
        }
        if (['Multiscale', 'Shadow Shield'].includes(defenderAbility)) {
            finalModifiers.push(0.5);
            modifiers.push(`${defenderAbility} ×0,5 a PS pieni`);
        }
        if ((defenderAbility === 'Heatproof' && moveType === 'fire') ||
            (defenderAbility === 'Water Bubble' && moveType === 'fire')) {
            finalModifiers.push(0.5);
            modifiers.push(`${defenderAbility} ×0,5`);
        }
        if (attackerItem === 'Life Orb') {
            finalModifiers.push(1.3);
            modifiers.push('Assorbisfera ×1,3');
        }
        if (attackerItem === 'Expert Belt' && effectiveness > 1) {
            finalModifiers.push(1.2);
            modifiers.push('Abilcintura ×1,2');
        }
        if ((attackerItem === 'Muscle Band' && move.category === 'Physical') ||
            (attackerItem === 'Wise Glasses' && move.category === 'Special')) {
            powerModifiers.push(1.1);
            modifiers.push(`${attackerItem} ×1,1 potenza`);
        }
        if (TYPE_ITEMS[attackerItem] === moveType) {
            powerModifiers.push(1.2);
            modifiers.push(`${attackerItem} ×1,2 potenza`);
        }
        if ((RESIST_BERRIES[defenderItem] === moveType && effectiveness > 1) ||
            (defenderItem === 'Chilan Berry' && moveType === 'normal')) {
            finalModifiers.push(0.5);
            modifiers.push(`${defenderItem} ×0,5`);
        }

        const power = applyChainedModifier(move.power, powerModifiers);
        const doubles = document.getElementById('damage-doubles').checked;
        const spread = document.getElementById('damage-spread').checked && doubles;
        const hasStab = (attacker.types || []).some(type => type.toLowerCase() === moveType);
        const screen = document.getElementById('damage-screen').checked;
        const burned = burnInput.checked && move.category === 'Physical' && !hasGuts && attackerAbility !== 'Water Bubble';
        if (spread) modifiers.push('Mossa ad area ×0,75');
        if (critical) modifiers.push('Brutto colpo ×1,5');
        if (hasStab) modifiers.push(`STAB ×${String(stabMultiplier).replace('.', ',')}`);
        if (burned) modifiers.push('Scottatura ×0,5');
        if (screen && !critical) modifiers.push(`Schermo ×${doubles ? 'circa 0,67' : '0,5'}`);
        const rolls = calculateChampionDamage({
            power,
            attack,
            defense,
            spread,
            weather,
            critical,
            stab: hasStab,
            stabMultiplier,
            typeEffectiveness: effectiveness,
            burn: burned,
            screen,
            finalModifiers,
            doubles
        });

        const isSpecialCase = SPECIAL_CASES.has(move.name);
        const naturalSpread = SPREAD_TARGETS.has(move.target);
        document.getElementById('damage-spread').disabled = !doubles;
        document.getElementById('damage-move-info').innerHTML = `
            <span>${escapeHtml(move.type)} · ${escapeHtml(move.category)} · Potenza ${move.power}${power !== move.power ? ` → ${power}` : ''}</span>
            ${naturalSpread ? '<span>Può colpire più bersagli</span>' : ''}`;

        const minimum = Math.min(...rolls);
        const maximum = Math.max(...rolls);
        if (maximum === 0) {
            result.innerHTML = `
                <div class="damage-result-matchup">
                    <strong>${escapeHtml(attacker.name_it || attacker.name)}</strong>
                    <span>${escapeHtml(move.name_it || move.name)}</span>
                    <strong>${escapeHtml(defender.name_it || defender.name)}</strong>
                </div>
                <div class="damage-result-main">0 PS</div>
                <div class="damage-result-ko">Nessun effetto per immunità di tipo</div>
                ${isSpecialCase ? `<div class="damage-warning">⚠ ${escapeHtml(move.name_it || move.name)} usa anche una meccanica speciale non ancora modellata.</div>` : ''}`;
            return;
        }
        const minPercent = minimum / hp * 100;
        const maxPercent = maximum / hp * 100;
        const ohkoRolls = rolls.filter(damage => damage >= hp).length;
        const minHits = Math.ceil(hp / maximum);
        const maxHits = Math.ceil(hp / minimum);
        const koLabel = ohkoRolls === 16
            ? 'OHKO garantito'
            : ohkoRolls > 0
                ? `${(ohkoRolls / 16 * 100).toFixed(1)}% di probabilità di OHKO`
                : minHits === maxHits
                    ? `${minHits}HKO garantito senza recupero`
                    : `${minHits}–${maxHits} colpi per il KO senza recupero`;
        result.innerHTML = `
            <div class="damage-result-matchup">
                <strong>${escapeHtml(attacker.name_it || attacker.name)}</strong>
                <span>${escapeHtml(move.name_it || move.name)}</span>
                <strong>${escapeHtml(defender.name_it || defender.name)}</strong>
            </div>
            <div class="damage-result-main">${minimum}–${maximum} PS</div>
            <div class="damage-result-percent">${minPercent.toFixed(1)}%–${maxPercent.toFixed(1)}% dei ${hp} PS</div>
            <div class="damage-result-ko">${koLabel}</div>
            <div class="damage-result-details">Attacco: ${attack} · Difesa: ${defense} · Efficacia: ×${effectiveness}</div>
            ${modifiers.length ? `<div class="damage-applied-modifiers">${modifiers.map(modifier => `<span>${escapeHtml(modifier)}</span>`).join('')}</div>` : ''}
            ${isSpecialCase ? `<div class="damage-warning">⚠ ${escapeHtml(move.name_it || move.name)} può usare una formula o una potenza condizionale non ancora modellata: il risultato usa la potenza e le statistiche mostrate.</div>` : ''}`;
    }
}
