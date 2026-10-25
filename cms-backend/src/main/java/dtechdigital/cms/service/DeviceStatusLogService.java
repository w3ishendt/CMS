package dtechdigital.cms.service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import dtechdigital.cms.dto.DeviceStatusLogDto;
import dtechdigital.cms.entity.DeviceStatusChange;
import dtechdigital.cms.entity.DeviceStatusLog;
import dtechdigital.cms.repository.DeviceHeartbeatHistoryRepository;
import dtechdigital.cms.repository.DeviceStatusChangeRepository;
import dtechdigital.cms.repository.DeviceStatusLogRepository;
// UNUSED import dtechdigital.cms.entity.DeviceStatusChange;

@Service
public class DeviceStatusLogService {

    @Autowired
    private DeviceStatusLogRepository deviceStatusLogRepository;

    @Autowired
    private DeviceStatusChangeRepository statusChangeRepository; // Add this

    @Autowired
    private DeviceHeartbeatHistoryRepository heartbeatHistoryRepository;

    @Value("${device.stale.threshold-seconds:420}")
    private long staleThresholdSeconds;

    @Value("${device.stale.check-interval-ms:60000}")
    private long staleCheckIntervalMs;

    private static final Logger logger = LoggerFactory.getLogger(DeviceStatusLogService.class);

    /**
     * Save device status log with real-time stale detection
     */
    public DeviceStatusLog saveDeviceStatusLog(DeviceStatusLogDto dto) {
        try {
            DeviceStatusLog existingRecord = findLatestDeviceRecord(dto.getSite(), dto.getCategory(), dto.getDeviceName(), dto.getIp());

            if (existingRecord != null) {
                pruneLegacyCategoryRows(existingRecord, dto);
            }

            if (existingRecord == null) {
                logger.info("🆕 New device detected: {} ({})", dto.getDeviceName(), dto.getIp());
                DeviceStatusLog newDevice = createNewDeviceRecord(dto);

                // 📊 LOG STATUS CHANGE TO HISTORY TABLE
                logStatusChange(dto.getSite(), dto.getCategory(), dto.getDeviceName(), dto.getIp(),
                        null, dto.getStatus(), dto.getDuration(), "NEW_DEVICE", newDevice.getId());

                return newDevice;
            }

            String oldStatus = existingRecord.getStatus();
            String oldDuration = existingRecord.getDuration();
            String newDuration = dto.getDuration();
            boolean statusChanged = !oldStatus.equals(dto.getStatus());

            if (statusChanged) {
                newDuration = "00:00:00";
            }

            boolean durationChanged = !oldDuration.equals(newDuration);

            // Keep the latest site/category metadata from incoming heartbeats.
            existingRecord.setSite(dto.getSite());
            existingRecord.setCategory(dto.getCategory());
            existingRecord.setDeviceName(dto.getDeviceName());
            existingRecord.setIp(dto.getIp());
            existingRecord.setStationId(dto.getStationId());

            // 🔧 Initialize lastDuration if null
            if (existingRecord.getLastDuration() == null) {
                existingRecord.setLastDuration(oldDuration);
                existingRecord.setDurationChangedAt(LocalDateTime.now());
                logger.debug("🔧 Initialized tracking for {}: lastDuration={}", dto.getDeviceName(), oldDuration);
            }

            // Real-time stale marking is handled by scheduled checker using last heartbeat (logTime).
            boolean shouldMarkStale = false;

            // 🚨 PRIORITY 1: Handle STALE detection first
            if (shouldMarkStale) {
                logger.warn("⚠️ REAL-TIME STALE: {} - Duration '{}' unchanged for {}s",
                    dto.getDeviceName(), newDuration, staleThresholdSeconds);

                String oldStatusForLog = existingRecord.getStatus();
                existingRecord.setStatus("STALE");
                existingRecord.setLogTime(LocalDateTime.now());
                existingRecord.setDuration(newDuration);
                // 🔧 DON'T update lastDuration/durationChangedAt here - keep tracking same duration

                DeviceStatusLog savedRecord = deviceStatusLogRepository.save(existingRecord);

                // 📊 LOG STATUS CHANGE TO HISTORY TABLE
                logStatusChange(dto.getSite(), dto.getCategory(), dto.getDeviceName(), dto.getIp(),
                        oldStatusForLog, "STALE", newDuration, "STALE_DETECTED", savedRecord.getId());

                return savedRecord;

            } else if (statusChanged) {
                // 🔄 STATUS CHANGED
                logger.info("🔄 Status changed for {}: {} → {}", dto.getDeviceName(), oldStatus, dto.getStatus());

                existingRecord.setStatus(dto.getStatus());
                existingRecord.setLogTime(LocalDateTime.now());
                existingRecord.setDuration(newDuration);

                // 🔧 ALWAYS UPDATE lastDuration if duration changed
                if (durationChanged) {
                    existingRecord.setLastDuration(newDuration);
                    existingRecord.setDurationChangedAt(LocalDateTime.now());
                    logger.debug("📊 Duration tracking updated: {} → {}", oldDuration, newDuration);
                }

                DeviceStatusLog savedRecord = deviceStatusLogRepository.save(existingRecord);

                // 📊 LOG STATUS CHANGE TO HISTORY TABLE
                logStatusChange(dto.getSite(), dto.getCategory(), dto.getDeviceName(), dto.getIp(),
                    oldStatus, dto.getStatus(), newDuration, "STATUS_CHANGE", savedRecord.getId());

                return savedRecord;

            } else if (durationChanged) {
                // 🔧 DURATION CHANGED (no status change) - THIS IS THE KEY FIX!
                logger.debug("📊 Duration changed: {} → {} (status stays {})", oldDuration, newDuration, oldStatus);

                existingRecord.setDuration(newDuration);
                existingRecord.setLastDuration(newDuration);  // ← ALWAYS UPDATE!
                existingRecord.setDurationChangedAt(LocalDateTime.now());  // ← RESET TIMER!
                existingRecord.setLogTime(LocalDateTime.now());

                // 🔧 If device was STALE and duration changed, mark as active
                if ("STALE".equals(oldStatus)) {
                    existingRecord.setStatus(dto.getStatus());
                    logger.info("✅ Device recovered from STALE: {} - Duration moved {} → {}",
                            dto.getDeviceName(), oldDuration, newDuration);

                    DeviceStatusLog savedRecord = deviceStatusLogRepository.save(existingRecord);

                    // 📊 LOG STALE RECOVERY TO HISTORY TABLE
                    logStatusChange(dto.getSite(), dto.getCategory(), dto.getDeviceName(), dto.getIp(),
                            "STALE", dto.getStatus(), newDuration, "STALE_RECOVERY", savedRecord.getId());

                    return savedRecord;
                }

                return deviceStatusLogRepository.save(existingRecord);

            } else {
                // 🔧 NO CHANGE - just update duration (same value) and timestamp
                existingRecord.setDuration(newDuration);
                existingRecord.setLogTime(LocalDateTime.now());
                return deviceStatusLogRepository.save(existingRecord);
            }

        } catch (Exception e) {
            logger.error("❌ Error saving device status for {}: {}", dto.getDeviceName(), e.getMessage(), e);
            throw e;
        }
    }

    /**
     * 🔧 SCHEDULED STALE DETECTION - Fixed to not create false stales
     */
    @Scheduled(fixedRateString = "${device.stale.check-interval-ms:60000}")
    public void detectStaleDevices() {
        try {
            LocalDateTime staleThreshold = LocalDateTime.now().minusSeconds(staleThresholdSeconds);

            long recentHeartbeatCount = heartbeatHistoryRepository.countByLogTimeAfter(staleThreshold);
            if (recentHeartbeatCount == 0) {
                logger.warn("⚠️ Skipping stale sweep: no heartbeat events received in the last {}s. This usually indicates an upstream ingestion outage, not that every device became stale at once.",
                        staleThresholdSeconds);
                return;
            }

            // Get all devices that are not already STALE
            List<DeviceStatusLog> activeDevices = getRecentLatestDeviceStatuses()
                    .stream()
                    .filter(device -> !"STALE".equals(device.getStatus()))
                    .collect(Collectors.toList());

            int staleCount = 0;
            for (DeviceStatusLog device : activeDevices) {
                if (device.getLogTime() == null) {
                    continue;
                }

                // Check if no heartbeat has been received within the configured threshold.
                if (device.getLogTime().isBefore(staleThreshold)) {
                    long secondsStale = java.time.Duration.between(device.getLogTime(), LocalDateTime.now()).getSeconds();

                    logger.warn("⚠️ SCHEDULED STALE: {} ({}) - no heartbeat for {}s",
                            device.getDeviceName(), device.getIp(), secondsStale);

                    String oldStatus = device.getStatus();
                    device.setStatus("STALE");
                    device.setLogTime(LocalDateTime.now());
                    // 🔧 DON'T update lastDuration/durationChangedAt - keep tracking stuck duration

                    deviceStatusLogRepository.save(device);

                    // 📊 LOG STATUS CHANGE TO HISTORY TABLE
                    logStatusChange(device.getSite(), device.getCategory(), device.getDeviceName(), device.getIp(),
                            oldStatus, "STALE", device.getDuration(), "SCHEDULED_STALE", device.getId());

                    staleCount++;
                }
            }

            if (staleCount > 0) {
                logger.info("📊 Scheduled stale check: {} devices marked as STALE", staleCount);
            }

        } catch (Exception e) {
            logger.error("❌ Error in scheduled stale detection: {}", e.getMessage());
        }
    }
    /**
     * Find the existing record for a specific device
     */
    private DeviceStatusLog findLatestDeviceRecord(String site, String category, String deviceName, String ip) {
        Optional<DeviceStatusLog> latestRecord = deviceStatusLogRepository
                .findBySiteAndCategoryAndDeviceNameAndIp(site, category, deviceName, ip);
        return latestRecord.orElse(null);
    }

        private void pruneLegacyCategoryRows(DeviceStatusLog currentRecord, DeviceStatusLogDto dto) {
        List<DeviceStatusLog> sameDeviceRows = deviceStatusLogRepository
            .findBySiteAndDeviceNameAndIp(dto.getSite(), dto.getDeviceName(), dto.getIp());

        List<DeviceStatusLog> legacyRows = sameDeviceRows.stream()
            .filter(row -> !row.getId().equals(currentRecord.getId()))
            .filter(row -> !dto.getCategory().equals(row.getCategory()))
            .toList();

        if (legacyRows.isEmpty()) {
            return;
        }

        deviceStatusLogRepository.deleteAll(legacyRows);
        logger.info("🧹 Removed {} legacy category row(s) for {} ({}) at site {}",
            legacyRows.size(), dto.getDeviceName(), dto.getIp(), dto.getSite());
        }

    /**
     * Create initial device record (brand new devices)
     */
    private DeviceStatusLog createNewDeviceRecord(DeviceStatusLogDto dto) {
        DeviceStatusLog entity = new DeviceStatusLog();
        entity.setSite(dto.getSite());
        entity.setCategory(dto.getCategory());
        entity.setDeviceName(dto.getDeviceName());
        entity.setIp(dto.getIp());
        entity.setStationId(dto.getStationId());
        entity.setStatus(dto.getStatus());
        entity.setDuration(dto.getDuration());

        LocalDateTime now = LocalDateTime.now();
        entity.setLogTime(now);
        entity.setLastDuration(dto.getDuration());  // ← Initialize tracking
        entity.setDurationChangedAt(now);

        return deviceStatusLogRepository.save(entity);
    }

    /**
     * Get paginated device status logs with optional filtering
     */
    public Page<DeviceStatusLog> getDeviceStatusLogs(int page, int size, String site, String category, String deviceName, String ip, String status) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("logTime").descending());

        // Build specification for filtering
        Specification<DeviceStatusLog> spec = Specification.where(null);

        if (site != null && !site.trim().isEmpty()) {
            spec = spec.and((root, query, cb) ->
                    cb.like(cb.lower(root.get("site")), "%" + site.toLowerCase() + "%"));
        }

        if (category != null && !category.trim().isEmpty()) {
            spec = spec.and((root, query, cb) ->
                    cb.like(cb.lower(root.get("category")), "%" + category.toLowerCase() + "%"));
        }

        if (deviceName != null && !deviceName.trim().isEmpty()) {
            spec = spec.and((root, query, cb) ->
                    cb.like(cb.lower(root.get("deviceName")), "%" + deviceName.toLowerCase() + "%"));
        }

        if (ip != null && !ip.trim().isEmpty()) {
            spec = spec.and((root, query, cb) ->
                cb.like(cb.lower(root.get("ip")), "%" + ip.toLowerCase() + "%"));
        }

        if (status != null && !status.trim().isEmpty()) {
            spec = spec.and((root, query, cb) ->
                    cb.equal(cb.upper(root.get("status")), status.toUpperCase()));
        }

        return deviceStatusLogRepository.findAll(spec, pageable);
    }


    /**
     * Get latest status for each unique device
     */
    public List<DeviceStatusLog> getLatestDeviceStatuses() {
        return collectLatestStatuses(deviceStatusLogRepository.findAllByOrderByLogTimeDesc());
        }

        /**
         * Get latest status for recently active devices only.
         */
        public List<DeviceStatusLog> getRecentLatestDeviceStatuses() {
        LocalDateTime recent = LocalDateTime.now().minusHours(1);
        return collectLatestStatuses(deviceStatusLogRepository.findByLogTimeAfterOrderByLogTimeDesc(recent));
    }

    /**
     * Get all devices (alias for getLatestDeviceStatuses)
     */
    public List<DeviceStatusLog> getAllDevices() {
        return getLatestDeviceStatuses();
    }

    private List<DeviceStatusLog> collectLatestStatuses(List<DeviceStatusLog> rows) {
        Map<String, DeviceStatusLog> latestByDevice = new HashMap<>();

        for (DeviceStatusLog device : rows) {
            String key = device.getSite() + "_" + device.getCategory() + "_" + device.getDeviceName() + "_" + device.getIp();
            latestByDevice.putIfAbsent(key, device);
        }

        return latestByDevice.values().stream().toList();
    }

    /**
     * Get all device status logs without pagination
     */
    public List<DeviceStatusLog> getAllDeviceStatusLogs() {
        return deviceStatusLogRepository.findAllByOrderByLogTimeDesc();
    }

    /**
     * Save device status (alias method)
     */
    public DeviceStatusLog saveDeviceStatus(DeviceStatusLogDto dto) {
        return saveDeviceStatusLog(dto);
    }

    public void updateDeviceHeartbeat(String site, String deviceName) {
        // Try to find existing record
        Optional<DeviceStatusLog> existing = deviceStatusLogRepository.findBySiteAndDeviceName(site, deviceName);

        if (existing.isPresent()) {
            // UPDATE existing record - just change log_time and duration
            DeviceStatusLog device = existing.get();
            LocalDateTime now = LocalDateTime.now();

            // Calculate duration since last update
            Duration duration = Duration.between(device.getLogTime(), now);

            device.setLogTime(now);
            device.setDuration(String.valueOf(duration.toMinutes())); // Convert long to String

            // Keep status same unless it was OFFLINE (then make it ONLINE)
            if ("OFFLINE".equals(device.getStatus())) {
                device.setStatus("ONLINE");
                System.out.println("📱 Device " + deviceName + " at " + site + " came back ONLINE");
            }

            deviceStatusLogRepository.save(device);
        } else {
            // CREATE new record only if device doesn't exist
            DeviceStatusLog newDevice = new DeviceStatusLog();
            newDevice.setSite(site);
            newDevice.setDeviceName(deviceName);
            newDevice.setLogTime(LocalDateTime.now());
            newDevice.setStatus("ONLINE");
            newDevice.setDuration("0"); // Convert int to String

            deviceStatusLogRepository.save(newDevice);
        }
    }

    public List<DeviceStatusLog> getDevicesBySite(String siteName) {
        return deviceStatusLogRepository.findBySite(siteName);
    }

    public Map<String, Object> normalizeCurrentStatusCategory(String site, String fromCategory, String toCategory) {
        List<DeviceStatusLog> legacyRows = deviceStatusLogRepository.findBySiteAndCategory(site, fromCategory);

        int deleted = 0;
        int updated = 0;

        for (DeviceStatusLog legacyRow : legacyRows) {
            Optional<DeviceStatusLog> canonicalRow = deviceStatusLogRepository.findBySiteAndCategoryAndDeviceNameAndIp(
                    site,
                    toCategory,
                    legacyRow.getDeviceName(),
                    legacyRow.getIp());

            if (canonicalRow.isPresent()) {
                deviceStatusLogRepository.delete(legacyRow);
                deleted++;
                continue;
            }

            legacyRow.setCategory(toCategory);
            deviceStatusLogRepository.save(legacyRow);
            updated++;
        }

        Map<String, Object> result = new HashMap<>();
        result.put("site", site);
        result.put("fromCategory", fromCategory);
        result.put("toCategory", toCategory);
        result.put("updated", updated);
        result.put("deleted", deleted);
        result.put("matched", legacyRows.size());
        return result;
    }

    public Page<DeviceStatusLog> getAllDeviceHistory(Pageable pageable) {
        return deviceStatusLogRepository.findAllByOrderByLogTimeDesc(pageable);
    }

    public List<DeviceStatusLog> getDeviceHistory(String deviceName, String ip, LocalDateTime after) {
        return deviceStatusLogRepository.findByDeviceNameAndIpAndLogTimeAfterOrderByLogTimeDesc(
                deviceName, ip, after);
    }

    public List<DeviceStatusLog> getSiteHistory(String site, LocalDateTime after) {
        return deviceStatusLogRepository.findBySiteAndLogTimeAfterOrderByLogTimeDesc(site, after);
    }

    public List<DeviceStatusLog> getStatusTransitions(String deviceName, String ip, LocalDateTime after) {
        // This would need a more complex query to find only status changes
        // For now, return all logs for the device
        if (deviceName != null && ip != null) {
            return getDeviceHistory(deviceName, ip, after);
        } else {
            return deviceStatusLogRepository.findByLogTimeAfterOrderByLogTimeDesc(after);
        }
    }

    public Map<String, Object> getHistoryStatistics(LocalDateTime after) {
        Map<String, Object> stats = new HashMap<>();

        Long totalRecords = deviceStatusLogRepository.countByLogTimeAfter(after);
        Long uniqueDevices = deviceStatusLogRepository.countDistinctDevicesSince(after);
        List<Object[]> statusCounts = deviceStatusLogRepository.countByStatusSince(after);

        stats.put("totalRecords", totalRecords);
        stats.put("uniqueDevices", uniqueDevices);

        Map<String, Long> statusMap = new HashMap<>();
        for (Object[] result : statusCounts) {
            statusMap.put((String) result[0], (Long) result[1]);
        }
        stats.put("statusBreakdown", statusMap);

        return stats;


    }

    /**
     * Create NEW database record for status changes
     */
    private DeviceStatusLog createStatusChangeRecord(DeviceStatusLogDto dto, String finalStatus) {
        DeviceStatusLog newRecord = new DeviceStatusLog();
        newRecord.setSite(dto.getSite());
        newRecord.setCategory(dto.getCategory());
        newRecord.setDeviceName(dto.getDeviceName());
        newRecord.setIp(dto.getIp());
        newRecord.setStatus(finalStatus);
        newRecord.setDuration(dto.getDuration());

        LocalDateTime now = LocalDateTime.now();
        newRecord.setLogTime(now);
        newRecord.setLastDuration(dto.getDuration());
        newRecord.setDurationChangedAt(now);

        return deviceStatusLogRepository.save(newRecord);
    }

    /**
     * 📊 LOG STATUS CHANGE TO HISTORY TABLE
     */
    private void logStatusChange(String site, String category, String deviceName, String ip,
                                 String oldStatus, String newStatus, String duration,
                                 String changeType, Long currentRecordId) {
        try {
            DeviceStatusChange change = new DeviceStatusChange();
            change.setSite(site);
            change.setCategory(category);
            change.setDeviceName(deviceName);
            change.setIp(ip);
            change.setOldStatus(oldStatus);
            change.setNewStatus(newStatus);
            change.setDuration(duration);
            change.setChangeType(changeType);
            change.setChangeTime(LocalDateTime.now());
            change.setCurrentRecordId(currentRecordId);

            statusChangeRepository.save(change);

            logger.info("📊 Status change logged to DB: {} | {} | {} → {} | {}",
                    deviceName, ip, oldStatus != null ? oldStatus : "NEW", newStatus, changeType);

        } catch (Exception e) {
            logger.error("❌ Failed to log status change: {}", e.getMessage());
        }
    }


}
