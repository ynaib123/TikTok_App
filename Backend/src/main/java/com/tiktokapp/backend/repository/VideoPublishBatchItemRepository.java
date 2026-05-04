package com.tiktokapp.backend.repository;

import com.tiktokapp.backend.model.VideoPublishBatchItem;
import com.tiktokapp.backend.model.VideoPublishBatchItemStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface VideoPublishBatchItemRepository extends JpaRepository<VideoPublishBatchItem, Long> {

    List<VideoPublishBatchItem> findByBatchIdOrderByIdAsc(String batchId);

    List<VideoPublishBatchItem> findByBatchIdAndStatus(String batchId, VideoPublishBatchItemStatus status);
}
