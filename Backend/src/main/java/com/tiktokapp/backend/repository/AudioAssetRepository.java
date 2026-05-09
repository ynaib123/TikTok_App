package com.tiktokapp.backend.repository;

import com.tiktokapp.backend.model.AudioAsset;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AudioAssetRepository extends JpaRepository<AudioAsset, Long> {

    List<AudioAsset> findByContentIdeaIdOrderByCreatedAtDesc(Long contentIdeaId);

    Optional<AudioAsset> findFirstByContentIdeaIdAndAssetKindAndSelectedIsTrue(
            Long contentIdeaId, AudioAsset.AssetKind assetKind);

    /**
     * Atomically clears the selected flag on every audio asset of a given kind
     * for a content idea. Called right before flipping the new winner to
     * {@code is_selected = true} so we keep at most one selected take per kind.
     */
    @Modifying
    @Query("update AudioAsset a set a.selected = false "
            + "where a.contentIdeaId = :ideaId and a.assetKind = :kind and a.selected = true")
    int clearSelectedFor(@Param("ideaId") Long contentIdeaId,
                         @Param("kind") AudioAsset.AssetKind kind);
}
