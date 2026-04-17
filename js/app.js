const App = {
    resources: [],
    recipes: [],
    prices: {},
    resourcesMap: {},
    recipesMap: {},
    calculations: [],
    currentView: 'market',

    async init() {
        await this.loadData();
        this.buildMaps();
        this.calculateAll();
        this.render();
        this.bindEvents();
    },

    switchView(viewName) {
        this.currentView = viewName;

        document.getElementById('view-market').classList.toggle('hidden', viewName !== 'market');
        document.getElementById('view-enchant').classList.toggle('hidden', viewName !== 'enchant');
        document.getElementById('view-city-enchants').classList.toggle('hidden', viewName !== 'city-enchants');
        document.getElementById('view-gardening').classList.toggle('hidden', viewName !== 'gardening');
        document.getElementById('view-mining').classList.toggle('hidden', viewName !== 'mining');
        document.getElementById('view-materials').classList.toggle('hidden', viewName !== 'materials');
        document.getElementById('view-ox-quiz').classList.toggle('hidden', viewName !== 'ox-quiz');
        document.getElementById('view-ore-timers').classList.toggle('hidden', viewName !== 'ore-timers');

        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.view === viewName);
        });

        if (viewName === 'enchant') {
            this.updateEnchantment();
        }
        if (viewName === 'city-enchants') {
            this.updateCityEnchants();
        }
        if (viewName === 'gardening') {
            this.updateGardening();
        }
        if (viewName === 'mining') {
            this.updateMining();
        }
        if (viewName === 'materials') {
            this.updateMaterials();
        }
        if (viewName === 'ox-quiz') {
            this.updateOxQuiz();
        }
        if (viewName === 'ore-timers') {
            OreTimers.init(document.getElementById('view-ore-timers'));
        }
    },

    getEnchantSlots() {
        const slots = [];
        document.querySelectorAll('.enchant-slot-row').forEach(row => {
            const checkbox = row.querySelector('.slot-enable');
            const fromSelect = row.querySelector('.slot-from');
            const toSelect = row.querySelector('.slot-to');
            slots.push({
                enabled: checkbox.checked,
                from: parseInt(fromSelect.value),
                to: parseInt(toSelect.value)
            });
        });
        return slots;
    },

    updateEnchantment() {
        const slots = this.getEnchantSlots();
        const result = EnchantmentCalc.calculate(slots, this.prices, this.recipesMap, this.resourcesMap);
        document.getElementById('enchant-results').innerHTML = EnchantmentCalc.render(result);
    },

    updateGardening() {
        const container = document.getElementById('gardening-results');
        const grouped = GardeningCalc.calculate(this.resources, this.prices);
        container.innerHTML = GardeningCalc.render(grouped, this.prices);
        GardeningCalc.bindToggle(container);
    },

    updateCityEnchants() {
        const container = document.getElementById('city-enchants-results');
        CityEnchantsCalc.setData(this.cityEnchantsData);
        container.innerHTML = CityEnchantsCalc.render();
        CityEnchantsCalc.bindEvents(container);
    },

    updateMining() {
        const container = document.getElementById('mining-results');
        const stamina = this.miningStamina || 100;
        container.innerHTML = MiningCalc.render(
            this.resources,
            this.prices,
            this.recipes,
            this.resourcesMap,
            stamina
        );
        // Restore qty state if any
        if (this.miningQtyState) {
            this.restoreMiningQtyState(container);
            MiningCalc.updateCalculations(container, this.prices, this.recipes, this.resourcesMap);
        }
    },

    updateMaterials() {
        const container = document.getElementById('materials-results');
        if (!container.classList.contains('initialized')) {
            container.innerHTML = MaterialsCalc.render();
            MaterialsCalc.bindEvents(container);
            container.classList.add('initialized');
        }
    },

    updateOxQuiz() {
        const container = document.getElementById('ox-quiz-results');
        if (!container.classList.contains('initialized')) {
            OxQuizCalc.setData(this.oxQuizData);
            container.innerHTML = OxQuizCalc.render();
            OxQuizCalc.bindEvents(container);
            container.classList.add('initialized');
        }
    },

    captureMiningQtyState(container) {
        const state = {};
        container.querySelectorAll('.mining-qty-input').forEach(input => {
            if (input.value) state[input.dataset.id] = input.value;
        });
        return state;
    },

    restoreMiningQtyState(container) {
        if (!this.miningQtyState) return;
        container.querySelectorAll('.mining-qty-input').forEach(input => {
            if (this.miningQtyState[input.dataset.id]) {
                input.value = this.miningQtyState[input.dataset.id];
            }
        });
    },

    async loadData() {
        const [resourcesRes, recipesRes, pricesRes, cityEnchantsRes, oxQuizRes] = await Promise.all([
            fetch('data/resources.json'),
            fetch('data/recipes.json'),
            fetch('data/prices.json'),
            fetch('data/city_enchants.json'),
            fetch('data/ox_quiz.json')
        ]);

        const resourcesData = await resourcesRes.json();
        const recipesData = await recipesRes.json();
        const defaultPricesData = await pricesRes.json();
        this.cityEnchantsData = await cityEnchantsRes.json();
        this.oxQuizData = await oxQuizRes.json();

        this.resources = resourcesData.resources;
        this.recipes = recipesData.recipes;

        // Загружаем цены из localStorage или используем дефолтные
        const savedPrices = localStorage.getItem('rox_prices');
        if (savedPrices) {
            this.prices = JSON.parse(savedPrices);
        } else {
            this.prices = defaultPricesData.prices;
        }

        // Загружаем историю цен
        const savedHistory = localStorage.getItem('rox_history');
        this.history = savedHistory ? JSON.parse(savedHistory) : {};
    },

    savePrices() {
        localStorage.setItem('rox_prices', JSON.stringify(this.prices));
        this.calculateAll();
        this.render();
    },

    updatePrice(resourceId, newPrice) {
        const price = parseFloat(newPrice);
        if (!isNaN(price) && price >= 0) {
            this.prices[resourceId] = price;
            this.addToHistory(resourceId, price);
            this.savePrices();
        }
    },

    addToHistory(resourceId, price) {
        const today = new Date().toLocaleDateString('ru-RU');
        if (!this.history[resourceId]) {
            this.history[resourceId] = [];
        }

        const resourceHistory = this.history[resourceId];
        const lastEntry = resourceHistory[resourceHistory.length - 1];

        // Обновляем цену за сегодня или добавляем новую запись
        if (lastEntry && lastEntry.date === today) {
            lastEntry.price = price;
        } else {
            resourceHistory.push({ date: today, price: price });
        }

        // Ограничиваем историю (например, последние 30 записей)
        if (resourceHistory.length > 30) {
            resourceHistory.shift();
        }

        localStorage.setItem('rox_history', JSON.stringify(this.history));
    },

    resetPrices() {
        if (confirm('Вы уверены, что хотите сбросить все цены к значениям по умолчанию?')) {
            localStorage.removeItem('rox_prices');
            location.reload();
        }
    },

    exportPrices() {
        const data = JSON.stringify(this.prices);
        navigator.clipboard.writeText(data).then(() => {
            alert('Цены скопированы в буфер обмена в формате JSON');
        });
    },

    importPrices() {
        const data = prompt('Вставьте JSON с ценами:');
        if (data) {
            try {
                const newPrices = JSON.parse(data);
                if (typeof newPrices === 'object') {
                    this.prices = newPrices;
                    this.savePrices();
                    alert('Цены успешно импортированы!');
                }
            } catch (e) {
                alert('Ошибка: неверный формат JSON');
            }
        }
    },

    buildMaps() {
        this.resourcesMap = {};
        for (const r of this.resources) {
            this.resourcesMap[r.id] = r;
        }

        this.recipesMap = {};
        for (const r of this.recipes) {
            this.recipesMap[r.output] = r;
        }
    },

    calculateAll() {
        Calculator.clearCache();
        this.calculations = [];

        for (const resource of this.resources) {
            const calc = Calculator.calculate(
                resource.id,
                this.prices,
                this.recipesMap,
                this.resourcesMap
            );
            this.calculations.push(calc);
        }
    },

    render() {
        const container = document.getElementById('resources-list');
        const searchTerm = document.getElementById('search').value.toLowerCase();
        const typeFilter = document.getElementById('type-filter').value;
        const sortBy = document.getElementById('sort-select').value;

        let filtered = this.calculations.filter(calc => {
            const matchesSearch = calc.resource.name.toLowerCase().includes(searchTerm);
            const matchesType = typeFilter === 'all' || calc.resource.type === typeFilter;
            return matchesSearch && matchesType;
        });

        filtered = this.sortCalculations(filtered, sortBy);

        container.innerHTML = '';

        for (const calc of filtered) {
            const card = Renderer.renderResourceCard(calc, (c) => this.showDetail(c));
            container.appendChild(card);
        }
    },

    sortCalculations(list, sortBy) {
        const sorted = [...list];

        switch (sortBy) {
            case 'margin-desc':
                sorted.sort((a, b) => b.margin - a.margin);
                break;
            case 'margin-asc':
                sorted.sort((a, b) => a.margin - b.margin);
                break;
            case 'price-desc':
                sorted.sort((a, b) => b.marketPrice - a.marketPrice);
                break;
            case 'price-asc':
                sorted.sort((a, b) => a.marketPrice - b.marketPrice);
                break;
            case 'name-asc':
                sorted.sort((a, b) => a.resource.name.localeCompare(b.resource.name));
                break;
        }

        return sorted;
    },

    showDetail(calcResult) {
        const modal = document.getElementById('detail-modal');
        const content = document.getElementById('detail-content');

        content.innerHTML = Renderer.renderDetailModal(
            calcResult,
            this.resourcesMap,
            this.recipesMap,
            this.prices
        );
        modal.classList.remove('hidden');

        // Инициализируем график истории
        Renderer.initPriceChart(this.history[calcResult.resourceId]);

        // Обработка изменения количества
        const qtyInput = document.getElementById('modal-qty');
        const dynamicContent = document.getElementById('modal-dynamic-content');

        if (qtyInput && dynamicContent) {
            qtyInput.addEventListener('input', (e) => {
                let qty = parseInt(e.target.value) || 1;
                if (qty < 1) qty = 1;
                if (qty > 999) qty = 999;

                dynamicContent.innerHTML = Renderer.renderDynamicDetailContent(
                    calcResult,
                    this.resourcesMap,
                    this.recipesMap,
                    this.prices,
                    qty
                );
            });
        }
    },

    hideDetail() {
        document.getElementById('detail-modal').classList.add('hidden');
    },

    bindEvents() {
        document.getElementById('search').addEventListener('input', () => this.render());
        document.getElementById('type-filter').addEventListener('change', () => this.render());
        document.getElementById('sort-select').addEventListener('change', () => this.render());

        const themeToggle = document.getElementById('theme-toggle');
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'light') {
            document.documentElement.classList.add('light');
            themeToggle.querySelector('.toggle-icon').textContent = '☀️';
        }
        themeToggle.addEventListener('click', () => {
            const isLight = document.documentElement.classList.toggle('light');
            themeToggle.querySelector('.toggle-icon').textContent = isLight ? '☀️' : '🌙';
            localStorage.setItem('theme', isLight ? 'light' : 'dark');
        });

        document.getElementById('tax-select').addEventListener('change', (e) => {
            const taxRate = parseFloat(e.target.value) / 100;
            Calculator.setTaxRate(taxRate);
            this.calculateAll();
            this.render();
        });

        document.getElementById('reset-prices').addEventListener('click', () => this.resetPrices());
        document.getElementById('export-prices').addEventListener('click', () => this.exportPrices());
        document.getElementById('import-prices').addEventListener('click', () => this.importPrices());

        // Обработка клика по редактируемой цене (делегирование)
        document.getElementById('resources-list').addEventListener('click', (e) => {
            const editable = e.target.closest('.editable');
            if (editable) {
                const id = editable.dataset.id;
                const currentPrice = this.prices[id];
                const newPrice = prompt(`Введите новую цену для ${this.resourcesMap[id].name}:`, currentPrice);
                if (newPrice !== null) {
                    this.updatePrice(id, newPrice);
                }
            }
        });

        // Обработка клика по редактируемой цене в Gardening
        document.getElementById('gardening-results').addEventListener('click', (e) => {
            const editable = e.target.closest('.editable');
            if (editable) {
                const id = editable.dataset.id;
                const currentPrice = this.prices[id];
                const newPrice = prompt(`Введите новую цену для ${this.resourcesMap[id].name}:`, currentPrice);
                if (newPrice !== null) {
                    this.updatePrice(id, newPrice);
                    if (this.currentView === 'gardening') {
                        this.updateGardening();
                    }
                }
            }
        });

        // Обработка клика по редактируемой цене в Mining
        document.getElementById('mining-results').addEventListener('click', (e) => {
            const editable = e.target.closest('.mining-price-edit');
            if (!editable) return;
            const id = editable.dataset.id;
            const currentPrice = this.prices[id];
            const newPrice = prompt(`Введите новую цену для ${this.resourcesMap[id].name}:`, currentPrice);
            if (newPrice !== null) {
                const container = document.getElementById('mining-results');
                this.miningStamina = parseInt(container.querySelector('#mining-stamina')?.value) || 100;
                this.miningQtyState = this.captureMiningQtyState(container);
                this.updatePrice(id, newPrice);
                if (this.currentView === 'mining') {
                    this.updateMining();
                }
            }
        });

        // Обработка ввода количества и стамины в Mining
        document.getElementById('mining-results').addEventListener('input', (e) => {
            const target = e.target;
            if (target.classList.contains('mining-qty-input') || target.id === 'mining-stamina') {
                MiningCalc.updateCalculations(
                    document.getElementById('mining-results'),
                    this.prices,
                    this.recipes,
                    this.resourcesMap
                );
            }
        });

        document.getElementById('modal-close').addEventListener('click', () => this.hideDetail());
        document.getElementById('detail-modal').addEventListener('click', (e) => {
            if (e.target.id === 'detail-modal') {
                this.hideDetail();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideDetail();
            }
        });

        // Sidebar toggle
        document.querySelector('.sidebar-toggle').addEventListener('click', () => {
            document.querySelector('.sidebar').classList.toggle('collapsed');
        });

        // Nav tabs
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', () => this.switchView(tab.dataset.view));
        });

        // Enchantment form reactivity
        document.getElementById('view-enchant').addEventListener('change', () => {
            if (this.currentView === 'enchant') {
                this.updateEnchantment();
            }
        });
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());
