const OreTimers = {
    audioVolume: 0.5,
    audioContext: null,
    timers: [],

    render() {
        return `
            <div style="display: flex; justify-content: center; align-items: flex-start; gap: 30px; margin-bottom: 30px; flex-wrap: wrap;">
                <!-- Left Mine -->
                <div class="resource-card timer-card" style="flex: 1; min-width: 300px; max-width: 380px;">
                    <h2 style="font-size: 1.5rem; margin-bottom: 15px;">Левая Жила</h2>
                    <div class="timer-display" style="font-size: 3.5rem; font-weight: bold; font-variant-numeric: tabular-nums; margin-bottom: 10px;" id="ot-timer1-display">
                        175<span style="font-size: 0.5em; opacity: 0.7;">.0</span>
                    </div>
                    <div id="ot-timer1-status" class="font-medium h-6" style="margin-bottom: 20px; height: 1.5rem; color: var(--text-secondary);"></div>
                    <div class="flex items-center justify-center gap-2">
                        <input type="number" id="ot-timer1-input" class="search-input" style="width: 80px; text-align: center; padding: 8px;" min="0" max="175" value="175">
                        <button id="ot-timer1-sync" class="btn btn-secondary">Sync</button>
                        <button id="ot-timer1-minus" class="btn btn-secondary">-1s</button>
                        <button id="ot-timer1-plus" class="btn btn-secondary">+1s</button>
                    </div>
                </div>

                <!-- Center Column (Volume + Stamina) -->
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: flex-start; gap: 15px; width: 260px;">
                    <!-- Volume Control -->
                    <div class="resource-card" style="width: 100%; padding: 15px 20px; display: flex; flex-direction: column; align-items: center; gap: 8px; border: none; background: transparent; box-shadow: none;">
                        <label class="font-medium" style="color: var(--text-secondary);">Громкость</label>
                        <div class="flex items-center justify-center gap-2" style="width: 100%;">
                            <input type="range" id="ot-volume-slider" min="0" max="100" value="50" style="width: 100px;">
                            <span id="ot-volume-display" class="font-medium" style="min-width: 35px; text-align: right;">50%</span>
                        </div>
                    </div>
                    
                    <!-- Stamina Control -->
                    <div class="resource-card" style="cursor: default; width: 100%; display: flex; flex-direction: column; align-items: center; padding: 25px 20px;">
                        <label class="font-medium" style="margin-bottom: 15px; font-size: 1.1rem; color: var(--text-secondary);">Стамина</label>
                        <input type="number" id="ot-stamina-input" class="search-input" style="width: 140px; padding: 12px; text-align: center; font-size: 1.25rem; font-weight: bold; margin-bottom: 15px;" min="0" value="2000">
                        <div id="ot-stamina-result" class="font-medium" style="color: var(--text-primary); text-align: center; font-size: 1.05rem; line-height: 1.6;">
                            ≈ 6 попыток <br> ≈ 19m
                        </div>
                    </div>
                </div>

                <!-- Right Mine -->
                <div class="resource-card timer-card" style="flex: 1; min-width: 300px; max-width: 380px;">
                    <h2 style="font-size: 1.5rem; margin-bottom: 15px;">Правая Жила</h2>
                    <div class="timer-display" style="font-size: 3.5rem; font-weight: bold; font-variant-numeric: tabular-nums; margin-bottom: 10px;" id="ot-timer2-display">
                        175<span style="font-size: 0.5em; opacity: 0.7;">.0</span>
                    </div>
                    <div id="ot-timer2-status" class="font-medium h-6" style="margin-bottom: 20px; height: 1.5rem; color: var(--text-secondary);"></div>
                    <div class="flex items-center justify-center gap-2">
                        <input type="number" id="ot-timer2-input" class="search-input" style="width: 80px; text-align: center; padding: 8px;" min="0" max="175" value="175">
                        <button id="ot-timer2-sync" class="btn btn-secondary">Sync</button>
                        <button id="ot-timer2-minus" class="btn btn-secondary">-1s</button>
                        <button id="ot-timer2-plus" class="btn btn-secondary">+1s</button>
                    </div>
                </div>
            </div>
        `;
    },

    init(container) {
        if (this.initialized) return;
        this.initialized = true;

        let target = container.querySelector('#ore-timers-results');
        if (!target) target = container;
        target.innerHTML = this.render();

        const volumeSlider = container.querySelector('#ot-volume-slider');
        const volumeDisplay = container.querySelector('#ot-volume-display');

        volumeSlider.addEventListener('input', (e) => {
            this.audioVolume = parseInt(e.target.value) / 100;
            volumeDisplay.textContent = `${e.target.value}%`;
            this.playBeep();
        });

        this.timers.push(new ConcentratedOreTimer(1, container, this));
        this.timers.push(new ConcentratedOreTimer(2, container, this));

        const staminaInput = container.querySelector('#ot-stamina-input');
        const staminaResult = container.querySelector('#ot-stamina-result');

        const updateStaminaCalc = () => {
            const stamina = parseInt(staminaInput.value) || 0;
            const attempts = Math.floor(stamina / 300);
            const minutes = attempts * 3;
            const hours = Math.floor(minutes / 60);
            const mins = minutes % 60;
            const timeStr = hours > 0 ? `${hours}h${mins > 0 ? mins + 'm' : ''}` : `${minutes}m`;
            staminaResult.textContent = `≈ ${attempts} попыток ≈ ${timeStr}`;
        };

        staminaInput.addEventListener('input', updateStaminaCalc);
        updateStaminaCalc();
    },

    initAudioContext() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    },

    playTone(freq, type, duration, volMult = 1, startTimeOffset = 0) {
        if (this.audioVolume === 0) return;
        this.initAudioContext();

        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        osc.connect(gain);
        gain.connect(this.audioContext.destination);
        osc.frequency.value = freq;
        osc.type = type;

        const now = this.audioContext.currentTime + startTimeOffset;
        gain.gain.setValueAtTime(this.audioVolume * 2 * volMult, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

        osc.start(now);
        osc.stop(now + duration);
    },

    playBeep() {
        this.playTone(800, 'sine', 0.1);
    },

    playTimerResetSound() {
        this.playTone(1200, 'sine', 0.15);
        this.playTone(600, 'sine', 0.15, 1, 0.1);
    },

    playResetSound() {
        this.playTone(280, 'sine', 0.04, 0.9);
        this.playTone(2200, 'sine', 0.45, 0.6);
        this.playTone(3500, 'sine', 0.25, 0.25);
    },

    playPickaxe() {
        if (this.audioVolume === 0) return;
        this.initAudioContext();
        
        const now = this.audioContext.currentTime;
        
        // Metallic clink (high pitch fast decay)
        const osc1 = this.audioContext.createOscillator();
        const gain1 = this.audioContext.createGain();
        osc1.type = 'square';
        osc1.frequency.setValueAtTime(2400, now);
        osc1.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
        gain1.gain.setValueAtTime(this.audioVolume * 0.3, now);
        gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc1.connect(gain1);
        gain1.connect(this.audioContext.destination);
        osc1.start(now);
        osc1.stop(now + 0.1);
        
        // Low percussive thud (like hitting rock)
        const osc2 = this.audioContext.createOscillator();
        const gain2 = this.audioContext.createGain();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(180, now);
        osc2.frequency.exponentialRampToValueAtTime(40, now + 0.15);
        gain2.gain.setValueAtTime(this.audioVolume * 0.7, now);
        gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc2.connect(gain2);
        gain2.connect(this.audioContext.destination);
        osc2.start(now);
        osc2.stop(now + 0.15);
    }
};

class ConcentratedOreTimer {
    constructor(id, container, parent) {
        this.parent = parent;
        this.displayEl = container.querySelector(`#ot-timer${id}-display`);
        this.statusEl = container.querySelector(`#ot-timer${id}-status`);
        this.inputEl = container.querySelector(`#ot-timer${id}-input`);

        container.querySelector(`#ot-timer${id}-sync`).addEventListener('click', () => this.syncTime());
        container.querySelector(`#ot-timer${id}-minus`).addEventListener('click', () => this.adjustTime(-1));
        container.querySelector(`#ot-timer${id}-plus`).addEventListener('click', () => this.adjustTime(1));

        this.countdownSeconds = 175;
        this.miningSeconds = 5;
        this.isMining = false;
        this.endTime = Date.now() + (this.countdownSeconds * 1000);
        this.lastBeepSecond = -1;
        this.lastPickaxeSecond = -1;

        this.updateDisplay();
        this.interval = setInterval(() => this.tick(), 50);
    }

    updateDisplay() {
        const msRemaining = Math.max(0, this.endTime - Date.now());
        const currentSeconds = Math.ceil(msRemaining / 1000);
        const displaySeconds = Math.floor(msRemaining / 1000);
        const displayMs = msRemaining % 1000;

        if (this.isMining) {
            this.displayEl.innerHTML = '--';
            this.displayEl.classList.remove('timer-warning');
            this.statusEl.textContent = `Добыча ${currentSeconds} сек...`;
            this.statusEl.classList.add('mining-flash');
        } else {
            this.displayEl.innerHTML = `${displaySeconds}<span style="font-size: 0.5em; opacity: 0.7;">.${Math.floor(displayMs / 100)}</span>`;
            this.statusEl.textContent = '';
            this.statusEl.classList.remove('mining-flash');

            if (currentSeconds <= 5 && currentSeconds > 0) {
                this.displayEl.classList.add('timer-warning');
            } else {
                this.displayEl.classList.remove('timer-warning');
            }
        }
    }

    syncTime() {
        const newTime = parseInt(this.inputEl.value);
        if (isNaN(newTime) || newTime < 0 || newTime > 175) return;

        this.endTime = Date.now() + (newTime * 1000);
        this.isMining = false;
        this.lastBeepSecond = -1;
        this.lastPickaxeSecond = -1;
        this.updateDisplay();
    }

    adjustTime(amount) {
        if (this.isMining) return;
        this.endTime += amount * 1000;
        const now = Date.now();
        if (this.endTime < now) this.endTime = now;
        if (this.endTime > now + 175 * 1000) this.endTime = now + 175 * 1000;
        this.lastBeepSecond = -1;
        this.lastPickaxeSecond = -1;
        this.updateDisplay();
    }

    tick() {
        const now = Date.now();
        const msRemaining = this.endTime - now;
        const currentSeconds = Math.max(0, Math.ceil(msRemaining / 1000));

        if (!this.isMining && currentSeconds <= 5 && currentSeconds > 0 && currentSeconds !== this.lastBeepSecond) {
            this.parent.playBeep();
            this.lastBeepSecond = currentSeconds;
        }

        if (this.isMining && currentSeconds > 0 && currentSeconds !== this.lastPickaxeSecond) {
            this.parent.playPickaxe();
            this.lastPickaxeSecond = currentSeconds;
        }

        if (msRemaining <= 0) {
            const overdue = -msRemaining;
            const countdownDurationMs = this.countdownSeconds * 1000;
            const miningDurationMs = this.miningSeconds * 1000;
            const fullCycleMs = countdownDurationMs + miningDurationMs;

            if (this.isMining) {
                if (overdue < countdownDurationMs) {
                    this.isMining = false;
                    this.endTime = now + (countdownDurationMs - overdue);
                    this.parent.playTimerResetSound();
                } else {
                    const remainder = (overdue - countdownDurationMs) % fullCycleMs;
                    if (remainder < miningDurationMs) {
                        this.isMining = true;
                        this.endTime = now + (miningDurationMs - remainder);
                        this.parent.playResetSound();
                    } else {
                        this.isMining = false;
                        this.endTime = now + (countdownDurationMs - (remainder - miningDurationMs));
                        this.parent.playTimerResetSound();
                    }
                }
                this.lastBeepSecond = -1;
                this.lastPickaxeSecond = -1;
            } else {
                if (overdue < miningDurationMs) {
                    this.isMining = true;
                    this.endTime = now + (miningDurationMs - overdue);
                    this.parent.playResetSound();
                } else {
                    const remainder = (overdue - miningDurationMs) % fullCycleMs;
                    if (remainder < countdownDurationMs) {
                        this.isMining = false;
                        this.endTime = now + (countdownDurationMs - remainder);
                        this.parent.playTimerResetSound();
                    } else {
                        this.isMining = true;
                        this.endTime = now + (miningDurationMs - (remainder - countdownDurationMs));
                        this.parent.playResetSound();
                    }
                }
                this.lastBeepSecond = -1;
                this.lastPickaxeSecond = -1;
            }
        }

        this.updateDisplay();
    }
}
