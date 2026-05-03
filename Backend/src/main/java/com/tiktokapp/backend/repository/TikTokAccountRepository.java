package com.tiktokapp.backend.repository;

import com.tiktokapp.backend.model.TikTokAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TikTokAccountRepository extends JpaRepository<TikTokAccount, Long> {

    List<TikTokAccount> findAllByOrderByIdAsc();

    Optional<TikTokAccount> findFirstByOpenId(String openId);
}
