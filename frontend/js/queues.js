const QueueApp = (() => {
    const API_BASE = window.location.origin + '/api';

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
        document.getElementById('queue-model').addEventListener('change', onModelChange);
        onModelChange();
    }

    function onModelChange() {
        const model = document.getElementById('queue-model').value;

        const needsK = ['mmk', 'mgk', 'finite_mmk', 'mmk_infinite_finite_peps'].includes(model);
        const needsN = ['finite_mm1', 'finite_mmk', 'mmk_infinite_finite_peps'].includes(model);
        const needsEs2 = model === 'mg1';
        const needsCs2 = model === 'mgk';
        const hasPnControls = ['mm1', 'mmk'].includes(model);

        toggle('group-k', needsK);
        toggle('group-N', needsN);
        toggle('group-es2', needsEs2);
        toggle('group-cs2', needsCs2);
        toggle('group-n', hasPnControls);
        toggle('group-max-n', hasPnControls);

        document.getElementById('queue-model-note').textContent = MODEL_NOTES[model] || '';
    }

    function toggle(id, show) {
        document.getElementById(id).classList.toggle('hidden', !show);
    }

    function getPayload() {
        const model = document.getElementById('queue-model').value;
        const payload = {
            model,
            lambda_rate: parseFloat(document.getElementById('lambda-rate').value),
            mu: parseFloat(document.getElementById('mu-rate').value),
        };

        if (!Number.isFinite(payload.lambda_rate) || !Number.isFinite(payload.mu)) {
            throw new Error('λ y μ deben ser numéricos.');
        }

        if (['mmk', 'mgk', 'finite_mmk', 'mmk_infinite_finite_peps'].includes(model)) {
            payload.k = parseInt(document.getElementById('queue-k').value, 10);
        }

        if (['finite_mm1', 'finite_mmk', 'mmk_infinite_finite_peps'].includes(model)) {
            payload.N = parseInt(document.getElementById('queue-N').value, 10);
        }

        if (model === 'mg1') {
            payload.e_s2 = parseFloat(document.getElementById('queue-es2').value);
        }

        if (model === 'mgk') {
            payload.c_s2 = parseFloat(document.getElementById('queue-cs2').value);
        }

        if (['mm1', 'mmk'].includes(model)) {
            const nRaw = document.getElementById('queue-n').value.trim();
            payload.max_n = parseInt(document.getElementById('queue-max-n').value, 10);
            if (nRaw !== '') payload.n = parseInt(nRaw, 10);
        }

        return payload;
    }

    async function calculate() {
        const btn = document.getElementById('btn-queue-calc');
        btn.classList.add('loading');

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
            btn.classList.remove('loading');
        }
    }

    function showResult(data) {
        const section = document.getElementById('queue-result-section');
        const title = document.getElementById('queue-result-title');
        const content = document.getElementById('queue-result-content');

        section.classList.remove('hidden');

        if (!data.success) {
            title.textContent = 'Error';
            content.innerHTML = `<div class="error-message">⚠️ ${data.error}</div>`;
            section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            return;
        }

        const r = data.result;
        title.textContent = `Resultados – ${r.model}`;

        const fields = [
            'rho', 'a', 'P0', 'Pn', 'Pw', 'Lq', 'L', 'Wq', 'W',
            'lambda_eff', 'P_system_full', 'E_S2', 'C_s2', 'Pw_MMk'
        ];

        const metricRows = fields
            .filter(key => r[key] !== undefined)
            .map(key => `
                <tr>
                    <th>${metricLabel(key)}</th>
                    <td>${formatNumber(r[key])}</td>
                </tr>
            `).join('');

        let html = `
            <div class="labeled-matrix-wrapper">
                <table class="labeled-matrix queue-metrics-table">
                    <tr><th>Métrica</th><th>Valor</th></tr>
                    ${metricRows}
                </table>
            </div>
        `;

        const diagnosis = buildDiagnosis(r);
        html += renderDiagnosis(diagnosis);

        html += renderFormulaHint(r);

        if (r.approximation) {
            html += `<p class="matrix-hint" style="margin-top:0.8rem">Aproximación usada: <strong>${r.approximation}</strong></p>`;
        }

        if (Array.isArray(r.probabilities) && r.probabilities.length > 0) {
            html += `
                <div class="markov-subsection" style="margin-top:1rem; border-bottom:none;">
                    <h4>Tabla de probabilidades de estado Pn</h4>
                    <div class="labeled-matrix-wrapper">
                        <table class="labeled-matrix">
                            <tr><th>n</th><th>Pn</th></tr>
                            ${r.probabilities.map(item => `
                                <tr>
                                    <td>${item.n}</td>
                                    <td>${formatNumber(item.P_n)}</td>
                                </tr>
                            `).join('')}
                        </table>
                    </div>
                </div>
            `;
        }

        const interpretation = buildInterpretation(r);
        if (interpretation.length > 0) {
            html += `
                <div class="markov-interpretation" style="margin-top:1rem;">
                    <h4>Interpretación</h4>
                    <ul>
                        ${interpretation.map(item => `<li>${item}</li>`).join('')}
                    </ul>
                </div>
            `;
        }

        const recommendations = buildRecommendations(r, diagnosis);
        if (recommendations.length > 0) {
            html += `
                <div class="markov-interpretation queue-reco" style="margin-top:1rem;">
                    <h4>Recomendaciones</h4>
                    <ul>
                        ${recommendations.map(item => `<li>${item}</li>`).join('')}
                    </ul>
                </div>
            `;
        }

        content.innerHTML = html;
        section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
            lines.push(`<strong>ρ = ${formatNumber(r.rho)}</strong>: nivel de utilización del sistema. En este caso indica <strong>${rhoState}</strong>.`);
        }

        if (modelName.includes('m/m/1')) {
            lines.push('En <strong>M/M/1</strong>, toda la demanda depende de un solo servidor: cuando la utilización sube, la cola crece rápidamente.');
        } else if (modelName.includes('m/m/k')) {
            lines.push('En <strong>M/M/k</strong>, la carga se distribuye entre varios servidores, por lo que <strong>Pw</strong> y <strong>Wq</strong> muestran el efecto real de tener capacidad paralela.');
        } else if (modelName.includes('m/g/1')) {
            lines.push('En <strong>M/G/1</strong>, la variabilidad del servicio (vía <strong>E[S²]</strong>) impacta directamente la cola: mayor variabilidad implica mayor espera.');
        } else if (modelName.includes('m/d/1')) {
            lines.push('En <strong>M/D/1</strong>, el servicio es constante (sin variabilidad), por eso suele tener menor espera que modelos con servicio aleatorio para la misma carga.');
        } else if (modelName.includes('m/g/k')) {
            lines.push('En <strong>M/G/k</strong>, los resultados son aproximados (Allen–Cunneen): útiles para planificación cuando el servicio no es exponencial.');
        }

        if (r.P0 !== undefined) {
            lines.push(`<strong>P0 = ${formatNumber(r.P0)}</strong>: probabilidad de sistema vacío (ningún cliente esperando ni siendo atendido).`);
        }
        if (r.Pw !== undefined) {
            lines.push(`<strong>Pw = ${formatNumber(r.Pw)}</strong>: probabilidad de que un cliente deba esperar antes de iniciar servicio.`);
        }
        if (r.Pn !== undefined) {
            lines.push(`<strong>Pn = ${formatNumber(r.Pn)}</strong>: probabilidad de observar exactamente <strong>n</strong> clientes en el sistema.`);
        }

        if (r.Lq !== undefined) {
            lines.push(`<strong>Lq = ${formatNumber(r.Lq)}</strong>: tamaño promedio de la cola. Es cuántos clientes, en promedio, están esperando.`);
        }
        if (r.L !== undefined) {
            lines.push(`<strong>L = ${formatNumber(r.L)}</strong>: clientes promedio en todo el sistema (espera + servicio).`);
        }
        if (r.Wq !== undefined) {
            lines.push(`<strong>Wq = ${formatNumber(r.Wq)}</strong>: tiempo promedio que un cliente tarda en comenzar a ser atendido.`);
        }
        if (r.W !== undefined) {
            lines.push(`<strong>W = ${formatNumber(r.W)}</strong>: tiempo promedio total dentro del sistema desde que llega hasta que termina servicio.`);
        }

        if (r.lambda_eff !== undefined) {
            lines.push(`<strong>λ_eff = ${formatNumber(r.lambda_eff)}</strong>: tasa efectiva de entrada al sistema (especialmente relevante con fuente finita).`);
        }
        if (r.P_system_full !== undefined) {
            lines.push(`<strong>P(sistema lleno) = ${formatNumber(r.P_system_full)}</strong>: probabilidad de operar al límite de capacidad.`);
        }

        if (modelName.includes('fuente finita') || modelName.includes('/n')) {
            lines.push('En <strong>fuente finita</strong>, la llegada depende de cuántos clientes aún están fuera del sistema, por eso se reporta <strong>λ_eff</strong>.');
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
            message = 'La tasa de llegada supera (o iguala) la capacidad de servicio. En operación real, la cola crecerá sin límite.';
        } else if (
            (rho !== null && rho >= 0.9) ||
            (pw !== null && pw >= 0.8) ||
            (wq !== null && wq >= 1)
        ) {
            level = 'warn';
            title = 'Sistema congestionado';
            message = 'Hay alta probabilidad de espera y tiempos de cola elevados; el usuario percibirá demoras frecuentes.';
        } else if (
            (rho !== null && rho >= 0.75) ||
            (pw !== null && pw >= 0.5)
        ) {
            level = 'mid';
            title = 'Carga media-alta';
            message = 'El sistema funciona, pero está cerca de zona de congestión en horas pico.';
        }

        return { level, title, message };
    }

    function renderDiagnosis(d) {
        const badgeClass = {
            ok: 'badge-ok',
            mid: 'badge-mid',
            warn: 'badge-warn',
            danger: 'badge-danger',
        }[d.level] || 'badge';

        const badgeText = {
            ok: 'Semáforo: Verde',
            mid: 'Semáforo: Amarillo',
            warn: 'Semáforo: Naranja',
            danger: 'Semáforo: Rojo',
        }[d.level] || 'Semáforo';

        return `
            <div class="queue-diagnosis ${d.level}">
                <div class="classification-info" style="margin-bottom:0.4rem;">
                    <span class="badge ${badgeClass}">${badgeText}</span>
                </div>
                <h4 style="margin-bottom:0.2rem;">${d.title}</h4>
                <p class="matrix-hint" style="margin:0;">${d.message}</p>
            </div>
        `;
    }

    function renderFormulaHint(r) {
        const modelName = (r.model || '').toLowerCase();
        let formulaText = '';

        if (modelName.includes('m/m/1')) {
            formulaText = 'Relaciones clave: ρ = λ/μ, W = 1/(μ-λ), Wq = ρ/(μ-λ).';
        } else if (modelName.includes('m/m/k')) {
            formulaText = 'Relaciones clave: ρ = λ/(kμ), Pw con Erlang-C, W = Wq + 1/μ.';
        } else if (modelName.includes('m/g/1')) {
            formulaText = 'Relaciones clave (Pollaczek–Khinchine): Lq = λ²E[S²]/(2(1-ρ)).';
        } else if (modelName.includes('m/d/1')) {
            formulaText = 'Relación clave: Lq = ρ² / (2(1-ρ)), con servicio determinista.';
        } else if (modelName.includes('m/g/k')) {
            formulaText = 'Se usa aproximación Allen–Cunneen basada en Pw(M/M/k) y C_s².';
        } else if (modelName.includes('/n') || modelName.includes('fuente finita')) {
            formulaText = 'Fuente finita: λ_eff depende de la población restante fuera del sistema.';
        }

        if (!formulaText) return '';

        return `
            <div class="queue-formula-hint">
                <strong>Recordatorio teórico:</strong> ${formulaText}
            </div>
        `;
    }

    function buildRecommendations(r, diagnosis) {
        const tips = [];
        const rho = Number.isFinite(r.rho) ? Number(r.rho) : null;
        const modelName = (r.model || '').toLowerCase();

        if (diagnosis.level === 'danger' || diagnosis.level === 'warn') {
            tips.push('Evaluar incremento de capacidad de servicio (<strong>μ</strong>) o número de servidores (<strong>k</strong>).');
            tips.push('Reducir variabilidad operativa (lotes, tiempos muertos, interrupciones) para bajar <strong>Wq</strong>.');
        }

        if (rho !== null && rho >= 0.8 && modelName.includes('m/m/1')) {
            tips.push('Para <strong>M/M/1</strong>, una pequeña mejora en μ puede reducir mucho la espera cuando ρ está cerca de 1.');
        }

        if (modelName.includes('m/g/1') || modelName.includes('m/g/k')) {
            tips.push('Controlar la variabilidad del servicio ayuda directamente a disminuir la cola (impacto de <strong>E[S²]</strong> y <strong>C_s²</strong>).');
        }

        if (r.P_system_full !== undefined) {
            tips.push('Si la probabilidad de sistema lleno es alta, revisar política de capacidad o reglas de admisión.');
        }

        if (modelName.includes('/n') || modelName.includes('fuente finita')) {
            tips.push('En fuente finita, monitorear <strong>λ_eff</strong> para estimar productividad real del sistema, no solo λ nominal.');
        }

        if (tips.length === 0) {
            tips.push('El desempeño es aceptable. Conviene mantener monitoreo periódico de ρ, Wq y Pw para detectar picos de demanda.');
        }

        return tips;
    }

    function formatNumber(value) {
        if (typeof value !== 'number') return String(value);
        if (!Number.isFinite(value)) return String(value);
        if (Math.abs(value) >= 1000 || (Math.abs(value) > 0 && Math.abs(value) < 1e-4)) {
            return value.toExponential(6);
        }
        return Number(value.toFixed(8)).toString();
    }

    document.addEventListener('DOMContentLoaded', init);

    return {
        calculate,
    };
})();
