import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../src/services/damage-calculator.js', import.meta.url), 'utf8');
const calculator = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const {
    applyChainedModifier,
    applyStatStage,
    calculateChampionDamage,
    calculateChampionStat,
    getTypeEffectiveness,
    pokeRound
} = calculator;

const baseOptions = {
    power: 100,
    attack: 120,
    defense: 120,
    spread: false,
    weather: 'none',
    critical: false,
    stab: false,
    typeEffectiveness: 1,
    burn: false,
    screen: false,
    doubles: true
};

test('calcola le statistiche Champions a livello 50', () => {
    assert.equal(calculateChampionStat(100, 0, 1, true), 175);
    assert.equal(calculateChampionStat(100, 32, 1, true), 207);
    assert.equal(calculateChampionStat(100, 0, 1), 120);
    assert.equal(calculateChampionStat(100, 32, 1.1), 167);
    assert.equal(calculateChampionStat(1, 32, 1, true), 1);
});

test('applica stadi e arrotondamento Game Freak', () => {
    assert.equal(applyStatStage(120, 2), 240);
    assert.equal(applyStatStage(120, -2), 60);
    assert.equal(pokeRound(58.5), 58);
    assert.equal(pokeRound(58.51), 59);
});

test('produce i 16 roll casuali dal 85 al 100', () => {
    const rolls = calculateChampionDamage(baseOptions);
    assert.equal(rolls.length, 16);
    assert.equal(rolls[0], 39);
    assert.equal(rolls.at(-1), 46);
});

test('applica STAB, area, meteo, critico e scottatura nell’ordine previsto', () => {
    assert.deepEqual(
        [calculateChampionDamage({ ...baseOptions, stab: true })[0], calculateChampionDamage({ ...baseOptions, stab: true }).at(-1)],
        [58, 69]
    );
    assert.deepEqual(
        [calculateChampionDamage({ ...baseOptions, spread: true })[0], calculateChampionDamage({ ...baseOptions, spread: true }).at(-1)],
        [28, 34]
    );
    assert.deepEqual(
        [calculateChampionDamage({ ...baseOptions, weather: 'boost' })[0], calculateChampionDamage({ ...baseOptions, weather: 'boost' }).at(-1)],
        [58, 69]
    );
    assert.deepEqual(
        [calculateChampionDamage({ ...baseOptions, critical: true })[0], calculateChampionDamage({ ...baseOptions, critical: true }).at(-1)],
        [58, 69]
    );
    assert.deepEqual(
        [calculateChampionDamage({ ...baseOptions, burn: true })[0], calculateChampionDamage({ ...baseOptions, burn: true }).at(-1)],
        [19, 23]
    );
});

test('combina i modificatori fissi con gli arrotondamenti intermedi', () => {
    assert.equal(applyChainedModifier(60, [1.3, 1.5]), 117);
});

test('gestisce STAB personalizzato e modificatori finali di abilità o strumenti', () => {
    const adaptability = calculateChampionDamage({ ...baseOptions, stab: true, stabMultiplier: 2 });
    assert.deepEqual([adaptability[0], adaptability.at(-1)], [78, 92]);
    const lifeOrb = calculateChampionDamage({ ...baseOptions, finalModifiers: [1.3] });
    assert.deepEqual([lifeOrb[0], lifeOrb.at(-1)], [51, 60]);
});

test('gestisce schermi e immunità', () => {
    const screenRolls = calculateChampionDamage({ ...baseOptions, screen: true });
    assert.deepEqual([screenRolls[0], screenRolls.at(-1)], [26, 31]);
    assert.deepEqual(
        calculateChampionDamage({ ...baseOptions, typeEffectiveness: 0 }),
        Array(16).fill(0)
    );
    assert.deepEqual(
        [calculateChampionDamage({ ...baseOptions, critical: true, screen: true })[0], calculateChampionDamage({ ...baseOptions, critical: true, screen: true }).at(-1)],
        [58, 69]
    );
});

test('combina correttamente i tipi del difensore', () => {
    const chart = { fire: { grass: 2, steel: 2, water: 0.5 } };
    assert.equal(getTypeEffectiveness('fire', ['grass', 'steel'], chart), 4);
    assert.equal(getTypeEffectiveness('fire', ['water'], chart), 0.5);
});
