package com.tiktokapp.backend.repository;

import com.tiktokapp.backend.model.VideoPipelineState;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface VideoPipelineStateRepository extends JpaRepository<VideoPipelineState, Long> {

    List<VideoPipelineState> findByContentIdeaIdIn(Collection<Long> contentIdeaIds);
}
