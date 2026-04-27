package com.tiktokapp.backend.service;

import com.tiktokapp.backend.dto.TikTokUploadResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

@Service
public class TikTokUploadService {

    private final HttpClient httpClient = HttpClient.newBuilder()
            .followRedirects(HttpClient.Redirect.NORMAL)
            .connectTimeout(Duration.ofSeconds(30))
            .build();

    public TikTokUploadResponse uploadFromShotstack(String shotstackUrl, String uploadUrl) {
        URI shotstackUri = parseHttpUri(shotstackUrl, "shotstackUrl");
        URI uploadUri = parseHttpUri(uploadUrl, "uploadUrl");

        try {
            byte[] videoBytes = downloadVideo(shotstackUri);
            if (videoBytes.length == 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La video telechargee est vide.");
            }

            int lastByteIndex = videoBytes.length - 1;
            HttpRequest uploadRequest = HttpRequest.newBuilder()
                    .uri(uploadUri)
                    .timeout(Duration.ofMinutes(5))
                    .header("Content-Type", "video/mp4")
                    .header("Content-Length", String.valueOf(videoBytes.length))
                    .header("Content-Range", "bytes 0-" + lastByteIndex + "/" + videoBytes.length)
                    .PUT(HttpRequest.BodyPublishers.ofByteArray(videoBytes))
                    .build();

            HttpResponse<String> uploadResponse = httpClient.send(uploadRequest, HttpResponse.BodyHandlers.ofString());
            int statusCode = uploadResponse.statusCode();
            boolean success = statusCode >= 200 && statusCode < 300;

            if (!success) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        "Upload TikTok refuse avec le statut " + statusCode + "."
                );
            }

            return new TikTokUploadResponse(
                    true,
                    statusCode,
                    videoBytes.length,
                    uploadResponse.body()
            );
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Impossible d envoyer la video vers TikTok.",
                    exception
            );
        } catch (IOException exception) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Impossible d envoyer la video vers TikTok.",
                    exception
            );
        }
    }

    private byte[] downloadVideo(URI shotstackUri) throws IOException, InterruptedException {
        HttpRequest downloadRequest = HttpRequest.newBuilder()
                .uri(shotstackUri)
                .timeout(Duration.ofMinutes(3))
                .GET()
                .build();

        HttpResponse<byte[]> downloadResponse = httpClient.send(downloadRequest, HttpResponse.BodyHandlers.ofByteArray());
        if (downloadResponse.statusCode() < 200 || downloadResponse.statusCode() >= 300) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Impossible de telecharger la video Shotstack."
            );
        }

        return downloadResponse.body();
    }

    private URI parseHttpUri(String rawValue, String fieldName) {
        try {
            URI uri = URI.create(rawValue);
            String scheme = uri.getScheme();
            if (scheme == null || (!"http".equalsIgnoreCase(scheme) && !"https".equalsIgnoreCase(scheme))) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        fieldName + " doit etre une URL HTTP(S) valide."
                );
            }
            return uri;
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    fieldName + " doit etre une URL HTTP(S) valide.",
                    exception
            );
        }
    }
}
