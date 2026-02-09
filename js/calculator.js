const Calculator = {
    memo: new Map(),
    taxRate: 0.10,

    setTaxRate(rate) {
        this.taxRate = rate;
        this.clearCache();
    },

    clearCache() {
        this.memo.clear();
    },

    calculate(resourceId, prices, recipesMap, resourcesMap) {
        if (this.memo.has(resourceId)) {
            return this.memo.get(resourceId);
        }

        const resource = resourcesMap[resourceId];
        const marketPrice = prices[resourceId] || 0;
        const marketPriceAfterTax = marketPrice * (1 - this.taxRate);
        const recipe = recipesMap[resourceId];

        if (!recipe) {
            const result = {
                resourceId,
                resource,
                marketPrice,
                marketPriceAfterTax,
                optimalCost: marketPrice,
                craftCost: null,
                decision: 'buy',
                margin: 0,
                marginPercent: 0,
                breakdown: null
            };
            this.memo.set(resourceId, result);
            return result;
        }

        let craftCost = 0;
        const breakdown = [];

        for (const ing of recipe.ingredients) {
            const sub = this.calculate(ing.id, prices, recipesMap, resourcesMap);
            const totalCost = sub.optimalCost * ing.quantity;
            craftCost += totalCost;

            breakdown.push({
                ...sub,
                quantity: ing.quantity,
                totalCost
            });
        }

        const decision = craftCost < marketPrice ? 'craft' : 'buy';
        const optimalCost = Math.min(marketPrice, craftCost);
        const margin = marketPriceAfterTax - optimalCost;
        const marginPercent = marketPriceAfterTax > 0 ? (margin / marketPriceAfterTax) * 100 : 0;

        const result = {
            resourceId,
            resource,
            marketPrice,
            marketPriceAfterTax,
            craftCost,
            optimalCost,
            decision,
            margin,
            marginPercent: marginPercent.toFixed(1),
            breakdown: breakdown // Сохраняем структуру всегда, если есть рецепт
        };

        this.memo.set(resourceId, result);
        return result;
    },

    getFlatPurchaseList(calcResult) {
        const purchases = {};

        const traverse = (node, multiplier = 1) => {
            if (node.decision === 'buy' || !node.breakdown) {
                const qty = (node.quantity || 1) * multiplier;
                const id = node.resourceId;
                if (!purchases[id]) {
                    purchases[id] = {
                        resource: node.resource,
                        quantity: 0,
                        unitCost: node.optimalCost
                    };
                }
                purchases[id].quantity += qty;
            } else if (node.breakdown) {
                for (const child of node.breakdown) {
                    traverse(child, multiplier);
                }
            }
        };

        traverse(calcResult);

        return Object.entries(purchases).map(([id, data]) => ({
            resourceId: id,
            resource: data.resource,
            quantity: data.quantity,
            unitCost: data.unitCost,
            totalCost: data.quantity * data.unitCost
        }));
    },

    generateAllVariants(resourceId, prices, recipesMap, resourcesMap) {
        const recipe = recipesMap[resourceId];
        if (!recipe) return [];

        const variants = [];
        const seenCosts = new Map(); // cost -> signature to keep it unique

        const buildVariant = (resId, decisions = {}) => {
            const resource = resourcesMap[resId];
            const marketPrice = prices[resId] || 0;
            const currentRecipe = recipesMap[resId];

            const decision = decisions[resId] || 'buy';

            if (decision === 'buy' || !currentRecipe) {
                return {
                    resourceId: resId,
                    resource,
                    cost: marketPrice,
                    decision: 'buy',
                    breakdown: null
                };
            }

            let craftCost = 0;
            const breakdown = [];

            for (const ing of currentRecipe.ingredients) {
                const sub = buildVariant(ing.id, decisions);
                const totalCost = sub.cost * ing.quantity;
                craftCost += totalCost;
                breakdown.push({
                    ...sub,
                    quantity: ing.quantity,
                    totalCost
                });
            }

            return {
                resourceId: resId,
                resource,
                cost: craftCost,
                decision: 'craft',
                breakdown
            };
        };

        const generateDecisionSets = (resId, visited = new Set()) => {
            const currentRecipe = recipesMap[resId];
            if (!currentRecipe || visited.has(resId)) return [{}];

            visited.add(resId);

            let ingredientSets = [{}];

            for (const ing of currentRecipe.ingredients) {
                const ingSets = generateDecisionSets(ing.id, new Set(visited));
                const nextSets = [];
                for (const base of ingredientSets) {
                    for (const s of ingSets) {
                        nextSets.push({...base, ...s});
                    }
                }
                ingredientSets = nextSets;
            }

            const results = [];
            // Вариант 1: Купить этот ингредиент
            for (const s of ingredientSets) results.push({...s});
            // Вариант 2: Крафтить этот ингредиент
            for (const s of ingredientSets) results.push({...s, [resId]: 'craft'});

            return results;
        };

        // Генерируем сеты, где корень ВСЕГДА 'craft' (чтобы не дублировать 'buy')
        let rootIngredientSets = [{}];
        for (const ing of recipe.ingredients) {
            const ingSets = generateDecisionSets(ing.id, new Set([resourceId]));
            const nextSets = [];
            for (const base of rootIngredientSets) {
                for (const s of ingSets) {
                    nextSets.push({...base, ...s});
                }
            }
            rootIngredientSets = nextSets;
        }

        const marketPriceAfterTax = (prices[resourceId] || 0) * (1 - this.taxRate);

        // Добавляем вариант "Просто купить"
        const buyOnly = buildVariant(resourceId, {}); // по умолчанию вернет buy
        variants.push({
            ...buyOnly,
            marketPrice: prices[resourceId] || 0,
            marketPriceAfterTax,
            margin: marketPriceAfterTax - buyOnly.cost,
            marginPercent: buyOnly.cost > 0 ? ((marketPriceAfterTax - buyOnly.cost) / marketPriceAfterTax * 100).toFixed(1) : 0,
            totalCost: buyOnly.cost
        });

        // Добавляем все варианты крафта
        for (const decisions of rootIngredientSets) {
            const variant = buildVariant(resourceId, {...decisions, [resourceId]: 'craft'});

            // Создаем уникальную подпись для дерева крафта, чтобы убрать дубликаты
            const signature = JSON.stringify(variant, (key, value) => {
                if (key === 'resource') return undefined; // исключаем большие объекты
                return value;
            });

            if ([...seenCosts.values()].includes(signature)) continue;
            seenCosts.set(variant.cost, signature);

            const margin = marketPriceAfterTax - variant.cost;
            const marginPercent = marketPriceAfterTax > 0
                ? ((margin / marketPriceAfterTax) * 100).toFixed(1)
                : 0;

            variants.push({
                ...variant,
                marketPrice: prices[resourceId] || 0,
                marketPriceAfterTax,
                margin,
                marginPercent,
                totalCost: variant.cost
            });
        }

        variants.sort((a, b) => b.margin - a.margin);
        return variants;
    }
};
