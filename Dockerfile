FROM node:20-alpine

WORKDIR /app

# Copy package.json and install dependencies
COPY package.json ./
RUN npm install --production

# Copy application files
COPY . .

# Expose the application port
EXPOSE 3000

# Start the server
CMD ["npm", "start"]
