const LEVEL_COLORS = {
    1: '#e0e000',
    2: '#00c8ff',
    3: '#ff6699',
    4: '#ff00ff',
    5: '#00e5a0',
    6: '#ff9900',
    7: '#c8a2ff',
    8: '#00cccc'
};

const GardeningCalc = {
    calculate(resources, prices) {
        const gathering = resources.filter(r => r.type === 'gathering' && r.required_lvl);
        const grouped = {};

        for (const resource of gathering) {
            const lvl = resource.required_lvl;
            if (!grouped[lvl]) {
                grouped[lvl] = [];
            }

            const price = prices[resource.id] || 0;
            const stamina = resource.stamina || 1;

            const profitByTax = {};
            for (const tax of [5, 10, 15]) {
                const afterTax = price * (1 - tax / 100);
                profitByTax[tax] = afterTax / stamina;
            }

            grouped[lvl].push({
                resource,
                price,
                stamina,
                profitByTax
            });
        }

        // Sort each level by profit at 10% tax descending
        for (const lvl of Object.keys(grouped)) {
            grouped[lvl].sort((a, b) => b.profitByTax[10] - a.profitByTax[10]);
        }

        return grouped;
    },

    render(grouped, prices) {
        const levels = Object.keys(grouped).map(Number).sort((a, b) => a - b);

        if (levels.length === 0) {
            return '<p style="color: var(--text-secondary); text-align: center; padding: 40px;">Нет данных для отображения</p>';
        }

        let html = '';

        for (const lvl of levels) {
            const rows = grouped[lvl];
            const color = LEVEL_COLORS[lvl] || '#aaa';
            const bestProfit10 = Math.max(...rows.map(r => r.profitByTax[10]));

            html += `
                <div class="gardening-level-section">
                    <div class="gardening-level-header" style="border-left: 4px solid ${color};" data-level="${lvl}">
                        <span class="gardening-level-title">
                            <span class="gardening-level-badge" style="background: ${color};">Lv${lvl}</span>
                            Gardening Level ${lvl}
                        </span>
                        <span class="gardening-level-count">${rows.length} ресурсов</span>
                        <span class="gardening-level-toggle">▼</span>
                    </div>
                    <table class="gardening-table" data-level-table="${lvl}">
                        <thead>
                            <tr>
                                <th>Ресурс</th>
                                <th>Цена</th>
                                <th>Стамина</th>
                                <th>Профит/Стамина<br><span class="tax-label">5% налог</span></th>
                                <th>Профит/Стамина<br><span class="tax-label">10% налог</span></th>
                                <th>Профит/Стамина<br><span class="tax-label">15% налог</span></th>
                            </tr>
                        </thead>
                        <tbody>`;

            for (const row of rows) {
                const isBest = row.price > 0 && row.profitByTax[10] === bestProfit10;
                const rowClass = isBest ? 'best-row' : '';
                const icon = row.resource.image
                    ? `<img src="${row.resource.image}" alt="${row.resource.name}">`
                    : '';

                html += `
                            <tr class="${rowClass}">
                                <td>
                                    <span class="gardening-resource-name">
                                        ${icon}${row.resource.name}
                                    </span>
                                </td>
                                <td>
                                    <span class="editable gardening-price-edit" data-id="${row.resource.id}" title="Нажмите, чтобы изменить">
                                        ${row.price > 0 ? row.price.toLocaleString('ru-RU') : '—'}
                                    </span>
                                </td>
                                <td>${row.stamina}</td>
                                <td class="profit-cell ${row.profitByTax[5] > 0 ? 'positive' : ''}">${row.price > 0 ? row.profitByTax[5].toFixed(2) : '0.00'}</td>
                                <td class="profit-cell ${row.profitByTax[10] > 0 ? 'positive' : ''} ${isBest ? 'best' : ''}">${row.price > 0 ? row.profitByTax[10].toFixed(2) : '0.00'}</td>
                                <td class="profit-cell ${row.profitByTax[15] > 0 ? 'positive' : ''}">${row.price > 0 ? row.profitByTax[15].toFixed(2) : '0.00'}</td>
                            </tr>`;
            }

            html += `
                        </tbody>
                    </table>
                </div>`;
        }

        return html;
    },

    bindToggle(container) {
        container.querySelectorAll('.gardening-level-header').forEach(header => {
            header.addEventListener('click', () => {
                const lvl = header.dataset.level;
                const table = container.querySelector(`[data-level-table="${lvl}"]`);
                const toggle = header.querySelector('.gardening-level-toggle');

                if (table) {
                    table.classList.toggle('collapsed');
                    toggle.textContent = table.classList.contains('collapsed') ? '▶' : '▼';
                }
            });
        });
    }
};
