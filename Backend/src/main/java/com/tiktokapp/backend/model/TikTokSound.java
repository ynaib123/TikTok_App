package com.tiktokapp.backend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.Instant;

/**
 * TikTok native sound from the licensed music catalogue.
 * The {@code soundId} (= TikTok {@code music_id}) is passed to the Content
 * Posting API in {@code music_info.music_id} at publish time.
 */
@Entity
@Table(name = "tiktok_sounds")
public class TikTokSound {

    public enum Source { manual, research_api, import_url }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "sound_id", nullable = false, unique = true, length = 64)
    private String soundId;

    @Column(name = "title", nullable = false, length = 512)
    private String title;

    @Column(name = "author_name", nullable = false, length = 255)
    private String authorName = "";

    @Column(name = "duration_ms")
    private Integer durationMs;

    @Column(name = "cover_url", columnDefinition = "TEXT")
    private String coverUrl;

    @Column(name = "play_url", columnDefinition = "TEXT")
    private String playUrl;

    @Column(name = "video_count")
    private Long videoCount;

    @Column(name = "trending", nullable = false)
    private boolean trending = false;

    @Column(name = "category", length = 64)
    private String category;

    @Column(name = "source", nullable = false, length = 32)
    private String source = Source.manual.name();

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "refreshed_at", nullable = false)
    private Instant refreshedAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        if (createdAt == null)  createdAt  = now;
        if (refreshedAt == null) refreshedAt = now;
        if (authorName == null) authorName = "";
        if (source == null)     source = Source.manual.name();
    }

    @PreUpdate
    void onUpdate() {
        refreshedAt = Instant.now();
    }

    // ── Getters / Setters ────────────────────────────────────────────────────

    public Long getId()                     { return id; }
    public String getSoundId()              { return soundId; }
    public void   setSoundId(String v)      { this.soundId = v; }
    public String getTitle()                { return title; }
    public void   setTitle(String v)        { this.title = v; }
    public String getAuthorName()           { return authorName; }
    public void   setAuthorName(String v)   { this.authorName = v == null ? "" : v; }
    public Integer getDurationMs()          { return durationMs; }
    public void    setDurationMs(Integer v) { this.durationMs = v; }
    public String getCoverUrl()             { return coverUrl; }
    public void   setCoverUrl(String v)     { this.coverUrl = v; }
    public String getPlayUrl()              { return playUrl; }
    public void   setPlayUrl(String v)      { this.playUrl = v; }
    public Long getVideoCount()             { return videoCount; }
    public void setVideoCount(Long v)       { this.videoCount = v; }
    public boolean isTrending()             { return trending; }
    public void    setTrending(boolean v)   { this.trending = v; }
    public String getCategory()             { return category; }
    public void   setCategory(String v)     { this.category = v; }
    public String getSource()               { return source; }
    public void   setSource(String v)       { this.source = v; }
    public Instant getCreatedAt()           { return createdAt; }
    public Instant getRefreshedAt()         { return refreshedAt; }
    public void    setRefreshedAt(Instant v){ this.refreshedAt = v; }
}
