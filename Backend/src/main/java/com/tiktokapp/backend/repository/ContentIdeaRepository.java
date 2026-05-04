package com.tiktokapp.backend.repository;

import com.tiktokapp.backend.model.ContentIdea;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ContentIdeaRepository extends JpaRepository<ContentIdea, Long> {

    List<ContentIdea> findAllByOrderByIdDesc();

    Page<ContentIdea> findAllBy(Pageable pageable);

    @Query("SELECT c FROM ContentIdea c WHERE c.shotstackRenderId IS NOT NULL AND c.finalVideoStatus = 'processing'")
    List<ContentIdea> findPendingRenders();

    Optional<ContentIdea> findByIdAndPlatformAndFinalVideoStatus(Long id, String platform, String finalVideoStatus);
}
