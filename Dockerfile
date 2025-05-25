# Gunakan image Node.js sebagai base image
FROM node:22

# Set working directory di dalam container
WORKDIR /usr/src/app

# Salin file package.json dan package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Salin semua file lainnya
COPY . .
ADD wait-for-it.sh /wait-for-it.sh
RUN chmod +x /wait-for-it.sh

# Expose port aplikasi Express.js
EXPOSE 3000

# Jalankan aplikasi saat container dijalankan
CMD ["sh", "-c", "/wait-for-it.sh db:5432 --timeout=30 --strict -- npm start"]
