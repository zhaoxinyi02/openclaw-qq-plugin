FROM mlikiowa/napcat-docker:latest

# Fix broken deps in base image, then install Node.js 20
RUN apt-get update && \
    apt-get --fix-broken install -y && \
    apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app/manager

# Copy package files first for better caching
COPY server/package.json server/package-lock.json* ./server/
COPY web/package.json web/package-lock.json* ./web/

# Install dependencies
RUN cd server && npm install && \
    cd ../web && npm install

# Copy source code
COPY server/ ./server/
COPY web/ ./web/

# Build backend (TS -> JS)
RUN cd server && npx tsc || true

# Build frontend
RUN cd web && npm run build

# Copy docker assets (entrypoint, qq-plugin, config templates)
COPY docker/ ./docker/
RUN chmod +x /app/manager/docker/entrypoint.sh

# Ports: 6099 (NapCat WebUI), 6199 (ClawPanel)
EXPOSE 6099 6199

# Override the default entrypoint
ENTRYPOINT ["bash", "/app/manager/docker/entrypoint.sh"]
