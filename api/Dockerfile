# Stage 1: Build Angular
FROM node:22 AS angular-build
WORKDIR /app
COPY ui/package*.json ./
RUN npm install
COPY ui/ ./
RUN npm run build -- --configuration production

# Stage 2: Build .NET
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS dotnet-build
WORKDIR /src
COPY api/*.csproj ./
RUN dotnet restore

# Copy Angular build output to wwwroot
COPY --from=angular-build /app/dist/ideahub/ ./wwwroot/

COPY api/ ./
RUN dotnet publish -c Release -o /app

# Stage 3: Runtime
FROM mcr.microsoft.com/dotnet/aspnet:9.0
WORKDIR /app
COPY --from=dotnet-build /app ./
EXPOSE 5065
ENTRYPOINT ["dotnet", "Ideahub.dll"]