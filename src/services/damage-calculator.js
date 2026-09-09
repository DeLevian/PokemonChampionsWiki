export function pokeRound(value) {
    return value % 1 > 0.5 ? Math.ceil(value) : Math.floor(value);
}

export function calculateChampionStat(base, statPoints = 0, nature = 1, isHp = false) {
    const safeBase = Math.max(1, Number(base) || 1);
    const safePoints = Math.min(32, Math.max(0, Number(statPoints) || 0));
    if (isHp) return safeBase === 1 ? 1 : Math.floor((safeBase * 2 + 31) * 50 / 100) + 60 + safePoints;
    return Math.floor((Math.floor((safeBase * 2 + 31) * 50 / 100) + 5 + safePoints) * nature);
}

export function applyStatStage(stat, stage = 0) {
    const safeStage = Math.min(6, Math.max(-6, Number(stage) || 0));
    if (safeStage > 0) return Math.floor(stat * (2 + safeStage) / 2);
    if (safeStage < 0) return Math.floor(stat * 2 / (2 - safeStage));
    return stat;
}

export function chainModifiers(modifiers) {
    return (modifiers || []).reduce((combined, modifier) =>
        Math.round(combined * Math.round(Number(modifier) * 0x1000) / 0x1000), 0x1000
    );
}

export function applyChainedModifier(value, modifiers) {
    return pokeRound(value * chainModifiers(modifiers) / 0x1000);
}

export function calculateChampionDamage(options) {
    const level = 50;
    const power = Number(options.power);
    const attack = Math.max(1, Number(options.attack));
    const defense = Math.max(1, Number(options.defense));
    if (!Number.isFinite(power) || power <= 0) return [];

    let baseDamage = Math.floor(
        Math.floor(Math.floor((2 * level) / 5 + 2) * power * attack / defense) / 50 + 2
    );

    if (options.spread) baseDamage = pokeRound(baseDamage * 0xC00 / 0x1000);
    if (options.weather === 'boost') baseDamage = pokeRound(baseDamage * 0x1800 / 0x1000);
    if (options.weather === 'reduce') baseDamage = pokeRound(baseDamage * 0x800 / 0x1000);
    if (options.critical) baseDamage = Math.floor(baseDamage * 1.5);

    const stabMultiplier = options.stab ? Number(options.stabMultiplier || 1.5) : 1;
    const stabMod = Math.round(stabMultiplier * 0x1000);
    const typeEffectiveness = Number(options.typeEffectiveness ?? 1);
    if (typeEffectiveness === 0) return Array(16).fill(0);
    const screenMod = options.screen && !options.critical
        ? (options.doubles ? 0xAAC : 0x800)
        : 0x1000;
    const rolls = [];

    for (let random = 85; random <= 100; random += 1) {
        let damage = Math.floor(baseDamage * random / 100);
        damage = pokeRound(damage * stabMod / 0x1000);
        damage = Math.floor(damage * typeEffectiveness);
        if (options.burn) damage = Math.floor(damage / 2);
        damage = pokeRound(damage * screenMod / 0x1000);
        const finalMod = options.finalModifiers
            ? chainModifiers(options.finalModifiers)
            : Math.round(Number(options.finalModifier || 1) * 0x1000);
        damage = pokeRound(damage * finalMod / 0x1000);
        rolls.push(Math.max(1, damage));
    }
    return rolls;
}

export function getTypeEffectiveness(moveType, defenderTypes, chart) {
    return (defenderTypes || []).reduce((multiplier, type) =>
        multiplier * (chart?.[moveType]?.[type] ?? 1), 1
    );
}
