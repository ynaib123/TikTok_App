package com.tiktokapp.backend.dto.videoops;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class PexelsVideoSearchRequest {

    @NotBlank
    @Size(max = 200)
    private String query;

    @Min(1)
    @Max(80)
    private Integer perPage = 5;

    @Size(max = 40)
    private String orientation = "portrait";

    public String getQuery() {
        return query;
    }

    public void setQuery(String query) {
        this.query = query;
    }

    public Integer getPerPage() {
        return perPage;
    }

    public void setPerPage(Integer perPage) {
        this.perPage = perPage;
    }

    public String getOrientation() {
        return orientation;
    }

    public void setOrientation(String orientation) {
        this.orientation = orientation;
    }
}
