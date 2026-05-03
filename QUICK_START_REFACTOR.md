# 🚀 QUICK START - Plan d'Exécution Immédiat

**Pour développeurs qui veulent commencer MAINTENANT**

---

## 📅 Semaine 1: CRITICAL FIXES

### Jour 1 - Matin (2-3h)

#### ✅ Task 1.1: CSRF Token Fix (15 min)
```bash
# File: Backend/src/main/java/com/tiktokapp/backend/config/SecurityConfig.java
# Line 40: CHANGE
.csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
# TO:
.csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyTrue())
```

**Validation:**
```bash
./mvnw clean build
# Doit compiler sans erreur
```

---

#### ✅ Task 1.2: Admin Password Validation (2-3h)

**Créer fichier:** `Backend/src/main/java/com/tiktokapp/backend/service/PasswordValidator.java`

```java
package com.tiktokapp.backend.service;

import org.springframework.stereotype.Component;
import java.util.*;
import java.util.regex.Pattern;

@Component
public class PasswordValidator {
    
    private static final int MIN_LENGTH = 12;
    private static final Pattern UPPERCASE = Pattern.compile("[A-Z]");
    private static final Pattern LOWERCASE = Pattern.compile("[a-z]");
    private static final Pattern DIGIT = Pattern.compile("[0-9]");
    private static final Pattern SPECIAL = Pattern.compile("[!@#$%^&*]");
    
    public PasswordValidationResult validate(String password) {
        List<String> errors = new ArrayList<>();
        
        if (password == null || password.isEmpty()) {
            errors.add("Password is required");
            return new PasswordValidationResult(false, errors);
        }
        
        if (password.length() < MIN_LENGTH) {
            errors.add(String.format("Minimum %d characters required", MIN_LENGTH));
        }
        if (!UPPERCASE.matcher(password).find()) {
            errors.add("At least 1 uppercase letter required");
        }
        if (!LOWERCASE.matcher(password).find()) {
            errors.add("At least 1 lowercase letter required");
        }
        if (!DIGIT.matcher(password).find()) {
            errors.add("At least 1 digit required");
        }
        if (!SPECIAL.matcher(password).find()) {
            errors.add("At least 1 special character required (!@#$%^&*)");
        }
        
        return new PasswordValidationResult(errors.isEmpty(), errors);
    }
    
    public static class PasswordValidationResult {
        public final boolean valid;
        public final List<String> errors;
        
        public PasswordValidationResult(boolean valid, List<String> errors) {
            this.valid = valid;
            this.errors = errors;
        }
    }
}
```

**Intégrer dans AdminAuthService.java:**
```java
// Add @Autowired field:
@Autowired
private PasswordValidator passwordValidator;

// In register/login method, add before password encoding:
var validation = passwordValidator.validate(request.getPassword());
if (!validation.valid) {
    throw new PasswordValidationException(String.join(", ", validation.errors));
}
```

**Frontend update:** `Frontend/admin/src/pages/AdminLogin.jsx`
```javascript
// Find password validation section, update minimum to 12 chars
```

**Test:**
```bash
./mvnw test -Dtest=PasswordValidatorTest
```

---

### Jour 1-2 (4-6h)

#### ✅ Task 1.3: Refresh Token Database Persistence

**Créer entity:** `Backend/src/main/java/com/tiktokapp/backend/model/RefreshToken.java`

```java
package com.tiktokapp.backend.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "refresh_tokens", indexes = {
    @Index(columnList = "admin_user_id"),
    @Index(columnList = "expires_at"),
    @Index(columnList = "revoked_at")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class RefreshToken {
    
    @Id
    private String token;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "admin_user_id", nullable = false)
    private AdminUser user;
    
    @Column(nullable = false)
    private LocalDateTime createdAt;
    
    @Column(nullable = false)
    private LocalDateTime expiresAt;
    
    private LocalDateTime revokedAt;
    
    private String ipAddress;
    private String userAgent;
    
    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
    }
    
    public boolean isValid() {
        return LocalDateTime.now().isBefore(this.expiresAt) && 
               this.revokedAt == null;
    }
}
```

**Créer repository:** `Backend/src/main/java/com/tiktokapp/backend/repository/RefreshTokenRepository.java`

```java
package com.tiktokapp.backend.repository;

import com.tiktokapp.backend.model.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDateTime;
import java.util.List;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, String> {
    List<RefreshToken> findByUserId(Long userId);
    long deleteByExpiresAtBeforeAndRevokedAtIsNull(LocalDateTime cutoff);
}
```

**Créer service:** `Backend/src/main/java/com/tiktokapp/backend/service/DatabaseRefreshTokenStore.java`

```java
package com.tiktokapp.backend.service;

import com.tiktokapp.backend.model.RefreshToken;
import com.tiktokapp.backend.model.AdminUser;
import com.tiktokapp.backend.repository.RefreshTokenRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.*;
import java.util.logging.Logger;

@Service
@Transactional
public class DatabaseRefreshTokenStore {
    
    private static final Logger logger = Logger.getLogger(
        DatabaseRefreshTokenStore.class.getName()
    );
    
    @Autowired
    private RefreshTokenRepository repository;
    
    public void store(String token, AdminUser user, LocalDateTime expiresAt,
                      String ipAddress, String userAgent) {
        RefreshToken entity = new RefreshToken();
        entity.setToken(token);
        entity.setUser(user);
        entity.setExpiresAt(expiresAt);
        entity.setIpAddress(ipAddress);
        entity.setUserAgent(userAgent);
        repository.save(entity);
    }
    
    @Transactional(readOnly = true)
    public Optional<RefreshToken> retrieve(String token) {
        return repository.findById(token)
            .filter(RefreshToken::isValid);
    }
    
    public void revoke(String token) {
        repository.findById(token).ifPresent(rt -> {
            rt.setRevokedAt(LocalDateTime.now());
            repository.save(rt);
        });
    }
    
    public void revokeAllForUser(Long userId) {
        List<RefreshToken> tokens = repository.findByUserId(userId);
        tokens.forEach(rt -> rt.setRevokedAt(LocalDateTime.now()));
        repository.saveAll(tokens);
    }
    
    public void cleanupExpired() {
        long deleted = repository.deleteByExpiresAtBeforeAndRevokedAtIsNull(
            LocalDateTime.now().minusDays(1)
        );
        if (deleted > 0) {
            logger.info("Cleaned up " + deleted + " expired tokens");
        }
    }
}
```

**Créer migration Flyway:** `Backend/src/main/resources/db/migration/V1.0__create_refresh_tokens_table.sql`

```sql
CREATE TABLE refresh_tokens (
    token VARCHAR(1024) PRIMARY KEY,
    admin_user_id BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent VARCHAR(500),
    
    CONSTRAINT fk_refresh_tokens_admin_user 
        FOREIGN KEY (admin_user_id) REFERENCES admin_user(id) ON DELETE CASCADE
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(admin_user_id);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
```

**Mettre à jour RefreshCookieService.java:**
```java
// Remplacer InMemoryRefreshTokenStore par DatabaseRefreshTokenStore
@Autowired
private DatabaseRefreshTokenStore tokenStore;  // NEW

// Dans generateRefreshToken():
tokenStore.store(token, user, expiresAt, clientIp, userAgent);  // Persister

// Dans validateRefreshToken():
Optional<RefreshToken> result = tokenStore.retrieve(token);  // Récupérer
```

**Supprimer:** `InMemoryRefreshTokenStore.java` (classe obsolète)

**Test:**
```bash
./mvnw clean test
# Doit passer tous les tests RefreshToken
```

---

### Jour 2-3 (2-3h)

#### ✅ Task 1.4: Fix Generic Exception Catches

**Fichier:** `Backend/src/main/java/com/tiktokapp/backend/config/AdminJwtAuthenticationFilter.java:60`

```java
// BEFORE:
try {
    String token = extractToken(request);
    if (token != null) {
        JwtAuthenticationToken auth = jwtService.validateToken(token);
        SecurityContextHolder.getContext().setAuthentication(auth);
    }
} catch (Exception ignored) {
    SecurityContextHolder.clearContext();
}

// AFTER:
try {
    String token = extractToken(request);
    if (token != null) {
        JwtAuthenticationToken auth = jwtService.validateToken(token);
        SecurityContextHolder.getContext().setAuthentication(auth);
    }
} catch (ExpiredJwtException e) {
    logger.debug("JWT token expired");
    SecurityContextHolder.clearContext();
} catch (UnsupportedJwtException | MalformedJwtException | 
         IllegalArgumentException e) {
    logger.debug("Invalid JWT token: {}", e.getMessage());
    SecurityContextHolder.clearContext();
}
```

**Même pattern pour:** `AdminAuthController.java:94`

---

### ✅ Checkpoint: Jour 3
```bash
./mvnw clean build
./mvnw test
# ✅ All PHASE 0 tests passing
# ✅ Ready for staging deployment
```

---

## 📊 Semaine 2-3: PERFORMANCE + ARCHITECTURE

### Task 2.1: Add Database Indexes (2-3h)

**Créer migration:** `V1.1__add_missing_indexes.sql`

```sql
-- ContentIdea indexes
CREATE INDEX idx_content_idea_tiktok_account_open_id 
    ON content_idea(tiktok_account_open_id);
CREATE INDEX idx_content_idea_status_created_at 
    ON content_idea(status, created_at DESC);

-- TikTokAccount indexes
CREATE INDEX idx_tiktok_account_open_id 
    ON tiktok_account(open_id);

-- VideoPipelineState indexes
CREATE INDEX idx_video_pipeline_state_content_idea_id 
    ON video_pipeline_state(content_idea_id);
CREATE INDEX idx_video_pipeline_state_stage 
    ON video_pipeline_state(stage);

-- ErrorLog indexes
CREATE INDEX idx_error_log_created_at 
    ON error_log(created_at DESC);
CREATE INDEX idx_error_log_severity_created_at 
    ON error_log(severity, created_at DESC);
```

**Ajouter annotations JPA:**

```java
// ContentIdea.java
@Entity
@Table(name = "content_idea", indexes = {
    @Index(name = "idx_tiktok_account_open_id", columnList = "tiktok_account_open_id"),
    @Index(name = "idx_status_created_at", columnList = "status,created_at")
})
public class ContentIdea { ... }

// TikTokAccount.java
@Entity
@Table(name = "tiktok_account", indexes = {
    @Index(name = "idx_open_id", columnList = "open_id", unique = true)
})
public class TikTokAccount { ... }
```

---

### Task 2.2: Implement Pagination (4-6h)

**Créer DTO:** `Backend/src/main/java/com/tiktokapp/backend/dto/PagedResponse.java`

```java
package com.tiktokapp.backend.dto;

import lombok.*;
import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class PagedResponse<T> {
    private List<T> content;
    private int pageNumber;
    private int pageSize;
    private long totalElements;
    private int totalPages;
    private boolean hasNext;
    private boolean hasPrevious;
}
```

**Mettre à jour controller:** `VideoOpsController.java`

```java
@GetMapping("/content-ideas")
public ResponseEntity<PagedResponse<ContentIdeaDto>> getContentIdeas(
    @RequestParam(defaultValue = "0") int page,
    @RequestParam(defaultValue = "50") int size,
    @RequestParam(defaultValue = "createdAt") String sortBy,
    @RequestParam(defaultValue = "desc") String direction
) {
    Pageable pageable = PageRequest.of(
        page, 
        Math.min(size, 100),  // Max 100 items per page
        Sort.Direction.fromString(direction.toUpperCase()),
        sortBy
    );
    
    Page<ContentIdea> ideas = contentIdeaRepository.findAll(pageable);
    
    PagedResponse<ContentIdeaDto> response = new PagedResponse<>(
        ideas.getContent().stream()
            .map(ContentIdeaDto::from)
            .toList(),
        page,
        ideas.getSize(),
        ideas.getTotalElements(),
        ideas.getTotalPages(),
        ideas.hasNext(),
        ideas.hasPrevious()
    );
    
    return ResponseEntity.ok(response);
}
```

**Frontend update:** `Frontend/admin/src/hooks/useContentIdeas.js` (NEW)

```javascript
import { useQuery } from '@tanstack/react-query';

export function useContentIdeas(page = 0, size = 50) {
    return useQuery({
        queryKey: ['contentIdeas', page, size],
        queryFn: async () => {
            const res = await fetch(
                `/api/video-ops/content-ideas?page=${page}&size=${size}`,
                { credentials: 'include' }
            );
            if (!res.ok) throw new Error('Failed to fetch');
            return res.json();
        },
        staleTime: 5 * 60 * 1000,  // 5 minutes
    });
}
```

**Utilisation:**
```javascript
const { data, isLoading, error } = useContentIdeas(0, 50);
```

---

### Task 2.3: Fix N+1 Queries (1-2h)

**Fichier:** `Backend/src/main/java/com/tiktokapp/backend/repository/VideoPipelineStateRepository.java`

```java
public interface VideoPipelineStateRepository 
    extends JpaRepository<VideoPipelineState, Long> {
    
    @Query("SELECT DISTINCT vps FROM VideoPipelineState vps " +
           "JOIN FETCH vps.contentIdea ci " +
           "JOIN FETCH ci.tiktokAccount ta " +
           "WHERE ci.id IN :ids")
    List<VideoPipelineState> findByContentIdeaIdInWithAssociations(
        @Param("ids") List<Long> ids
    );
}
```

**Utilisation dans VideoOpsService.java:115**

```java
// BEFORE:
List<VideoPipelineState> states = 
    pipelineStateRepository.findByContentIdeaIdIn(contentIdeaIds);

// AFTER:
List<VideoPipelineState> states = 
    pipelineStateRepository.findByContentIdeaIdInWithAssociations(contentIdeaIds);
```

---

### Task 2.4: Split VideoOpsService (6-8h)

**Plan:**
1. Créer `ContentIdeaService` - CRUD et validation
2. Créer `WorkflowRunService` - Orchestration workflows
3. Créer `VideoObservabilityService` - Erreurs et métriques
4. Refactorer `VideoOpsService` comme orchestrator

**Template ContentIdeaService:**

```java
@Service
@Transactional
public class ContentIdeaService {
    
    @Autowired
    private ContentIdeaRepository repository;
    
    @Autowired
    private PasswordValidator passwordValidator;  // Example dependency
    
    public Page<ContentIdea> getAllIdeas(Pageable pageable) {
        return repository.findAll(pageable);
    }
    
    public ContentIdea createIdea(ContentIdeaCreateRequest request) {
        // Validation + creation logic
        ContentIdea idea = new ContentIdea();
        idea.setTitle(request.getTitle());
        // ... more fields
        return repository.save(idea);
    }
    
    public ContentIdea updateIdea(Long id, ContentIdeaUpdateRequest request) {
        ContentIdea idea = repository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Idea not found"));
        idea.setTitle(request.getTitle());
        // ... update fields
        return repository.save(idea);
    }
    
    public void deleteIdea(Long id) {
        repository.deleteById(id);
    }
}
```

---

## 📋 Semaine 3-4: SECURITY + LOGGING

### Task 3.1: Token Encryption (6-8h)

**Créer service:** `Backend/src/main/java/com/tiktokapp/backend/service/TokenEncryptionService.java`

```java
package com.tiktokapp.backend.service;

import javax.crypto.Cipher;
import javax.crypto.spec.SecretKeySpec;
import javax.crypto.spec.IvParameterSpec;
import java.util.Base64;
import java.security.SecureRandom;

@Service
public class TokenEncryptionService {
    
    @Value("${app.token-encryption-key}")
    private String encryptionKey;
    
    private static final String ALGORITHM = "AES";
    private static final String TRANSFORMATION = "AES/CBC/PKCS5Padding";
    
    public String encrypt(String plainToken) throws Exception {
        SecretKeySpec key = new SecretKeySpec(
            encryptionKey.getBytes(), 0, 32, ALGORITHM
        );
        
        Cipher cipher = Cipher.getInstance(TRANSFORMATION);
        
        // Generate random IV
        byte[] iv = new byte[16];
        new SecureRandom().nextBytes(iv);
        IvParameterSpec ivSpec = new IvParameterSpec(iv);
        
        cipher.init(Cipher.ENCRYPT_MODE, key, ivSpec);
        byte[] encrypted = cipher.doFinal(plainToken.getBytes());
        
        // Concatenate IV + encrypted data
        byte[] combined = new byte[iv.length + encrypted.length];
        System.arraycopy(iv, 0, combined, 0, iv.length);
        System.arraycopy(encrypted, 0, combined, iv.length, encrypted.length);
        
        return Base64.getEncoder().encodeToString(combined);
    }
    
    public String decrypt(String encryptedToken) throws Exception {
        byte[] combined = Base64.getDecoder().decode(encryptedToken);
        
        // Extract IV
        byte[] iv = new byte[16];
        System.arraycopy(combined, 0, iv, 0, 16);
        IvParameterSpec ivSpec = new IvParameterSpec(iv);
        
        // Extract encrypted data
        byte[] encrypted = new byte[combined.length - 16];
        System.arraycopy(combined, 16, encrypted, 0, encrypted.length);
        
        SecretKeySpec key = new SecretKeySpec(
            encryptionKey.getBytes(), 0, 32, ALGORITHM
        );
        
        Cipher cipher = Cipher.getInstance(TRANSFORMATION);
        cipher.init(Cipher.DECRYPT_MODE, key, ivSpec);
        
        return new String(cipher.doFinal(encrypted));
    }
}
```

**Utiliser dans TikTokAccount.java:**

```java
@Entity
public class TikTokAccount {
    
    @Autowired(required = false)
    private TokenEncryptionService encryptionService;
    
    @Column(columnDefinition = "TEXT")
    private String accessToken;  // Stored encrypted
    
    @Column(columnDefinition = "TEXT")
    private String refreshToken;  // Stored encrypted
    
    @Transient
    private String _decryptedAccessToken;
    
    // Getter returns decrypted value
    public String getAccessToken() {
        if (_decryptedAccessToken != null) {
            return _decryptedAccessToken;
        }
        if (accessToken != null && encryptionService != null) {
            try {
                _decryptedAccessToken = encryptionService.decrypt(accessToken);
                return _decryptedAccessToken;
            } catch (Exception e) {
                throw new RuntimeException("Failed to decrypt token", e);
            }
        }
        return accessToken;
    }
    
    // Setter encrypts value
    public void setAccessToken(String value) {
        _decryptedAccessToken = value;
        if (value != null && encryptionService != null) {
            try {
                this.accessToken = encryptionService.encrypt(value);
            } catch (Exception e) {
                throw new RuntimeException("Failed to encrypt token", e);
            }
        } else {
            this.accessToken = value;
        }
    }
}
```

---

### Task 3.2: Comprehensive Logging (6-8h)

**Ajouter dependency dans pom.xml:**
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-logging</artifactId>
</dependency>
```

**Create** `Backend/src/main/resources/logback-spring.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
    <property name="LOG_FILE" value="${LOG_FILE:-${LOG_PATH:-${LOG_TEMP:-${java.io.tmpdir:-/tmp}}/}spring.log}"/>
    
    <appender name="FILE" class="ch.qos.logback.core.rolling.RollingFileAppender">
        <file>${LOG_FILE}</file>
        <encoder>
            <pattern>%d{yyyy-MM-dd HH:mm:ss} [%thread] %-5level %logger{36} - %msg%n</pattern>
        </encoder>
        <rollingPolicy class="ch.qos.logback.core.rolling.SizeAndTimeBasedRollingPolicy">
            <fileNamePattern>${LOG_FILE}.%d{yyyy-MM-dd}.%i.gz</fileNamePattern>
            <maxFileSize>10MB</maxFileSize>
            <maxHistory>30</maxHistory>
        </rollingPolicy>
    </appender>
    
    <root level="INFO">
        <appender-ref ref="FILE"/>
    </root>
    
    <logger name="com.tiktokapp.backend.service" level="DEBUG"/>
    <logger name="com.tiktokapp.backend.controller" level="DEBUG"/>
</configuration>
```

**Ajouter logging dans AdminAuthService.java:**

```java
@Slf4j
@Service
public class AdminAuthService {
    
    public AdminAuthResponse login(LoginRequest request, HttpServletRequest httpReq) {
        String clientIp = getClientIp(httpReq);
        
        try {
            AdminUser user = authenticateAdmin(request.getEmail(), request.getPassword());
            log.info("Admin login successful - IP: {}", clientIp);
            
            return generateTokens(user);
        } catch (BadCredentialsException e) {
            log.warn("Admin login failed - email: {}, IP: {}", 
                maskEmail(request.getEmail()), clientIp);
            throw e;
        } catch (Exception e) {
            log.error("Unexpected error during login", e);
            throw e;
        }
    }
    
    private String maskEmail(String email) {
        if (email == null || email.length() < 5) return "***";
        return email.substring(0, 2) + "***" + email.substring(email.length() - 2);
    }
}
```

---

## ✅ Testing & Validation

### Run All Tests
```bash
cd Backend
./mvnw clean test

cd ../Frontend/admin
npm test
```

### Performance Benchmarking
```bash
# Before: Query all content ideas
# After: Query page 1 of 50

# Time comparison:
# Before: 500ms (1000 ideas) → 5s (10000 ideas)
# After: 50ms (any size, same page) ✅ 10x faster
```

### Security Verification
```bash
# Verify CSRF token is HttpOnly
curl -v http://localhost:8080/api/admins/csrf-token
# Look for: Set-Cookie: XSRF-TOKEN=...; HttpOnly; Secure

# Verify passwords are enforced
curl -X POST http://localhost:8080/api/admins/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"weak"}'
# Should return validation error
```

---

## 📊 Success Checklist

### After Week 1 ✅
- [ ] CSRF HttpOnly implemented
- [ ] Refresh tokens in database
- [ ] Admin password validation working
- [ ] Generic exception catches fixed
- [ ] All tests passing
- [ ] Zero critical security issues

### After Week 2 ✅
- [ ] Database indexes added
- [ ] Pagination implemented
- [ ] N+1 queries fixed
- [ ] Performance: 10-50x improvement on list endpoints
- [ ] VideoOpsService split into 3-4 services

### After Week 3 ✅
- [ ] Token encryption implemented
- [ ] Comprehensive logging in place
- [ ] OAuth state handling secure
- [ ] CORS properly configured
- [ ] Security audit passed

---

## 🆘 If Stuck

**Problem:** Tests failing after CSRF change  
**Solution:** Update frontend to not expect CSRF in response body

**Problem:** Refresh token migration  
**Solution:** Add data migration script to populate RefreshToken table

**Problem:** Performance still slow after indexes  
**Solution:** Check EXPLAIN PLAN for queries, ensure indexes are used

---

**Dernière mise à jour:** Mai 3, 2026  
**Status:** Ready to execute  
**Estimated completion:** 4-6 semaines (2 développeurs)
