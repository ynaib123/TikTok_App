package com.tiktokapp.backend.dto.videoops;

public class RateUsageDto {

    private final long used;
    private final long limit;

    public RateUsageDto(long used, long limit) {
        this.used = used;
        this.limit = limit;
    }

    public long getUsed() {
        return used;
    }

    public long getLimit() {
        return limit;
    }
}
