# Calculadora de Matrices – Investigación Operativa

Aplicación web para resolver operaciones matriciales y cadenas de Markov.  
**Universidad Católica Boliviana** – Investigación Operativa

---

## Arquitectura

El proyecto usa una **arquitectura de 3 capas**:

```
┌─────────────────────────────────────────────────┐
│  Capa de Presentación                           │
│  ├── Frontend (HTML/CSS/JS)                     │
│  └── API REST (Flask – app.py)                  │
├─────────────────────────────────────────────────┤
│  Capa de Lógica de Negocio                      │
│  └── services/matrix_service.py                 │
├─────────────────────────────────────────────────┤
│  Capa de Datos / Utilidades                     │
│  └── utils/matrix_operations.py                 │
└─────────────────────────────────────────────────┘
```

## Operaciones disponibles

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
│   │   └── matrix_service.py       # Lógica de negocio
│   └── utils/
│       ├── __init__.py
│       └── matrix_operations.py    # Operaciones puras
└── frontend/
    ├── index.html
    ├── css/
    │   └── styles.css
    └── js/
        ├── app.js                  # Controlador principal
        └── matrix.js               # UI de matrices
```

## API

**POST** `/api/matrix/operate`

```json
{
    "operation": "multiply",
    "matrix_a": [[1, 2], [3, 4]],
    "matrix_b": [[5, 6], [7, 8]]
}
```

**GET** `/api/matrix/operations` — Lista todas las operaciones disponibles.
