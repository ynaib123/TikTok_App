package com.tiktokapp.backend.repository;

import com.tiktokapp.backend.model.VideoPipelineEvent;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VideoPipelineEventRepository extends JpaRepository<VideoPipelineEvent, Long> {
}
