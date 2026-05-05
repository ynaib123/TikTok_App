package com.tiktokapp.backend.repository;

import com.tiktokapp.backend.model.FailedCallback;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;

public interface FailedCallbackRepository extends JpaRepository<FailedCallback, Long> {

    List<FailedCallback> findByResolvedAtIsNullAndNextRetryAtBefore(Instant cutoff);

    long countByResolvedAtIsNull();
}
