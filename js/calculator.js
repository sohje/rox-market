const Calculator = {
    memo: new Map(),

    clearCache() {
        this.memo.clear();
    },

    calculate(resourceId, prices, recipesMap, resourcesMap) {
        if (this.memo.has(resourceId)) {
            return this.memo.get(resourceId);
        }

        const resource = resourcesMap[resourceId];
        const marketPrice = prices[resourceId] || 0;
        const recipe = recipesMap[resourceId];

        if (!recipe) {
            const result = {
                resourceId,
                resource,
                marketPrice,
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
        const margin = marketPrice - optimalCost;
        const marginPercent = marketPrice > 0 ? (margin / marketPrice) * 100 : 0;

        const result = {
            resourceId,
            resource,
            marketPrice,
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
    }
};
