package com.tiktokapp.backend.dto.audio;

import com.tiktokapp.backend.model.TikTokSound;

/**
 * API response for a single TikTok native sound.
 * The {@code soundId} field is the value to pass to the TikTok Content Posting
 * API as {@code music_info.music_id} when publishing a video.
 */
public record TikTokSoundResponse(
        String  soundId,
        String  title,
        String  authorName,
        Integer durationMs,
        String  coverUrl,
        String  playUrl,
        Long    videoCount,
        boolean trending,
        String  category
) {
    public static TikTokSoundResponse from(TikTokSound s) {
        return new TikTokSoundResponse(
                s.getSoundId(),
                s.getTitle(),
                s.getAuthorName(),
                s.getDurationMs(),
                s.getCoverUrl(),
                s.getPlayUrl(),
                s.getVideoCount(),
                s.isTrending(),
                s.getCategory()
        );
    }
}
