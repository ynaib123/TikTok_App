package com.tiktokapp.backend.service;

import com.tiktokapp.backend.config.SecurityProperties;
import com.tiktokapp.backend.dto.AdminProfileResponse;
import com.tiktokapp.backend.model.AdminAccount;
import com.tiktokapp.backend.repository.AdminAccountRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class AdminAuthService {

    private final AdminAccountRepository adminAccountRepository;
    private final SecurityProperties securityProperties;
    private final PasswordEncoder passwordEncoder;

    public AdminAuthService(
            AdminAccountRepository adminAccountRepository,
            SecurityProperties securityProperties,
            PasswordEncoder passwordEncoder
    ) {
        this.adminAccountRepository = adminAccountRepository;
        this.securityProperties = securityProperties;
        this.passwordEncoder = passwordEncoder;
    }

    public Optional<AdminProfileResponse> authenticate(String email, String password) {
        String normalizedEmail = normalize(email);
        return adminAccountRepository.findByEmailIgnoreCase(normalizedEmail)
                .filter(admin -> passwordEncoder.matches(String.valueOf(password), admin.getPasswordHash()))
                .map(this::toProfile);
    }

    public AdminProfileResponse getConfiguredAdmin() {
        String normalizedEmail = normalize(securityProperties.getAdminEmail());
        AdminAccount admin = adminAccountRepository.findByEmailIgnoreCase(normalizedEmail)
                .orElseThrow(() -> new IllegalStateException("Default admin account is missing from database"));
        return toProfile(admin);
    }

    private String normalize(String email) {
        return String.valueOf(email == null ? "" : email).trim().toLowerCase();
    }

    private AdminProfileResponse toProfile(AdminAccount admin) {
        return new AdminProfileResponse(admin.getId(), admin.getNom(), normalize(admin.getEmail()));
    }
}
