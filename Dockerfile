# Use an official Node.js runtime as a parent image
FROM node:latest

# Set environment variables
ENV DEBIAN_FRONTEND=noninteractive


# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# COPY /node-glints/package*.json ./
# COPY /waweb-api/package*.json ./
COPY package*.json ./
RUN npm install
# RUN cd node_modules/puppeteer
# RUN npm install
# Install dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libdbus-1-3 \
    libxcomposite1 \
    libxrandr2 \
    libxdamage1 \
    libxkbcommon0 \
    libgbm1 \
    libnss3 \
    libxss1 \
    lsb-release \
    xdg-utils \
    wget \
    --no-install-recommends \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install Puppeteer
RUN npm install puppeteer

# Bundle app source
# COPY /node-glints/. .
# COPY /waweb-api/. .
COPY . .

# Expose the Node.js app port
EXPOSE 3001

# Start SSH and the Node.js app
CMD  npm start

