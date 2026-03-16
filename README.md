# Calculadora de Matrices & Cadenas de Markov – Investigación Operativa

Aplicación web para resolver operaciones matriciales, cadenas de Markov ergódicas, cadenas absorbentes y visualizar árboles de probabilidades.  
**Universidad Católica Boliviana** – Investigación Operativa

---

## Arquitectura

El proyecto usa una **arquitectura de 3 capas**:

```
┌─────────────────────────────────────────────────┐
│  Capa de Presentación                           │
│  ├── Frontend (HTML/CSS/JS) — 4 pestañas        │
│  └── API REST (Flask – app.py)                  │
├─────────────────────────────────────────────────┤
│  Capa de Lógica de Negocio                      │
│  ├── services/matrix_service.py                 │
│  └── services/markov_service.py                 │
├─────────────────────────────────────────────────┤
│  Capa de Datos / Utilidades                     │
│  ├── utils/matrix_operations.py                 │
│  └── utils/markov_operations.py                 │
└─────────────────────────────────────────────────┘
```

## Funcionalidades

### 1. Calculadora de Matrices

| Operación | Descripción | Tipo |
|-----------|-------------|------|
| `add` | Suma A + B | Binaria |
| `subtract` | Resta A − B | Binaria |
| `multiply` | Multiplicación A × B | Binaria |
| `scalar_multiply` | Escalar k · A | Especial |
| `transpose` | Transpuesta Aᵀ | Unaria |
| `determinant` | Determinante det(A) | Unaria → escalar |
| `inverse` | Inversa A⁻¹ | Unaria |
| `power` | Potencia Aⁿ | Especial |
| `trace` | Traza tr(A) | Unaria → escalar |
| `rank` | Rango | Unaria → escalar |
| `rref` | Forma escalonada reducida | Unaria |
| `cofactor` | Matriz de cofactores | Unaria |
| `adjugate` | Matriz adjunta | Unaria |
| `eigenvalues` | Valores propios (2×2) | Unaria |
| `identity` | Identidad Iₙ | Especial |

### 2. Cadenas de Markov Ergódicas (Estados Transitorios)

| Operación | Descripción |
|-----------|-------------|
| Chapman-Kolmogorov | π(n) = π(0) · Pⁿ — distribución en n pasos |
| Estado estacionario | πP = π, Σπᵢ = 1 — distribución a largo plazo |
| Primer pasaje | M_ij — tiempo esperado de estado i a estado j |
| Análisis completo | Todas las anteriores + clasificación de estados |

Notas importantes para π(0):
- `π(0)` ahora puede ser una **distribución** (suma 1) o **cantidades reales** (ej: autos por sucursal).
- Si se envía en cantidades, el backend devuelve también:
    - `total_units`
    - `final_counts` (proyección estacionaria en unidades reales)

### 3. Cadenas de Markov Absorbentes

| Operación | Descripción |
|-----------|-------------|
| Forma canónica | Reordena P en \[I 0; R Q\] |
| Matriz fundamental | N = (I − Q)⁻¹ — visitas esperadas antes de absorción |
| Probabilidades de absorción | B = N · R — probabilidad de absorción por cada estado |
| Predicción con vector b | b · B — distribución final dado vector inicial |

### 4. Árbol de Probabilidades

Genera un **árbol visual SVG** que muestra todas las transiciones posibles desde un estado inicial a lo largo de n pasos (máximo 5).

- Visualización jerárquica con colores por estado
- Probabilidades de transición en cada rama
- Probabilidad acumulada en cada nodo
- Poda configurable por umbral mínimo
- Tabla resumen de distribución por paso
- Controles de zoom (acercar / alejar / ajustar)

## Requisitos

- Python 3.10+
- pip

## Instalación y ejecución

```bash
# 1. Ir al directorio del proyecto
cd "Investigacion Operativa"

# 2. Crear entorno virtual (opcional pero recomendado)
python3 -m venv venv
source venv/bin/activate

# 3. Instalar dependencias
pip install -r backend/requirements.txt

# 4. Ejecutar el servidor
cd backend
python app.py
```

Abrir **http://localhost:5000** en el navegador.

## Estructura de archivos

```
├── README.md
├── backend/
│   ├── app.py                      # API REST (Flask)
│   ├── requirements.txt
│   ├── services/
│   │   ├── __init__.py
│   │   ├── matrix_service.py       # Lógica de negocio – matrices
│   │   └── markov_service.py       # Lógica de negocio – Markov
│   └── utils/
│       ├── __init__.py
│       ├── matrix_operations.py    # Operaciones puras de matrices
│       └── markov_operations.py    # Operaciones puras de Markov
└── frontend/
    ├── index.html                  # 4 pestañas
    ├── css/
    │   └── styles.css
    └── js/
        ├── app.js                  # Controlador principal + tabs
        ├── matrix.js               # UI de grids matriciales
        ├── markov.js               # UI cadenas ergódicas
        ├── absorbing.js            # UI cadenas absorbentes
        └── tree.js                 # UI árbol de probabilidades
```

## API

### Matrices

**POST** `/api/matrix/operate`

```json
{
    "operation": "multiply",
    "matrix_a": [[1, 2], [3, 4]],
    "matrix_b": [[5, 6], [7, 8]]
}
```

**GET** `/api/matrix/operations` — Lista todas las operaciones matriciales.

### Cadenas de Markov

**POST** `/api/markov/operate`

```json
{
    "operation": "full_analysis",
    "matrix_p": [[0.7, 0.2, 0.1], [0.3, 0.4, 0.3], [0.2, 0.3, 0.5]],
    "pi_0": [1, 0, 0],
    "steps": 5,
    "state_names": ["Soleado", "Nublado", "Lluvioso"]
}
```

Operaciones: `chapman_kolmogorov`, `steady_state`, `mean_first_passage`, `full_analysis`, `absorbing_analysis`, `probability_tree`.

**GET** `/api/markov/operations` — Lista todas las operaciones de Markov.

## Refactor interno (backend)

Se separó la lógica de Markov en servicios especializados:

- `services/markov_transient_service.py`: transitorias/ergódicas + árbol
- `services/markov_absorbing_service.py`: absorbentes
- `services/markov_service.py`: fachada de despacho

Esto simplifica mantenimiento y extensibilidad.

## Responsive (mobile-first)

La UI fue ajustada con enfoque **mobile-first**:
- Layout base optimizado para pantallas pequeñas.
- Navegación de pestañas con scroll horizontal en móvil.
- Inputs y paneles apilados por defecto.
- Ajustes progresivos para tablet/desktop con `@media (min-width: 769px)`.
