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

## Deployment – Docker

El proyecto se despliega con **Docker**. Un único contenedor ejecuta el servidor gunicorn que expone la API REST y sirve el frontend estático.

### Imagen publicada (recomendado)

Cada vez que se hace merge a `main`, GitHub Actions construye y publica automáticamente la imagen en **Docker Hub**:

```bash
# Descargar y ejecutar la última versión publicada
# Usa el mismo valor configurado en el secret DOCKERHUB_USERNAME del workflow
DOCKERHUB_USERNAME=<dockerhub-username>
docker run -p 5000:8080 ${DOCKERHUB_USERNAME}/investigacion-operativa:latest
```

Abrir **http://localhost:5000** en el navegador.

### Deploy de la imagen en Heroku (usable desde celular)

Si ya tienes la imagen en Docker Hub, puedes desplegarla en Heroku **sin reconstruir**:

```bash
# Variables (reemplazar por tus valores)
HEROKU_APP=tu-app-heroku
DOCKERHUB_USERNAME=tu-usuario-dockerhub
IMAGE=investigacion-operativa

# 1) Login en Heroku Container Registry
heroku container:login

# 2) Traer imagen publicada en Docker Hub
docker pull ${DOCKERHUB_USERNAME}/${IMAGE}:latest

# 3) Re-etiquetar para Heroku (tipo web)
docker tag ${DOCKERHUB_USERNAME}/${IMAGE}:latest registry.heroku.com/${HEROKU_APP}/web

# 4) Subir y liberar
docker push registry.heroku.com/${HEROKU_APP}/web
heroku container:release web --app ${HEROKU_APP}
```

Verifica:

```bash
heroku open --app ${HEROKU_APP}
```

Heroku te dará una URL pública `https://<tu-app>.herokuapp.com`; esa URL ya puedes abrirla directamente desde tu celular.

> Nota: este contenedor ya escucha en `0.0.0.0` y usa la variable `PORT`, que es compatible con Heroku.

### ¿Y Appwrite?

Appwrite te sirve muy bien como backend/BaaS (Auth, DB, Storage), pero para publicar **esta imagen Docker web completa** la opción directa es Heroku (o un PaaS similar).  
Si usas Appwrite además de Heroku, normalmente Appwrite queda como servicio de backend y Heroku como hosting público de la app.

### Construir localmente

**Requisitos:** [Docker](https://docs.docker.com/get-docker/) instalado.

```bash
# Construir la imagen
docker build -t investigacion-operativa .

# Ejecutar el contenedor
docker run -p 5000:8080 investigacion-operativa
```

### Docker Compose (desarrollo local)

```bash
docker compose up --build
```

La app queda disponible en **http://localhost:5000**.

### Variables de entorno

Copia `backend/.env.example` a `backend/.env` y ajusta según necesites:

| Variable | Valor por defecto | Descripción |
|---|---|---|
| `PORT` | `8080` | Puerto en que escucha el servidor dentro del contenedor |
| `HOST` | `0.0.0.0` | Host de escucha (necesario para recibir tráfico externo) |
| `FLASK_DEBUG` | `false` | Activa el modo debug (solo desarrollo local) |

### CI/CD con GitHub Actions

El repositorio incluye `.github/workflows/ci.yml` con tres etapas encadenadas:

| Etapa | Cuándo | Qué hace |
|---|---|---|
| **Backend tests** | PRs y merge a `main` | Verifica que los servicios Python importan correctamente |
| **Docker build** | PRs y merge a `main` | Construye la imagen y comprueba que responde HTTP 200 |
| **Deploy** | Solo al hacer merge a `main` | Publica la imagen en Docker Hub con tag `latest` y el SHA del commit |
| **Deploy Heroku** | Solo al hacer merge a `main` | Publica en `registry.heroku.com/investigacion-operativa/web` y libera la versión (si existe `HEROKU_API_KEY`) |

Para habilitar el deploy automático debes configurar estos **Secrets** en GitHub Actions:

- `DOCKERHUB_USERNAME`: usuario de Docker Hub.
- `DOCKERHUB_TOKEN`: access token de Docker Hub (no usar password de cuenta).
- `HEROKU_API_KEY`: token de API de Heroku para publicar/liberar el contenedor en la app `investigacion-operativa`.

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
