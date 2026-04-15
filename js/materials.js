const MaterialsCalc = {
    render() {
        return `
            <div class="materials-calc-wrapper">
                <div class="calc-section synthesize-section">
                    <h3>Синтез</h3>
                    <div class="tier-row">
                        <div class="tier-col">
                            <label>Tier 1</label>
                            <div class="input-wrapper">
                                <input type="number" class="mat-input synth-input" data-tier="1" min="0" placeholder="0">
                                <div class="remainder-label"></div>
                            </div>
                        </div>
                        <div class="tier-arrow">&gt;</div>
                        <div class="tier-col">
                            <label>Tier 2</label>
                            <div class="input-wrapper">
                                <input type="number" class="mat-input synth-input" data-tier="2" min="0" placeholder="0">
                                <div class="remainder-label"></div>
                            </div>
                        </div>
                        <div class="tier-arrow">&gt;</div>
                        <div class="tier-col">
                            <label>Tier 3</label>
                            <div class="input-wrapper">
                                <input type="number" class="mat-input synth-input" data-tier="3" min="0" placeholder="0">
                                <div class="remainder-label"></div>
                            </div>
                        </div>
                        <div class="tier-arrow">&gt;</div>
                        <div class="tier-col">
                            <label>Tier 4</label>
                            <div class="input-wrapper">
                                <input type="number" class="mat-input synth-input" data-tier="4" min="0" placeholder="0">
                                <div class="remainder-label"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="calc-section dismantle-section" style="margin-top: 40px;">
                    <h3>Разборка</h3>
                    <div class="tier-row">
                        <div class="tier-col">
                            <label>Tier 1</label>
                            <div class="input-wrapper">
                                <input type="number" class="mat-input dism-input" data-tier="1" min="0" placeholder="0">
                                <div class="remainder-label"></div>
                            </div>
                        </div>
                        <div class="tier-arrow">&lt;</div>
                        <div class="tier-col">
                            <label>Tier 2</label>
                            <div class="input-wrapper">
                                <input type="number" class="mat-input dism-input" data-tier="2" min="0" placeholder="0">
                                <div class="remainder-label"></div>
                            </div>
                        </div>
                        <div class="tier-arrow">&lt;</div>
                        <div class="tier-col">
                            <label>Tier 3</label>
                            <div class="input-wrapper">
                                <input type="number" class="mat-input dism-input" data-tier="3" min="0" placeholder="0">
                                <div class="remainder-label"></div>
                            </div>
                        </div>
                        <div class="tier-arrow">&lt;</div>
                        <div class="tier-col">
                            <label>Tier 4</label>
                            <div class="input-wrapper">
                                <input type="number" class="mat-input dism-input" data-tier="4" min="0" placeholder="0">
                                <div class="remainder-label"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <style>
                .materials-calc-wrapper {
                    background: var(--bg-card);
                    border-radius: 12px;
                    padding: 30px;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                    max-width: 800px;
                    margin: 0 auto;
                }
                .calc-section h3 {
                    margin-bottom: 25px;
                    color: var(--text-primary);
                    text-align: center;
                    font-size: 1.4rem;
                }
                .tier-row {
                    display: flex;
                    align-items: flex-start;
                    justify-content: center;
                    gap: 20px;
                    flex-wrap: wrap;
                }
                .tier-col {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 10px;
                }
                .tier-col label {
                    font-weight: 600;
                    color: var(--text-secondary);
                    font-size: 1.1rem;
                }
                .input-wrapper {
                    position: relative;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }
                .mat-input {
                    width: 120px;
                    padding: 12px;
                    border: 2px solid var(--border);
                    border-radius: 8px;
                    background: var(--bg-secondary);
                    color: var(--text-primary);
                    font-size: 1.3rem;
                    text-align: center;
                    transition: border-color 0.2s, background-color 0.2s, box-shadow 0.2s;
                }
                
                /* Hide spinners */
                .mat-input::-webkit-outer-spin-button,
                .mat-input::-webkit-inner-spin-button {
                    -webkit-appearance: none;
                    margin: 0;
                }
                .mat-input {
                    -moz-appearance: textfield;
                }

                .mat-input:focus {
                    outline: none;
                    border-color: var(--accent);
                    background: rgba(255, 255, 255, 0.05);
                    box-shadow: 0 0 0 3px rgba(233, 69, 96, 0.2);
                }
                .mat-input.active-input {
                    background-color: rgba(241, 196, 15, 0.15);
                    border-color: #f1c40f;
                    color: #e5b300;
                }
                html.light .mat-input.active-input {
                    background-color: #fff4d1;
                    color: #d4a000;
                }
                
                .remainder-label {
                    position: absolute;
                    top: 100%;
                    margin-top: 5px;
                    height: 20px;
                    white-space: nowrap;
                    color: var(--profit);
                    font-size: 0.85rem;
                    font-weight: 600;
                }

                .tier-arrow {
                    font-size: 1.8rem;
                    color: var(--text-secondary);
                    font-weight: 700;
                    margin-top: 35px;
                    opacity: 0.5;
                }
                
                @media (max-width: 600px) {
                    .tier-row {
                        flex-direction: column;
                        align-items: center;
                        gap: 10px;
                    }
                    .tier-arrow {
                        transform: rotate(90deg);
                        margin-top: 5px;
                        margin-bottom: 5px;
                    }
                    .remainder-label {
                        position: static;
                        margin-bottom: 10px;
                    }
                }
            </style>
        `;
    },

    bindEvents(container) {
        const synthInputs = container.querySelectorAll('.synth-input');
        const dismInputs = container.querySelectorAll('.dism-input');

        synthInputs.forEach(input => {
            input.addEventListener('input', (e) => {
                this.updateSynth(e.target, synthInputs);
            });
            input.addEventListener('focus', (e) => {
                 this.highlightActive(e.target, synthInputs);
            });
        });

        dismInputs.forEach(input => {
            input.addEventListener('input', (e) => {
                this.updateDismantle(e.target, dismInputs);
            });
            input.addEventListener('focus', (e) => {
                 this.highlightActive(e.target, dismInputs);
            });
        });
    },

    highlightActive(activeInput, inputs) {
        inputs.forEach(input => input.classList.remove('active-input'));
        activeInput.classList.add('active-input');
    },

    updateSynth(activeInput, inputs) {
        let val = parseFloat(activeInput.value);
        if (isNaN(val)) {
            inputs.forEach(input => {
                if (input !== activeInput) {
                    input.value = '';
                    input.nextElementSibling.innerHTML = '';
                }
            });
            return;
        }
        
        const activeTier = parseInt(activeInput.dataset.tier);

        inputs.forEach(input => {
            if (input === activeInput) {
                input.nextElementSibling.innerHTML = ''; // clear its own remainder
                return;
            }
            const targetTier = parseInt(input.dataset.tier);
            
            if (targetTier > activeTier) {
                // Synthesizing UP (Requires more items per level)
                const ratio = Math.pow(3, targetTier - activeTier);
                const result = Math.floor(val / ratio);
                const remainder = val % ratio;
                input.value = result > 0 ? result : (remainder > 0 ? 0 : '');
                if (result === 0 && remainder === 0 && val !== 0) {
                     input.value = 0;
                }
                input.nextElementSibling.innerHTML = remainder > 0 ? `ост. ${remainder} T${activeTier}` : '';
            } else {
                // Synthesizing DOWN
                const ratio = Math.pow(3, activeTier - targetTier);
                const result = val * ratio;
                input.value = result;
                input.nextElementSibling.innerHTML = '';
            }
        });
    },

    updateDismantle(activeInput, inputs) {
        let val = parseFloat(activeInput.value);
        if (isNaN(val)) {
            inputs.forEach(input => {
                if (input !== activeInput) {
                    input.value = '';
                    input.nextElementSibling.innerHTML = '';
                }
            });
            return;
        }
        
        const activeTier = parseInt(activeInput.dataset.tier);

        inputs.forEach(input => {
            if (input === activeInput) {
                input.nextElementSibling.innerHTML = '';
                return;
            }
            const targetTier = parseInt(input.dataset.tier);
            
            if (targetTier < activeTier) {
                // Dismantling DOWN
                const ratio = Math.pow(2, activeTier - targetTier);
                const result = val * ratio;
                input.value = result;
                input.nextElementSibling.innerHTML = '';
            } else {
                // Dismantling UP
                const ratio = Math.pow(2, targetTier - activeTier);
                const result = Math.floor(val / ratio);
                const remainder = val % ratio;
                input.value = result > 0 ? result : (remainder > 0 ? 0 : '');
                if (result === 0 && remainder === 0 && val !== 0) {
                     input.value = 0;
                }
                input.nextElementSibling.innerHTML = remainder > 0 ? `ост. ${remainder} T${activeTier}` : '';
            }
        });
    }
};
