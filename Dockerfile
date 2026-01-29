# Stage 1: Build .NET
#FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
#WORKDIR /src

## Restore
#COPY api/*.csproj ./api/
#RUN dotnet restore api

## Copy source
#COPY api/ ./api/

## Copy pre-built Angular files
#COPY ui/dist/ideahub/ ./api/wwwroot/

## Publish
#RUN dotnet publish api -c Release -o /app

## Stage 2: Runtime
#FROM mcr.microsoft.com/dotnet/aspnet:9.0
#WORKDIR /app

#COPY --from=build /app .

#EXPOSE 5065
#ENTRYPOINT ["dotnet", "Ideahub.dll"]

# Stage 0: Build Angular frontend
FROM node:20 AS frontend-build
WORKDIR /app
COPY ui/ .
RUN npm install
RUN npm run build --prod --output-path=dist/ideahub

# Stage 1: Build .NET backend
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Restore .NET
COPY api/*.csproj ./api/
RUN dotnet restore api

# Copy source
COPY api/ ./api/

# Copy Angular build from frontend stage
COPY --from=frontend-build /app/dist/ideahub ./api/wwwroot/

# Publish .NET app
RUN dotnet publish api -c Release -o /app

# Stage 2: Runtime
FROM mcr.microsoft.com/dotnet/aspnet:9.0
WORKDIR /app
COPY --from=build /app .
EXPOSE 5065
ENTRYPOINT ["dotnet", "Ideahub.dll"]
