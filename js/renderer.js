const Renderer = {
    typeNames: {
        mining: 'Добыча',
        fishing: 'Рыболовство',
        gathering: 'Собирательство',
        crafting: 'Создание'
    },

    typeIcons: {
        mining: '⛏️',
        fishing: '🐟',
        gathering: '🌿',
        crafting: '⚒️'
    },

    renderIcon(resource, size = 40) {
        if (resource?.image) {
            return `<img src="${resource.image}" alt="${resource.name}"
                         style="width:${size}px;height:${size}px;object-fit:contain"
                         onerror="this.style.display='none';this.nextElementSibling.style.display='block'">
                    <span style="display:none;font-size:${size * 0.6}px">${this.typeIcons[resource.type] || '📦'}</span>`;
        }
        return `<span style="font-size:${size * 0.6}px">${this.typeIcons[resource?.type] || '📦'}</span>`;
    },

    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        }
        if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toLocaleString('ru-RU');
    },

    renderResourceCard(calcResult, onClick) {
        const card = document.createElement('div');
        card.className = 'resource-card';
        card.onclick = () => onClick(calcResult);

        const hasRecipe = calcResult.craftCost !== null;
        const marginClass = hasRecipe && calcResult.margin > 0 ? 'profit' : '';

        card.innerHTML = `
            <div class="resource-header">
                <div class="resource-icon">
                    ${this.renderIcon(calcResult.resource, 40)}
                </div>
                <div class="resource-info">
                    <div class="resource-name">${calcResult.resource.name}</div>
                    <span class="type-badge ${calcResult.resource.type}">
                        ${this.typeNames[calcResult.resource.type]}
                    </span>
                </div>
            </div>
            <div class="resource-prices">
                <div class="price-block">
                    <div class="price-label">Цена на рынке</div>
                    <div class="price-value">${this.formatNumber(calcResult.marketPrice)}</div>
                </div>
                <div class="price-block">
                    <div class="price-label">Себестоимость</div>
                    <div class="price-value ${marginClass}">
                        ${hasRecipe ? this.formatNumber(calcResult.optimalCost) : '—'}
                    </div>
                </div>
                <div class="margin-block">
                    <span class="margin-label">Маржа:</span>
                    <span class="margin-value ${hasRecipe ? (calcResult.margin > 0 ? 'profit' : '') : 'no-recipe'}">
                        ${hasRecipe
                            ? `+${this.formatNumber(calcResult.margin)} (${calcResult.marginPercent}%)`
                            : 'Нет рецепта'}
                    </span>
                </div>
            </div>
        `;

        return card;
    },

    renderDetailModal(calcResult, resourcesMap) {
        const hasRecipe = calcResult.craftCost !== null;

        let html = `
            <div class="detail-header">
                <div class="detail-icon">
                    ${this.renderIcon(calcResult.resource, 64)}
                </div>
                <div>
                    <div class="detail-title">${calcResult.resource.name}</div>
                    <span class="type-badge ${calcResult.resource.type}">
                        ${this.typeNames[calcResult.resource.type]}
                    </span>
                </div>
            </div>

            <div class="detail-prices">
                <div class="detail-price-block">
                    <div class="detail-price-label">Цена на рынке</div>
                    <div class="detail-price-value">${this.formatNumber(calcResult.marketPrice)}</div>
                </div>
                <div class="detail-price-block">
                    <div class="detail-price-label">Себестоимость</div>
                    <div class="detail-price-value" style="color: var(--profit)">
                        ${hasRecipe ? this.formatNumber(calcResult.optimalCost) : '—'}
                    </div>
                </div>
                <div class="detail-price-block">
                    <div class="detail-price-label">Маржа</div>
                    <div class="detail-price-value" style="color: ${calcResult.margin > 0 ? 'var(--profit)' : 'var(--text-secondary)'}">
                        ${hasRecipe ? `${calcResult.marginPercent}%` : '—'}
                    </div>
                </div>
            </div>
        `;

        if (hasRecipe && calcResult.breakdown) {
            html += `
                <div class="craft-tree">
                    <h3>Дерево крафта (оптимальный путь)</h3>
                    ${this.renderCraftTree(calcResult, 0)}
                </div>
            `;

            const purchaseList = Calculator.getFlatPurchaseList(calcResult);
            const totalCost = purchaseList.reduce((sum, p) => sum + p.totalCost, 0);

            html += `
                <div class="purchase-list">
                    <h3>Список покупок</h3>
                    ${purchaseList.map(p => `
                        <div class="purchase-item">
                            <span class="purchase-item-icon">${this.renderIcon(p.resource, 24)}</span>
                            <span>${p.resource?.name || p.resourceId}</span>
                            <span>× ${p.quantity}</span>
                            <span>${this.formatNumber(p.totalCost)}</span>
                        </div>
                    `).join('')}
                    <div class="purchase-total">
                        <span>Итого:</span>
                        <span style="color: var(--profit)">${this.formatNumber(totalCost)}</span>
                    </div>
                </div>
            `;
        } else if (!hasRecipe) {
            html += `<div class="no-recipe-msg">Базовый ресурс, рецепт отсутствует</div>`;
        }

        return html;
    },

    renderCraftTree(node, depth) {
        const indent = depth > 0;
        let html = '';

        if (node.breakdown) {
            html += `<div class="${indent ? 'tree-node' : ''}">`;
            for (const child of node.breakdown) {
                const decisionClass = child.decision;
                const decisionText = child.decision === 'buy' ? 'КУПИТЬ' : 'КРАФТ';

                html += `
                    <div class="tree-item">
                        <div class="tree-item-icon">${this.renderIcon(child.resource, 24)}</div>
                        <span class="tree-item-name">${child.resource?.name || child.resourceId}</span>
                        <span class="tree-item-qty">× ${child.quantity}</span>
                        <span class="tree-item-decision ${decisionClass}">${decisionText}</span>
                        <span class="tree-item-cost">${this.formatNumber(child.totalCost)}</span>
                    </div>
                `;

                if (child.breakdown) {
                    html += this.renderCraftTree(child, depth + 1);
                }
            }
            html += `</div>`;
        }

        return html;
    }
};
