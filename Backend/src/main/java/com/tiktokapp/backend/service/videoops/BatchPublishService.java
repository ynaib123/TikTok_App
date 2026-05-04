package com.tiktokapp.backend.service.videoops;

import com.tiktokapp.backend.config.VideoOpsProperties;
import com.tiktokapp.backend.dto.videoops.BatchPublishItemResponse;
import com.tiktokapp.backend.dto.videoops.BatchPublishResponse;
import com.tiktokapp.backend.dto.videoops.WorkflowTriggerRequest;
import com.tiktokapp.backend.model.ContentIdea;
import com.tiktokapp.backend.model.VideoPublishBatch;
import com.tiktokapp.backend.model.VideoPublishBatchItem;
import com.tiktokapp.backend.model.VideoPublishBatchItemStatus;
import com.tiktokapp.backend.model.VideoPublishBatchStatus;
import com.tiktokapp.backend.repository.ContentIdeaRepository;
import com.tiktokapp.backend.repository.VideoPublishBatchItemRepository;
import com.tiktokapp.backend.repository.VideoPublishBatchRepository;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;

@Service
public class BatchPublishService {

    private static final Logger logger = LoggerFactory.getLogger(BatchPublishService.class);

    private final VideoOpsProperties properties;
    private final VideoPublishBatchRepository batchRepository;
    private final VideoPublishBatchItemRepository itemRepository;
    private final ContentIdeaRepository contentIdeaRepository;
    private final VideoOpsService videoOpsService;
    private final TransactionTemplate transactionTemplate;

    private final ExecutorService executor;
    private final Semaphore concurrencyLimiter;

    public BatchPublishService(
            VideoOpsProperties properties,
            VideoPublishBatchRepository batchRepository,
            VideoPublishBatchItemRepository itemRepository,
            ContentIdeaRepository contentIdeaRepository,
            VideoOpsService videoOpsService,
            TransactionTemplate transactionTemplate
    ) {
        this.properties = properties;
        this.batchRepository = batchRepository;
        this.itemRepository = itemRepository;
        this.contentIdeaRepository = contentIdeaRepository;
        this.videoOpsService = videoOpsService;
        this.transactionTemplate = transactionTemplate;
        int concurrency = Math.max(1, properties.getBatchPublishConcurrency());
        this.executor = Executors.newFixedThreadPool(concurrency, r -> {
            Thread t = new Thread(r, "batch-publish-worker");
            t.setDaemon(true);
            return t;
        });
        this.concurrencyLimiter = new Semaphore(concurrency);
    }

    @PreDestroy
    void shutdown() {
        executor.shutdown();
        try { executor.awaitTermination(10, TimeUnit.SECONDS); }
        catch (InterruptedException ignored) { Thread.currentThread().interrupt(); }
    }

    @Transactional
    public BatchPublishResponse startBatch(List<Long> contentIdeaIds, String tiktokAccountOpenId, String requestedByEmail) {
        Set<Long> uniqueIds = new LinkedHashSet<>(contentIdeaIds == null ? List.of() : contentIdeaIds);
        if (uniqueIds.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Aucune vidéo sélectionnée.");
        }
        int max = properties.getBatchPublishMaxSize();
        if (uniqueIds.size() > max) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Limite de " + max + " vidéos par lot dépassée (" + uniqueIds.size() + ").");
        }

        List<ContentIdea> ideas = contentIdeaRepository.findAllById(uniqueIds);
        if (ideas.size() != uniqueIds.size()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Une ou plusieurs idées sont introuvables.");
        }
        for (ContentIdea idea : ideas) {
            if (!isEligible(idea)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "L'idée #" + idea.getId() + " n'est pas prête à être publiée (statut courant: "
                                + describeStatus(idea) + ").");
            }
        }

        VideoPublishBatch batch = new VideoPublishBatch();
        batch.setId(UUID.randomUUID().toString());
        batch.setRequestedByEmail(requestedByEmail);
        batch.setTiktokAccountOpenId(tiktokAccountOpenId);
        batch.setTotalCount(uniqueIds.size());
        batch.setStatus(VideoPublishBatchStatus.RUNNING);
        batchRepository.save(batch);

        List<VideoPublishBatchItem> items = new ArrayList<>();
        for (Long ideaId : uniqueIds) {
            VideoPublishBatchItem item = new VideoPublishBatchItem();
            item.setBatchId(batch.getId());
            item.setContentIdeaId(ideaId);
            item.setStatus(VideoPublishBatchItemStatus.PENDING);
            items.add(item);
        }
        itemRepository.saveAll(items);

        for (VideoPublishBatchItem item : items) {
            String batchId = batch.getId();
            Long itemId = item.getId();
            executor.submit(() -> processItem(batchId, itemId));
        }

        return toResponse(batch, items);
    }

    private void processItem(String batchId, Long itemId) {
        try {
            concurrencyLimiter.acquire();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return;
        }
        try {
            transactionTemplate.executeWithoutResult(s -> {
                VideoPublishBatchItem item = itemRepository.findById(itemId).orElse(null);
                if (item == null) return;
                item.setStatus(VideoPublishBatchItemStatus.RUNNING);
                itemRepository.save(item);
            });

            String error = null;
            Long workflowRunId = null;
            VideoPublishBatchItemStatus finalStatus;

            try {
                VideoPublishBatchItem snapshot = itemRepository.findById(itemId).orElseThrow();
                VideoPublishBatch batchSnap = batchRepository.findById(batchId).orElseThrow();

                WorkflowTriggerRequest req = new WorkflowTriggerRequest();
                req.setContentIdeaId(snapshot.getContentIdeaId());
                req.setSource("batch-publish:" + batchId);
                req.setTiktokAccountOpenId(batchSnap.getTiktokAccountOpenId());
                req.setForce(false);

                var actionResponse = videoOpsService.triggerInitPublish(req, batchSnap.getRequestedByEmail());
                workflowRunId = actionResponse.getRunId();
                finalStatus = VideoPublishBatchItemStatus.PUBLISHED;
            } catch (ResponseStatusException ex) {
                error = ex.getReason();
                finalStatus = VideoPublishBatchItemStatus.FAILED;
                logger.warn("Batch {} item {} failed: {}", batchId, itemId, error);
            } catch (Exception ex) {
                error = ex.getMessage();
                finalStatus = VideoPublishBatchItemStatus.FAILED;
                logger.error("Batch {} item {} failed unexpectedly", batchId, itemId, ex);
            }

            String finalError = error;
            Long finalWorkflowRunId = workflowRunId;
            VideoPublishBatchItemStatus statusToWrite = finalStatus;
            transactionTemplate.executeWithoutResult(s -> {
                VideoPublishBatchItem item = itemRepository.findById(itemId).orElse(null);
                if (item == null) return;
                item.setStatus(statusToWrite);
                item.setErrorMessage(truncate(finalError, 1000));
                item.setWorkflowRunId(finalWorkflowRunId);
                item.setCompletedAt(Instant.now());
                itemRepository.save(item);

                VideoPublishBatch batch = batchRepository.findById(item.getBatchId()).orElse(null);
                if (batch == null) return;
                if (statusToWrite == VideoPublishBatchItemStatus.PUBLISHED) {
                    batch.setCompletedCount(batch.getCompletedCount() + 1);
                } else if (statusToWrite == VideoPublishBatchItemStatus.FAILED) {
                    batch.setFailedCount(batch.getFailedCount() + 1);
                }
                int processed = batch.getCompletedCount() + batch.getFailedCount();
                if (processed >= batch.getTotalCount()) {
                    if (batch.getFailedCount() == 0) batch.setStatus(VideoPublishBatchStatus.COMPLETED);
                    else if (batch.getCompletedCount() == 0) batch.setStatus(VideoPublishBatchStatus.FAILED);
                    else batch.setStatus(VideoPublishBatchStatus.PARTIAL_FAILURE);
                    batch.setCompletedAt(Instant.now());
                }
                batchRepository.save(batch);
            });
        } finally {
            concurrencyLimiter.release();
        }
    }

    public BatchPublishResponse getBatch(String batchId) {
        VideoPublishBatch batch = batchRepository.findById(batchId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Batch introuvable."));
        List<VideoPublishBatchItem> items = itemRepository.findByBatchIdOrderByIdAsc(batchId);
        return toResponse(batch, items);
    }

    private BatchPublishResponse toResponse(VideoPublishBatch batch, List<VideoPublishBatchItem> items) {
        List<BatchPublishItemResponse> itemDtos = new ArrayList<>(items.size());
        for (VideoPublishBatchItem it : items) {
            itemDtos.add(new BatchPublishItemResponse(
                    it.getContentIdeaId(),
                    it.getStatus().name(),
                    it.getErrorMessage(),
                    it.getWorkflowRunId(),
                    it.getAttemptNumber(),
                    it.getCompletedAt()
            ));
        }
        int pending = batch.getTotalCount() - batch.getCompletedCount() - batch.getFailedCount();
        return new BatchPublishResponse(
                batch.getId(),
                batch.getStatus().name(),
                batch.getTotalCount(),
                batch.getCompletedCount(),
                batch.getFailedCount(),
                Math.max(0, pending),
                batch.getCreatedAt(),
                batch.getUpdatedAt(),
                batch.getCompletedAt(),
                itemDtos
        );
    }

    private boolean isEligible(ContentIdea idea) {
        String publishStatus = lower(idea.getPublishStatus());
        if ("published".equals(publishStatus)) return false;
        String finalVideoStatus = lower(idea.getFinalVideoStatus());
        if (idea.getShotstackUrl() == null || idea.getShotstackUrl().isBlank()) return false;
        if (!"done".equals(finalVideoStatus) && !"ready".equals(finalVideoStatus)) return false;
        if (idea.getTiktokAccountOpenId() == null || idea.getTiktokAccountOpenId().isBlank()) return false;
        return true;
    }

    private String describeStatus(ContentIdea idea) {
        return "publish=" + idea.getPublishStatus()
                + " finalVideo=" + idea.getFinalVideoStatus()
                + " shotstack=" + (idea.getShotstackUrl() == null ? "absent" : "present")
                + " account=" + (idea.getTiktokAccountOpenId() == null ? "missing" : "ok");
    }

    private String lower(String s) {
        return s == null ? "" : s.toLowerCase();
    }

    private String truncate(String s, int max) {
        if (s == null) return null;
        return s.length() <= max ? s : s.substring(0, max);
    }
}
