package com.tiktokapp.backend.service.audio;

import com.tiktokapp.backend.IntegrationTestBase;
import com.tiktokapp.backend.dto.audio.AudioAssetResponse;
import com.tiktokapp.backend.model.AudioAsset;
import com.tiktokapp.backend.model.ContentIdea;
import com.tiktokapp.backend.repository.AudioAssetRepository;
import com.tiktokapp.backend.repository.ContentIdeaRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Lot 8 / I1 — exercises the Audio domain end-to-end against a real Postgres :
 *
 * <ul>
 *   <li>{@link AudioAsset#isSelected()} stays true for at most one asset per kind.</li>
 *   <li>{@link AudioService#selectAsset} clears the previous selection.</li>
 *   <li>{@link AudioService#listForIdea} respects the create-time ordering.</li>
 * </ul>
 *
 * The AudioService is exercised via the repository + a thin handcrafted asset
 * to avoid hitting the live ElevenLabs API (which would require an API key).
 */
class AudioServiceIntegrationTest extends IntegrationTestBase {

    @Autowired AudioAssetRepository audioAssetRepository;
    @Autowired AudioService audioService;
    @Autowired ContentIdeaRepository contentIdeaRepository;

    @Test
    void selectingASecondAssetClearsThePrevious() {
        long ideaId = createIdea();

        AudioAsset first = newAsset(ideaId, "voice-1", true);
        AudioAsset second = newAsset(ideaId, "voice-2", false);
        audioAssetRepository.saveAll(List.of(first, second));

        AudioAssetResponse selected = audioService.selectAsset(second.getId(), "tester@local");

        assertThat(selected.id()).isEqualTo(second.getId());
        assertThat(selected.selected()).isTrue();
        assertThat(audioAssetRepository.findById(first.getId()).orElseThrow().isSelected()).isFalse();
    }

    @Test
    void listForIdeaReturnsAssetsNewestFirst() {
        long ideaId = createIdea();

        AudioAsset first = newAsset(ideaId, "voice-A", false);
        audioAssetRepository.save(first);
        AudioAsset second = newAsset(ideaId, "voice-B", true);
        audioAssetRepository.save(second);

        List<AudioAssetResponse> rows = audioService.listForIdea(ideaId);

        assertThat(rows).hasSize(2);
        // Created at descending order — second one was saved later.
        assertThat(rows.get(0).voiceId()).isEqualTo("voice-B");
        assertThat(rows.get(1).voiceId()).isEqualTo("voice-A");
    }

    @Test
    void selectingAMissingAssetReturns404() {
        assertThatThrownBy(() -> audioService.selectAsset(999_999L, "tester@local"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("404");
    }

    private long createIdea() {
        ContentIdea idea = new ContentIdea();
        idea.setCategory("test");
        idea.setTopic("audio-it");
        idea.setScripts("Test script.");
        return contentIdeaRepository.save(idea).getId();
    }

    private AudioAsset newAsset(long ideaId, String voiceId, boolean selected) {
        AudioAsset asset = new AudioAsset();
        asset.setContentIdeaId(ideaId);
        asset.setAssetKind(AudioAsset.AssetKind.voice);
        asset.setVoiceId(voiceId);
        asset.setStorageUrl("file:///tmp/" + voiceId + ".mp3");
        asset.setSelected(selected);
        return asset;
    }
}
