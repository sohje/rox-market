const OxQuizCalc = {
    data: [],
    searchQuery: '',

    setData(data) {
        this.data = data;
    },

    setSearch(query) {
        this.searchQuery = query.toLowerCase().trim();
    },

    render() {
        if (!this.data || this.data.length === 0) {
            return '<p style="color: var(--text-secondary); text-align: center; padding: 40px;">Нет данных или загрузка...</p>';
        }

        let html = `
            <div class="ox-search-wrapper" style="margin-bottom: 20px;">
                <input type="text" id="ox-search-input" class="search-input" placeholder="Поиск вопросов или ответов..." value="${this.searchQuery}" style="width: 100%;">
            </div>
            <div class="ox-questions-list">
        `;

        for (const item of this.data) {
            const qStr = item.question.toLowerCase();
            const aStr = item.answer ? 'true' : 'false';
            if (this.searchQuery) {
                if (!qStr.includes(this.searchQuery) && !aStr.includes(this.searchQuery)) {
                    continue;
                }
            }

            const answerText = item.answer ? 'O True' : 'X False';

            // Custom styles applied inline for easy injection into the theme
            // Uses CSS variables for light/dark mode compatibility where possible
            html += `
                <div class="ox-content-card" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; margin-bottom: 8px; background: var(--card-bg); border: 1px solid var(--border-color); border-radius: var(--border-radius); transition: border-color 0.2s;">
                    <div class="ox-question pr-4" style="flex: 1; color: var(--text-color); font-size: 0.95rem; line-height: 1.5;">
                        ${this.highlight(item.question, this.searchQuery)}
                    </div>
                    <div class="ox-answer-badge" style="flex-shrink: 0; font-weight: normal; border-radius: 0.5rem; padding: 0.25rem 0.75rem; font-size: 0.875rem; ${item.answer ? 'background: rgba(76, 175, 80, 0.15); border: 1px solid rgba(76, 175, 80, 0.5); color: #4caf50;' : 'background: rgba(244, 67, 54, 0.15); border: 1px solid rgba(244, 67, 54, 0.5); color: #f44336;'}">
                        ${this.highlight(answerText, this.searchQuery)}
                    </div>
                </div>
            `;
        }

        html += `</div>`;
        return html;
    },

    highlight(text, term) {
        if (!term) return text;
        const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return text.replace(regex, '<span style="background-color: rgba(200, 160, 40, 0.4); font-weight: bold; border-radius: 2px;">$1</span>');
    },

    bindEvents(container) {
        const searchInput = container.querySelector('#ox-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.setSearch(e.target.value);
                const cursorPos = searchInput.selectionStart;
                container.innerHTML = this.render();
                this.bindEvents(container);
                const newSearch = container.querySelector('#ox-search-input');
                if (newSearch) {
                    newSearch.focus();
                    newSearch.setSelectionRange(cursorPos, cursorPos);
                }
            });
        }
    }
};
