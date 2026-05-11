const MvpTimers = {
    MAX_TIMERS: 20,
    audioVolume: 0.5,
    audioContext: null,
    notifyAt5: true,
    notifyAt10: true,
    timers: [],
    initialized: false,

    // ─── Persistence ───────────────────────────────────────────────────────────

    STORAGE_KEY: 'mvp_timers_v1',
    PREFS_KEY: 'mvp_timers_prefs_v1',

    saveTimers() {
        const data = this.timers.map(t => ({
            name: t.name,
            endTime: t.endTime,
            totalSeconds: t.totalSeconds,
            state: t.state,
        }));
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    },

    loadTimers() {
        try {
            return JSON.parse(localStorage.getItem(this.STORAGE_KEY)) || [];
        } catch {
            return [];
        }
    },

    savePrefs() {
        localStorage.setItem(this.PREFS_KEY, JSON.stringify({
            notifyAt5: this.notifyAt5,
            notifyAt10: this.notifyAt10,
            audioVolume: this.audioVolume,
        }));
    },

    loadPrefs() {
        try {
            const p = JSON.parse(localStorage.getItem(this.PREFS_KEY));
            if (!p) return;
            this.notifyAt5 = p.notifyAt5 ?? true;
            this.notifyAt10 = p.notifyAt10 ?? true;
            this.audioVolume = p.audioVolume ?? 0.5;
        } catch {
            // keep defaults
        }
    },

    // ─── Audio ─────────────────────────────────────────────────────────────────

    initAudioContext() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    },

    playTone(freq, type, duration, vol = 1, offset = 0) {
        if (this.audioVolume === 0) return;
        this.initAudioContext();
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        osc.connect(gain);
        gain.connect(this.audioContext.destination);
        osc.frequency.value = freq;
        osc.type = type;
        const now = this.audioContext.currentTime + offset;
        gain.gain.setValueAtTime(this.audioVolume * vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
        osc.start(now);
        osc.stop(now + duration);
    },

    playBeep() {
        // Quick test beep for volume slider
        this.playTone(880, 'sine', 0.12, 0.6);
    },

    // Pleasant chime: 3-note ascending arpeggio
    playWarningChime(isUrgent) {
        if (isUrgent) {
            // 5-min warning: lower, more urgent chord
            this.playTone(523, 'sine', 0.35, 0.5, 0);
            this.playTone(659, 'sine', 0.35, 0.4, 0.12);
            this.playTone(784, 'sine', 0.45, 0.6, 0.24);
            this.playTone(1047, 'sine', 0.55, 0.5, 0.36);
        } else {
            // 10-min warning: gentle ascending chime
            this.playTone(659, 'sine', 0.3, 0.35, 0);
            this.playTone(784, 'sine', 0.3, 0.3, 0.15);
            this.playTone(988, 'sine', 0.4, 0.4, 0.3);
        }
    },

    playSpawnSound() {
        // Triumphant fanfare when timer hits 0
        this.playTone(784, 'sine', 0.15, 0.6, 0);
        this.playTone(988, 'sine', 0.15, 0.6, 0.1);
        this.playTone(1175, 'sine', 0.2, 0.7, 0.2);
        this.playTone(1568, 'sine', 0.5, 0.8, 0.35);
    },

    // ─── Timer management ──────────────────────────────────────────────────────

    hasName(name) {
        const norm = name.trim().toLowerCase();
        return this.timers.some(t => t.name.toLowerCase() === norm);
    },

    addTimer(name, totalSeconds, container) {
        name = name.trim();
        if (!name) return { ok: false, error: 'Введите имя MVP/Mini' };
        if (totalSeconds <= 0 || isNaN(totalSeconds)) return { ok: false, error: 'Некорректное время' };
        if (this.hasName(name)) return { ok: false, error: `"${name}" уже существует` };
        if (this.timers.length >= this.MAX_TIMERS) return { ok: false, error: `Максимум ${this.MAX_TIMERS} таймеров` };

        const timer = new MvpTimer(name, totalSeconds, this);
        this.timers.unshift(timer); // newest first
        this.saveTimers();
        this.renderTimerList(container);
        return { ok: true };
    },

    removeTimer(name, container) {
        const idx = this.timers.findIndex(t => t.name === name);
        if (idx === -1) return;
        this.timers[idx].destroy();
        this.timers.splice(idx, 1);
        this.saveTimers();
        this.renderTimerList(container);
    },

    resetTimer(name, totalSeconds, container) {
        const timer = this.timers.find(t => t.name === name);
        if (!timer) return;
        timer.reset(totalSeconds);
        this.saveTimers();
        this.renderTimerCard(timer, container);
    },

    // ─── Render ────────────────────────────────────────────────────────────────

    parseTime(str) {
        // Accepts HH:MM:SS or MM:SS or raw seconds
        str = str.trim();
        const parts = str.split(':').map(Number);
        if (parts.some(isNaN)) return NaN;
        if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
        if (parts.length === 2) return parts[0] * 60 + parts[1];
        if (parts.length === 1) return parts[0];
        return NaN;
    },

    formatTime(seconds) {
        const s = Math.max(0, Math.floor(seconds));
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        const sec = s % 60;
        if (h > 0) {
            return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
        }
        return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    },

    renderForm() {
        return `
            <div class="mvp-form-panel">
                <div class="mvp-form-row">
                    <input type="text" id="mvp-name-input" class="search-input mvp-name-input"
                        placeholder="Имя MVP / Mini (напр. Eddga)" maxlength="40" autocomplete="off">
                    <input type="text" id="mvp-time-input" class="search-input mvp-time-input"
                        placeholder="ЧЧ:ММ:СС" maxlength="8" autocomplete="off">
                    <button id="mvp-add-btn" class="btn btn-accent">+ Добавить</button>
                </div>
                <div id="mvp-form-error" class="mvp-form-error hidden"></div>
                <div class="mvp-form-prefs">
                    <span class="mvp-prefs-label">Уведомления:</span>
                    <label class="mvp-check-label">
                        <input type="checkbox" id="mvp-notify-10" ${this.notifyAt10 ? 'checked' : ''}>
                        <span>за 10 мин</span>
                    </label>
                    <label class="mvp-check-label">
                        <input type="checkbox" id="mvp-notify-5" ${this.notifyAt5 ? 'checked' : ''}>
                        <span>за 5 мин</span>
                    </label>
                    <div class="mvp-volume-wrap">
                        <span class="mvp-prefs-label">Громкость:</span>
                        <input type="range" id="mvp-volume-slider" min="0" max="100"
                            value="${Math.round(this.audioVolume * 100)}" class="mvp-volume-slider">
                        <span id="mvp-volume-display" class="mvp-volume-display">${Math.round(this.audioVolume * 100)}%</span>
                    </div>
                </div>
            </div>
        `;
    },

    renderTimerCard(timer, container) {
        const cardEl = container.querySelector(`.mvp-timer-card[data-name="${CSS.escape(timer.name)}"]`);
        if (!cardEl) return;
        cardEl.outerHTML = this.timerCardHTML(timer);
        // re-bind the new card
        this.bindCardEvents(
            container.querySelector(`.mvp-timer-card[data-name="${CSS.escape(timer.name)}"]`),
            timer,
            container
        );
    },

    timerCardHTML(timer) {
        const secsLeft = Math.max(0, (timer.endTime - Date.now()) / 1000);
        const stateClass = timer.stateClass();
        const progress = timer.totalSeconds > 0
            ? Math.min(1, secsLeft / timer.totalSeconds)
            : 0;
        const progressPct = (progress * 100).toFixed(1);

        let displayHTML;
        if (timer.state === 'expired') {
            displayHTML = `
                <div class="mvp-spawned-label">СПАВН!</div>
                <div class="mvp-reset-row">
                    <input type="text" class="search-input mvp-reset-input"
                        placeholder="ЧЧ:ММ:СС" maxlength="8" autocomplete="off">
                    <button class="btn btn-secondary mvp-reset-btn">Reset</button>
                </div>
            `;
        } else {
            displayHTML = `
                <div class="mvp-timer-display ${stateClass}" id="mvp-display-${timer.safeId()}">
                    ${this.formatTime(secsLeft)}
                </div>
            `;
        }

        return `
            <div class="mvp-timer-card ${stateClass}" data-name="${timer.name}">
                <div class="mvp-card-header">
                    <span class="mvp-card-name"> ${timer.name}</span>
                    <button class="mvp-delete-btn" title="Удалить">×</button>
                </div>
                <div class="mvp-progress-wrap">
                    <div class="mvp-progress-bar ${stateClass}" style="width: ${progressPct}%"></div>
                </div>
                <div class="mvp-card-body">
                    ${displayHTML}
                </div>
            </div>
        `;
    },

    renderTimerList(container) {
        const listEl = container.querySelector('#mvp-timer-list');
        if (!listEl) return;

        if (this.timers.length === 0) {
            listEl.innerHTML = `
                <div class="mvp-empty-state">
                    <div class="mvp-empty-icon"></div>
                    <p>Нет активных таймеров.<br>Добавьте MVP или Mini босса выше.</p>
                </div>
            `;
            return;
        }

        listEl.innerHTML = this.timers.map(t => this.timerCardHTML(t)).join('');

        this.timers.forEach(timer => {
            const card = listEl.querySelector(`.mvp-timer-card[data-name="${CSS.escape(timer.name)}"]`);
            if (card) this.bindCardEvents(card, timer, container);
        });
    },

    bindCardEvents(card, timer, container) {
        if (!card) return;

        card.querySelector('.mvp-delete-btn')?.addEventListener('click', () => {
            this.removeTimer(timer.name, container);
        });

        const resetBtn = card.querySelector('.mvp-reset-btn');
        const resetInput = card.querySelector('.mvp-reset-input');
        if (resetBtn && resetInput) {
            resetBtn.addEventListener('click', () => {
                const secs = this.parseTime(resetInput.value);
                if (isNaN(secs) || secs <= 0) {
                    resetInput.style.borderColor = 'var(--loss)';
                    return;
                }
                resetInput.style.borderColor = '';
                this.resetTimer(timer.name, secs, container);
            });
            resetInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') resetBtn.click();
            });
            resetInput.addEventListener('input', () => {
                this.autoFormatTimeInput(resetInput);
            });
        }
    },

    autoFormatTimeInput(input) {
        let v = input.value.replace(/[^0-9:]/g, '');
        // auto-insert colons after 2 and 4 digits (if not already there)
        const digits = v.replace(/:/g, '');
        if (digits.length > 4) {
            v = digits.slice(0, 2) + ':' + digits.slice(2, 4) + ':' + digits.slice(4, 6);
        } else if (digits.length > 2) {
            v = digits.slice(0, 2) + ':' + digits.slice(2, 4);
        } else {
            v = digits;
        }
        input.value = v;
    },

    showError(container, msg) {
        const el = container.querySelector('#mvp-form-error');
        if (!el) return;
        el.textContent = msg;
        el.classList.remove('hidden');
        clearTimeout(this._errTimer);
        this._errTimer = setTimeout(() => el.classList.add('hidden'), 3500);
    },

    bindFormEvents(container) {
        const nameInput = container.querySelector('#mvp-name-input');
        const timeInput = container.querySelector('#mvp-time-input');
        const addBtn = container.querySelector('#mvp-add-btn');
        const notify5 = container.querySelector('#mvp-notify-5');
        const notify10 = container.querySelector('#mvp-notify-10');
        const volumeSlider = container.querySelector('#mvp-volume-slider');
        const volumeDisplay = container.querySelector('#mvp-volume-display');

        timeInput.addEventListener('input', () => this.autoFormatTimeInput(timeInput));

        timeInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') addBtn.click();
        });
        nameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') timeInput.focus();
        });

        addBtn.addEventListener('click', () => {
            const secs = this.parseTime(timeInput.value);
            const result = this.addTimer(nameInput.value, secs, container);
            if (result.ok) {
                nameInput.value = '';
                timeInput.value = '';
                nameInput.focus();
            } else {
                this.showError(container, result.error);
            }
        });

        notify5.addEventListener('change', () => {
            this.notifyAt5 = notify5.checked;
            this.savePrefs();
        });
        notify10.addEventListener('change', () => {
            this.notifyAt10 = notify10.checked;
            this.savePrefs();
        });

        volumeSlider.addEventListener('input', () => {
            this.audioVolume = parseInt(volumeSlider.value) / 100;
            volumeDisplay.textContent = `${volumeSlider.value}%`;
            this.playBeep();
            this.savePrefs();
        });
    },

    // ─── Tick updater ──────────────────────────────────────────────────────────

    startGlobalTick(container) {
        if (this._globalInterval) return;
        this._globalInterval = setInterval(() => {
            const listEl = container.querySelector('#mvp-timer-list');
            if (!listEl) return;

            let needsFullRender = false;
            this.timers.forEach(timer => {
                const changed = timer.tick();
                if (changed === 'expired' || changed === 'reset') {
                    needsFullRender = true;
                } else if (changed === 'tick') {
                    // fast-path: just update the display span
                    const el = listEl.querySelector(`#mvp-display-${timer.safeId()}`);
                    if (el) {
                        const secsLeft = Math.max(0, (timer.endTime - Date.now()) / 1000);
                        el.textContent = this.formatTime(secsLeft);
                        // Update state class
                        const sc = timer.stateClass();
                        el.className = `mvp-timer-display ${sc}`;
                        const card = listEl.querySelector(`.mvp-timer-card[data-name="${CSS.escape(timer.name)}"]`);
                        if (card) {
                            card.className = `mvp-timer-card ${sc}`;
                            const bar = card.querySelector('.mvp-progress-bar');
                            if (bar) {
                                const progress = timer.totalSeconds > 0
                                    ? Math.min(1, secsLeft / timer.totalSeconds)
                                    : 0;
                                bar.style.width = `${(progress * 100).toFixed(1)}%`;
                                bar.className = `mvp-progress-bar ${sc}`;
                            }
                        }
                    }
                }
            });

            if (needsFullRender) {
                this.renderTimerList(container);
                this.saveTimers();
            }
        }, 500);
    },

    // ─── Init ──────────────────────────────────────────────────────────────────

    init(container) {
        if (this.initialized) return;
        this.initialized = true;

        this.loadPrefs();

        const target = container.querySelector('#mvp-timers-results') || container;
        target.innerHTML = `
            ${this.renderForm()}
            <div id="mvp-timer-list"></div>
        `;

        this.bindFormEvents(container);

        // Restore persisted timers
        const saved = this.loadTimers();
        saved.forEach(s => {
            if (this.timers.length >= this.MAX_TIMERS) return;
            const timer = new MvpTimer(s.name, s.totalSeconds, this);
            // Restore endTime as-is — tick() will handle expired state
            timer.endTime = s.endTime;
            if (s.state === 'expired' || s.endTime <= Date.now()) {
                timer.state = 'expired';
            }
            this.timers.push(timer);
        });

        this.renderTimerList(container);
        this.startGlobalTick(container);
    },
};

// ─── Timer class ───────────────────────────────────────────────────────────────

class MvpTimer {
    constructor(name, totalSeconds, parent) {
        this.name = name;
        this.totalSeconds = totalSeconds;
        this.endTime = Date.now() + totalSeconds * 1000;
        this.state = 'running'; // 'running' | 'warning10' | 'warning5' | 'expired'
        this.parent = parent;
        this.notify10Fired = false;
        this.notify5Fired = false;
        this.spawnFired = false;
    }

    safeId() {
        // Safe id for DOM queries from timer name
        return this.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    }

    stateClass() {
        return `mvp-state-${this.state}`;
    }

    reset(totalSeconds) {
        this.totalSeconds = totalSeconds;
        this.endTime = Date.now() + totalSeconds * 1000;
        this.state = 'running';
        this.spawnFired = false;
        this.notify10Fired = false;
        this.notify5Fired = false;
        // Grace period: don't fire audio for 2s after reset to avoid
        // overlapping with the spawn fanfare that may still be playing.
        this.noNotifyUntil = Date.now() + 2000;
    }

    destroy() {
        // nothing to clean — global tick handles all
    }

    // Returns: 'tick' | 'expired' | null
    tick() {
        if (this.state === 'expired') return null;

        const secsLeft = (this.endTime - Date.now()) / 1000;

        if (secsLeft <= 0) {
            if (!this.spawnFired) {
                this.spawnFired = true;
                this.parent.playSpawnSound();
            }
            this.state = 'expired';
            return 'expired';
        }

        const audioAllowed = !this.noNotifyUntil || Date.now() >= this.noNotifyUntil;

        if (secsLeft <= 300) {
            this.state = 'warning5';
            if (!this.notify5Fired && this.parent.notifyAt5 && audioAllowed) {
                this.notify5Fired = true;
                this.parent.playWarningChime(true);
            }
        } else if (secsLeft <= 600) {
            this.state = 'warning10';
            if (!this.notify10Fired && this.parent.notifyAt10 && audioAllowed) {
                this.notify10Fired = true;
                this.parent.playWarningChime(false);
            }
        } else {
            this.state = 'running';
        }

        return 'tick';
    }
}
