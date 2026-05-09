package com.tiktokapp.backend.service.audio;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tiktokapp.backend.dto.audio.AudioAssetResponse;
import com.tiktokapp.backend.dto.audio.GenerateVoiceRequest;
import com.tiktokapp.backend.dto.audio.VoiceCardResponse;
import com.tiktokapp.backend.model.AudioAsset;
import com.tiktokapp.backend.repository.AudioAssetRepository;
import com.tiktokapp.backend.repository.ContentIdeaRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

/**
 * Orchestrates the audio step :
 *
 * <ul>
 *   <li>Lists ElevenLabs voices (cached 1h via Redis when the cache is on).</li>
 *   <li>Generates a voice-over take, persists it as an {@link AudioAsset} and
 *       flips the {@code selected} flag so Remotion picks it up at render time.</li>
 *   <li>Lists / re-selects existing takes for an idea.</li>
 * </ul>
 *
 * <p>The actual audio bytes are persisted via {@link AudioStorage} which today
 * stores to local disk under {@code app.elevenlabs.storage-path} (default
 * {@code /app/audio-assets}); switching to R2 is a one-line change in
 * {@code AudioStorage}.
 */
@Service
public class AudioService {

    private static final Logger logger = LoggerFactory.getLogger(AudioService.class);

    private final ElevenLabsClient elevenLabsClient;
    private final AudioAssetRepository audioAssetRepository;
    private final ContentIdeaRepository contentIdeaRepository;
    private final AudioStorage audioStorage;
    private final ObjectMapper objectMapper;

    public AudioService(
            ElevenLabsClient elevenLabsClient,
            AudioAssetRepository audioAssetRepository,
            ContentIdeaRepository contentIdeaRepository,
            AudioStorage audioStorage,
            ObjectMapper objectMapper
    ) {
        this.elevenLabsClient = elevenLabsClient;
        this.audioAssetRepository = audioAssetRepository;
        this.contentIdeaRepository = contentIdeaRepository;
        this.audioStorage = audioStorage;
        this.objectMapper = objectMapper;
    }

    @Cacheable(cacheNames = "llm-responses", key = "'elevenlabs.voices'")
    public List<VoiceCardResponse> listVoices() {
        return elevenLabsClient.listVoices();
    }

    public byte[] previewVoice(String voiceId, String text) {
        if (text != null && text.length() > 240) {
            text = text.substring(0, 240);
        }
        return elevenLabsClient.textToSpeech(voiceId, text, null);
    }

    @Transactional
    public AudioAssetResponse generateVoice(GenerateVoiceRequest request, String requestedByEmail) {
        Long ideaId = request.getContentIdeaId();
        if (!contentIdeaRepository.existsById(ideaId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "contentIdea introuvable.");
        }

        byte[] audioBytes = elevenLabsClient.textToSpeech(
                request.getVoiceId(), request.getText(), request.getModelId());
        String storageUrl = audioStorage.persist(ideaId, request.getVoiceId(), audioBytes);

        // Single-winner per kind : clear previous selection then mark this one.
        audioAssetRepository.clearSelectedFor(ideaId, AudioAsset.AssetKind.voice);

        AudioAsset asset = new AudioAsset();
        asset.setContentIdeaId(ideaId);
        asset.setAssetKind(AudioAsset.AssetKind.voice);
        asset.setVoiceId(request.getVoiceId());
        asset.setStorageUrl(storageUrl);
        asset.setVoiceVolume(request.getVoiceVolume() == null ? 100 : request.getVoiceVolume());
        asset.setMusicVolume(request.getMusicVolume() == null ? 30 : request.getMusicVolume());
        asset.setCreatedByEmail(requestedByEmail);
        asset.setSelected(true);
        asset.setElevenlabsRequest(serialize(Map.of(
                "voiceId", request.getVoiceId(),
                "modelId", request.getModelId(),
                "textLength", request.getText().length()
        )));
        AudioAsset saved = audioAssetRepository.save(asset);
        logger.info("audio event=voice_generated contentIdeaId={} assetId={} bytes={} requestedBy={}",
                ideaId, saved.getId(), audioBytes.length, requestedByEmail);
        return AudioAssetResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public List<AudioAssetResponse> listForIdea(Long contentIdeaId) {
        return audioAssetRepository.findByContentIdeaIdOrderByCreatedAtDesc(contentIdeaId).stream()
                .map(AudioAssetResponse::from)
                .toList();
    }

    @Transactional
    public AudioAssetResponse selectAsset(Long assetId, String requestedByEmail) {
        AudioAsset asset = audioAssetRepository.findById(assetId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "audioAsset introuvable."));
        audioAssetRepository.clearSelectedFor(asset.getContentIdeaId(), asset.getAssetKind());
        asset.setSelected(true);
        AudioAsset saved = audioAssetRepository.save(asset);
        logger.info("audio event=asset_selected contentIdeaId={} assetId={} kind={} requestedBy={}",
                asset.getContentIdeaId(), assetId, asset.getAssetKind(), requestedByEmail);
        return AudioAssetResponse.from(saved);
    }

    private String serialize(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException ex) {
            return "{\"error\":\"serialization_failed\"}";
        }
    }
}
