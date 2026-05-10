package com.tiktokapp.backend.repository;

import com.tiktokapp.backend.model.TikTokSound;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface TikTokSoundRepository extends JpaRepository<TikTokSound, Long> {

    Optional<TikTokSound> findBySoundId(String soundId);

    boolean existsBySoundId(String soundId);

    /** Trending sounds, most-used first. */
    List<TikTokSound> findByTrendingTrueOrderByVideoCountDesc(Pageable pageable);

    /** All sounds in a category, most-used first. */
    List<TikTokSound> findByCategoryOrderByVideoCountDesc(String category, Pageable pageable);

    /** Full-text search on title + authorName (case-insensitive). */
    @Query("""
        SELECT s FROM TikTokSound s
        WHERE LOWER(s.title) LIKE LOWER(CONCAT('%', :q, '%'))
           OR LOWER(s.authorName) LIKE LOWER(CONCAT('%', :q, '%'))
        ORDER BY s.videoCount DESC NULLS LAST
        """)
    List<TikTokSound> searchByQuery(@Param("q") String q, Pageable pageable);
}
