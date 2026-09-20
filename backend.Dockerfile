FROM containers.mathworks.com/matlab-runtime:r2026a

USER root

WORKDIR /app

# Install Python and dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    libglib2.0-0 \
    libgl1 \
    && rm -rf /var/lib/apt/lists/*

# Setup virtual environment so pip works smoothly
ENV VIRTUAL_ENV=/opt/venv
RUN python3 -m venv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

# Install Python dependencies
COPY requirements.txt .
RUN pip install --default-timeout=1000 --no-cache-dir -r requirements.txt
RUN pip install "httpx<0.28.0"

# Install compiled MATLAB package
COPY matlab_compiled ./matlab_compiled
RUN pip install ./matlab_compiled

# Cache bust to force fresh source code copy
RUN echo "Cache bust 2026-09-21"

# Copy source code
COPY . .

# Expose the port
EXPOSE 8000

# Increase h11's max incomplete event size to allow 50 MB image uploads
# (uvicorn uses h11 which has a default of 16 KB for request bodies)
ENV H11_MAX_INCOMPLETE_EVENT_SIZE=52428800

# Start the application
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000", "--timeout-keep-alive", "600"]
