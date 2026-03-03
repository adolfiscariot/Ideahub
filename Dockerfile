# Stage 1: Build .NET backend
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Copy csproj and restore
COPY api/*.csproj ./api/
RUN dotnet restore api

# Copy backend source (including wwwroot which already contains built Angular)
COPY api/ ./api/

# Publish
RUN dotnet publish api -c Release -o /app

# Stage 2: Runtime
FROM mcr.microsoft.com/dotnet/aspnet:9.0
WORKDIR /app

COPY --from=build /app .

EXPOSE 5065
ENTRYPOINT ["dotnet", "Ideahub.dll"]