# Stage 1: Build Angular app
FROM node:20-slim AS builder
WORKDIR /app

COPY package*.json ./
RUN npm install
COPY . .

# Build Angular in production mode
RUN npm run build -- --configuration production

# Stage 2: Serve built app using lightweight Node server
FROM node:20-slim
WORKDIR /app

# Install lightweight static server
RUN npm install -g serve

# Copy production build
COPY --from=builder /app/dist/ideahub /app/dist

EXPOSE 80

# Start server
CMD ["serve", "-s", "dist", "-l", "80"]
