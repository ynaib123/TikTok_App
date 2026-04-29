package com.tiktokapp.backend.repository;

import com.tiktokapp.backend.model.VideoWorkflowRun;
import com.tiktokapp.backend.model.VideoWorkflowRunStatus;
import com.tiktokapp.backend.model.VideoWorkflowType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface VideoWorkflowRunRepository extends JpaRepository<VideoWorkflowRun, Long> {

    Optional<VideoWorkflowRun> findTopByContentIdeaIdAndWorkflowTypeOrderByCreatedAtDesc(Long contentIdeaId, VideoWorkflowType workflowType);

    Optional<VideoWorkflowRun> findTopByContentIdeaIdOrderByCreatedAtDesc(Long contentIdeaId);

    Optional<VideoWorkflowRun> findTopByContentIdeaIdIsNullAndWorkflowTypeOrderByCreatedAtDesc(VideoWorkflowType workflowType);

    long countByContentIdeaIdAndWorkflowType(Long contentIdeaId, VideoWorkflowType workflowType);

    long countByContentIdeaIdIsNullAndWorkflowType(VideoWorkflowType workflowType);

    List<VideoWorkflowRun> findTop10ByOrderByCreatedAtDesc();

    List<VideoWorkflowRun> findTop8ByOrderByCreatedAtDesc();

    List<VideoWorkflowRun> findTop8ByStatusOrderByCreatedAtDesc(VideoWorkflowRunStatus status);
}
