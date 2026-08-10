# Tahap 1: Build aplikasi Vite/TypeScript dengan Node.js
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Tahap 2: Sajikan hasil build menggunakan Nginx ringan
FROM nginx:alpine
# Hapus konfigurasi default nginx
RUN rm -rf /usr/share/nginx/html/*
# Salin hasil build dari tahap 1 ke folder HTML Nginx
COPY --from=builder /app/dist /usr/share/nginx/html
# Ekspos port 80 untuk internal container
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
