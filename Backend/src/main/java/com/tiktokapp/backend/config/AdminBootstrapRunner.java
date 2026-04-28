package com.tiktokapp.backend.config;

import com.tiktokapp.backend.model.AdminAccount;
import com.tiktokapp.backend.repository.AdminAccountRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class AdminBootstrapRunner implements CommandLineRunner {

    private final AdminAccountRepository adminAccountRepository;
    private final SecurityProperties securityProperties;
    private final PasswordEncoder passwordEncoder;

    public AdminBootstrapRunner(
            AdminAccountRepository adminAccountRepository,
            SecurityProperties securityProperties,
            PasswordEncoder passwordEncoder
    ) {
        this.adminAccountRepository = adminAccountRepository;
        this.securityProperties = securityProperties;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        if (!securityProperties.isBootstrapAdminOnStartup()) {
            return;
        }

        String email = normalize(securityProperties.getAdminEmail());
        adminAccountRepository.findByEmailIgnoreCase(email).ifPresentOrElse(existing -> {
            boolean changed = false;
            if (!securityProperties.getAdminName().equals(existing.getNom())) {
                existing.setNom(securityProperties.getAdminName());
                changed = true;
            }
            if (!"ADMIN".equalsIgnoreCase(existing.getRole())) {
                existing.setRole("ADMIN");
                changed = true;
            }
            if (!passwordEncoder.matches(securityProperties.getAdminPassword(), existing.getPasswordHash())) {
                existing.setPasswordHash(passwordEncoder.encode(securityProperties.getAdminPassword()));
                changed = true;
            }
            if (changed) {
                adminAccountRepository.save(existing);
            }
        }, () -> {
            AdminAccount admin = new AdminAccount();
            admin.setNom(securityProperties.getAdminName());
            admin.setEmail(email);
            admin.setPasswordHash(passwordEncoder.encode(securityProperties.getAdminPassword()));
            admin.setRole("ADMIN");
            adminAccountRepository.save(admin);
        });
    }

    private String normalize(String value) {
        return String.valueOf(value == null ? "" : value).trim().toLowerCase();
    }
}
