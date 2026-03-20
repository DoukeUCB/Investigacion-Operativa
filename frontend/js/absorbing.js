/**
 * absorbing.js – Controlador para Cadenas de Markov con Estados Absorbentes
 *
 * Flujo:
 *  1. Forma canónica:  [ I  0 ]    (abs × abs)  (abs × trans)
 *                      [ R  Q ]    (trans × abs) (trans × trans)
 *  2. Matriz fundamental:  N = (I − Q)⁻¹
 *  3. Probabilidades de absorción:  B = N · R
 *  4. (Opcional) Con vector b:  b · B
 */

const AbsorbingApp = (() => {
    const API_BASE = (window.APP_CONFIG && window.APP_CONFIG.API_BASE)
        ? window.APP_CONFIG.API_BASE
        : (window.location.origin + '/api');
    let initialized = false;
    let currentSize = 3;

    // ═══════════════ Inicialización ═══════════════

    function init() {
        if (initialized) return;
        initialized = true;

        currentSize = parseInt(document.getElementById('abs-size').value) || 3;

        document.getElementById('abs-size').addEventListener('change', onSizeChange);

        buildAll();
    }

    function buildAll() {
        currentSize = parseInt(document.getElementById('abs-size').value) || 3;
        MatrixUI.buildGrid('abs', currentSize, currentSize);
        buildStateNameInputs(currentSize);
        buildCheckboxes(currentSize);
        buildVectorB();
        updateRowSums();

        const grid = document.getElementById('matrix-abs-grid');
        grid.addEventListener('input', () => {
            updateRowSums();
            autoDetectAbsorbing();
            buildVectorB();
        });
    }

    function onSizeChange() {
        buildAll();
    }

    // ═══════════════ Grids auxiliares ═══════════════

    function buildStateNameInputs(n) {
        const container = document.getElementById('abs-state-names');
        container.innerHTML = '';
        for (let i = 0; i < n; i++) {
            const input = document.createElement('input');
            input.type = 'text';
            input.placeholder = `Estado ${i + 1}`;
            input.id = `abs-name-${i}`;
            input.className = 'state-name-input';
            input.maxLength = 20;
            container.appendChild(input);
        }
    }

    function buildCheckboxes(n) {
        const container = document.getElementById('abs-checkboxes');
        container.innerHTML = '';
        for (let i = 0; i < n; i++) {
            const label = document.createElement('label');
            label.className = 'abs-checkbox-label';

            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.id = `abs-cb-${i}`;
            cb.className = 'abs-checkbox';
            cb.addEventListener('change', buildVectorB);

            const span = document.createElement('span');
            span.id = `abs-cb-text-${i}`;
            span.textContent = `E${i + 1}`;

            label.appendChild(cb);
            label.appendChild(span);
            container.appendChild(label);
        }
    }

    function autoDetectAbsorbing() {
        const n = currentSize;
        for (let i = 0; i < n; i++) {
            let diagVal = 0;
            let restZero = true;
            for (let j = 0; j < n; j++) {
                const inp = document.getElementById(`m-abs-${i}-${j}`);
                const val = inp ? (parseFloat(inp.value) || 0) : 0;
                if (i === j) {
                    diagVal = val;
                } else if (Math.abs(val) > 1e-9) {
                    restZero = false;
                }
            }
            const cb = document.getElementById(`abs-cb-${i}`);
            if (cb) cb.checked = (Math.abs(diagVal - 1) < 1e-6 && restZero);
        }
    }

    function buildVectorB() {
        const container = document.getElementById('abs-vector-b');
        container.innerHTML = '';

        const transientIndices = getTransientIndices();
        if (transientIndices.length === 0) {
            container.innerHTML = '<span class="matrix-hint">No hay estados transitorios</span>';
            return;
        }

        transientIndices.forEach(i => {
            const wrapper = document.createElement('div');
            wrapper.className = 'pi0-entry';

            const label = document.createElement('span');
            label.className = 'pi0-label';
            const nameInp = document.getElementById(`abs-name-${i}`);
            label.textContent = (nameInp && nameInp.value.trim()) || `E${i + 1}`;

            const input = document.createElement('input');
            input.type = 'number';
            input.step = 'any';
            input.min = '0';
            input.placeholder = '0';
            input.id = `abs-b-${i}`;

            wrapper.appendChild(label);
            wrapper.appendChild(input);
            container.appendChild(wrapper);
        });
    }

    function getAbsorbingIndices() {
        const indices = [];
        for (let i = 0; i < currentSize; i++) {
            const cb = document.getElementById(`abs-cb-${i}`);
            if (cb && cb.checked) indices.push(i);
        }
        return indices;
    }

    function getTransientIndices() {
        const absSet = new Set(getAbsorbingIndices());
        const trans = [];
        for (let i = 0; i < currentSize; i++) {
            if (!absSet.has(i)) trans.push(i);
        }
        return trans;
    }

    function updateRowSums() {
        const container = document.getElementById('abs-row-sums');
        const n = currentSize;
        let html = '<div class="row-sums-grid">';
        for (let i = 0; i < n; i++) {
            let sum = 0;
            for (let j = 0; j < n; j++) {
                const inp = document.getElementById(`m-abs-${i}-${j}`);
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
        return MatrixUI.readMatrix('abs');
    }

    function readStateNames() {
        const names = [];
        for (let i = 0; i < currentSize; i++) {
            const inp = document.getElementById(`abs-name-${i}`);
            const val = inp ? inp.value.trim() : '';
            names.push(val || `Estado ${i + 1}`);
        }
        return names;
    }

    function readVectorB() {
        const transient = getTransientIndices();
        if (transient.length === 0) return null;

        let hasValues = false;
        const b = transient.map(i => {
            const inp = document.getElementById(`abs-b-${i}`);
            const val = inp ? (parseFloat(inp.value) || 0) : 0;
            if (val !== 0) hasValues = true;
            return val;
        });

        return hasValues ? b : null;
    }

    function clearVectorB() {
        const transient = getTransientIndices();
        transient.forEach(i => {
            const inp = document.getElementById(`abs-b-${i}`);
            if (inp) inp.value = '';
        });
    }

    // ═══════════════ Ejemplo ═══════════════

    function loadExample() {
        // Ejemplo clásico: 5 estados, 2 absorbentes (0 y 4), 3 transitorios (1, 2, 3)
        document.getElementById('abs-size').value = '5';
        onSizeChange();

        const names = ['Aprobado', 'Nivel 1', 'Nivel 2', 'Nivel 3', 'Reprobado'];
        names.forEach((name, i) => {
            const inp = document.getElementById(`abs-name-${i}`);
            if (inp) inp.value = name;
        });

        //       Aprob  N1    N2    N3    Repr
        const P = [
            [1.0,  0.0,  0.0,  0.0,  0.0],   // Aprobado (absorbente)
            [0.3,  0.0,  0.4,  0.0,  0.3],   // Nivel 1
            [0.1,  0.2,  0.0,  0.5,  0.2],   // Nivel 2
            [0.0,  0.0,  0.3,  0.0,  0.7],   // Nivel 3
            [0.0,  0.0,  0.0,  0.0,  1.0],   // Reprobado (absorbente)
        ];

        for (let i = 0; i < 5; i++) {
            for (let j = 0; j < 5; j++) {
                const inp = document.getElementById(`m-abs-${i}-${j}`);
                if (inp) inp.value = P[i][j];
            }
        }

        autoDetectAbsorbing();
        updateRowSums();
        buildVectorB();

        // Vector b de ejemplo: [100, 0, 0] = 100 alumnos empezando en Nivel 1
        setTimeout(() => {
            const bInput = document.getElementById(`abs-b-1`);
            if (bInput) bInput.value = '100';
        }, 100);
    }

    // ═══════════════ Llamada al backend ═══════════════

    async function runAnalysis() {
        const P = readMatrixP();
        const names = readStateNames();
        const absIdx = getAbsorbingIndices();
        const b = readVectorB();

        const payload = {
            operation: 'absorbing_analysis',
            matrix_p: P,
            state_names: names,
        };

        if (absIdx.length > 0) {
            payload.absorbing_states = absIdx;
        }

        if (b) {
            payload.vector_b = b;
        }

        const btn = document.getElementById('btn-abs-analyze');
        btn.classList.add('loading');

        try {
            const path = '/markov/operate';
            const response = await fetch(window.resolveApiUrl(path), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(window.buildApiPayload(path, payload)),
            });
            const data = await response.json();
            showResult(data);
        } catch (err) {
            showResult({ success: false, error: `Error de conexión: ${err.message}` });
        } finally {
            btn.classList.remove('loading');
        }
    }

    // ═══════════════ Renderizado ═══════════════

    function showResult(data) {
        const section = document.getElementById('abs-result-section');
        const container = document.getElementById('abs-results-container');
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

        const r = data.result;
        container.innerHTML = renderAnalysis(r);
        section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function renderAnalysis(r) {
        const absNames = r.absorbing_names;
        const transNames = r.transient_names;
        const allCanonNames = [...absNames, ...transNames];
        let html = '';

        // ── Paso 0: Clasificación ──
        html += `
        <div class="result-card markov-result-card">
            <div class="result-header">
                <h3>Análisis de Cadena Absorbente</h3>
            </div>
            <div class="markov-subsection">
                <h4>Clasificación de estados</h4>
                <div class="classification-info">
                    <span class="badge">${r.s + r.t} estados totales</span>
                    <span class="badge badge-ok">${r.s} absorbente${r.s > 1 ? 's' : ''}: ${absNames.join(', ')}</span>
                    <span class="badge badge-warn">${r.t} transitorio${r.t > 1 ? 's' : ''}: ${transNames.join(', ')}</span>
                </div>
            </div>
        </div>`;

        // ── Paso 1: Forma canónica ──
        html += `
        <div class="result-card markov-result-card">
            <div class="result-header">
                <h3>Paso 1: Forma Canónica</h3>
            </div>
            <p class="formula-note">
                Se reordena P poniendo primero los estados absorbentes y luego los transitorios:
                <code>P = [ I  0 ; R  Q ]</code>
            </p>
            <div class="markov-subsection">
                <h4>Matriz P reordenada</h4>
                ${renderLabeledMatrix(r.P_canonical, allCanonNames, allCanonNames)}
            </div>
            <div class="abs-submatrices">
                <div class="markov-subsection">
                    <h4>Matriz R <span class="matrix-dim">(${r.t}×${r.s})</span> — transitorios → absorbentes</h4>
                    ${renderLabeledMatrix(r.R, transNames, absNames)}
                </div>
                <div class="markov-subsection">
                    <h4>Matriz Q <span class="matrix-dim">(${r.t}×${r.t})</span> — transitorios → transitorios</h4>
                    ${renderLabeledMatrix(r.Q, transNames, transNames)}
                </div>
            </div>
        </div>`;

        // ── Paso 2: Matriz fundamental ──
        html += `
        <div class="result-card markov-result-card">
            <div class="result-header">
                <h3>Paso 2: Matriz Fundamental N = (I − Q)⁻¹</h3>
            </div>
            <p class="formula-note">
                <code>N_ij</code> = número esperado de veces que se visita el estado transitorio <em>j</em>
                partiendo del estado transitorio <em>i</em>, antes de ser absorbido.
            </p>
            <div class="markov-subsection">
                <h4>Matriz N <span class="matrix-dim">(${r.t}×${r.t})</span></h4>
                ${renderLabeledMatrix(r.N, transNames, transNames)}
            </div>
            <div class="markov-interpretation">
                <h4>Interpretación</h4>
                <ul>
                    ${buildNInterpretation(r.N, transNames)}
                </ul>
            </div>
        </div>`;

        // ── Paso 3: Probabilidades de absorción ──
        html += `
        <div class="result-card markov-result-card">
            <div class="result-header">
                <h3>Paso 3: Probabilidades de Absorción B = N · R</h3>
            </div>
            <p class="formula-note">
                <code>B_ij</code> = probabilidad de que, partiendo del estado transitorio <em>i</em>,
                sea finalmente absorbido por el estado <em>j</em>.
            </p>
            <div class="markov-subsection">
                <h4>Matriz B <span class="matrix-dim">(${r.t}×${r.s})</span></h4>
                ${renderLabeledMatrix(r.B, transNames, absNames)}
            </div>
            <div class="markov-interpretation">
                <h4>Interpretación</h4>
                <ul>
                    ${buildBInterpretation(r.B, transNames, absNames)}
                </ul>
            </div>
        </div>`;

        // ── Paso 4: Vector b (opcional) ──
        if (r.b_B) {
            html += `
            <div class="result-card markov-result-card">
                <div class="result-header">
                    <h3>Paso 4: Predicción con Vector b</h3>
                </div>
                <p class="formula-note">
                    <code>b · B</code> = distribución final esperada entre los estados absorbentes,
                    dado el vector inicial <code>b</code> sobre los estados transitorios.
                </p>
                <div class="markov-subsection">
                    <h4>Vector b (inicial sobre transitorios)</h4>
                    ${renderSimpleVector(r.b, transNames)}
                </div>
                <div class="markov-subsection">
                    <h4>Resultado b · B (distribución final en absorbentes)</h4>
                    ${renderSimpleVector(r.b_B, absNames)}
                </div>
                <div class="markov-interpretation">
                    <h4>Interpretación</h4>
                    <ul>
                        ${absNames.map((name, j) =>
                            `<li>Se espera que <strong>${parseFloat(r.b_B[j].toFixed(4))}</strong> terminen en <strong>${name}</strong>.</li>`
                        ).join('')}
                    </ul>
                </div>
            </div>`;
        }

        return html;
    }

    // ═══════════════ Helpers de renderizado ═══════════════

    function renderLabeledMatrix(matrix, rowNames, colNames) {
        const rows = matrix.length;
        const cols = matrix[0].length;
        let html = '<div class="labeled-matrix-wrapper"><table class="labeled-matrix">';

        html += '<tr><th class="corner-cell">De \\ A</th>';
        for (let j = 0; j < cols; j++) {
            html += `<th>${colNames[j]}</th>`;
        }
        html += '</tr>';

        for (let i = 0; i < rows; i++) {
            html += `<tr><th>${rowNames[i]}</th>`;
            for (let j = 0; j < cols; j++) {
                let val = matrix[i][j];
                val = Number.isInteger(val) ? val : parseFloat(val.toFixed(4));
                html += `<td>${val}</td>`;
            }
            html += '</tr>';
        }

        html += '</table></div>';
        return html;
    }

    function renderSimpleVector(vec, names) {
        let html = '<div class="prob-vector">';
        vec.forEach((v, i) => {
            const display = Number.isInteger(v) ? v : parseFloat(v.toFixed(6));
            html += `
            <div class="prob-item">
                <span class="prob-name">${names[i]}</span>
                <span class="prob-value">${display}</span>
            </div>`;
        });
        html += '</div>';
        return html;
    }

    function buildNInterpretation(N, transNames) {
        let items = '';
        const t = transNames.length;
        for (let i = 0; i < t; i++) {
            // Sum of row = expected total steps before absorption
            const totalSteps = N[i].reduce((a, b) => a + b, 0);
            items += `<li>Desde <strong>${transNames[i]}</strong>: se esperan <strong>${parseFloat(totalSteps.toFixed(2))}</strong> pasos totales antes de la absorción.</li>`;
        }
        return items;
    }

    function buildBInterpretation(B, transNames, absNames) {
        let items = '';
        const t = transNames.length;
        const s = absNames.length;
        for (let i = 0; i < t; i++) {
            for (let j = 0; j < s; j++) {
                const pct = (B[i][j] * 100).toFixed(2);
                items += `<li>Desde <strong>${transNames[i]}</strong> → <strong>${absNames[j]}</strong>: probabilidad <strong>${pct}%</strong></li>`;
            }
        }
        return items;
    }

    // ═══════════════ API pública ═══════════════

    return {
        init,
        runAnalysis,
        loadExample,
        clearVectorB,
    };
})();
