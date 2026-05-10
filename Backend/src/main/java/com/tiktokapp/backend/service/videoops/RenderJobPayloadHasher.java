package com.tiktokapp.backend.service.videoops;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;

/**
 * Calcule un hash déterministe des champs significatifs d'un render job.
 * Deux payloads avec les mêmes médias, styles, audio et configuration
 * produiront le même hash — ce qui permet de détecter les relances redondantes.
 *
 * Les champs volontairement exclus du hash : workflowRunId, requestedAt, source
 * (variant à chaque déclenchement sans changer le contenu voulu).
 */
@Service
public class RenderJobPayloadHasher {

    private final ObjectMapper objectMapper;

    public RenderJobPayloadHasher(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    /**
     * Calcule le hash SHA-256 (hex) des champs significatifs du render job.
     * @param renderJob le payload complet (ObjectNode conforme au schema)
     * @return hash hex 64 caractères, ou null si le calcul échoue
     */
    public String hash(ObjectNode renderJob) {
        if (renderJob == null) return null;
        try {
            ObjectNode significant = extractSignificantFields(renderJob);
            String canonical = objectMapper.writeValueAsString(significant);
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] bytes = digest.digest(canonical.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(bytes);
        } catch (Exception e) {
            return null;
        }
    }

    private ObjectNode extractSignificantFields(ObjectNode job) {
        ObjectNode out = objectMapper.createObjectNode();

        // Champs render : template, qualité, durée, mode caption
        JsonNode render = job.path("render");
        if (!render.isMissingNode()) {
            ObjectNode r = objectMapper.createObjectNode();
            copyText(r, render, "templateId");
            copyText(r, render, "qualityProfile");
            copyText(r, render, "captionMode");
            copyText(r, render, "sceneStrategy");
            copyNumber(r, render, "durationSec");
            copyNumber(r, render, "fps");
            copyNumber(r, render, "width");
            copyNumber(r, render, "height");
            out.set("render", r);
        }

        // Assets : scènes (url + style + durée), voiceover, music
        JsonNode assets = job.path("assets");
        if (!assets.isMissingNode()) {
            ObjectNode a = objectMapper.createObjectNode();

            JsonNode scenes = assets.path("scenes");
            if (scenes.isArray()) {
                var scenesOut = objectMapper.createArrayNode();
                for (JsonNode scene : scenes) {
                    ObjectNode s = objectMapper.createObjectNode();
                    copyNumber(s, scene, "index");
                    copyNumber(s, scene, "durationSec");
                    copyText(s, scene, "text");
                    copyText(s, scene, "mediaQuery");
                    JsonNode media = scene.path("media");
                    if (!media.isMissingNode()) {
                        ObjectNode m = objectMapper.createObjectNode();
                        copyText(m, media, "url");
                        s.set("media", m);
                    }
                    JsonNode textStyle = scene.path("textStyle");
                    if (!textStyle.isMissingNode()) {
                        s.set("textStyle", textStyle.deepCopy());
                    }
                    scenesOut.add(s);
                }
                a.set("scenes", scenesOut);
            }

            JsonNode voiceover = assets.path("voiceover");
            if (!voiceover.isMissingNode() && !voiceover.isNull()) {
                ObjectNode v = objectMapper.createObjectNode();
                copyText(v, voiceover, "url");
                copyNumber(v, voiceover, "volume");
                a.set("voiceover", v);
            }

            JsonNode music = assets.path("music");
            if (!music.isMissingNode() && !music.isNull()) {
                ObjectNode m = objectMapper.createObjectNode();
                copyText(m, music, "url");
                copyNumber(m, music, "volume");
                a.set("music", m);
            }

            out.set("assets", a);
        }

        // Idée : keyword et caption influencent l'audio/sous-titres
        JsonNode idea = job.path("idea");
        if (!idea.isMissingNode()) {
            ObjectNode i = objectMapper.createObjectNode();
            copyText(i, idea, "keyword");
            out.set("idea", i);
        }

        return out;
    }

    private static void copyText(ObjectNode dest, JsonNode source, String field) {
        JsonNode node = source.path(field);
        if (!node.isMissingNode() && !node.isNull()) {
            dest.put(field, node.asText());
        }
    }

    private static void copyNumber(ObjectNode dest, JsonNode source, String field) {
        JsonNode node = source.path(field);
        if (!node.isMissingNode() && !node.isNull() && node.isNumber()) {
            dest.set(field, node.deepCopy());
        }
    }
}
