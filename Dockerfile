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
RUN cd ./node_modules/puppeteer
RUN npm install

# Bundle app source
# COPY /node-glints/. .
# COPY /waweb-api/. .
COPY . .

# Expose the Node.js app port
EXPOSE 3001

# Start SSH and the Node.js app
CMD  npm start

