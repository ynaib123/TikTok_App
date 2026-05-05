package com.tiktokapp.backend.repository;

import com.tiktokapp.backend.model.AuditEvent;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuditEventRepository extends JpaRepository<AuditEvent, Long> {

    Page<AuditEvent> findByAdminIdOrderByCreatedAtDesc(Long adminId, Pageable pageable);

    Page<AuditEvent> findByActionOrderByCreatedAtDesc(String action, Pageable pageable);
}
