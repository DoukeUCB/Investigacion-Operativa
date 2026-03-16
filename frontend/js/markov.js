/**
 * markov.js – Controlador para Cadenas de Markov (estados transitorios / ergódicas)
 *
 * Operaciones:
 *  1. Chapman-Kolmogorov:  π(n) = π(0) · P^n
 *  2. Estado estacionario: πP = π,  Σπᵢ = 1
 *  3. Tiempo medio de primer pasaje: M_ij
 *  4. Análisis completo
 */

const MarkovApp = (() => {
    const API_BASE = window.location.origin + '/api';
    let initialized = false;
    let currentSize = 2;

    // ═══════════════ Inicialización ═══════════════

    function init() {
        if (initialized) return;
        initialized = true;

        currentSize = parseInt(document.getElementById('markov-size').value) || 2;

        // Event listeners
        document.getElementById('markov-size').addEventListener('change', onSizeChange);

        // Construir grids
        buildAll();
    }

    function buildAll() {
        currentSize = parseInt(document.getElementById('markov-size').value) || 2;
        MatrixUI.buildGrid('p', currentSize, currentSize);
        buildPi0Grid(currentSize);
        buildStateNameInputs(currentSize);
        updateRowSums();

        // Listener para actualizar sumas de filas en tiempo real
        const pGrid = document.getElementById('matrix-p-grid');
        pGrid.addEventListener('input', updateRowSums);
    }

    function onSizeChange() {
        buildAll();
    }

    // ═══════════════ Grids auxiliares ═══════════════

    function buildPi0Grid(n) {
        const container = document.getElementById('markov-pi0-grid');
        container.innerHTML = '';

        for (let i = 0; i < n; i++) {
            const wrapper = document.createElement('div');
            wrapper.className = 'pi0-entry';

            const label = document.createElement('span');
            label.className = 'pi0-label';
            label.textContent = `π${i + 1}(0)`;
            label.id = `pi0-label-${i}`;

            const input = document.createElement('input');
            input.type = 'number';
            input.step = 'any';
            input.min = '0';
            input.max = '1';
            input.placeholder = '0';
            input.id = `pi0-${i}`;
            input.value = i === 0 ? '1' : '0';

            wrapper.appendChild(label);
            wrapper.appendChild(input);
            container.appendChild(wrapper);
        }
    }

    function buildStateNameInputs(n) {
        const container = document.getElementById('markov-state-names');
        container.innerHTML = '';

        for (let i = 0; i < n; i++) {
            const input = document.createElement('input');
            input.type = 'text';
            input.placeholder = `Estado ${i + 1}`;
            input.id = `state-name-${i}`;
            input.className = 'state-name-input';
            input.maxLength = 20;
            container.appendChild(input);
        }
    }

    function updateRowSums() {
        const container = document.getElementById('markov-row-sums');
        const n = currentSize;
        let html = '<div class="row-sums-grid">';

        for (let i = 0; i < n; i++) {
            let sum = 0;
            for (let j = 0; j < n; j++) {
                const inp = document.getElementById(`m-p-${i}-${j}`);
                if (inp) sum += parseFloat(inp.value) || 0;
            }
            const isValid = Math.abs(sum - 1.0) < 0.001;
            html += `<span class="row-sum ${isValid ? 'valid' : 'invalid'}">Σ fila ${i + 1} = ${sum.toFixed(3)}</span>`;
        }

        html += '</div>';
        container.innerHTML = html;
    }

    // ═══════════════ Leer datos ═══════════════

    function readMatrixP() {
        return MatrixUI.readMatrix('p');
    }

    function readPi0() {
        const n = currentSize;
        const pi = [];
        for (let i = 0; i < n; i++) {
            const inp = document.getElementById(`pi0-${i}`);
            pi.push(inp ? (parseFloat(inp.value) || 0) : 0);
        }
        return pi;
    }

    function readStateNames() {
        const n = currentSize;
        const names = [];
        for (let i = 0; i < n; i++) {
            const inp = document.getElementById(`state-name-${i}`);
            const val = inp ? inp.value.trim() : '';
            names.push(val || `Estado ${i + 1}`);
        }
        return names;
    }

    function clearPi0() {
        for (let i = 0; i < currentSize; i++) {
            const inp = document.getElementById(`pi0-${i}`);
            if (inp) inp.value = '';
        }
    }

    // ═══════════════ Ejemplo predefinido ═══════════════

    function loadExample() {
        // Ejemplo clásico: clima (Soleado, Nublado, Lluvioso)
        document.getElementById('markov-size').value = '3';
        onSizeChange();

        // Nombres
        const names = ['Soleado', 'Nublado', 'Lluvioso'];
        names.forEach((name, i) => {
            const inp = document.getElementById(`state-name-${i}`);
            if (inp) inp.value = name;
        });

        // Matriz P
        const P = [
            [0.7, 0.2, 0.1],
            [0.3, 0.4, 0.3],
            [0.2, 0.3, 0.5],
        ];
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                const inp = document.getElementById(`m-p-${i}-${j}`);
                if (inp) inp.value = P[i][j];
            }
        }

        // Vector π(0) — empieza en "Soleado"
        const pi0 = [1, 0, 0];
        pi0.forEach((v, i) => {
            const inp = document.getElementById(`pi0-${i}`);
            if (inp) inp.value = v;
        });

        // Pasos
        document.getElementById('markov-steps').value = '5';

        updateRowSums();
    }

    // ═══════════════ Llamadas al backend ═══════════════

    async function run(operation) {
        const P = readMatrixP();
        const pi0 = readPi0();
        const steps = parseInt(document.getElementById('markov-steps').value) || 1;
        const names = readStateNames();

        const payload = {
            operation: operation,
            matrix_p: P,
            pi_0: pi0,
            steps: steps,
            state_names: names,
        };

        try {
            const response = await fetch(`${API_BASE}/markov/operate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await response.json();
            showMarkovResult(data);
        } catch (err) {
            showMarkovResult({
                success: false,
                error: `Error de conexión: ${err.message}`,
            });
        }
    }

    async function runFullAnalysis() {
        const P = readMatrixP();
        const pi0 = readPi0();
        const steps = parseInt(document.getElementById('markov-steps').value) || 1;
        const names = readStateNames();

        const payload = {
            operation: 'full_analysis',
            matrix_p: P,
            pi_0: pi0,
            steps: steps,
            state_names: names,
        };

        const btn = document.getElementById('btn-markov-full');
        btn.classList.add('loading');

        try {
            const response = await fetch(`${API_BASE}/markov/operate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await response.json();
            showMarkovResult(data);
        } catch (err) {
            showMarkovResult({
                success: false,
                error: `Error de conexión: ${err.message}`,
            });
        } finally {
            btn.classList.remove('loading');
        }
    }

    // ═══════════════ Renderizado de resultados ═══════════════

    function showMarkovResult(data) {
        const section = document.getElementById('markov-result-section');
        const container = document.getElementById('markov-results-container');
        section.classList.remove('hidden');

        if (!data.success) {
            container.innerHTML = `
                <div class="result-card error">
                    <div class="result-header"><h3>Error</h3></div>
                    <div class="error-message">⚠️ ${data.error}</div>
                </div>`;
            section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            return;
        }

        const result = data.result;
        let html = '';

        switch (result.type) {
            case 'chapman_kolmogorov':
                html = renderChapmanKolmogorov(result);
                break;
            case 'steady_state':
                html = renderSteadyState(result);
                break;
            case 'mean_first_passage':
                html = renderMeanFirstPassage(result);
                break;
            case 'full_analysis':
                html = renderFullAnalysis(result);
                break;
            default:
                html = `<div class="result-card"><pre>${JSON.stringify(result, null, 2)}</pre></div>`;
        }

        container.innerHTML = html;
        section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // ── Chapman-Kolmogorov ──
    function renderChapmanKolmogorov(r) {
        const names = r.state_names;
        return `
        <div class="result-card markov-result-card">
            <div class="result-header">
                <h3>Chapman-Kolmogorov — π(${r.steps}) = π(0) · P<sup>${r.steps}</sup></h3>
            </div>

            <div class="markov-subsection">
                <h4>Vector π(0) (estado inicial)</h4>
                ${renderStateVector(r.pi_0, names, r.total_units)}
            </div>

            <div class="markov-subsection">
                <h4>Vector π(${r.steps}) (estado en el paso ${r.steps})</h4>
                ${renderStateVector(r.pi_n, names, r.total_units)}
            </div>

            <div class="markov-subsection">
                <h4>Matriz P<sup>${r.steps}</sup> (probabilidades de transición a ${r.steps} pasos)</h4>
                ${renderLabeledMatrix(r.P_n, names)}
            </div>
        </div>`;
    }

    // ── Estado estacionario ──
    function renderSteadyState(r) {
        const names = r.state_names;
        const hasCounts = Array.isArray(r.final_counts);
        return `
        <div class="result-card markov-result-card">
            <div class="result-header">
                <h3>Distribución Estacionaria — πP = π</h3>
            </div>

            <div class="markov-subsection">
                <h4>Sistema de ecuaciones</h4>
                <div class="equations-block">
                    ${r.equations.map(eq => `<div class="equation">${eq}</div>`).join('')}
                </div>
            </div>

            <div class="markov-subsection">
                <h4>Vector estacionario π</h4>
                ${renderProbVector(r.pi, names)}
            </div>

            ${hasCounts ? `
            <div class="markov-subsection">
                <h4>Proyección en cantidades (total = ${r.total_units})</h4>
                ${renderStateVector(r.final_counts, names, r.total_units)}
            </div>` : ''}

            <div class="markov-interpretation">
                <h4>Interpretación</h4>
                <ul>
                    ${names.map((name, i) =>
                        `<li>A largo plazo, el sistema estará en <strong>${name}</strong> el <strong>${(r.pi[i] * 100).toFixed(2)}%</strong> del tiempo.</li>`
                    ).join('')}
                </ul>
            </div>
        </div>`;
    }

    // ── Tiempo medio de primer pasaje ──
    function renderMeanFirstPassage(r) {
        const names = r.state_names;
        return `
        <div class="result-card markov-result-card">
            <div class="result-header">
                <h3>Tiempo Medio de Primer Pasaje</h3>
            </div>

            <div class="markov-subsection">
                <h4>Distribución estacionaria π</h4>
                ${renderProbVector(r.pi, names)}
            </div>

            <div class="markov-subsection">
                <h4>Matriz M (M_ij = pasos esperados de i → j)</h4>
                ${renderLabeledMatrix(r.M, names)}
            </div>

            <div class="markov-interpretation">
                <h4>Interpretación</h4>
                <ul>
                    ${buildMFPTInterpretation(r.M, names)}
                </ul>
            </div>
        </div>`;
    }

    // ── Análisis completo ──
    function renderFullAnalysis(r) {
        const names = r.state_names;
        let html = '';

        // Clasificación
        html += `
        <div class="result-card markov-result-card">
            <div class="result-header">
                <h3>Análisis Completo de la Cadena de Markov</h3>
            </div>
            <div class="markov-subsection">
                <h4>Clasificación</h4>
                <div class="classification-info">
                    <span class="badge">${r.classification.num_states} estados</span>
                    <span class="badge ${r.classification.is_irreducible ? 'badge-ok' : 'badge-warn'}">
                        ${r.classification.is_irreducible ? 'Irreducible ✓' : 'Reducible ⚠'}
                    </span>
                    <span class="badge ${r.classification.is_ergodic ? 'badge-ok' : 'badge-warn'}">
                        ${r.classification.is_ergodic ? 'Ergódica ✓' : 'No ergódica ⚠'}
                    </span>
                </div>
            </div>
        </div>`;

        // Estado estacionario
        html += `
        <div class="result-card markov-result-card">
            <div class="result-header">
                <h3>1. Distribución Estacionaria — πP = π, Σπᵢ = 1</h3>
            </div>

            <div class="markov-subsection">
                <h4>Sistema de ecuaciones resuelto</h4>
                <div class="equations-block">
                    ${r.steady_state.equations.map(eq => `<div class="equation">${eq}</div>`).join('')}
                </div>
            </div>

            <div class="markov-subsection">
                <h4>Solución: Vector estacionario π</h4>
                ${renderProbVector(r.steady_state.pi, names)}
            </div>

            ${Array.isArray(r.steady_state.final_counts) ? `
            <div class="markov-subsection">
                <h4>Proyección en cantidades (total = ${r.steady_state.total_units})</h4>
                ${renderStateVector(r.steady_state.final_counts, names, r.steady_state.total_units)}
            </div>` : ''}

            <div class="markov-interpretation">
                <h4>Interpretación</h4>
                <ul>
                    ${names.map((name, i) =>
                        `<li><strong>${name}:</strong> probabilidad estacionaria = <strong>${(r.steady_state.pi[i] * 100).toFixed(2)}%</strong></li>`
                    ).join('')}
                </ul>
            </div>
        </div>`;

        // Primer pasaje
        html += `
        <div class="result-card markov-result-card">
            <div class="result-header">
                <h3>2. Tiempo Medio de Primer Pasaje</h3>
            </div>
            <p class="formula-note">M_ij = 1 + Σ<sub>k≠j</sub> p<sub>ik</sub> · m<sub>kj</sub> &nbsp;|&nbsp; Usando Z = (I − P + W)<sup>−1</sup></p>

            <div class="markov-subsection">
                <h4>Matriz M (pasos esperados de estado i → estado j)</h4>
                ${renderLabeledMatrix(r.mean_first_passage.M, names)}
            </div>

            <div class="markov-interpretation">
                <h4>Interpretación</h4>
                <ul>
                    ${buildMFPTInterpretation(r.mean_first_passage.M, names)}
                </ul>
            </div>
        </div>`;

        // Chapman-Kolmogorov (si se proporcionó π(0))
        if (r.chapman_kolmogorov) {
            const ck = r.chapman_kolmogorov;
            html += `
            <div class="result-card markov-result-card">
                <div class="result-header">
                    <h3>3. Chapman-Kolmogorov — π(${ck.steps}) = π(0) · P<sup>${ck.steps}</sup></h3>
                </div>

                <div class="markov-subsection">
                    <h4>Vector π(0)</h4>
                    ${renderStateVector(ck.pi_0, names, ck.total_units)}
                </div>

                <div class="markov-subsection">
                    <h4>Vector π(${ck.steps})</h4>
                    ${renderStateVector(ck.pi_n, names, ck.total_units)}
                </div>

                <div class="markov-subsection">
                    <h4>Matriz P<sup>${ck.steps}</sup></h4>
                    ${renderLabeledMatrix(ck.P_n, names)}
                </div>
            </div>`;
        }

        return html;
    }

    // ═══════════════ Helpers de renderizado ═══════════════

    function renderProbVector(vec, names) {
        let html = '<div class="prob-vector">';
        vec.forEach((v, i) => {
            const pct = (v * 100).toFixed(2);
            const display = Number.isInteger(v) ? v : parseFloat(v.toFixed(6));
            html += `
            <div class="prob-item">
                <div class="prob-bar-bg">
                    <div class="prob-bar" style="width:${Math.min(pct, 100)}%"></div>
                </div>
                <span class="prob-name">${names[i]}</span>
                <span class="prob-value">${display}</span>
                <span class="prob-pct">(${pct}%)</span>
            </div>`;
        });
        html += '</div>';
        return html;
    }

    function renderStateVector(vec, names, totalUnits = null) {
        const total = totalUnits && totalUnits > 0
            ? totalUnits
            : vec.reduce((a, b) => a + b, 0);

        let html = '<div class="prob-vector">';
        vec.forEach((v, i) => {
            const pct = total > 0 ? ((v / total) * 100) : 0;
            const display = Number.isInteger(v) ? v : parseFloat(v.toFixed(6));
            html += `
            <div class="prob-item">
                <div class="prob-bar-bg">
                    <div class="prob-bar" style="width:${Math.min(pct, 100)}%"></div>
                </div>
                <span class="prob-name">${names[i]}</span>
                <span class="prob-value">${display}</span>
                <span class="prob-pct">(${pct.toFixed(2)}%)</span>
            </div>`;
        });
        html += '</div>';
        return html;
    }

    function renderLabeledMatrix(matrix, names) {
        const n = matrix.length;
        let html = '<div class="labeled-matrix-wrapper"><table class="labeled-matrix">';

        // Header row
        html += '<tr><th class="corner-cell">De \\ A</th>';
        for (let j = 0; j < n; j++) {
            html += `<th>${names[j]}</th>`;
        }
        html += '</tr>';

        // Data rows
        for (let i = 0; i < n; i++) {
            html += `<tr><th>${names[i]}</th>`;
            for (let j = 0; j < n; j++) {
                let val = matrix[i][j];
                val = Number.isInteger(val) ? val : parseFloat(val.toFixed(4));
                html += `<td>${val}</td>`;
            }
            html += '</tr>';
        }

        html += '</table></div>';
        return html;
    }

    function buildMFPTInterpretation(M, names) {
        const n = names.length;
        let items = '';

        // Diagonal: tiempos de recurrencia
        for (let i = 0; i < n; i++) {
            items += `<li>Tiempo de retorno a <strong>${names[i]}</strong>: <strong>${parseFloat(M[i][i].toFixed(2))}</strong> pasos</li>`;
        }

        // Algunos pares relevantes
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                if (i !== j) {
                    items += `<li>De <strong>${names[i]}</strong> → <strong>${names[j]}</strong>: <strong>${parseFloat(M[i][j].toFixed(2))}</strong> pasos en promedio</li>`;
                }
            }
        }

        return items;
    }

    // ═══════════════ API pública ═══════════════

    return {
        init,
        run,
        runFullAnalysis,
        loadExample,
        clearPi0,
    };
})();
