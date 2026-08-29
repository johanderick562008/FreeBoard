FROM python:3.11-slim

# System packages: Tesseract itself (pytesseract just talks to this binary),
# plus the shared libraries OpenCV needs to import correctly on a slim image.
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Render assigns the actual port via $PORT at runtime — must bind to it, not a fixed 8000.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]