/**
 * tree.js – Controlador para el Árbol de Probabilidades de Markov
 *
 * Genera y renderiza un árbol SVG que muestra las transiciones de estados
 * desde un estado inicial a lo largo de n pasos, con probabilidades acumuladas.
 */

const TreeApp = (() => {
    const API_BASE = window.location.origin + '/api';
    let initialized = false;
    let currentSize = 2;
    let currentZoom = 1;
    const MIN_ZOOM = 0.3;
    const MAX_ZOOM = 3;

    // ── Paleta de colores para estados ──
    const STATE_COLORS = [
        '#6366f1', // indigo
        '#10b981', // emerald
        '#f59e0b', // amber
        '#ef4444', // red
        '#8b5cf6', // violet
        '#06b6d4', // cyan
        '#ec4899', // pink
        '#14b8a6', // teal
    ];

    // ═══════════════ Inicialización ═══════════════

    function init() {
        if (initialized) return;
        initialized = true;

        currentSize = parseInt(document.getElementById('tree-size').value) || 2;

        document.getElementById('tree-size').addEventListener('change', onSizeChange);
        document.getElementById('tree-steps').addEventListener('change', () => {});

        buildAll();
    }

    function buildAll() {
        currentSize = parseInt(document.getElementById('tree-size').value) || 2;
        MatrixUI.buildGrid('tree', currentSize, currentSize);
        buildStateNameInputs(currentSize);
        buildInitialStateSelect(currentSize);
        updateRowSums();

        const tGrid = document.getElementById('matrix-tree-grid');
        tGrid.addEventListener('input', updateRowSums);
    }

    function onSizeChange() {
        buildAll();
    }

    // ═══════════════ Grids auxiliares ═══════════════

    function buildStateNameInputs(n) {
        const container = document.getElementById('tree-state-names');
        container.innerHTML = '';
        for (let i = 0; i < n; i++) {
            const input = document.createElement('input');
            input.type = 'text';
            input.placeholder = `Estado ${i + 1}`;
            input.id = `tree-name-${i}`;
            input.className = 'state-name-input';
            input.maxLength = 20;
            container.appendChild(input);
        }
    }

    function buildInitialStateSelect(n) {
        const sel = document.getElementById('tree-initial');
        sel.innerHTML = '';
        for (let i = 0; i < n; i++) {
            const opt = document.createElement('option');
            opt.value = i;
            opt.textContent = `Estado ${i + 1}`;
            sel.appendChild(opt);
        }
    }

    function updateRowSums() {
        const container = document.getElementById('tree-row-sums');
        const n = currentSize;
        let html = '<div class="row-sums-grid">';
        for (let i = 0; i < n; i++) {
            let sum = 0;
            for (let j = 0; j < n; j++) {
                const inp = document.getElementById(`m-tree-${i}-${j}`);
                if (inp) sum += parseFloat(inp.value) || 0;
            }
            const isValid = Math.abs(sum - 1.0) < 0.001;
            html += `<span class="row-sum ${isValid ? 'valid' : 'invalid'}">Σ fila ${i + 1} = ${sum.toFixed(3)}</span>`;
        }
        html += '</div>';
        container.innerHTML = html;
    }

    function readStateNames() {
        const names = [];
        for (let i = 0; i < currentSize; i++) {
            const inp = document.getElementById(`tree-name-${i}`);
            const val = inp ? inp.value.trim() : '';
            names.push(val || `Estado ${i + 1}`);
        }
        return names;
    }

    // ═══════════════ Ejemplo ═══════════════

    function loadExample() {
        document.getElementById('tree-size').value = '3';
        onSizeChange();

        const names = ['Soleado', 'Nublado', 'Lluvioso'];
        names.forEach((name, i) => {
            const inp = document.getElementById(`tree-name-${i}`);
            if (inp) inp.value = name;
        });

        const P = [
            [0.7, 0.2, 0.1],
            [0.3, 0.4, 0.3],
            [0.2, 0.3, 0.5],
        ];
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                const inp = document.getElementById(`m-tree-${i}-${j}`);
                if (inp) inp.value = P[i][j];
            }
        }

        document.getElementById('tree-initial').value = '0';
        document.getElementById('tree-steps').value = '3';
        document.getElementById('tree-prune').value = '0.01';
        updateRowSums();
    }

    // ═══════════════ Generar árbol ═══════════════

    async function generate() {
        const P = MatrixUI.readMatrix('tree');
        const names = readStateNames();
        const initialState = parseInt(document.getElementById('tree-initial').value) || 0;
        const steps = parseInt(document.getElementById('tree-steps').value) || 3;
        const pruneThreshold = parseFloat(document.getElementById('tree-prune').value) || 0;

        const payload = {
            operation: 'probability_tree',
            matrix_p: P,
            state_names: names,
            initial_state: initialState,
            steps: steps,
            prune_threshold: pruneThreshold,
        };

        const btn = document.getElementById('btn-tree-generate');
        btn.classList.add('loading');

        try {
            const response = await fetch(`${API_BASE}/markov/operate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await response.json();
            showResult(data);
        } catch (err) {
            showResult({
                success: false,
                error: `Error de conexión: ${err.message}`,
            });
        } finally {
            btn.classList.remove('loading');
        }
    }

    // ═══════════════ Mostrar resultado ═══════════════

    function showResult(data) {
        const section = document.getElementById('tree-result-section');
        section.classList.remove('hidden');

        if (!data.success) {
            document.getElementById('tree-svg-wrapper').innerHTML = '';
            document.getElementById('tree-info').innerHTML =
                `<div class="error-message">⚠️ ${data.error}</div>`;
            document.getElementById('tree-summary-card').innerHTML = '';
            section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            return;
        }

        const result = data.result;
        const title = document.getElementById('tree-result-title');
        title.textContent = `Árbol de Probabilidades — ${result.steps} pasos desde "${result.state_names[result.initial_state]}"`;

        // Info bar
        document.getElementById('tree-info').innerHTML = `
            <div class="tree-info-badges">
                <span class="badge">${result.num_states} estados</span>
                <span class="badge">${result.steps} pasos</span>
                <span class="badge">${result.total_nodes} nodos</span>
                ${result.prune_threshold > 0 ? `<span class="badge badge-warn">Poda: ${result.prune_threshold}</span>` : ''}
            </div>
        `;

        // Build and render SVG tree
        currentZoom = 1;
        renderTree(result.tree, result.state_names, result.steps);

        // Build summary table
        renderSummaryTable(result.tree, result.state_names, result.steps);

        section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // ═══════════════ SVG Tree Rendering ═══════════════

    function renderTree(tree, stateNames, steps) {
        // 1) Layout: assign (x, y) to each node using a layered approach
        const layout = computeLayout(tree, steps);
        const { nodes, edges, width, height } = layout;

        const PAD_X = 60;
        const PAD_Y = 50;
        const svgW = width + PAD_X * 2;
        const svgH = height + PAD_Y * 2;

        const wrapper = document.getElementById('tree-svg-wrapper');
        // Create fresh SVG
        wrapper.innerHTML = `<svg id="tree-svg" xmlns="http://www.w3.org/2000/svg" 
            width="${svgW}" height="${svgH}" 
            viewBox="0 0 ${svgW} ${svgH}"
            style="transform: scale(${currentZoom}); transform-origin: top center;">
        </svg>`;
        const svg = document.getElementById('tree-svg');

        // Defs for arrow marker
        const defs = svgEl('defs');
        const marker = svgEl('marker', {
            id: 'arrow',
            markerWidth: '8', markerHeight: '6',
            refX: '8', refY: '3',
            orient: 'auto',
        });
        marker.appendChild(svgEl('path', {
            d: 'M0,0 L8,3 L0,6 Z',
            fill: 'var(--text-muted)',
        }));
        defs.appendChild(marker);
        svg.appendChild(defs);

        // Group for everything (with padding offset)
        const g = svgEl('g', { transform: `translate(${PAD_X}, ${PAD_Y})` });
        svg.appendChild(g);

        // 2) Draw edges first (below nodes)
        edges.forEach(e => {
            const fromNode = nodes[e.fromId];
            const toNode = nodes[e.toId];

            const x1 = fromNode.x;
            const y1 = fromNode.y + 20; // bottom of node
            const x2 = toNode.x;
            const y2 = toNode.y - 20; // top of next node

            // Curved path
            const midY = (y1 + y2) / 2;
            const path = svgEl('path', {
                d: `M${x1},${y1} C${x1},${midY} ${x2},${midY} ${x2},${y2}`,
                stroke: getStateColor(toNode.state),
                'stroke-width': Math.max(1, Math.min(4, e.prob * 8)),
                'stroke-opacity': Math.max(0.25, Math.min(1, e.prob + 0.2)),
                fill: 'none',
            });
            g.appendChild(path);

            // Edge label (transition probability)
            const labelX = (x1 + x2) / 2 + (x2 > x1 ? 8 : -8);
            const labelY = midY;
            const edgeLabel = svgEl('text', {
                x: labelX, y: labelY,
                'text-anchor': 'middle',
                'dominant-baseline': 'middle',
                'font-size': '11',
                'font-family': "'JetBrains Mono', monospace",
                fill: 'var(--text-muted)',
                'font-weight': '500',
            });
            edgeLabel.textContent = e.prob.toFixed(2);
            g.appendChild(edgeLabel);
        });

        // 3) Draw nodes
        Object.values(nodes).forEach(node => {
            const color = getStateColor(node.state);
            const nodeG = svgEl('g', {
                transform: `translate(${node.x}, ${node.y})`,
                class: 'tree-node',
            });

            // Node circle/rounded rect
            const rectW = Math.max(70, node.name.length * 9 + 20);
            const rectH = 38;
            const rect = svgEl('rect', {
                x: -rectW / 2, y: -rectH / 2,
                width: rectW, height: rectH,
                rx: '8', ry: '8',
                fill: color,
                'fill-opacity': '0.12',
                stroke: color,
                'stroke-width': node.step === 0 ? '2.5' : '1.5',
            });
            nodeG.appendChild(rect);

            // State name
            const nameText = svgEl('text', {
                x: 0, y: -3,
                'text-anchor': 'middle',
                'dominant-baseline': 'middle',
                'font-size': '12',
                'font-weight': '600',
                'font-family': "'Inter', sans-serif",
                fill: color,
            });
            nameText.textContent = node.name;
            nodeG.appendChild(nameText);

            // Probability label
            const probText = svgEl('text', {
                x: 0, y: 13,
                'text-anchor': 'middle',
                'dominant-baseline': 'middle',
                'font-size': '10',
                'font-family': "'JetBrains Mono', monospace",
                fill: 'var(--text-muted)',
            });
            probText.textContent = node.prob >= 0.001
                ? `P=${node.prob.toFixed(4)}`
                : `P=${node.prob.toExponential(2)}`;
            nodeG.appendChild(probText);

            g.appendChild(nodeG);
        });

        // 4) Step labels on the left
        const levelY = computeLevelYPositions(steps);
        for (let s = 0; s <= steps; s++) {
            const label = svgEl('text', {
                x: -PAD_X + 10,
                y: levelY[s],
                'text-anchor': 'start',
                'dominant-baseline': 'middle',
                'font-size': '11',
                'font-weight': '600',
                'font-family': "'Inter', sans-serif",
                fill: 'var(--text-muted)',
            });
            label.textContent = s === 0 ? 'Inicio' : `Paso ${s}`;
            g.appendChild(label);
        }
    }

    // ── Layout computation ──

    const NODE_W = 90;    // horizontal space per node
    const LEVEL_H = 110;  // vertical space per level

    function computeLevelYPositions(steps) {
        const positions = [];
        for (let s = 0; s <= steps; s++) {
            positions.push(s * LEVEL_H);
        }
        return positions;
    }

    function computeLayout(tree, steps) {
        // Collect all nodes and edges
        const allNodes = {};
        const allEdges = [];
        const levelNodes = {}; // step -> [node...]

        function traverse(node, parentId) {
            if (!levelNodes[node.step]) levelNodes[node.step] = [];
            levelNodes[node.step].push(node);
            allNodes[node.id] = {
                id: node.id,
                state: node.state,
                name: node.name,
                prob: node.prob,
                step: node.step,
                x: 0,
                y: node.step * LEVEL_H,
            };
            if (parentId !== null) {
                allEdges.push({
                    fromId: parentId,
                    toId: node.id,
                    prob: node.transition_prob || 0,
                });
            }
            (node.children || []).forEach(child => traverse(child, node.id));
        }

        traverse(tree, null);

        // Find the widest level
        let maxWidth = 0;
        for (const step of Object.keys(levelNodes)) {
            const count = levelNodes[step].length;
            if (count > maxWidth) maxWidth = count;
        }

        const totalWidth = maxWidth * NODE_W;

        // Assign x positions level by level, centered
        for (const step of Object.keys(levelNodes)) {
            const nodesInLevel = levelNodes[step];
            const count = nodesInLevel.length;
            const levelW = count * NODE_W;
            const startX = (totalWidth - levelW) / 2 + NODE_W / 2;

            nodesInLevel.forEach((node, i) => {
                allNodes[node.id].x = startX + i * NODE_W;
            });
        }

        return {
            nodes: allNodes,
            edges: allEdges,
            width: totalWidth,
            height: steps * LEVEL_H,
        };
    }

    // ── SVG helpers ──

    function svgEl(tag, attrs = {}) {
        const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
        for (const [k, v] of Object.entries(attrs)) {
            el.setAttribute(k, v);
        }
        return el;
    }

    function getStateColor(stateIdx) {
        return STATE_COLORS[stateIdx % STATE_COLORS.length];
    }

    // ═══════════════ Summary table ═══════════════

    function renderSummaryTable(tree, stateNames, steps) {
        const container = document.getElementById('tree-summary-card');

        // Compute probability distribution at each step
        const distributions = [];
        for (let s = 0; s <= steps; s++) {
            const dist = new Array(stateNames.length).fill(0);
            distributions.push(dist);
        }

        function sumProbs(node) {
            distributions[node.step][node.state] += node.prob;
            (node.children || []).forEach(child => sumProbs(child));
        }
        sumProbs(tree);

        let html = `
            <div class="result-header">
                <h3>Distribución de probabilidad por paso</h3>
            </div>
            <div class="labeled-matrix-wrapper">
                <table class="labeled-matrix">
                    <tr>
                        <th class="corner-cell">Paso</th>
                        ${stateNames.map(n => `<th>${n}</th>`).join('')}
                        <th>Σ</th>
                    </tr>`;

        for (let s = 0; s <= steps; s++) {
            const total = distributions[s].reduce((a, b) => a + b, 0);
            html += `<tr><th>${s === 0 ? 'Inicio' : `${s}`}</th>`;
            distributions[s].forEach(v => {
                const val = v.toFixed(4);
                html += `<td>${val}</td>`;
            });
            html += `<td style="font-weight:600">${total.toFixed(4)}</td></tr>`;
        }

        html += '</table></div>';

        // Interpretation
        const lastDist = distributions[steps];
        html += `
            <div class="markov-interpretation" style="margin-top:1rem">
                <h4>Interpretación (paso ${steps})</h4>
                <ul>
                    ${stateNames.map((name, i) =>
                        `<li>Probabilidad de estar en <strong>${name}</strong>: <strong>${(lastDist[i] * 100).toFixed(2)}%</strong></li>`
                    ).join('')}
                </ul>
            </div>`;

        container.innerHTML = html;
    }

    // ═══════════════ Zoom controls ═══════════════

    function zoomIn() {
        currentZoom = Math.min(MAX_ZOOM, currentZoom + 0.2);
        applyZoom();
    }

    function zoomOut() {
        currentZoom = Math.max(MIN_ZOOM, currentZoom - 0.2);
        applyZoom();
    }

    function fitToView() {
        currentZoom = 1;
        applyZoom();
    }

    function applyZoom() {
        const svg = document.getElementById('tree-svg');
        if (svg) {
            svg.style.transform = `scale(${currentZoom})`;
        }
    }

    // ═══════════════ API pública ═══════════════

    return {
        init,
        generate,
        loadExample,
        zoomIn,
        zoomOut,
        fitToView,
    };
})();
