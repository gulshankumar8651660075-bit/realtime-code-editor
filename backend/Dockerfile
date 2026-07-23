# Use node alpine base image
FROM node:18-alpine

# Install compiling dependencies for the sandbox execution engine
RUN apk add --no-cache g++ go python3

# Set working directory
WORKDIR /usr/src/app

# Copy dependency configs
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code and config files
COPY . .

# Generate Prisma client and compile TypeScript to JavaScript
RUN npx prisma generate && npm run build

# Expose server port
EXPOSE 5000

# Set environment production defaults
ENV NODE_ENV=production
ENV PORT=5000

# Launch server
CMD ["npm", "start"]
