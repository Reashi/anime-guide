# Multi-stage build for Angular application
FROM node:22-alpine AS builder

# Çalışma dizinini ayarla
WORKDIR /app

# Package dosyalarını kopyala
COPY package*.json ./

# Bağımlılıkları yükle
RUN npm install --legacy-peer-deps

# Kaynak kodu kopyala
COPY . .

# Angular uygulamasını build et
RUN npm run build

# Production stage
FROM nginx:alpine

# Custom nginx config kopyala (opsiyonel)
# COPY nginx.conf /etc/nginx/nginx.conf

# Build edilen Angular uygulamasını nginx'e kopyala
COPY --from=builder /app/dist/anime-guide/browser /usr/share/nginx/html

# Angular routing için nginx konfigürasyonu
RUN echo 'server { \
    listen 80; \
    server_name localhost; \
    root /usr/share/nginx/html; \
    index index.html; \
    # API proxy (backend ile bağlantı için) \
    location /api/ { \
        proxy_pass http://anime-api-server:3000; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
        proxy_set_header X-Forwarded-Proto $scheme; \
    } \
    # Angular routing \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Port 80'i expose et
EXPOSE 80

# Nginx'i başlat
CMD ["nginx", "-g", "daemon off;"] 