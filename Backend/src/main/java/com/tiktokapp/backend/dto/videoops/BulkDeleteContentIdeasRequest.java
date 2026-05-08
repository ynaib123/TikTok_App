package com.tiktokapp.backend.dto.videoops;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public class BulkDeleteContentIdeasRequest {

    public static final int MAX_BATCH_SIZE = 200;

    @NotNull
    @NotEmpty
    @Size(max = MAX_BATCH_SIZE)
    private List<@NotNull Long> contentIdeaIds;

    public List<Long> getContentIdeaIds() {
        return contentIdeaIds;
    }

    public void setContentIdeaIds(List<Long> contentIdeaIds) {
        this.contentIdeaIds = contentIdeaIds;
    }
}
