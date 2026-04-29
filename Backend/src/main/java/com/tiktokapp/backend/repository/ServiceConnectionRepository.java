package com.tiktokapp.backend.repository;

import com.tiktokapp.backend.model.ServiceConnection;
import com.tiktokapp.backend.model.ServiceConnectionProvider;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ServiceConnectionRepository extends JpaRepository<ServiceConnection, Long> {

    Optional<ServiceConnection> findByProviderKey(ServiceConnectionProvider providerKey);

    List<ServiceConnection> findAllByOrderByProviderKeyAsc();
}
