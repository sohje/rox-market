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
            breakdown: decision === 'craft' ? breakdown : null
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
        const variants = [];
        const seen = new Set();

        const buildVariant = (resId, decisions = {}) => {
            const resource = resourcesMap[resId];
            const marketPrice = prices[resId] || 0;
            const recipe = recipesMap[resId];

            if (!recipe) {
                return {
                    resourceId: resId,
                    resource,
                    cost: marketPrice,
                    decision: 'buy',
                    breakdown: null
                };
            }

            const decision = decisions[resId] || 'buy';

            if (decision === 'buy') {
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

            for (const ing of recipe.ingredients) {
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
            if (visited.has(resId)) return [{}];
            visited.add(resId);

            const recipe = recipesMap[resId];
            if (!recipe) return [{}];

            let allSets = [{}];

            for (const ing of recipe.ingredients) {
                const ingSets = generateDecisionSets(ing.id, new Set(visited));
                const newSets = [];

                for (const baseSet of allSets) {
                    for (const ingSet of ingSets) {
                        newSets.push({...baseSet, ...ingSet});
                    }
                }
                allSets = newSets;
            }

            const withBuy = allSets.map(s => ({...s}));
            const withCraft = allSets.map(s => ({...s, [resId]: 'craft'}));

            return [...withBuy, ...withCraft];
        };

        const decisionSets = generateDecisionSets(resourceId);
        const marketPriceAfterTax = (prices[resourceId] || 0) * (1 - this.taxRate);

        for (const decisions of decisionSets) {
            const variant = buildVariant(resourceId, decisions);
            const margin = marketPriceAfterTax - variant.cost;
            const marginPercent = marketPriceAfterTax > 0
                ? ((margin / marketPriceAfterTax) * 100).toFixed(1)
                : 0;

            const signature = JSON.stringify(decisions);
            if (seen.has(signature)) continue;
            seen.add(signature);

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
