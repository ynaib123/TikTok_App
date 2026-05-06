package com.tiktokapp.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.rate-limit")
public class RateLimitProperties {

    private boolean enabled = true;

    private final Bucket login = new Bucket(10, 60);

    private final Bucket workflows = new Bucket(60, 60);

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public Bucket getLogin() {
        return login;
    }

    public Bucket getWorkflows() {
        return workflows;
    }

    public static class Bucket {
        private int capacity;
        private long refillSeconds;

        public Bucket() {
        }

        public Bucket(int capacity, long refillSeconds) {
            this.capacity = capacity;
            this.refillSeconds = refillSeconds;
        }

        public int getCapacity() {
            return capacity;
        }

        public void setCapacity(int capacity) {
            this.capacity = capacity;
        }

        public long getRefillSeconds() {
            return refillSeconds;
        }

        public void setRefillSeconds(long refillSeconds) {
            this.refillSeconds = refillSeconds;
        }
    }
}
