const App = {
    resources: [],
    recipes: [],
    prices: {},
    resourcesMap: {},
    recipesMap: {},
    calculations: [],

    async init() {
        await this.loadData();
        this.buildMaps();
        this.calculateAll();
        this.render();
        this.bindEvents();
    },

    async loadData() {
        const [resourcesRes, recipesRes, pricesRes] = await Promise.all([
            fetch('data/resources.json'),
            fetch('data/recipes.json'),
            fetch('data/prices.json')
        ]);

        const resourcesData = await resourcesRes.json();
        const recipesData = await recipesRes.json();
        const pricesData = await pricesRes.json();

        this.resources = resourcesData.resources;
        this.recipes = recipesData.recipes;
        this.prices = pricesData.prices;
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
    },

    hideDetail() {
        document.getElementById('detail-modal').classList.add('hidden');
    },

    bindEvents() {
        document.getElementById('search').addEventListener('input', () => this.render());
        document.getElementById('type-filter').addEventListener('change', () => this.render());
        document.getElementById('sort-select').addEventListener('change', () => this.render());

        document.getElementById('tax-select').addEventListener('change', (e) => {
            const taxRate = parseFloat(e.target.value) / 100;
            Calculator.setTaxRate(taxRate);
            this.calculateAll();
            this.render();
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
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());
