FROM node:18-alpine

# Install certificates for HTTPS requests (misal Meta CAPI)
RUN apk add --no-cache ca-certificates

WORKDIR /app

# Copy package files first for layer caching
COPY package*.json ./
RUN npm install --production

# Copy all app files (leads.json excluded via .dockerignore)
COPY . .

# Buat direktori data dan pastikan leads.json tersedia saat startup
RUN mkdir -p /app/data && \
    if [ ! -f /app/data/leads.json ]; then echo "[]" > /app/data/leads.json; fi

# Port aplikasi
ENV PORT=4000
EXPOSE 4000

# Volume untuk leads.json (data runtime yang perlu persistent)
VOLUME ["/app/data"]

CMD ["node", "server.js"]
