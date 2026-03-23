# ── Imagen base ──────────────────────────────────────────────────────────────
FROM python:3.11-slim

# Directorio de trabajo dentro del contenedor
WORKDIR /app

# ── Dependencias Python ───────────────────────────────────────────────────────
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# ── Código fuente ─────────────────────────────────────────────────────────────
COPY backend/ ./backend/
COPY frontend/ ./frontend/

# ── Variables de entorno por defecto (desde .env.example) ─────────────────────
COPY backend/.env.example ./backend/.env
# PORT también se necesita como variable de shell para el CMD de gunicorn
ENV PORT=8080

EXPOSE 8080

# ── Arranque ──────────────────────────────────────────────────────────────────
# gunicorn en producción; workers = 2*(CPUs)+1 es la fórmula estándar.
# Usamos 2 workers como valor seguro para contenedores de un solo CPU.
WORKDIR /app/backend
CMD ["sh", "-c", "gunicorn app:app --bind 0.0.0.0:${PORT} --workers 2 --timeout 120 --access-logfile - --error-logfile -"]
