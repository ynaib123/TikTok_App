# Intégration Frontend-Backend MyShop

## Configuration pour la connexion Frontend-Backend

Le frontend est maintenant connecté au backend Spring Boot !

### Prérequis

1. **Backend Spring Boot** : Doit tourner sur `http://localhost:8081`
2. **Frontend React** : Tourne sur `http://localhost:5173` (ou port Vite disponible)

### Services d'API créés

#### 1. **apiClient.js** - Client API universel
- Gère tous les appels HTTP vers le backend
- Ajoute automatiquement le token JWT dans les headers
- Gère le base URL via `VITE_API_BASE_URL` (par défaut `/api`, proxy Vite)

#### 2. **authService.js** - Authentification
```javascript
loginUser(email, motDePasse)      // Connexion
startClientSignup(nom, prenom, email, motDePasse, confirmMotDePasse) // Envoi code
completeClientSignup(email, code) // Validation code
```

#### 3. **produitService.js** - Gestion des produits
```javascript
getAllProduits()          // Récupère tous les produits
getProduitById(id)        // Récupère un produit
searchProduits(nom)       // Recherche par nom
```

#### 4. **commandeService.js** - Gestion des commandes
```javascript
getAllCommandes()         // Récupère les commandes
createCommande(clientId)  // Crée une commande
addLigneToCommande(...)   // Ajoute une ligne à une commande
```

#### 5. **clientService.js** - Gestion des clients
```javascript
getAllClients()           // Récupère les clients
getClientById(id)         // Récupère un client
updateClient(id, data)    // Met à jour un client
```

Note: les catégories sont récupérées via les produits (pas de service dédié côté frontend).

### Flux d'Authentification

1. **Backend** : Doit exposer les endpoints :
   - `POST /api/clients/register/start` - Enregistrement (envoi code)
   - `POST /api/clients/register/complete` - Validation code
   - `POST /api/clients/login` - Connexion
   - Retourner `{ token, client }` après login

2. **Frontend** :
   - Login → Appelle `loginUser()` → Token stocké dans localStorage
   - Signup → Appelle `startClientSignup()` puis `completeClientSignup()` → Redirection vers login

3. **Sécurité** :
   - Le token JWT est automiquement ajouté à chaque requête
   - Header: `Authorization: Bearer {token}`

### Backend Spring Boot

Les endpoints nécessaires sont déjà implémentés dans `ClientController` et `AdminController`.

### Démarrage

```bash
# Terminal 1 : Backend Spring Boot
cd c:\myshop
mvn spring-boot:run

# Terminal 2 : Frontend React
cd c:\myshop\frontend
npm run dev
```

### URLs

- **Frontend** : http://localhost:5173
- **Backend API** : http://localhost:8081/api
- **Swagger API** (si configuré) : http://localhost:8081/swagger-ui.html

### Gestion des erreurs

Toutes les erreurs API sont capturées et affichées à l'utilisateur via le contexte AuthContext :
```javascript
const { error, setError } = useAuth()
```

### Prochaines étapes

1. ✅ Implémenter `/api/clients/login` et `/api/clients/register/*` avec JWT
2. ✅ Ajouter la gestion CORS si le backend et frontend tournent sur des ports différents
3. ✅ Mettre à jour ProductTable pour charger les produits du backend
4. ✅ Créer un panier d'achat connecté aux commandes
5. ✅ Ajouter un formulaire pour créer des produits (admin)
