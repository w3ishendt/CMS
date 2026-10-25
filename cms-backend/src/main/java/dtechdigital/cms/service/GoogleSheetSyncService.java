package dtechdigital.cms.service;

import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import dtechdigital.cms.dto.DeviceStatusLogDto;
import dtechdigital.cms.entity.DeviceStatusLog;
import dtechdigital.cms.repository.DeviceStatusLogRepository;

@Service
public class GoogleSheetSyncService {

    private static final Logger logger = LoggerFactory.getLogger(GoogleSheetSyncService.class);

    @Autowired
    private GoogleSheetReadService googleSheetReadService;

    @Autowired
    private DeviceStatusLogService deviceStatusLogService;

    @Autowired
    private DeviceStatusLogRepository deviceStatusLogRepository;

    @Autowired
    private DeviceHeartbeatHistoryService heartbeatHistoryService;

    @Value("${google.sheet.sync.enabled:true}")
    private boolean googleSheetSyncEnabled;

    public Map<String, Object> syncFromGoogleSheetToDatabase() {
        List<Map<String, Object>> rows = googleSheetReadService.fetchAllRowsForSync();

        int totalRows = rows.size();
        int synced = 0;
        int skipped = 0;
        int failed = 0;

        for (Map<String, Object> row : rows) {
            try {
                DeviceStatusLogDto dto = toDto(row);
                if (dto == null) {
                    skipped++;
                    continue;
                }

                String eventId = getString(row, "eventide");
                heartbeatHistoryService.saveHeartbeatEvent(dto, eventId);

                DeviceStatusLog latest = deviceStatusLogRepository.findLatestByDeviceNameAndIp(dto.getDeviceName(), dto.getIp());
                if (latest != null
                        && safeEqualsIgnoreCase(latest.getStatus(), dto.getStatus())
                        && safeEquals(latest.getDuration(), dto.getDuration())) {
                    skipped++;
                    continue;
                }

                deviceStatusLogService.saveDeviceStatusLog(dto);
                synced++;
            } catch (Exception e) {
                failed++;
                logger.warn("Failed syncing one Google Sheet row: {}", e.getMessage());
            }
        }

        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        result.put("source", "google_sheet");
        result.put("totalRows", totalRows);
        result.put("synced", synced);
        result.put("skipped", skipped);
        result.put("failed", failed);
        return result;
    }

    @Scheduled(initialDelayString = "${google.sheet.sync.initial-delay-ms:30000}", fixedDelayString = "${google.sheet.sync.interval-ms:300000}")
    public void scheduledSync() {
        if (!googleSheetSyncEnabled) {
            return;
        }

        try {
            Map<String, Object> result = syncFromGoogleSheetToDatabase();
            logger.info("Scheduled Google Sheet sync: totalRows={}, synced={}, skipped={}, failed={}",
                    result.get("totalRows"), result.get("synced"), result.get("skipped"), result.get("failed"));
        } catch (Exception e) {
            logger.warn("Scheduled Google Sheet sync failed: {}", e.getMessage());
        }
    }

    private DeviceStatusLogDto toDto(Map<String, Object> row) {
        String site = getString(row, "site");
        String category = getString(row, "category");
        String deviceName = getString(row, "deviceName");
        String ip = getString(row, "ip");
        String status = normalizeStatus(getString(row, "status"));
        String duration = getString(row, "duration");
        String logTime = getString(row, "logTime");

        if (!StringUtils.hasText(site)
                || !StringUtils.hasText(category)
                || !StringUtils.hasText(deviceName)
                || !StringUtils.hasText(ip)
                || !StringUtils.hasText(status)) {
            return null;
        }

        if (!StringUtils.hasText(duration)) {
            duration = "00:00:00";
        }

        DeviceStatusLogDto dto = new DeviceStatusLogDto();
        dto.setSite(site);
        dto.setCategory(category);
        dto.setDeviceName(deviceName);
        dto.setIp(ip);
        dto.setStatus(status);
        dto.setDuration(duration);
        dto.setLogTime(logTime);
        dto.setEventide(getString(row, "eventide"));
        dto.setStationId(getString(row, "stationId"));
        return dto;
    }

    private String getString(Map<String, Object> row, String key) {
        Object value = row.get(key);
        if (value == null) {
            return "";
        }
        return String.valueOf(value).trim();
    }

    private String normalizeStatus(String value) {
        if (!StringUtils.hasText(value)) {
            return "";
        }
        String upper = value.trim().toUpperCase(Locale.ROOT);
        if ("ONLINE".equals(upper) || "OFFLINE".equals(upper)) {
            return upper;
        }
        return "";
    }

    private boolean safeEquals(String a, String b) {
        String left = a == null ? "" : a;
        String right = b == null ? "" : b;
        return left.equals(right);
    }

    private boolean safeEqualsIgnoreCase(String a, String b) {
        String left = a == null ? "" : a;
        String right = b == null ? "" : b;
        return left.equalsIgnoreCase(right);
    }
}
