/**
 * matrix.js – Módulo de UI para matrices
 * Manejo de grids de entrada, lectura/escritura de valores.
 */

const MatrixUI = (() => {
    /**
     * Crea el grid de inputs para una matriz.
     * @param {string} id - 'a' o 'b'
     * @param {number} rows
     * @param {number} cols
     */
    function buildGrid(id, rows, cols) {
        const grid = document.getElementById(`matrix-${id}-grid`);
        grid.innerHTML = '';
        grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                const input = document.createElement('input');
                input.type = 'number';
                input.step = 'any';
                input.placeholder = '0';
                input.dataset.row = i;
                input.dataset.col = j;
                input.id = `m-${id}-${i}-${j}`;
                input.setAttribute('aria-label', `${id.toUpperCase()}[${i+1},${j+1}]`);

                // Navegación con flechas
                input.addEventListener('keydown', (e) => handleKeyNav(e, id, i, j, rows, cols));

                grid.appendChild(input);
            }
        }
    }

    /**
     * Navegación con flechas del teclado dentro del grid.
     */
    function handleKeyNav(e, id, row, col, rows, cols) {
        let targetRow = row, targetCol = col;

        switch (e.key) {
            case 'ArrowRight':
            case 'Tab':
                if (!e.shiftKey) {
                    targetCol = (col + 1) % cols;
                    if (targetCol === 0) targetRow = (row + 1) % rows;
                    e.preventDefault();
                }
                break;
            case 'ArrowLeft':
                targetCol = col - 1;
                if (targetCol < 0) {
                    targetCol = cols - 1;
                    targetRow = (row - 1 + rows) % rows;
                }
                e.preventDefault();
                break;
            case 'ArrowDown':
                targetRow = (row + 1) % rows;
                e.preventDefault();
                break;
            case 'ArrowUp':
                targetRow = (row - 1 + rows) % rows;
                e.preventDefault();
                break;
            case 'Enter':
                // Al presionar Enter, calcular
                e.preventDefault();
                App.calculate();
                return;
            default:
                return;
        }

        const target = document.getElementById(`m-${id}-${targetRow}-${targetCol}`);
        if (target) {
            target.focus();
            target.select();
        }
    }

    /**
     * Lee los valores del grid como una matriz (array 2D).
     */
    function readMatrix(id) {
        const grid = document.getElementById(`matrix-${id}-grid`);
        const inputs = grid.querySelectorAll('input');
        if (inputs.length === 0) return null;

        // Determinar filas y columnas desde los atributos data-row / data-col
        const lastInput = inputs[inputs.length - 1];
        const rows = parseInt(lastInput.dataset.row) + 1;
        const cols = parseInt(lastInput.dataset.col) + 1;

        const matrix = [];
        for (let i = 0; i < rows; i++) {
            const row = [];
            for (let j = 0; j < cols; j++) {
                const inp = document.getElementById(`m-${id}-${i}-${j}`);
                const val = inp ? parseFloat(inp.value) : 0;
                row.push(isNaN(val) ? 0 : val);
            }
            matrix.push(row);
        }
        return matrix;
    }

    /**
     * Escribe valores en el grid.
     */
    function writeMatrix(id, matrix) {
        const rows = matrix.length;
        const cols = matrix[0].length;

        // Ajustar dimensiones en los selectores
        const rowSel = document.getElementById(`rows-${id}`);
        const colSel = document.getElementById(`cols-${id}`);
        if (rowSel) rowSel.value = rows;
        if (colSel) colSel.value = cols;

        buildGrid(id, rows, cols);

        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                const input = document.getElementById(`m-${id}-${i}-${j}`);
                if (input) input.value = matrix[i][j];
            }
        }
    }

    function fillZeros(id) {
        const grid = document.getElementById(`matrix-${id}-grid`);
        grid.querySelectorAll('input').forEach(inp => inp.value = '0');
    }

    function fillOnes(id) {
        const grid = document.getElementById(`matrix-${id}-grid`);
        grid.querySelectorAll('input').forEach(inp => inp.value = '1');
    }

    function fillRandom(id) {
        const grid = document.getElementById(`matrix-${id}-grid`);
        grid.querySelectorAll('input').forEach(inp => {
            inp.value = Math.floor(Math.random() * 19) - 9; // -9 a 9
        });
    }

    function clear(id) {
        const grid = document.getElementById(`matrix-${id}-grid`);
        grid.querySelectorAll('input').forEach(inp => inp.value = '');
    }

    /**
     * Renderiza una matriz de resultado en HTML.
     */
    function renderResultMatrix(matrix) {
        const rows = matrix.length;
        const cols = matrix[0].length;

        let html = '<div class="result-matrix">';
        html += '<div class="bracket-left"></div>';
        html += `<div class="result-grid" style="grid-template-columns: repeat(${cols}, 1fr)">`;

        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                let val = matrix[i][j];
                // Formatear: si es entero, sin decimales; si no, hasta 4 decimales
                if (Number.isInteger(val)) {
                    val = val.toString();
                } else {
                    val = parseFloat(val.toFixed(4)).toString();
                }
                html += `<div class="cell">${val}</div>`;
            }
        }

        html += '</div>';
        html += '<div class="bracket-right"></div>';
        html += '</div>';
        return html;
    }

    /**
     * Renderiza un escalar.
     */
    function renderResultScalar(value) {
        let display = value;
        if (typeof value === 'number') {
            display = Number.isInteger(value) ? value : parseFloat(value.toFixed(6));
        }
        return `<div class="result-scalar">${display}</div>`;
    }

    /**
     * Renderiza valores propios.
     */
    function renderEigenvalues(values) {
        let html = '<div class="result-eigenvalues">';
        values.forEach((v, i) => {
            html += `<div><span class="eigen-label">λ${i + 1} = </span>`;
            if (v.imag === 0) {
                const real = Number.isInteger(v.real) ? v.real : parseFloat(v.real.toFixed(6));
                html += `${real}`;
            } else {
                const real = parseFloat(v.real.toFixed(6));
                const imag = parseFloat(Math.abs(v.imag).toFixed(6));
                const sign = v.imag >= 0 ? '+' : '−';
                html += `${real} ${sign} ${imag}i`;
            }
            html += '</div>';
        });
        html += '</div>';
        return html;
    }

    return {
        buildGrid,
        readMatrix,
        writeMatrix,
        fillZeros,
        fillOnes,
        fillRandom,
        clear,
        renderResultMatrix,
        renderResultScalar,
        renderEigenvalues,
    };
})();
