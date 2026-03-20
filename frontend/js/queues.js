const QueueApp = (() => {
    const API_BASE = window.location.origin + '/api';
    let activeTab = 'infinite';

    const MODEL_NOTES = {
        mm1: 'M/M/1: fuente infinita con 1 servidor. Requiere ρ = λ/μ < 1.',
        mmk: 'M/M/k: fuente infinita con k servidores (Erlang-C). Requiere ρ = λ/(kμ) < 1.',
        mg1: 'M/G/1: 1 servidor, tiempo de servicio general. Requiere E[S²].',
        md1: 'M/D/1: 1 servidor, servicio determinista.',
        mgk: 'M/G/k: aproximación de Allen–Cunneen usando C_s².',
        finite_mm1: 'M/M/1/N: población finita N, 1 servidor.',
        finite_mmk: 'M/M/k/N: población finita N y k servidores.',
        mmk_infinite_finite_peps: 'M/M/k/∞/N/PEPS: misma base de estados que M/M/k/N finito.',
    };

    function init() {
        bindEvents();
        updateTabUI();
        onModelChange();
    }

    function bindEvents() {
        const tabInfinite = document.getElementById('tab-infinite-btn');
        const tabFinite = document.getElementById('tab-finite-btn');
        const selectInfinite = document.getElementById('queue-model-infinite');
        const selectFinite = document.getElementById('queue-model-finite');
        const calculateBtn = document.getElementById('btn-queue-calc');
        const optimizeKWait = document.getElementById('optimize-k-wait');
        const manualEconomic = document.getElementById('manual-economic');
        const economicEnabled = document.getElementById('economic-enabled');

        if (tabInfinite) {
            tabInfinite.addEventListener('click', () => {
                activeTab = 'infinite';
                updateTabUI();
                onModelChange();
            });
        }

        if (tabFinite) {
            tabFinite.addEventListener('click', () => {
                activeTab = 'finite';
                updateTabUI();
                onModelChange();
            });
        }

        if (selectInfinite) selectInfinite.addEventListener('change', onModelChange);
        if (selectFinite) selectFinite.addEventListener('change', onModelChange);
        if (optimizeKWait) optimizeKWait.addEventListener('change', onModelChange);
        if (manualEconomic) manualEconomic.addEventListener('change', onModelChange);
        if (economicEnabled) economicEnabled.addEventListener('change', onModelChange);

        if (calculateBtn) calculateBtn.addEventListener('click', calculate);
    }

    function updateTabUI() {
        const infiniteBtn = document.getElementById('tab-infinite-btn');
        const finiteBtn = document.getElementById('tab-finite-btn');
        const infinitePanel = document.getElementById('tab-infinite');
        const finitePanel = document.getElementById('tab-finite');

        const isInfinite = activeTab === 'infinite';

        if (infiniteBtn) {
            infiniteBtn.classList.toggle('active', isInfinite);
            infiniteBtn.setAttribute('aria-selected', isInfinite ? 'true' : 'false');
        }
        if (finiteBtn) {
            finiteBtn.classList.toggle('active', !isInfinite);
            finiteBtn.setAttribute('aria-selected', isInfinite ? 'false' : 'true');
        }

        if (infinitePanel) infinitePanel.classList.toggle('active', isInfinite);
        if (finitePanel) finitePanel.classList.toggle('active', !isInfinite);
    }

    function getCurrentModel() {
        if (activeTab === 'finite') {
            return document.getElementById('queue-model-finite').value;
        }
        return document.getElementById('queue-model-infinite').value;
    }

    function onModelChange() {
        const model = getCurrentModel();
        const optimizeKWait = document.getElementById('optimize-k-wait');
        const manualEconomic = document.getElementById('manual-economic');
        const economicEnabled = document.getElementById('economic-enabled');
        const wantsWaitOptimization = optimizeKWait ? optimizeKWait.checked : false;
        const wantsManualEconomic = manualEconomic ? manualEconomic.checked : false;
        const wantsEconomic = economicEnabled ? economicEnabled.checked : false;

        const needsK = ['mmk', 'mgk', 'finite_mmk', 'mmk_infinite_finite_peps'].includes(model);
        const needsN = ['finite_mm1', 'finite_mmk', 'mmk_infinite_finite_peps'].includes(model);
        const needsEs2 = model === 'mg1';
        const needsCs2 = model === 'mgk';
        const hasPnControls = ['mm1', 'mmk'].includes(model);
        const supportsKOptimization = canOptimizeByK(model);

        toggle('group-k', needsK);
        toggle('group-N', needsN);
        toggle('group-es2', needsEs2);
        toggle('group-cs2', needsCs2);
        toggle('group-n', hasPnControls);
        toggle('group-max-n', hasPnControls);
        toggle('group-k-range-wait', wantsWaitOptimization && supportsKOptimization);
        toggle('group-economic-inputs', wantsEconomic);
        toggle('group-manual-economic', wantsEconomic && wantsManualEconomic);

        if (optimizeKWait) {
            optimizeKWait.disabled = !supportsKOptimization;
            if (!supportsKOptimization) optimizeKWait.checked = false;
        }

        if (manualEconomic) {
            manualEconomic.disabled = !wantsEconomic;
            if (!wantsEconomic) manualEconomic.checked = false;
        }

        const note = document.getElementById('queue-model-note');
        if (note) note.textContent = MODEL_NOTES[model] || '';
    }

    function canOptimizeByK(model) {
        return ['mmk', 'mgk', 'finite_mmk', 'mmk_infinite_finite_peps'].includes(model);
    }

    function toggle(id, show) {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('hidden', !show);
    }

    function getPayload() {
        const model = getCurrentModel();
        const optimizeKWait = document.getElementById('optimize-k-wait');
        const manualEconomic = document.getElementById('manual-economic');
        const economicEnabled = document.getElementById('economic-enabled');
        const wantsEconomic = economicEnabled ? economicEnabled.checked : false;
        const wantsWaitOptimization = optimizeKWait ? optimizeKWait.checked : false;
        const payload = {
            model,
            lambda_rate: parseRealInput(document.getElementById('lambda-rate').value, 'λ'),
            mu: parseRealInput(document.getElementById('mu-rate').value, 'μ'),
            economic_enabled: wantsEconomic,
            optimize_k_wait: wantsWaitOptimization,
        };

        if (!Number.isFinite(payload.lambda_rate) || !Number.isFinite(payload.mu)) {
            throw new Error('λ y μ deben ser numéricos o fracciones válidas (ej: 2/3).');
        }

        if (wantsEconomic) {
            payload.cw = parseRealInput(document.getElementById('cost-cw').value, 'Cw');
            payload.cs = parseRealInput(document.getElementById('cost-cs').value, 'Cs');
            payload.wait_cost_basis = document.getElementById('cost-basis').value;
            payload.manual_economic = manualEconomic ? manualEconomic.checked : false;

            if (!Number.isFinite(payload.cw) || payload.cw < 0) {
                throw new Error('Cw debe ser numérico/fracción y >= 0.');
            }

            if (!Number.isFinite(payload.cs) || payload.cs < 0) {
                throw new Error('Cs debe ser numérico/fracción y >= 0.');
            }
        }

        if (['mmk', 'mgk', 'finite_mmk', 'mmk_infinite_finite_peps'].includes(model)) {
            payload.k = parseInt(document.getElementById('queue-k').value, 10);
        }

        if (['finite_mm1', 'finite_mmk', 'mmk_infinite_finite_peps'].includes(model)) {
            payload.N = parseInt(document.getElementById('queue-N').value, 10);
        }

        if (model === 'mg1') {
            payload.e_s2 = parseRealInput(document.getElementById('queue-es2').value, 'E[S²]');
        }

        if (model === 'mgk') {
            payload.c_s2 = parseRealInput(document.getElementById('queue-cs2').value, 'C_s²');
        }

        if (['mm1', 'mmk'].includes(model)) {
            const nRaw = document.getElementById('queue-n').value.trim();
            payload.max_n = parseInt(document.getElementById('queue-max-n').value, 10);
            if (nRaw !== '') payload.n = parseInt(nRaw, 10);
        }

        if (payload.optimize_k_wait && canOptimizeByK(model)) {
            payload.k_min = parseInt(document.getElementById('k-min').value, 10);
            payload.k_max = parseInt(document.getElementById('k-max').value, 10);
            payload.wait_target_metric = document.getElementById('wait-target-metric').value;
            payload.wait_target_max = parseRealInput(document.getElementById('wait-target-max').value, 'Tiempo máximo objetivo');
            if (!Number.isFinite(payload.k_min) || !Number.isFinite(payload.k_max) || payload.k_min < 1 || payload.k_max < payload.k_min) {
                throw new Error('Rango K inválido: usa 1 <= K mínimo <= K máximo.');
            }
            if (!Number.isFinite(payload.wait_target_max) || payload.wait_target_max < 0) {
                throw new Error('Tiempo máximo objetivo debe ser numérico/fracción y >= 0.');
            }
        }

        if (wantsEconomic && payload.manual_economic) {
            payload.manual_k = parseInt(document.getElementById('manual-k').value, 10);
            payload.manual_wait_metric_value = parseRealInput(document.getElementById('manual-wait-value').value, 'L/Lq manual');

            if (!Number.isFinite(payload.manual_k) || payload.manual_k < 1) {
                throw new Error('K actual manual debe ser entero >= 1.');
            }

            if (!Number.isFinite(payload.manual_wait_metric_value) || payload.manual_wait_metric_value < 0) {
                throw new Error('L/Lq manual debe ser numérico/fracción y >= 0.');
            }
        }

        return payload;
    }

    function parseRealInput(rawValue, fieldName) {
        const raw = String(rawValue ?? '').trim();
        if (raw === '') throw new Error(`${fieldName} no puede estar vacío.`);

        if (raw.includes('/')) {
            const parts = raw.split('/').map((p) => p.trim());
            if (parts.length !== 2 || parts[0] === '' || parts[1] === '') {
                throw new Error(`${fieldName} tiene formato de fracción inválido. Usa a/b.`);
            }
            const numerator = Number(parts[0]);
            const denominator = Number(parts[1]);
            if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) {
                throw new Error(`${fieldName} contiene valores no numéricos.`);
            }
            if (Math.abs(denominator) < 1e-12) {
                throw new Error(`${fieldName} tiene denominador 0.`);
            }
            return numerator / denominator;
        }

        const value = Number(raw);
        if (!Number.isFinite(value)) {
            throw new Error(`${fieldName} debe ser numérico o fracción válida (ej: 2/3).`);
        }
        return value;
    }

    async function calculate() {
        const btn = document.getElementById('btn-queue-calc');
        if (btn) btn.classList.add('loading');

        try {
            const payload = getPayload();
            const response = await fetch(`${API_BASE}/queues/operate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await response.json();
            showResult(data);
        } catch (err) {
            showResult({ success: false, error: err.message || String(err) });
        } finally {
            if (btn) btn.classList.remove('loading');
        }
    }

    function showResult(data) {
        const section = document.getElementById('queue-result-section');
        const title = document.getElementById('queue-result-title');
        const content = document.getElementById('queue-result-content');

        if (!section || !title || !content) return;

        section.classList.remove('hidden');
        content.replaceChildren();

        if (!data.success) {
            title.textContent = 'Error';
            const errorBox = el('div', 'error-message', `⚠️ ${data.error}`);
            content.appendChild(errorBox);
            section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            return;
        }

        const r = data.result;
        title.textContent = `Resultados – ${r.model}`;

        if (r.wait_optimization) {
            content.appendChild(buildWaitOptimizationBlock(r.wait_optimization));
        }

        if (r.economic) {
            content.appendChild(buildEconomicBlock(r.economic));
        }

        content.appendChild(buildMetricsTable(r));
        content.appendChild(renderDiagnosis(buildDiagnosis(r)));

        const formulaHint = renderFormulaHint(r);
        if (formulaHint) content.appendChild(formulaHint);

        if (r.approximation) {
            content.appendChild(el('p', 'matrix-hint', `Aproximación usada: ${r.approximation}`));
        }

        if (Array.isArray(r.probabilities) && r.probabilities.length > 0) {
            content.appendChild(buildProbabilitiesBlock(r.probabilities));
        }

        const interpretation = buildInterpretation(r);
        if (interpretation.length > 0) {
            content.appendChild(buildListBlock('Interpretación', interpretation, 'markov-interpretation'));
        }

        const recommendations = buildRecommendations(r, buildDiagnosis(r));
        if (recommendations.length > 0) {
            content.appendChild(buildListBlock('Recomendaciones', recommendations, 'markov-interpretation queue-reco'));
        }

        section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function buildMetricsTable(r) {
        const wrapper = el('div', 'labeled-matrix-wrapper');
        const table = el('table', 'labeled-matrix queue-metrics-table');

        const header = document.createElement('tr');
        header.appendChild(el('th', '', 'Métrica'));
        header.appendChild(el('th', '', 'Valor'));
        table.appendChild(header);

        const fields = [
            'rho', 'a', 'P0', 'Pn', 'Pw', 'Lq', 'L', 'Wq', 'W',
            'lambda_eff', 'P_system_full', 'E_S2', 'C_s2', 'Pw_MMk'
        ];

        fields.forEach((key) => {
            if (r[key] === undefined) return;
            const row = document.createElement('tr');
            row.appendChild(el('th', '', metricLabel(key)));
            row.appendChild(el('td', '', formatNumber(r[key])));
            table.appendChild(row);
        });

        wrapper.appendChild(table);
        return wrapper;
    }

    function buildEconomicBlock(economic) {
        const block = el('div', 'queue-economic-block');
        block.appendChild(el('h4', '', 'Análisis económico'));
        block.appendChild(el('p', 'matrix-hint', `${economic.formula} usando ${economic.cost_basis}.`));

        if (economic.recommendation_text) {
            block.appendChild(el('p', 'queue-economic-decision', economic.recommendation_text));
        }

        const wrapper = el('div', 'labeled-matrix-wrapper');
        const table = el('table', 'labeled-matrix queue-metrics-table');

        const header = document.createElement('tr');
        header.appendChild(el('th', '', 'Concepto'));
        header.appendChild(el('th', '', 'Valor'));
        table.appendChild(header);

        const rows = [
            ['Cw', formatCurrency(economic.Cw)],
            ['Cs', formatCurrency(economic.Cs)],
            ['K actual', String(economic.K)],
            [`${economic.cost_basis} usado`, formatNumber(economic.wait_metric_value)],
            ['Costo de espera', formatCurrency(economic.waiting_cost)],
            ['Costo de servicio', formatCurrency(economic.service_cost)],
            ['CT (costo total)', formatCurrency(economic.total_cost)],
        ];

        rows.forEach(([name, value]) => {
            const row = document.createElement('tr');
            row.appendChild(el('th', '', name));
            row.appendChild(el('td', '', value));
            table.appendChild(row);
        });

        wrapper.appendChild(table);
        block.appendChild(wrapper);

        if (economic.optimization) {
            block.appendChild(renderOptimization(economic));
        }

        return block;
    }

    function buildWaitOptimizationBlock(opt) {
        const block = el('div', 'queue-optimization-block');
        block.appendChild(el('h4', '', 'Optimización de K por tiempo máximo'));

        if (!opt.enabled) {
            block.appendChild(el('p', 'matrix-hint', opt.message || 'No se pudo ejecutar la optimización por tiempo.'));
            return block;
        }

        block.appendChild(el('p', 'queue-opt-summary', `Objetivo: ${opt.target_metric} ≤ ${formatNumber(opt.target_max)} en K ∈ [${opt.k_min}, ${opt.k_max}].`));

        if (opt.best_feasible) {
            block.appendChild(el('p', 'queue-gain-positive', `Recomendación por servicio: usar K=${opt.best_feasible.K} para cumplir el objetivo con el menor número de servidores.`));
        } else {
            block.appendChild(el('p', 'queue-gain-neutral', 'Ningún K del rango cumple el objetivo de tiempo máximo.'));
        }

        const wrapper = el('div', 'labeled-matrix-wrapper');
        const table = el('table', 'labeled-matrix queue-model-table');

        const header = document.createElement('tr');
        header.appendChild(el('th', '', 'K'));
        header.appendChild(el('th', '', 'Wq'));
        header.appendChild(el('th', '', 'W'));
        header.appendChild(el('th', '', 'Cumple objetivo'));
        table.appendChild(header);

        opt.candidates.forEach((candidate) => {
            const row = document.createElement('tr');
            if (opt.best_feasible && candidate.K === opt.best_feasible.K) row.classList.add('queue-best-row');
            row.appendChild(el('td', '', String(candidate.K)));
            row.appendChild(el('td', '', formatNumber(candidate.Wq)));
            row.appendChild(el('td', '', formatNumber(candidate.W)));
            row.appendChild(el('td', '', candidate.meets_target ? 'Sí' : 'No'));
            table.appendChild(row);
        });

        wrapper.appendChild(table);
        block.appendChild(wrapper);
        return block;
    }

    function renderOptimization(economic) {
        const opt = economic.optimization;
        const block = el('div', 'queue-optimization-block');
        block.appendChild(el('h4', '', 'Optimización discreta de K'));

        if (!opt.enabled) {
            block.appendChild(el('p', 'matrix-hint', opt.message || 'No se pudo ejecutar la optimización.'));
            return block;
        }

        const best = opt.best;
        const savings = Number(opt.savings_vs_current || 0);
        const summary = el('p', 'queue-opt-summary', `Mejor alternativa en [${opt.k_min}, ${opt.k_max}]: K=${best.K} con CT=${formatCurrency(best.total_cost)}.`);
        block.appendChild(summary);

        const gain = el(
            'p',
            savings > 0 ? 'queue-gain-positive' : 'queue-gain-neutral',
            savings > 0
                ? `Ganancia estimada (ahorro vs K actual): ${formatCurrency(savings)} por período.`
                : 'No hay ahorro económico frente al K actual dentro del rango evaluado.'
        );
        block.appendChild(gain);

        const wrapper = el('div', 'labeled-matrix-wrapper');
        const table = el('table', 'labeled-matrix queue-model-table');
        const metricCol = economic.cost_basis;

        const header = document.createElement('tr');
        header.appendChild(el('th', '', 'K'));
        header.appendChild(el('th', '', metricCol));
        header.appendChild(el('th', '', 'Costo espera'));
        header.appendChild(el('th', '', 'Costo servicio'));
        header.appendChild(el('th', '', 'CT'));
        table.appendChild(header);

        opt.candidates.forEach((candidate) => {
            const row = document.createElement('tr');
            if (candidate.K === best.K) row.classList.add('queue-best-row');
            row.appendChild(el('td', '', String(candidate.K)));
            row.appendChild(el('td', '', formatNumber(candidate[metricCol])));
            row.appendChild(el('td', '', formatCurrency(candidate.waiting_cost)));
            row.appendChild(el('td', '', formatCurrency(candidate.service_cost)));
            row.appendChild(el('td', '', formatCurrency(candidate.total_cost)));
            table.appendChild(row);
        });

        wrapper.appendChild(table);
        block.appendChild(wrapper);
        return block;
    }

    function buildProbabilitiesBlock(probabilities) {
        const section = el('div', 'markov-subsection queue-prob-section');
        section.appendChild(el('h4', '', 'Tabla de probabilidades de estado Pn'));

        const wrapper = el('div', 'labeled-matrix-wrapper');
        const table = el('table', 'labeled-matrix');

        const header = document.createElement('tr');
        header.appendChild(el('th', '', 'n'));
        header.appendChild(el('th', '', 'Pn'));
        table.appendChild(header);

        probabilities.forEach((item) => {
            const row = document.createElement('tr');
            row.appendChild(el('td', '', String(item.n)));
            row.appendChild(el('td', '', formatNumber(item.P_n)));
            table.appendChild(row);
        });

        wrapper.appendChild(table);
        section.appendChild(wrapper);
        return section;
    }

    function buildListBlock(title, items, className) {
        const block = el('div', className + ' queue-list-block');
        block.appendChild(el('h4', '', title));
        const ul = document.createElement('ul');
        items.forEach((item) => {
            ul.appendChild(el('li', '', item));
        });
        block.appendChild(ul);
        return block;
    }

    function metricLabel(key) {
        const labels = {
            rho: 'ρ (utilización)',
            a: 'a = λ/μ',
            P0: 'P0',
            Pn: 'Pn',
            Pw: 'Pw (prob. de espera)',
            Lq: 'Lq',
            L: 'L',
            Wq: 'Wq',
            W: 'W',
            lambda_eff: 'λ_eff',
            P_system_full: 'P(sistema lleno)',
            E_S2: 'E[S²]',
            C_s2: 'C_s²',
            Pw_MMk: 'Pw(M/M/k)',
        };
        return labels[key] || key;
    }

    function buildInterpretation(r) {
        const lines = [];
        const modelName = (r.model || '').toLowerCase();

        if (r.rho !== undefined) {
            const rhoValue = Number(r.rho);
            let rhoState = 'operación saludable';
            if (rhoValue >= 0.85 && rhoValue < 1) rhoState = 'alta congestión esperada';
            if (rhoValue >= 1) rhoState = 'sistema inestable';
            lines.push(`ρ = ${formatNumber(r.rho)}: nivel de utilización del sistema (${rhoState}).`);
        }

        if (modelName.includes('m/m/1')) {
            lines.push('M/M/1: toda la demanda depende de un solo servidor; cuando la utilización sube, la cola crece rápido.');
        } else if (modelName.includes('m/m/k')) {
            lines.push('M/M/k: la carga se distribuye entre servidores paralelos; Pw y Wq muestran el beneficio de la capacidad paralela.');
        } else if (modelName.includes('m/g/1')) {
            lines.push('M/G/1: la variabilidad del servicio (E[S²]) impacta directamente la cola.');
        } else if (modelName.includes('m/d/1')) {
            lines.push('M/D/1: el servicio constante suele reducir espera frente a modelos de servicio aleatorio.');
        } else if (modelName.includes('m/g/k')) {
            lines.push('M/G/k: los resultados se basan en una aproximación (Allen–Cunneen).');
        }

        if (r.P0 !== undefined) lines.push(`P0 = ${formatNumber(r.P0)}: probabilidad de sistema vacío.`);
        if (r.Pw !== undefined) lines.push(`Pw = ${formatNumber(r.Pw)}: probabilidad de que un cliente deba esperar.`);
        if (r.Pn !== undefined) lines.push(`Pn = ${formatNumber(r.Pn)}: probabilidad de observar exactamente n clientes en el sistema.`);
        if (r.Lq !== undefined) lines.push(`Lq = ${formatNumber(r.Lq)}: número promedio de clientes esperando en cola.`);
        if (r.L !== undefined) lines.push(`L = ${formatNumber(r.L)}: número promedio de clientes en el sistema (cola + servicio).`);
        if (r.Wq !== undefined) lines.push(`Wq = ${formatNumber(r.Wq)}: tiempo promedio de espera en cola.`);
        if (r.W !== undefined) lines.push(`W = ${formatNumber(r.W)}: tiempo promedio total en el sistema.`);
        if (r.lambda_eff !== undefined) lines.push(`λ_eff = ${formatNumber(r.lambda_eff)}: tasa efectiva de llegada que realmente ingresa al sistema.`);
        if (r.P_system_full !== undefined) lines.push(`P(sistema lleno) = ${formatNumber(r.P_system_full)}: probabilidad de operar al límite de capacidad.`);

        if (modelName.includes('fuente finita') || modelName.includes('/n')) {
            lines.push('Fuente finita: la llegada depende de cuántos clientes están fuera del sistema, por eso λ_eff es clave.');
        }

        return lines;
    }

    function buildDiagnosis(r) {
        const rho = Number.isFinite(r.rho) ? Number(r.rho) : null;
        const pw = Number.isFinite(r.Pw) ? Number(r.Pw) : null;
        const wq = Number.isFinite(r.Wq) ? Number(r.Wq) : null;

        let level = 'ok';
        let title = 'Sistema balanceado';
        let message = 'La carga es manejable y los tiempos de espera están en un rango bajo/moderado.';

        if (rho !== null && rho >= 1) {
            level = 'danger';
            title = 'Sistema inestable';
            message = 'La tasa de llegada supera (o iguala) la capacidad de servicio; la cola tenderá a crecer sin límite.';
        } else if ((rho !== null && rho >= 0.9) || (pw !== null && pw >= 0.8) || (wq !== null && wq >= 1)) {
            level = 'warn';
            title = 'Sistema congestionado';
            message = 'Hay alta probabilidad de espera y tiempos de cola elevados.';
        } else if ((rho !== null && rho >= 0.75) || (pw !== null && pw >= 0.5)) {
            level = 'mid';
            title = 'Carga media-alta';
            message = 'El sistema opera, pero está cerca de zona de congestión en picos de demanda.';
        }

        return { level, title, message };
    }

    function renderDiagnosis(d) {
        const block = el('div', `queue-diagnosis ${d.level}`);
        const badgeClass = { ok: 'badge-ok', mid: 'badge-mid', warn: 'badge-warn', danger: 'badge-danger' }[d.level] || 'badge';
        const badgeText = { ok: 'Semáforo: Verde', mid: 'Semáforo: Amarillo', warn: 'Semáforo: Naranja', danger: 'Semáforo: Rojo' }[d.level] || 'Semáforo';

        const badgeWrap = el('div', 'classification-info queue-badge-wrap');
        badgeWrap.appendChild(el('span', `badge ${badgeClass}`, badgeText));

        block.appendChild(badgeWrap);
        block.appendChild(el('h4', 'queue-diagnosis-title', d.title));
        block.appendChild(el('p', 'matrix-hint queue-diagnosis-text', d.message));
        return block;
    }

    function renderFormulaHint(r) {
        const modelName = (r.model || '').toLowerCase();
        let formulaText = '';

        if (modelName.includes('m/m/1')) {
            formulaText = 'Relaciones clave: ρ = λ/μ, W = 1/(μ-λ), Wq = ρ/(μ-λ).';
        } else if (modelName.includes('m/m/k')) {
            formulaText = 'Relaciones clave: ρ = λ/(kμ), Pw por Erlang-C, W = Wq + 1/μ.';
        } else if (modelName.includes('m/g/1')) {
            formulaText = 'Pollaczek–Khinchine: Lq = λ²E[S²] / (2(1-ρ)).';
        } else if (modelName.includes('m/d/1')) {
            formulaText = 'Relación clave: Lq = ρ² / (2(1-ρ)) con servicio determinista.';
        } else if (modelName.includes('m/g/k')) {
            formulaText = 'Aproximación de Allen–Cunneen basada en Pw(M/M/k) y C_s².';
        } else if (modelName.includes('/n') || modelName.includes('fuente finita')) {
            formulaText = 'Fuente finita: λ_eff depende de la población restante fuera del sistema.';
        }

        if (!formulaText) return null;
        const block = el('div', 'queue-formula-hint');
        block.appendChild(el('strong', '', 'Recordatorio teórico: '));
        block.appendChild(document.createTextNode(formulaText));
        return block;
    }

    function buildRecommendations(r, diagnosis) {
        const tips = [];
        const rho = Number.isFinite(r.rho) ? Number(r.rho) : null;
        const modelName = (r.model || '').toLowerCase();

        if (diagnosis.level === 'danger' || diagnosis.level === 'warn') {
            tips.push('Evaluar incremento de capacidad de servicio (μ) o número de servidores (k).');
            tips.push('Reducir variabilidad operativa (lotes, tiempos muertos, interrupciones) para bajar Wq.');
        }

        if (rho !== null && rho >= 0.8 && modelName.includes('m/m/1')) {
            tips.push('En M/M/1, una pequeña mejora en μ puede reducir significativamente la espera cuando ρ está cerca de 1.');
        }

        if (modelName.includes('m/g/1') || modelName.includes('m/g/k')) {
            tips.push('Controlar la variabilidad del servicio ayuda directamente a disminuir la cola (impacto de E[S²] y C_s²).');
        }

        if (r.P_system_full !== undefined) {
            tips.push('Si la probabilidad de sistema lleno es alta, revisar política de capacidad o reglas de admisión.');
        }

        if (modelName.includes('/n') || modelName.includes('fuente finita')) {
            tips.push('En fuente finita, monitorear λ_eff para estimar productividad real del sistema y no solo λ nominal.');
        }

        if (tips.length === 0) {
            tips.push('Desempeño aceptable: mantener monitoreo periódico de ρ, Wq y Pw para detectar picos de demanda.');
        }

        return tips;
    }

    function formatNumber(value) {
        if (typeof value !== 'number') return String(value);
        if (!Number.isFinite(value)) return String(value);
        if (Math.abs(value) >= 1e9 || (Math.abs(value) > 0 && Math.abs(value) < 1e-6)) {
            return value.toExponential(6);
        }
        const rounded = Number(value.toFixed(8));
        return rounded.toLocaleString('es-BO', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 8,
            useGrouping: false,
        });
    }

    function formatCurrency(value) {
        const amount = typeof value === 'number' ? value : Number(value);
        if (!Number.isFinite(amount)) return `$ ${String(value)}`;
        return `$ ${formatNumber(amount)}`;
    }

    function el(tag, className = '', text = '') {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text) node.textContent = text;
        return node;
    }

    document.addEventListener('DOMContentLoaded', init);

    return {
        calculate,
    };
})();
