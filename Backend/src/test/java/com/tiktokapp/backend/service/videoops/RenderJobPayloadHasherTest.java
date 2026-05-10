package com.tiktokapp.backend.service.videoops;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class RenderJobPayloadHasherTest {

    private RenderJobPayloadHasher hasher;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        hasher = new RenderJobPayloadHasher(objectMapper);
    }

    private ObjectNode sampleJob() throws Exception {
        return (ObjectNode) objectMapper.readTree("""
                {
                  "contractVersion": "1.1.0",
                  "workflowRunId": 42,
                  "contentIdeaId": 7,
                  "source": "admin-ui",
                  "requestedAt": "2026-05-09T10:00:00Z",
                  "idea": {
                    "topic": "Fitness tips",
                    "script": "Here is the script",
                    "caption": "Short caption",
                    "keyword": "fitness"
                  },
                  "render": {
                    "templateId": "tiktok-scene-sequence",
                    "aspectRatio": "9:16",
                    "width": 1080,
                    "height": 1920,
                    "fps": 30,
                    "durationSec": 15.0,
                    "qualityProfile": "high",
                    "captionMode": "none",
                    "sceneStrategy": "timed-scenes"
                  },
                  "assets": {
                    "backgroundVideo": { "url": "https://example.com/bg.mp4" },
                    "scenes": [
                      {
                        "index": 0,
                        "durationSec": 5.0,
                        "text": "Scene 1",
                        "mediaQuery": "fitness gym",
                        "media": { "url": "https://example.com/scene1.mp4" }
                      }
                    ]
                  }
                }
                """);
    }

    @Test
    void hashIsDeterministic() throws Exception {
        ObjectNode job = sampleJob();
        String h1 = hasher.hash(job);
        String h2 = hasher.hash(job);
        assertThat(h1).isNotNull().isEqualTo(h2);
    }

    @Test
    void hashHas64HexChars() throws Exception {
        String hash = hasher.hash(sampleJob());
        assertThat(hash).hasSize(64).matches("[0-9a-f]+");
    }

    @Test
    void changingMediaUrlChangesHash() throws Exception {
        ObjectNode job1 = sampleJob();
        ObjectNode job2 = sampleJob();
        // Changer l'URL du premier média de scène
        ((ObjectNode) job2.path("assets").path("scenes").get(0).path("media"))
                .put("url", "https://example.com/DIFFERENT.mp4");

        assertThat(hasher.hash(job1)).isNotEqualTo(hasher.hash(job2));
    }

    @Test
    void changingOnlyWorkflowRunIdDoesNotChangeHash() throws Exception {
        ObjectNode job1 = sampleJob();
        ObjectNode job2 = sampleJob();
        job2.put("workflowRunId", 999);
        job2.put("requestedAt", "2030-01-01T00:00:00Z");

        // workflowRunId et requestedAt sont exclus du hash
        assertThat(hasher.hash(job1)).isEqualTo(hasher.hash(job2));
    }

    @Test
    void changingQualityProfileChangesHash() throws Exception {
        ObjectNode job1 = sampleJob();
        ObjectNode job2 = sampleJob();
        ((ObjectNode) job2.path("render")).put("qualityProfile", "premium");

        assertThat(hasher.hash(job1)).isNotEqualTo(hasher.hash(job2));
    }

    @Test
    void addingVoiceoverChangesHash() throws Exception {
        ObjectNode job1 = sampleJob();
        ObjectNode job2 = sampleJob();
        ObjectNode voiceover = ((ObjectNode) job2.path("assets")).putObject("voiceover");
        voiceover.put("url", "https://example.com/voice.mp3");
        voiceover.put("volume", 100.0);

        assertThat(hasher.hash(job1)).isNotEqualTo(hasher.hash(job2));
    }

    @Test
    void returnsNullForNullInput() {
        assertThat(hasher.hash(null)).isNull();
    }

    // --- Test de contrat : vérifie que le payload Java respecte les champs requis du schema ---

    @Test
    void contractRequiredFieldsPresent() throws Exception {
        ObjectNode job = sampleJob();
        assertThat(job.has("contractVersion")).isTrue();
        assertThat(job.has("workflowRunId")).isTrue();
        assertThat(job.has("contentIdeaId")).isTrue();
        assertThat(job.has("source")).isTrue();
        assertThat(job.has("requestedAt")).isTrue();
        assertThat(job.has("idea")).isTrue();
        assertThat(job.has("render")).isTrue();
        assertThat(job.has("assets")).isTrue();

        assertThat(job.path("render").has("templateId")).isTrue();
        assertThat(job.path("render").has("qualityProfile")).isTrue();
        assertThat(job.path("render").has("durationSec")).isTrue();

        assertThat(job.path("assets").has("backgroundVideo")).isTrue();
        assertThat(job.path("assets").path("backgroundVideo").has("url")).isTrue();
    }

    @Test
    void contractVersionIsKnown() throws Exception {
        ObjectNode job = sampleJob();
        String version = job.path("contractVersion").asText();
        assertThat(version).isIn("1.0.0", "1.1.0");
    }
}
