package com.tiktokapp.backend.repository;

import com.tiktokapp.backend.model.TikTokAccount;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TikTokAccountRepository extends JpaRepository<TikTokAccount, Long> {

    List<TikTokAccount> findAllByOrderByIdAsc();

    Optional<TikTokAccount> findFirstByOpenId(String openId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select a from TikTokAccount a where a.id = :id")
    Optional<TikTokAccount> findByIdForUpdate(Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select a from TikTokAccount a where a.openId = :openId")
    Optional<TikTokAccount> findFirstByOpenIdForUpdate(String openId);
}
