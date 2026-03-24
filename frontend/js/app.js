/**
 * app.js – Controlador principal de la aplicación
 * Maneja eventos, comunicación con el backend y estado de la UI.
 */

const App = (() => {
    const API_BASE = window.location.origin + '/api';

    // ── Mapeo de operaciones a símbolos ──
    const OP_SYMBOLS = {
        add: '+', subtract: '−', multiply: '×',
        scalar_multiply: 'k·A', power: 'Aⁿ',
        transpose: 'Aᵀ', determinant: 'det', inverse: 'A⁻¹',
        trace: 'tr', rank: 'rango', rref: 'RREF',
        cofactor: 'Cof', adjugate: 'Adj', eigenvalues: 'λ',
        identity: 'I',
    };

    const OP_LABELS = {
        add: 'Suma', subtract: 'Resta', multiply: 'Multiplicación',
        scalar_multiply: 'Escalar × Matriz', power: 'Potencia',
        transpose: 'Transpuesta', determinant: 'Determinante',
        inverse: 'Inversa', trace: 'Traza', rank: 'Rango',
        rref: 'RREF', cofactor: 'Cofactores', adjugate: 'Adjunta',
        eigenvalues: 'Valores Propios', identity: 'Identidad',
    };

    // Operaciones que necesitan dos matrices
    const BINARY_OPS = new Set(['add', 'subtract', 'multiply']);

    // Operaciones que no necesitan ninguna matriz de entrada
    const NO_MATRIX_OPS = new Set(['identity']);

    let history = [];
    let lastResult = null;

    // ═══════════════ Inicialización ═══════════════

    function init() {
        // Construir grids iniciales
        MatrixUI.buildGrid('a', 2, 2);
        MatrixUI.buildGrid('b', 2, 2);

        // Event listeners
        document.getElementById('operation-select').addEventListener('change', onOperationChange);
        document.getElementById('rows-a').addEventListener('change', onDimensionChange);
        document.getElementById('cols-a').addEventListener('change', onDimensionChange);
        document.getElementById('rows-b').addEventListener('change', onDimensionChange);
        document.getElementById('cols-b').addEventListener('change', onDimensionChange);

        // Pestañas
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                if (tab.disabled) return;
                document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
                tab.classList.add('active');
                const target = document.getElementById('tab-' + tab.dataset.tab);
                if (target) target.classList.add('active');
                // Inicializar Markov si es la primera vez
                if (tab.dataset.tab === 'markov' && typeof MarkovApp !== 'undefined') {
                    MarkovApp.init();
                }
                if (tab.dataset.tab === 'absorbing' && typeof AbsorbingApp !== 'undefined') {
                    AbsorbingApp.init();
                }
                if (tab.dataset.tab === 'tree' && typeof TreeApp !== 'undefined') {
                    TreeApp.init();
                }
            });
        });

        // Inicializar estado de UI
        onOperationChange();

        // Cargar historial del localStorage
        loadHistory();
    }

    // ═══════════════ UI State Management ═══════════════

    function onOperationChange() {
        const op = document.getElementById('operation-select').value;
        const isBinary = BINARY_OPS.has(op);
        const isNoMatrix = NO_MATRIX_OPS.has(op);

        // Mostrar/ocultar Matriz B
        const bCard = document.getElementById('matrix-b-card');
        const opSymbol = document.getElementById('operator-symbol');
        const dimsB = document.getElementById('dims-b-group');
        const dimsA = document.getElementById('dims-a-group');
        const matACard = document.getElementById('matrix-a-card');

        bCard.classList.toggle('hidden', !isBinary);
        opSymbol.classList.toggle('hidden', !isBinary);
        dimsB.classList.toggle('hidden', !isBinary);
        dimsA.classList.toggle('hidden', isNoMatrix);
        matACard.classList.toggle('hidden', isNoMatrix);

        // Mostrar/ocultar campos especiales
        document.getElementById('scalar-group').classList.toggle('hidden', op !== 'scalar_multiply');
        document.getElementById('exponent-group').classList.toggle('hidden', op !== 'power');
        document.getElementById('identity-group').classList.toggle('hidden', op !== 'identity');

        // Actualizar símbolo del operador
        opSymbol.textContent = OP_SYMBOLS[op] || '?';
    }

    function onDimensionChange() {
        const rowsA = parseInt(document.getElementById('rows-a').value);
        const colsA = parseInt(document.getElementById('cols-a').value);
        const rowsB = parseInt(document.getElementById('rows-b').value);
        const colsB = parseInt(document.getElementById('cols-b').value);

        MatrixUI.buildGrid('a', rowsA, colsA);
        MatrixUI.buildGrid('b', rowsB, colsB);
    }

    // ═══════════════ Cálculo ═══════════════

    async function calculate() {
        const op = document.getElementById('operation-select').value;
        const btn = document.getElementById('btn-calculate');

        // Construir payload
        const payload = { operation: op };

        if (!NO_MATRIX_OPS.has(op)) {
            payload.matrix_a = MatrixUI.readMatrix('a');
        }

        if (BINARY_OPS.has(op)) {
            payload.matrix_b = MatrixUI.readMatrix('b');
        }

        if (op === 'scalar_multiply') {
            payload.scalar = parseFloat(document.getElementById('scalar-input').value) || 0;
        }

        if (op === 'power') {
            payload.exponent = parseInt(document.getElementById('exponent-input').value) || 0;
        }

        if (op === 'identity') {
            payload.size = parseInt(document.getElementById('identity-size').value) || 3;
        }

        // Validar que las matrices tengan datos
        if (payload.matrix_a && payload.matrix_a.flat().every(v => v === 0)) {
            // Permitir matrices de ceros, no es un error
        }

        // Llamar al backend
        btn.classList.add('loading');
        try {
            const response = await fetch(`${API_BASE}/matrix/operate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await response.json();
            showResult(data, op);

            if (data.success) {
                addToHistory(op, payload, data);
            }
        } catch (err) {
            showResult({
                success: false,
                error: `Error de conexión: ${err.message}. ¿Está corriendo el servidor?`,
            }, op);
        } finally {
            btn.classList.remove('loading');
        }
    }

    // ═══════════════ Mostrar resultado ═══════════════

    function showResult(data, op) {
        const section = document.getElementById('result-section');
        const content = document.getElementById('result-content');
        const title = document.getElementById('result-title');
        const card = section.querySelector('.result-card');

        section.classList.remove('hidden');

        if (!data.success) {
            card.classList.add('error');
            title.textContent = 'Error';
            content.innerHTML = `<div class="error-message">⚠️ ${data.error}</div>`;
            lastResult = null;
            return;
        }

        card.classList.remove('error');
        title.textContent = `Resultado – ${OP_LABELS[op] || op}`;
        lastResult = data.result;

        const result = data.result;

        switch (result.type) {
            case 'matrix':
                content.innerHTML = MatrixUI.renderResultMatrix(result.value);
                break;
            case 'scalar':
                content.innerHTML = MatrixUI.renderResultScalar(result.value);
                break;
            case 'eigenvalues':
                content.innerHTML = MatrixUI.renderEigenvalues(result.value);
                break;
            default:
                content.innerHTML = `<pre>${JSON.stringify(result, null, 2)}</pre>`;
        }

        // Scroll suave al resultado
        section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // ═══════════════ Historial ═══════════════

    function addToHistory(op, payload, data) {
        const entry = {
            operation: op,
            label: OP_LABELS[op] || op,
            timestamp: new Date().toLocaleTimeString('es-BO'),
            dims: getDimsString(payload),
            payload: payload,
            result: data.result,
        };

        history.unshift(entry);
        if (history.length > 20) history.pop();

        saveHistory();
        renderHistory();
    }

    function getDimsString(payload) {
        let s = '';
        if (payload.matrix_a) {
            s += `${payload.matrix_a.length}×${payload.matrix_a[0].length}`;
        }
        if (payload.matrix_b) {
            s += ` · ${payload.matrix_b.length}×${payload.matrix_b[0].length}`;
        }
        if (payload.scalar !== undefined) s += ` k=${payload.scalar}`;
        if (payload.exponent !== undefined) s += ` n=${payload.exponent}`;
        if (payload.size !== undefined) s += `${payload.size}×${payload.size}`;
        return s;
    }

    function renderHistory() {
        const list = document.getElementById('history-list');

        if (history.length === 0) {
            list.innerHTML = '<p class="history-empty">Aún no hay operaciones realizadas.</p>';
            return;
        }

        list.innerHTML = history.map((entry, i) => `
            <div class="history-item" onclick="App.loadHistory(${i})" title="Click para cargar">
                <span class="history-op">${entry.label}</span>
                <span class="history-dims">${entry.dims}</span>
                <span class="history-time">${entry.timestamp}</span>
            </div>
        `).join('');
    }

    function loadHistory(index) {
        const entry = history[index];
        if (!entry) return;

        // Restaurar operación
        document.getElementById('operation-select').value = entry.operation;
        onOperationChange();

        // Restaurar matrices
        if (entry.payload.matrix_a) {
            MatrixUI.writeMatrix('a', entry.payload.matrix_a);
        }
        if (entry.payload.matrix_b) {
            MatrixUI.writeMatrix('b', entry.payload.matrix_b);
        }
        if (entry.payload.scalar !== undefined) {
            document.getElementById('scalar-input').value = entry.payload.scalar;
        }
        if (entry.payload.exponent !== undefined) {
            document.getElementById('exponent-input').value = entry.payload.exponent;
        }

        // Mostrar resultado
        showResult({ success: true, result: entry.result }, entry.operation);

        // Scroll arriba
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function clearHistory() {
        history = [];
        localStorage.removeItem('matrixCalcHistory');
        renderHistory();
    }

    function saveHistory() {
        try {
            localStorage.setItem('matrixCalcHistory', JSON.stringify(history));
        } catch (e) { /* ignore */ }
    }

    function loadHistoryFromStorage() {
        try {
            const stored = localStorage.getItem('matrixCalcHistory');
            if (stored) {
                history = JSON.parse(stored);
                renderHistory();
            }
        } catch (e) { /* ignore */ }
    }

    // Alias
    function loadHistoryFn() {
        loadHistoryFromStorage();
    }

    // ═══════════════ Copiar resultado ═══════════════

    function copyResult() {
        if (!lastResult) return;

        let text = '';
        if (lastResult.type === 'matrix') {
            text = lastResult.value.map(row => row.join('\t')).join('\n');
        } else if (lastResult.type === 'scalar') {
            text = lastResult.value.toString();
        } else if (lastResult.type === 'eigenvalues') {
            text = lastResult.value.map((v, i) =>
                `λ${i+1} = ${v.imag === 0 ? v.real : `${v.real} + ${v.imag}i`}`
            ).join('\n');
        }

        navigator.clipboard.writeText(text).then(() => {
            showToast('Copiado al portapapeles');
        }).catch(() => {
            showToast('Error al copiar', true);
        });
    }

    function showToast(message, isError = false) {
        const toast = document.createElement('div');
        toast.className = `toast ${isError ? 'error' : ''}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2500);
    }

    // ═══════════════ Init on DOM ready ═══════════════

    document.addEventListener('DOMContentLoaded', () => {
        init();
        loadHistoryFromStorage();
    });

    return {
        calculate,
        copyResult,
        clearHistory,
        loadHistory,
    };
})();
