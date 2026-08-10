# Sajikan hasil build menggunakan Nginx ringan
FROM nginx:latest
# Hapus konfigurasi default nginx
RUN rm -rf /usr/share/nginx/html/*
# Salin hasil build lokal ke folder HTML Nginx
COPY dist /usr/share/nginx/html
# Ekspos port 80 untuk internal container
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
