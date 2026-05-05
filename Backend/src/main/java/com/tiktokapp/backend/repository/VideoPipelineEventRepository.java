package com.tiktokapp.backend.repository;

import com.tiktokapp.backend.model.VideoPipelineEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface VideoPipelineEventRepository extends JpaRepository<VideoPipelineEvent, Long> {

    VideoPipelineEvent findTopByContentIdeaIdOrderByCreatedAtDesc(Long contentIdeaId);

    List<VideoPipelineEvent> findTop8BySeverityOrderByCreatedAtDesc(String severity);

    List<VideoPipelineEvent> findTop8ByOrderByCreatedAtDesc();

    void deleteByContentIdeaId(Long contentIdeaId);
}
