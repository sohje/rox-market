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
        // Предотвращаем открытие модалки при клике на редактируемую цену
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.editable')) {
                onClick(calcResult);
            }
        });

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
                    <div class="price-value editable"
                         data-id="${calcResult.resourceId}"
                         title="Нажмите, чтобы изменить">
                        ${this.formatNumber(calcResult.marketPrice)}
                    </div>
                </div>
                <div class="price-block">
                    <div class="price-label">Себестоимость</div>
                    <div class="price-value ${marginClass}">
                        ${hasRecipe ? this.formatNumber(calcResult.optimalCost) : '—'}
                    </div>
                </div>
                <div class="margin-block">
                    <span class="margin-label">Маржа:</span>
                    <span class="margin-value ${hasRecipe ? (calcResult.margin > 0 ? 'profit' : 'loss') : 'no-recipe'}">
                        ${hasRecipe
                            ? `${calcResult.margin > 0 ? '+' : ''}${this.formatNumber(calcResult.margin)} (${calcResult.marginPercent}%)`
                            : 'Нет рецепта'}
                    </span>
                </div>
            </div>
        `;

        return card;
    },

    renderDetailModal(calcResult, resourcesMap, recipesMap, prices) {
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
                    <div class="detail-price-label">После налога</div>
                    <div class="detail-price-value">${this.formatNumber(calcResult.marketPriceAfterTax)}</div>
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

        const allVariants = Calculator.generateAllVariants(
            calcResult.resourceId,
            prices,
            recipesMap,
            resourcesMap
        );

        if (allVariants.length > 0) {
            // Находим лучший вариант именно КРАФТА для отображения дерева по умолчанию
            const bestCraft = allVariants.find(v => v.decision === 'craft') || allVariants[0];

            html += `
                <div class="craft-tree">
                    <h3>${bestCraft.decision === 'craft' ? 'Рецепт крафта' : 'Оптимальный путь'}</h3>
                    ${this.renderCraftTree(bestCraft, 0)}
                </div>
            `;

            const purchaseList = Calculator.getFlatPurchaseList(bestCraft);
            const totalCost = purchaseList.reduce((sum, p) => sum + p.totalCost, 0);

            html += `
                <div class="purchase-list">
                    <h3>Список покупок для этого варианта</h3>
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

            if (allVariants.length > 1) {
                html += `
                    <div class="all-variants">
                        <h3>Все варианты получения (${allVariants.length})</h3>
                        <div class="variants-list">
                            ${allVariants.map((variant, idx) => this.renderVariant(variant, idx)).join('')}
                        </div>
                    </div>
                `;
            }
        } else {
            html += `<div class="no-recipe-msg">Базовый ресурс, рецепт отсутствует</div>`;
        }

        html += `
            <div class="price-history-section">
                <h3>История цен</h3>
                <div class="chart-container" style="position: relative; height:200px; width:100%">
                    <canvas id="priceChart"></canvas>
                </div>
            </div>
        `;

        return html;
    },

    initPriceChart(history) {
        const ctx = document.getElementById('priceChart').getContext('2d');
        if (!history || history.length === 0) {
            ctx.font = '14px Arial';
            ctx.fillStyle = '#aaa';
            ctx.textAlign = 'center';
            ctx.fillText('Нет данных истории', ctx.canvas.width / 2, ctx.canvas.height / 2);
            return;
        }

        const labels = history.map(h => h.date);
        const prices = history.map(h => h.price);

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Цена',
                    data: prices,
                    borderColor: '#e94560',
                    backgroundColor: 'rgba(233, 69, 96, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        grid: { color: '#334155' },
                        ticks: { color: '#aaa' }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#aaa' }
                    }
                }
            }
        });
    },

    renderVariant(variant, index) {
        const isOptimal = index === 0;
        const marginColor = variant.margin > 0 ? 'var(--profit)' : 'var(--loss)';

        let html = `
            <div class="variant-card ${isOptimal ? 'optimal' : ''}">
                <div class="variant-header">
                    <span class="variant-index">#${index + 1}</span>
                    ${isOptimal ? '<span class="optimal-badge">ОПТИМАЛЬНО</span>' : ''}
                    <span class="variant-cost">${this.formatNumber(variant.totalCost)}</span>
                    <span class="variant-margin" style="color: ${marginColor}">
                        ${variant.margin >= 0 ? '+' : ''}${this.formatNumber(variant.margin)} (${variant.marginPercent}%)
                    </span>
                </div>
                <div class="variant-tree">
                    ${this.renderCraftTree(variant, 0)}
                </div>
            </div>
        `;

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
