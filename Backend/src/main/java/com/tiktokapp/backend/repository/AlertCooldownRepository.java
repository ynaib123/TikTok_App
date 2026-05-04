package com.tiktokapp.backend.repository;

import com.tiktokapp.backend.model.AlertCooldown;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.Optional;

public interface AlertCooldownRepository extends JpaRepository<AlertCooldown, Long> {

    Optional<AlertCooldown> findByAlertKey(String alertKey);

    long countByLastSentAtAfter(Instant threshold);
}
