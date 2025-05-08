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

# Expose port aplikasi Express.js
EXPOSE 3000

# Jalankan aplikasi saat container dijalankan
CMD ["npm", "start"]
