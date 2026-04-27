#!/bin/bash
# Script de vérification de la connexion Frontend-Backend

echo "=== Vérification MyShop Frontend-Backend ==="
echo ""

# Vérifier Frontend
echo "1️⃣  Vérification Frontend (Vite)..."
if curl -s http://localhost:5173/ > /dev/null; then
  echo "✅ Frontend accessible sur http://localhost:5173"
else
  echo "❌ Frontend NOT accessible sur http://localhost:5173"
fi

echo ""

# Vérifier Backend
echo "2️⃣  Vérification Backend (Spring Boot)..."
if curl -s http://localhost:8081/api/produits > /dev/null 2>&1; then
  echo "✅ Backend accessible sur http://localhost:8081/api"
else
  echo "❌ Backend NOT accessible sur http://localhost:8081/api"
  echo "Assurez-vous que Spring Boot est lancé:"
  echo "  cd c:\\myshop"
  echo "  ./mvnw spring-boot:run"
fi

echo ""

# Vérifier CORS
echo "3️⃣  Configuration CORS..."
echo "⚠️  Si vous avez des erreurs CORS, ajoutez cette configuration au backend:"
echo ""
echo "@Configuration"
echo "public class CorsConfig {"
echo "  @Bean"
echo "  public CorsConfigurationSource corsConfigurationSource() {"
echo "    CorsConfiguration configuration = new CorsConfiguration();"
echo "    configuration.setAllowedOrigins(List.of(\"http://localhost:5175\"));"
echo "    configuration.setAllowedMethods(List.of(\"GET\", \"POST\", \"PUT\", \"DELETE\"));"
echo "    configuration.setAllowedHeaders(List.of(\"*\"));"
echo "    configuration.setAllowCredentials(true);"
echo "    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();"
echo "    source.registerCorsConfiguration(\"/**\", configuration);"
echo "    return source;"
echo "  }"
echo "}"
echo ""

echo "=== Résumé ==="
echo "Frontend : http://localhost:5173"
echo "Backend API : http://localhost:8081/api"
echo ""
echo "Services disponibles:"
echo "  - POST /clients/login"
echo "  - POST /clients/register"
echo "  - GET /produits"
echo "  - GET /commandes"
echo "  - GET /clients"
echo "  - GET /categories"
