# Stage 1: Build Angular
FROM node:20-alpine AS frontend-build
WORKDIR /app
COPY ui/package*.json ./
RUN npm ci
COPY ui/ ./
ARG FRONTEND_CONFIG=production
RUN npm run build -- --configuration=${FRONTEND_CONFIG}

# Stage 2: Build .NET backend
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS backend-build
WORKDIR /src
COPY api/*.csproj ./api/
RUN dotnet restore api
COPY api/ ./api/
COPY --from=frontend-build /app/dist/ideahub/ ./api/wwwroot/
RUN dotnet publish api -c Release -o /app

# Stage 3: Runtime
FROM mcr.microsoft.com/dotnet/aspnet:9.0
WORKDIR /app
COPY --from=backend-build /app .
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
EXPOSE 5065
ENTRYPOINT ["/entrypoint.sh"]