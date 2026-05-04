package com.tiktokapp.backend.repository;

import com.tiktokapp.backend.model.VideoPublishBatch;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VideoPublishBatchRepository extends JpaRepository<VideoPublishBatch, String> {
}
