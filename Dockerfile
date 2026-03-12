# Gunakan Node.js versi 20 (Stabil & Ringan)
FROM node:20-alpine

# Set working directory di dalam container
WORKDIR /app

# Install dependency sistem yang dibutuhkan (jaga-jaga kalau jagproject butuh)
RUN apk add --no-cache git python3 make g++

# Copy file package.json dan package-lock.json dulu
COPY package*.json ./

# Install semua dependency npm
RUN npm install --production

# Copy semua file project ke dalam container
COPY . .

# Expose port (Northflank biasanya auto-detect, tapi ini good practice)
EXPOSE 3000

# Command untuk menjalankan bot
CMD ["node", "main.js"]
