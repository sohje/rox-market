const COLOR_ORDER = ['white', 'blue', 'purple', 'gold'];
const SLOT_ORDER = ['weapon', 'armor', 'accessory'];

const CityEnchantsCalc = {
    data: null,
    selectedLevel: 1,
    expandedCities: {},
    searchQuery: '',
    weaponMode: '1h', // '1h' or '2h'

    setData(data) {
        this.data = data;
        if (data && data.cities.length > 0) {
            this.expandedCities[data.cities[0].id] = true;
        }
    },

    setLevel(level) {
        this.selectedLevel = level;
    },

    setSearch(query) {
        this.searchQuery = query.toLowerCase().trim();
    },

    getMaxLevel() {
        if (!this.data) return 10;

        let maxLevel = 1;
        for (const city of this.data.cities) {
            for (const lvlKey of Object.keys(city.levels)) {
                const lvl = parseInt(lvlKey);
                if (lvl > maxLevel) maxLevel = lvl;
            }
        }
        return Math.max(maxLevel, 10);
    },

    hasDataForLevel(level) {
        if (!this.data) return false;
        const lvlKey = String(level);
        return this.data.cities.some(city => city.levels[lvlKey]);
    },

    getCityDataForLevel(city, level) {
        return city.levels[String(level)] || null;
    },

    matchesSearch(enchantNames) {
        if (!this.searchQuery) return true;
        return enchantNames.some(name => name.toLowerCase().includes(this.searchQuery));
    },

    renderLevelSelector() {
        const maxLevel = this.getMaxLevel();
        let html = '<div class="ce-level-selector">';
        html += '<span class="ce-level-label">Enchant Level:</span>';
        html += '<div class="ce-level-pills">';

        for (let i = 1; i <= maxLevel; i++) {
            const hasData = this.hasDataForLevel(i);
            const isActive = i === this.selectedLevel;
            const classes = ['ce-level-pill'];
            if (isActive) classes.push('active');
            if (!hasData) classes.push('empty');

            html += `<button class="${classes.join(' ')}" data-level="${i}">${i}</button>`;
        }

        html += '</div>';

        // 1H/2H weapon toggle
        html += '<div class="ce-weapon-toggle">';
        html += `<button class="ce-weapon-btn${this.weaponMode === '1h' ? ' active' : ''}" data-weapon-mode="1h">1H</button>`;
        html += `<button class="ce-weapon-btn${this.weaponMode === '2h' ? ' active' : ''}" data-weapon-mode="2h">2H</button>`;
        html += '</div>';

        html += '</div>';
        return html;
    },

    renderSearch() {
        return `
            <div class="ce-search-wrapper">
                <input type="text"
                    id="ce-search"
                    class="ce-search-input"
                    placeholder="Поиск по стату (ATK, STR, Crit...)"
                    value="${this.searchQuery}">
            </div>
        `;
    },

    /**
     * Get weapon values for current mode from slot data.
     * Returns { colorValues } or null if no data for this mode.
     */
    getWeaponValues(slotData) {
        if (this.weaponMode === '2h') {
            return slotData.twohand || null;
        }
        return slotData.mainhand || null;
    },

    getWeaponOffhandValues(slotData) {
        if (this.weaponMode !== '1h') return null;
        return slotData.offhand || null;
    },

    renderSlotCard(slotKey, slotData, city) {
        const colors = this.data.colors;
        const slotLabel = this.data.slotLabels[slotKey];
        const slotIcon = this.data.slotIcons[slotKey];
        const enchantNames = city.enchants[slotKey];

        if (!enchantNames) return this.renderEmptySlot(slotKey);

        const isWeapon = slotKey === 'weapon';

        // For weapon, resolve values based on weapon mode
        let colorValues, offhandValues;
        if (isWeapon) {
            colorValues = this.getWeaponValues(slotData);
            offhandValues = this.getWeaponOffhandValues(slotData);

            if (!colorValues) {
                // No data for this weapon mode
                return this.renderNoWeaponModeSlot(slotKey);
            }
        } else {
            colorValues = slotData;
        }

        // Search filter on names
        if (this.searchQuery && !this.matchesSearch(enchantNames)) {
            return '';
        }

        let html = `<div class="ce-slot-card">`;
        html += `<div class="ce-slot-header">`;
        html += `<span class="ce-slot-icon">${slotIcon}</span>`;
        html += `<span class="ce-slot-title">${slotLabel}</span>`;
        if (isWeapon) {
            const modeLabel = this.weaponMode === '1h' ? 'Main Hand + OffHand' : 'Two-Hand';
            html += `<span class="ce-weapon-mode-badge">${modeLabel}</span>`;
        }
        html += `</div>`;
        html += `<div class="ce-slot-body">`;

        for (const colorKey of COLOR_ORDER) {
            const colorMeta = colors[colorKey];
            const values = colorValues[colorKey];
            if (!values || values.length === 0) continue;

            const offValues = offhandValues ? offhandValues[colorKey] : null;

            html += `<div class="ce-color-group">`;
            html += `<div class="ce-color-badge" style="background: ${colorMeta.hex}; color: ${colorKey === 'white' ? '#333' : '#fff'}">`;
            html += `${colorMeta.label}`;
            html += `</div>`;
            html += `<div class="ce-stat-list">`;

            for (let i = 0; i < enchantNames.length; i++) {
                const name = enchantNames[i];
                const value = values[i] || '';
                const offValue = offValues ? offValues[i] : null;

                const isHighlighted = this.searchQuery && name.toLowerCase().includes(this.searchQuery);
                const lineClass = isHighlighted ? 'ce-stat-line highlighted' : 'ce-stat-line';

                html += `<div class="${lineClass}">`;
                html += `<span class="ce-stat-names">${name}</span> `;
                html += `<span class="ce-stat-value">${value}</span>`;
                if (offValue) {
                    html += ` <span class="ce-offhand-value">${offValue}</span>`;
                }
                html += `</div>`;
            }

            html += `</div></div>`;
        }

        html += `</div></div>`;
        return html;
    },

    renderNoWeaponModeSlot(slotKey) {
        const slotLabel = this.data.slotLabels[slotKey];
        const slotIcon = this.data.slotIcons[slotKey];
        const modeLabel = this.weaponMode === '2h' ? '2H' : '1H';

        return `
            <div class="ce-slot-card ce-slot-empty">
                <div class="ce-slot-header">
                    <span class="ce-slot-icon">${slotIcon}</span>
                    <span class="ce-slot-title">${slotLabel}</span>
                    <span class="ce-weapon-mode-badge">${modeLabel}</span>
                </div>
                <div class="ce-slot-body">
                    <div class="ce-empty-slot-msg">Нет данных для ${modeLabel}</div>
                </div>
            </div>
        `;
    },

    renderCity(city) {
        const isExpanded = this.expandedCities[city.id] || false;
        const levelData = this.getCityDataForLevel(city, this.selectedLevel);
        const slotsAvailable = levelData ? Object.keys(levelData).length : 0;
        const toggleIcon = isExpanded ? '▼' : '▶';

        let html = `<div class="ce-city-section" data-city="${city.id}">`;

        html += `<div class="ce-city-header" data-city-toggle="${city.id}">`;
        html += `<span class="ce-city-toggle">${toggleIcon}</span>`;
        html += `<span class="ce-city-name">${city.name}</span>`;
        if (levelData) {
            html += `<span class="ce-city-slots-count">${slotsAvailable}/3 slots</span>`;
        } else {
            html += `<span class="ce-city-no-data">Нет данных для Lv${this.selectedLevel}</span>`;
        }
        html += `</div>`;

        if (isExpanded) {
            html += `<div class="ce-city-content">`;

            if (!levelData) {
                html += `<div class="ce-empty-state">Данные для уровня ${this.selectedLevel} в ${city.name} пока не добавлены</div>`;
            } else {
                html += `<div class="ce-slots-grid">`;

                for (const slotKey of SLOT_ORDER) {
                    if (levelData[slotKey]) {
                        html += this.renderSlotCard(slotKey, levelData[slotKey], city);
                    } else {
                        html += this.renderEmptySlot(slotKey);
                    }
                }

                html += `</div>`;
            }

            html += `</div>`;
        }

        html += `</div>`;
        return html;
    },

    renderEmptySlot(slotKey) {
        const slotLabel = this.data.slotLabels[slotKey];
        const slotIcon = this.data.slotIcons[slotKey];

        return `
            <div class="ce-slot-card ce-slot-empty">
                <div class="ce-slot-header">
                    <span class="ce-slot-icon">${slotIcon}</span>
                    <span class="ce-slot-title">${slotLabel}</span>
                </div>
                <div class="ce-slot-body">
                    <div class="ce-empty-slot-msg">Нет данных</div>
                </div>
            </div>
        `;
    },

    render() {
        if (!this.data) {
            return '<p style="color: var(--text-secondary); text-align: center; padding: 40px;">Загрузка данных...</p>';
        }

        let html = '';
        html += this.renderLevelSelector();
        html += this.renderSearch();

        for (const city of this.data.cities) {
            html += this.renderCity(city);
        }

        return html;
    },

    bindEvents(container) {
        // Level pills
        container.querySelectorAll('.ce-level-pill').forEach(pill => {
            pill.addEventListener('click', () => {
                this.selectedLevel = parseInt(pill.dataset.level);
                container.innerHTML = this.render();
                this.bindEvents(container);
            });
        });

        // Weapon mode toggle
        container.querySelectorAll('.ce-weapon-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.weaponMode = btn.dataset.weaponMode;
                container.innerHTML = this.render();
                this.bindEvents(container);
            });
        });

        // City collapse toggles
        container.querySelectorAll('.ce-city-header').forEach(header => {
            header.addEventListener('click', () => {
                const cityId = header.dataset.cityToggle;
                this.expandedCities[cityId] = !this.expandedCities[cityId];
                container.innerHTML = this.render();
                this.bindEvents(container);
            });
        });

        // Search
        const searchInput = container.querySelector('#ce-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.setSearch(e.target.value);
                // Re-render only city content, preserve level selector & search focus
                const cursorPos = searchInput.selectionStart;
                container.innerHTML = this.render();
                this.bindEvents(container);
                const newSearch = container.querySelector('#ce-search');
                if (newSearch) {
                    newSearch.focus();
                    newSearch.setSelectionRange(cursorPos, cursorPos);
                }
            });
        }
    }
};
