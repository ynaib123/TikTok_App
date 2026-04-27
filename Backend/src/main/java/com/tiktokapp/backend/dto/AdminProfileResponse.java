package com.tiktokapp.backend.dto;

public class AdminProfileResponse {

    private Long id;
    private String nom;
    private String email;

    public AdminProfileResponse(Long id, String nom, String email) {
        this.id = id;
        this.nom = nom;
        this.email = email;
    }

    public Long getId() {
        return id;
    }

    public String getNom() {
        return nom;
    }

    public String getEmail() {
        return email;
    }
}
