# Build Stage
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["Comzera.StrategySuite.Api.csproj", "."]
RUN dotnet restore
COPY . .
RUN dotnet publish -c Release -o /app

# Runtime Stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app .

# Create volume for SQLite
VOLUME /app/data
# Update connection string to use the volume path if needed, 
# or ensure the DB is created in /app/data/
ENV ConnectionStrings__DefaultConnection="Data Source=/app/data/strategy_suite.db"

EXPOSE 5000
ENTRYPOINT ["dotnet", "Comzera.StrategySuite.Api.dll", "--urls", "http://0.0.0.0:5000"]
