// How many lower-tier items you get when decomposing one higher-tier item
const DECOMPOSE_OUTPUT = 2;

const MiningCalc = {
    /**
     * Finds single-ingredient recipe where `resourceId` is the ingredient (merge up: 3→1)
     * Returns { outputId, quantity } or null
     */
    findMergeRecipe(resourceId, recipes) {
        for (const recipe of recipes) {
            if (
                recipe.ingredients.length === 1 &&
                recipe.ingredients[0].id === resourceId
            ) {
                return { outputId: recipe.output, quantity: recipe.ingredients[0].quantity };
            }
        }
        return null;
    },

    /**
     * Finds single-ingredient recipe where `resourceId` is the output (decompose down: 1→2)
     * Returns { inputId, quantity } or null
     */
    findDecomposeRecipe(resourceId, recipes) {
        const recipe = recipes.find(
            r => r.output === resourceId && r.ingredients.length === 1
        );
        if (!recipe) return null;
        return { inputId: recipe.ingredients[0].id, quantity: recipe.ingredients[0].quantity };
    },

    /**
     * Evaluates the best strategy for a mined resource given its quantity.
     * Returns: 'sell' | 'merge' | 'decompose'
     * Along with profit comparison data.
     */
    evaluateStrategy(resourceId, quantity, prices, recipes, resourcesMap) {
        const price = prices[resourceId] || 0;

        const sellProfit = quantity * price;

        const mergeRecipe = this.findMergeRecipe(resourceId, recipes);
        const decomposeRecipe = this.findDecomposeRecipe(resourceId, recipes);

        let mergeData = null;
        let decomposeData = null;

        // Check merge: do we have enough to merge and is the output worth more?
        if (mergeRecipe) {
            const outputResource = resourcesMap[mergeRecipe.outputId];
            // Only recommend merge if output is also a mining resource
            if (outputResource && outputResource.type === 'mining') {
                const outputPrice = prices[mergeRecipe.outputId] || 0;
                const mergedCount = Math.floor(quantity / mergeRecipe.quantity);
                const remainder = quantity % mergeRecipe.quantity;
                if (mergedCount > 0) {
                    const mergedProfit = mergedCount * outputPrice + remainder * price;
                    mergeData = {
                        outputId: mergeRecipe.outputId,
                        outputName: outputResource.name,
                        mergedCount,
                        remainder,
                        profit: mergedProfit,
                        inputQuantity: mergeRecipe.quantity
                    };
                }
            }
        }

        // Check decompose: if someone put this resource as output in a single-ingredient recipe,
        // its input is the lower-tier resource. We can "decompose" this item into DECOMPOSE_OUTPUT
        // lower-tier items.
        if (decomposeRecipe) {
            const inputResource = resourcesMap[decomposeRecipe.inputId];
            if (inputResource && inputResource.type === 'mining') {
                const inputPrice = prices[decomposeRecipe.inputId] || 0;
                const decomposedProfit = quantity * DECOMPOSE_OUTPUT * inputPrice;
                decomposeData = {
                    inputId: decomposeRecipe.inputId,
                    inputName: inputResource.name,
                    decomposedCount: quantity * DECOMPOSE_OUTPUT,
                    profit: decomposedProfit
                };
            }
        }

        // Determine best strategy
        let bestStrategy = 'sell';
        let bestProfit = sellProfit;

        if (mergeData && mergeData.profit > bestProfit) {
            bestStrategy = 'merge';
            bestProfit = mergeData.profit;
        }
        if (decomposeData && decomposeData.profit > bestProfit) {
            bestStrategy = 'decompose';
            bestProfit = decomposeData.profit;
        }

        return { bestStrategy, sellProfit, mergeData, decomposeData };
    },

    /**
         * Compute profit values for a given price and quantity at each tax rate.
         */
    computeProfitByTax(price, quantity) {
        const result = {};
        for (const tax of [5, 10, 15]) {
            result[tax] = quantity * price * (1 - tax / 100);
        }
        return result;
    },

    /**
     * Derive a group key for a mining resource.
     * Uses subtype when available, otherwise strips trailing _N from id.
     */
    getGroupKey(resource) {
        if (resource.subtype) return resource.subtype;
        return resource.id.replace(/_\d+$/, '');
    },

    /**
     * Human-readable group label from a group key.
     */
    formatGroupLabel(key) {
        return key
            .split('_')
            .map(w => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ');
    },

    /**
     * Group and sort mining resources: by group key order of first appearance,
     * then by tier within each group.
     */
    groupResources(miningResources) {
        const groups = new Map();
        for (const r of miningResources) {
            const key = this.getGroupKey(r);
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key).push(r);
        }
        // Sort within each group by tier (nulls last)
        for (const items of groups.values()) {
            items.sort((a, b) => (a.tier ?? 999) - (b.tier ?? 999));
        }
        return groups;
    },

    render(resources, prices, recipes, resourcesMap, stamina) {
        const miningResources = resources.filter(r => r.type === 'mining');

        if (miningResources.length === 0) {
            return '<p style="color: var(--text-secondary); text-align: center; padding: 40px;">Нет ресурсов для отображения</p>';
        }

        const groups = this.groupResources(miningResources);

        let html = `
            <div class="mining-controls">
                <label class="mining-stamina-label">
                    <span>⚡ Стамина потрачено:</span>
                    <input type="number" id="mining-stamina" class="mining-stamina-input" value="${stamina}" min="1" max="99999" placeholder="100">
                </label>
            </div>
        `;

        html += `
            <div class="mining-table-wrapper">
                <table class="mining-table">
                    <thead>
                        <tr>
                            <th class="col-icon"></th>
                            <th class="col-name">Ресурс</th>
                            <th class="col-price">Цена</th>
                            <th class="col-qty">Добыто</th>
                            <th class="col-profit">Профит<br><span class="tax-label">5% налог</span></th>
                            <th class="col-profit">Профит<br><span class="tax-label">10% налог</span></th>
                            <th class="col-profit">Профит<br><span class="tax-label">15% налог</span></th>
                            <th class="col-hint">Рекомендация</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        let isFirst = true;
        for (const [key, items] of groups) {
            const label = this.formatGroupLabel(key);
            html += `
                <tr class="mining-group-header${isFirst ? ' first' : ''}">
                    <td colspan="8"><span class="mining-group-label">${label}</span></td>
                </tr>
            `;
            isFirst = false;
            for (const resource of items) {
                const price = prices[resource.id] || 0;
                html += this.renderRow(resource, price, 0, prices, recipes, resourcesMap);
            }
        }

        html += `
                    </tbody>
                </table>
            </div>
        `;

        html += this.renderSummary(miningResources, prices, stamina);

        return html;
    },

    renderRow(resource, price, qty, prices, recipes, resourcesMap) {
        const profitByTax = this.computeProfitByTax(price, qty);
        const strategy = qty > 0
            ? this.evaluateStrategy(resource.id, qty, prices, recipes, resourcesMap)
            : null;

        const icon = resource.image
            ? `<img src="${resource.image}" alt="${resource.name}">`
            : '⛏';

        const strategyHtml = strategy ? this.renderStrategy(strategy) : '<span class="mining-hint-empty">—</span>';

        return `
            <tr class="mining-row" data-id="${resource.id}">
                <td class="col-icon"><span class="mining-resource-icon">${icon}</span></td>
                <td class="col-name"><span class="mining-resource-name">${resource.name}</span></td>
                <td class="col-price">
                    <span class="editable mining-price-edit" data-id="${resource.id}" title="Нажмите, чтобы изменить">
                        ${price > 0 ? price.toLocaleString('ru-RU') : '—'}
                    </span>
                </td>
                <td class="col-qty">
                    <input type="number"
                        class="mining-qty-input"
                        data-id="${resource.id}"
                        value="${qty > 0 ? qty : ''}"
                        min="0"
                        max="99999"
                        placeholder="0">
                </td>
                <td class="col-profit profit-cell ${profitByTax[5] > 0 ? 'positive' : ''}">
                    ${qty > 0 && price > 0 ? Math.round(profitByTax[5]).toLocaleString('ru-RU') : '0'}
                </td>
                <td class="col-profit profit-cell ${profitByTax[10] > 0 ? 'positive' : ''}">
                    ${qty > 0 && price > 0 ? Math.round(profitByTax[10]).toLocaleString('ru-RU') : '0'}
                </td>
                <td class="col-profit profit-cell ${profitByTax[15] > 0 ? 'positive' : ''}">
                    ${qty > 0 && price > 0 ? Math.round(profitByTax[15]).toLocaleString('ru-RU') : '0'}
                </td>
                <td class="col-hint">${strategyHtml}</td>
            </tr>
        `;
    },

    renderStrategy(strategy) {
        if (strategy.bestStrategy === 'sell') {
            return `<span class="mining-hint mining-hint-sell">✅ Продать</span>`;
        }
        if (strategy.bestStrategy === 'merge' && strategy.mergeData) {
            const d = strategy.mergeData;
            return `<span class="mining-hint mining-hint-merge" title="Собрать ${d.inputQuantity}→1 в ${d.outputName}">
                🔼 Собрать в ${d.outputName}
            </span>`;
        }
        if (strategy.bestStrategy === 'decompose' && strategy.decomposeData) {
            const d = strategy.decomposeData;
            return `<span class="mining-hint mining-hint-decompose" title="Разобрать 1→${DECOMPOSE_OUTPUT} в ${d.inputName}">
                🔽 Разобрать в ${d.inputName}
            </span>`;
        }
        return '<span class="mining-hint-empty">—</span>';
    },

    renderSummary(miningResources, prices, stamina) {
        return `
            <div class="mining-summary" id="mining-summary">
                <div class="mining-summary-title">📊 Итоговая статистика</div>
                <div class="mining-summary-grid">
                    <div class="mining-summary-block">
                        <div class="mining-summary-label">Общий профит<br><span class="tax-label">5% налог</span></div>
                        <div class="mining-summary-value" id="summary-profit-5">0</div>
                    </div>
                    <div class="mining-summary-block">
                        <div class="mining-summary-label">Общий профит<br><span class="tax-label">10% налог</span></div>
                        <div class="mining-summary-value" id="summary-profit-10">0</div>
                    </div>
                    <div class="mining-summary-block">
                        <div class="mining-summary-label">Общий профит<br><span class="tax-label">15% налог</span></div>
                        <div class="mining-summary-value" id="summary-profit-15">0</div>
                    </div>
                    <div class="mining-summary-block">
                        <div class="mining-summary-label">Профит/Стамина<br><span class="tax-label">5% налог</span></div>
                        <div class="mining-summary-value" id="summary-per-stam-5">0</div>
                    </div>
                    <div class="mining-summary-block">
                        <div class="mining-summary-label">Профит/Стамина<br><span class="tax-label">10% налог</span></div>
                        <div class="mining-summary-value" id="summary-per-stam-10">0</div>
                    </div>
                    <div class="mining-summary-block">
                        <div class="mining-summary-label">Профит/Стамина<br><span class="tax-label">15% налог</span></div>
                        <div class="mining-summary-value" id="summary-per-stam-15">0</div>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Recomputes all row profits and summary from current DOM state.
     * Called whenever qty or price changes.
     */
    updateCalculations(container, prices, recipes, resourcesMap) {
        const staminaInput = container.querySelector('#mining-stamina');
        const stamina = parseInt(staminaInput?.value) || 1;

        let totals = { 5: 0, 10: 0, 15: 0 };

        container.querySelectorAll('.mining-row').forEach(row => {
            const resourceId = row.dataset.id;
            const qtyInput = row.querySelector('.mining-qty-input');
            const qty = parseInt(qtyInput?.value) || 0;
            const price = prices[resourceId] || 0;

            const profitByTax = this.computeProfitByTax(price, qty);

            for (const tax of [5, 10, 15]) {
                totals[tax] += profitByTax[tax];
            }

            // Update profit cells
            const cells = row.querySelectorAll('.col-profit');
            const taxRates = [5, 10, 15];
            cells.forEach((cell, i) => {
                const tax = taxRates[i];
                const val = profitByTax[tax];
                cell.textContent = qty > 0 && price > 0 ? Math.round(val).toLocaleString('ru-RU') : '0';
                cell.className = `col-profit profit-cell${val > 0 ? ' positive' : ''}`;
            });

            // Update recommendation
            const hintCell = row.querySelector('.col-hint');
            if (hintCell) {
                if (qty > 0 && price > 0) {
                    const strategy = this.evaluateStrategy(resourceId, qty, prices, recipes, resourcesMap);
                    hintCell.innerHTML = this.renderStrategy(strategy);
                } else {
                    hintCell.innerHTML = '<span class="mining-hint-empty">—</span>';
                }
            }
        });

        // Update summary
        for (const tax of [5, 10, 15]) {
            const totalEl = container.querySelector(`#summary-profit-${tax}`);
            const perStamEl = container.querySelector(`#summary-per-stam-${tax}`);
            if (totalEl) totalEl.textContent = Math.round(totals[tax]).toLocaleString('ru-RU');
            if (perStamEl) perStamEl.textContent = (totals[tax] / stamina).toFixed(1);
        }
    }
};
