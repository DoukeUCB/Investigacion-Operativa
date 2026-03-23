# Plataforma de Investigación Operativa – UCB

Aplicación web por temas para resolver operaciones de Investigación Operativa.

- **Tema 1:** Cadenas de Markov
- **Tema 2:** Teoría de Colas

Incluye además calculadora matricial como base transversal del curso.  
**Universidad Católica Boliviana** – Investigación Operativa

---

## Arquitectura

El proyecto usa una **arquitectura de 3 capas**:

```
┌─────────────────────────────────────────────────┐
│  Capa de Presentación                           │
│  ├── Frontend (landing + páginas por tema)      │
│  └── API REST (Flask – app.py)                  │
├─────────────────────────────────────────────────┤
│  Capa de Lógica de Negocio                      │
│  ├── services/matrix_service.py                 │
│  ├── services/markov_service.py                 │
│  ├── services/markov_transient_service.py       │
│  ├── services/markov_absorbing_service.py       │
│  └── services/queue_service.py                  │
├─────────────────────────────────────────────────┤
│  Capa de Datos / Utilidades                     │
│  ├── utils/matrix_operations.py                 │
│  ├── utils/markov_operations.py                 │
│  └── utils/queue_operations.py                  │
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

### 5. Teoría de Colas (Tema 2)

Modelos implementados en backend y UI:

1. `mm1` — M/M/1 (fuente infinita)
2. `mmk` — M/M/k (fuente infinita)
3. `mg1` — M/G/1
4. `md1` — M/D/1
5. `mgk` — M/G/k (aprox. Allen–Cunneen)
6. `finite_mm1` — Fuente finita M/M/1/N
7. `finite_mmk` — Fuente finita M/M/k/N
8. `mmk_infinite_finite_peps` — M/M/k/∞/N/PEPS

Métricas reportadas según modelo: `ρ`, `P0`, `Pn`, `Pw`, `Lq`, `L`, `Wq`, `W`, `λ_eff`, `P_system_full`.

## Requisitos

- Python 3.10+
- pip

## Instalación y ejecución (desarrollo local)

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

---

## Deployment

El proyecto es una aplicación **stateless** (sin base de datos) compuesta por:

- **Backend:** API REST en Python/Flask.
- **Frontend:** HTML + CSS + JavaScript servido directamente por Flask.

Esto permite desplegar **todo desde un único contenedor Docker**, lo que lo hace portable a cualquier plataforma cloud.

### Opción 1 – Docker (recomendado ✅)

Es la opción más portable y reproducible. Un solo contenedor ejecuta el backend y sirve el frontend.

**Requisitos:** [Docker](https://docs.docker.com/get-docker/) instalado.

```bash
# Construir la imagen
docker build -t investigacion-operativa .

# Ejecutar el contenedor
docker run -p 5000:8080 investigacion-operativa
```

Abrir **http://localhost:5000** en el navegador.

#### Con Docker Compose (recomendado para desarrollo local con Docker)

```bash
docker compose up --build
```

La app queda disponible en **http://localhost:5000**.

#### Variables de entorno

Copia `backend/.env.example` a `backend/.env` y ajusta según necesites:

| Variable | Valor por defecto | Descripción |
|---|---|---|
| `PORT` | `5000` | Puerto en que escucha el servidor |
| `HOST` | `0.0.0.0` | Host de escucha (usar `0.0.0.0` en Docker/cloud) |
| `FLASK_DEBUG` | `false` | Activa el modo debug (solo desarrollo) |

---

### Opción 2 – GitHub Actions CI/CD

El repositorio incluye `.github/workflows/ci.yml` que se ejecuta en cada push/PR a `main` y:

1. Verifica que los servicios Python importan correctamente.
2. Construye la imagen Docker.
3. Levanta el contenedor y comprueba que responde HTTP 200.

Para activarlo solo necesitas tener el repositorio en GitHub; el workflow corre automáticamente.

---

### Opción 3 – Heroku

Heroku detecta el `Procfile` incluido en el repositorio y levanta la app con `gunicorn`.

```bash
# Instalar Heroku CLI y hacer login
heroku login

# Crear la app
heroku create nombre-de-tu-app

# Deploy
git push heroku main
```

Heroku inyecta la variable `PORT` automáticamente; el servidor la lee sin configuración adicional.

---

### Opción 4 – Render / Railway (plataformas modernas)

Ambas plataformas soportan despliegue directo desde GitHub con detección automática del `Dockerfile`.

**Render:**
1. Crear cuenta en [render.com](https://render.com).
2. "New Web Service" → conectar el repositorio.
3. Render detecta el `Dockerfile` automáticamente.
4. Hacer deploy. La URL pública se genera al finalizar.

**Railway:**
1. Crear cuenta en [railway.app](https://railway.app).
2. "New Project" → "Deploy from GitHub repo".
3. Railway detecta el `Dockerfile` automáticamente.
4. La variable `PORT` es inyectada automáticamente.

Ambas plataformas ofrecen **tier gratuito** suficiente para este proyecto.

---

### Opción 5 – Appwrite Cloud (funciones serverless)

El frontend ya incluye soporte para Appwrite en `frontend/js/config.js`. Para activarlo:

1. Crear una función en [Appwrite Cloud](https://cloud.appwrite.io) con el runtime Python 3.11.
2. Subir el código del backend como función.
3. Actualizar `APPWRITE_FUNCTION_URL` y `APPWRITE_PROJECT_ID` en `config.js`.

> **Nota:** Esta opción requiere adaptar cada endpoint Flask a la interfaz de funciones de Appwrite.

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
    ├── index.html                  # Landing de selección de temas
    ├── markov.html                 # Tema 1 (Markov)
    ├── queues.html                 # Tema 2 (Teoría de colas)
    ├── css/
    │   └── styles.css
    └── js/
        ├── app.js                  # Controlador principal Tema 1
        ├── matrix.js               # UI de grids matriciales
        ├── markov.js               # UI cadenas ergódicas
        ├── absorbing.js            # UI cadenas absorbentes
        ├── tree.js                 # UI árbol de probabilidades
        └── queues.js               # UI tema 2
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

### Teoría de Colas

**POST** `/api/queues/operate`

```json
{
    "model": "mmk",
    "lambda_rate": 8,
    "mu": 5,
    "k": 2,
    "max_n": 10
}
```

**GET** `/api/queues/models` — Lista modelos de colas disponibles y parámetros requeridos.

## Refactor interno (backend)

Se separó la lógica de Markov en servicios especializados:

- `services/markov_transient_service.py`: transitorias/ergódicas + árbol
- `services/markov_absorbing_service.py`: absorbentes
- `services/markov_service.py`: fachada de despacho

Esto simplifica mantenimiento y extensibilidad.

También se agregó `services/queue_service.py` para el Tema 2 y `utils/queue_operations.py` para fórmulas puras de colas.

## Responsive (mobile-first)

La UI fue ajustada con enfoque **mobile-first**:
- Layout base optimizado para pantallas pequeñas.
- Navegación de pestañas con scroll horizontal en móvil.
- Inputs y paneles apilados por defecto.
- Ajustes progresivos para tablet/desktop con `@media (min-width: 769px)`.
