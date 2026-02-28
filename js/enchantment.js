const XP_TABLE = {
    1: 10,
    2: 30,
    3: 60,
    4: 100,
    5: 150,
    6: 250,
    7: 400,
    8: 600,
    9: 1000
};

const ENCHANT_STONES = [
    { id: 'sharpening_enchantment_stone', xp: 1, perAttempt: 2 },
    { id: 'toughening_enchantment_stone', xp: 1, perAttempt: 2 },
    { id: 'secret_enchantment_stone', xp: 1, perAttempt: 2 },
    { id: 'blazing_enchantment_stone', xp: 2, perAttempt: 2 },
    { id: 'hardening_enchantment_stone', xp: 2, perAttempt: 2 },
    { id: 'gold_enchantment_stone', xp: 2, perAttempt: 2 },
    { id: 'tidal_current_enchantment_stone', xp: 4, perAttempt: 2 },
    { id: 'crystallize_enchantment_stone', xp: 4, perAttempt: 2 },
    { id: 'glowing_star_enchantment_stone', xp: 4, perAttempt: 2 },
    { id: 'muspellium_1', xp: 1, perAttempt: 30 },
];

const EnchantmentCalc = {
    calculate(slots, prices, recipesMap, resourcesMap) {
        let totalXP = 0;

        for (const slot of slots) {
            if (!slot.enabled) continue;
            for (let lvl = slot.from; lvl < slot.to; lvl++) {
                totalXP += XP_TABLE[lvl] || 0;
            }
        }

        if (totalXP === 0) return null;

        const rows = [];

        for (const stone of ENCHANT_STONES) {
            const calc = Calculator.calculate(stone.id, prices, recipesMap, resourcesMap);
            const attempts = Math.ceil(totalXP / stone.xp);
            const stonesNeeded = attempts * stone.perAttempt;

            const marketPrice = calc.marketPrice;
            const craftCost = calc.craftCost;
            const optimalCost = calc.optimalCost;

            rows.push({
                stoneId: stone.id,
                resource: calc.resource,
                xpPerAttempt: stone.xp,
                perAttempt: stone.perAttempt,
                stonesNeeded,
                buyCost: marketPrice * stonesNeeded,
                craftCost: craftCost !== null ? craftCost * stonesNeeded : null,
                bestCost: optimalCost * stonesNeeded,
                unitBuy: marketPrice,
                unitCraft: craftCost,
                unitBest: optimalCost,
                decision: calc.decision
            });
        }

        rows.sort((a, b) => a.bestCost - b.bestCost);

        return { totalXP, rows };
    },

    render(result) {
        if (!result) {
            return '<p style="color: var(--text-secondary); text-align: center; padding: 40px;">Выберите хотя бы один слот для расчёта</p>';
        }

        const minBest = result.rows[0].bestCost;

        let html = `
            <div class="enchant-summary">
                Всего очков опыта: <strong>${result.totalXP.toLocaleString('ru-RU')}</strong>
            </div>
            <table class="enchant-table">
                <thead>
                    <tr>
                        <th>Камень</th>
                        <th>XP/попытка</th>
                        <th>Камней</th>
                        <th>Покупка</th>
                        <th>Крафт</th>
                        <th>Лучшая цена</th>
                    </tr>
                </thead>
                <tbody>
        `;

        for (const row of result.rows) {
            const isBest = row.bestCost === minBest;
            const rowClass = isBest ? 'best-row' : '';
            const bestClass = isBest ? 'best' : '';
            const name = row.resource?.name || row.stoneId;
            const icon = row.resource?.image
                ? `<img src="${row.resource.image}" alt="${name}">`
                : '';

            html += `
                <tr class="${rowClass}">
                    <td>
                        <span class="stone-name">${icon}${name}</span>
                        <div style="font-size: 0.75rem; color: var(--text-secondary); margin-left: 36px;">
                            ${row.perAttempt} шт. на попытку
                        </div>
                    </td>
                    <td>${row.xpPerAttempt}</td>
                    <td>${row.stonesNeeded.toLocaleString('ru-RU')}</td>
                    <td>${row.buyCost.toLocaleString('ru-RU')}</td>
                    <td>${row.craftCost !== null ? row.craftCost.toLocaleString('ru-RU') : '—'}</td>
                    <td class="${bestClass}">${row.bestCost.toLocaleString('ru-RU')}</td>
                </tr>
            `;
        }

        html += '</tbody></table>';
        return html;
    }
};
