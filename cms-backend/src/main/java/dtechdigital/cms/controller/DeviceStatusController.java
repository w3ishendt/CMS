package dtechdigital.cms.controller;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import dtechdigital.cms.dto.DeviceStatusLogDto;
import dtechdigital.cms.entity.DeviceStatusLog;
import dtechdigital.cms.service.DeviceHeartbeatHistoryService;
import dtechdigital.cms.service.DeviceStatusLogService;
import dtechdigital.cms.service.GoogleSheetReadService;
import dtechdigital.cms.service.GoogleSheetSyncService;
import dtechdigital.cms.service.MessageProducerService;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/device-status")
@CrossOrigin(origins = "*")
public class DeviceStatusController {

    private static final Logger logger = LoggerFactory.getLogger(DeviceStatusController.class);

    @Autowired
    private DeviceStatusLogService deviceStatusLogService;

    @Autowired
    private MessageProducerService messageProducer;

    @Autowired
    private GoogleSheetReadService googleSheetReadService;

    @Autowired
    private GoogleSheetSyncService googleSheetSyncService;

    @Autowired
    private DeviceHeartbeatHistoryService heartbeatHistoryService;

    /**
     * HIGH-THROUGHPUT ENDPOINT: Queue message and return immediately
     */
        @PostMapping("/log")
    public ResponseEntity<Map<String, Object>> logDeviceStatus(@Valid @RequestBody DeviceStatusLogDto deviceStatus) {
        try {
            logger.info("📨 Received device status: {} - {} - {}", 
                deviceStatus.getDeviceName(), deviceStatus.getStatus(), deviceStatus.getSite());
            String deliveryMode = "RABBITMQ";

            // Prefer RabbitMQ for async processing, but fall back to direct save when broker is unavailable.
            try {
                messageProducer.sendDeviceStatus(deviceStatus);
            } catch (Exception mqError) {
                logger.warn("⚠️ RabbitMQ unavailable, saving status directly for {}: {}",
                        deviceStatus.getDeviceName(), mqError.getMessage());
                deviceStatusLogService.saveDeviceStatusLog(deviceStatus);
                deliveryMode = "DIRECT_DB_FALLBACK";
            }

            heartbeatHistoryService.saveHeartbeatEvent(deviceStatus, deviceStatus.getEventide());
            
//            // Check if it's a power trip and send alert
//            if ("OFFLINE".equalsIgnoreCase(deviceStatus.getStatus())) {
//                messageProducer.sendPowerTripAlert(deviceStatus);
//            }

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Processed successfully");
            response.put("deliveryMode", deliveryMode);
            response.put("timestamp", LocalDateTime.now());
            response.put("device", deviceStatus.getDeviceName());

            logger.info("✅ Device status processed ({}): {}", deliveryMode, deviceStatus.getDeviceName());
            
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            logger.error("❌ Failed to queue device status: {}", deviceStatus.getDeviceName(), e);

            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "Failed to queue: " + e.getMessage());
            response.put("timestamp", LocalDateTime.now());

            return ResponseEntity.status(500).body(response);
        }
    }

    @GetMapping("/all")
    public ResponseEntity<List<DeviceStatusLog>> getAllDeviceStatuses() {
        try {
            List<DeviceStatusLog> devices = deviceStatusLogService.getAllDevices();
            return ResponseEntity.ok(devices);
        } catch (Exception e) {
            logger.error("Failed to retrieve device statuses", e);
            return ResponseEntity.status(500).build();
        }
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "UP");
        response.put("service", "Device Status API");
        response.put("timestamp", java.time.LocalDateTime.now());
        return ResponseEntity.ok(response);
    }
    @GetMapping("/logs")
public ResponseEntity<Map<String, Object>> getDeviceStatusLogs(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size,
        @RequestParam(required = false) String site,
        @RequestParam(required = false) String category,
        @RequestParam(required = false) String deviceName,
    @RequestParam(required = false) String ip,
        @RequestParam(required = false) String status) {
    
    try {
        logger.info("📋 Fetching device logs - page: {}, size: {}", page, size);
        
        Page<DeviceStatusLog> logsPage = deviceStatusLogService.getDeviceStatusLogs(
            page, size, site, category, deviceName, ip, status);
        
        Map<String, Object> response = new HashMap<>();
        response.put("content", logsPage.getContent());
        response.put("currentPage", logsPage.getNumber());
        response.put("totalItems", logsPage.getTotalElements());
        response.put("totalPages", logsPage.getTotalPages());
        response.put("size", logsPage.getSize());
        response.put("hasNext", logsPage.hasNext());
        response.put("hasPrevious", logsPage.hasPrevious());
        
        logger.info("✅ Retrieved {} device logs", logsPage.getContent().size());
        return ResponseEntity.ok(response);
        
    } catch (Exception e) {
        logger.error("❌ Failed to fetch device logs: {}", e.getMessage(), e);
        Map<String, Object> errorResponse = new HashMap<>();
        errorResponse.put("error", "Failed to fetch device logs");
        errorResponse.put("message", e.getMessage());
        return ResponseEntity.status(500).body(errorResponse);
    }
}

/**
 * Get latest status for each unique device
 */
@GetMapping("/devices/latest")
public ResponseEntity<List<DeviceStatusLog>> getLatestDeviceStatus() {
    try {
        logger.info("📡 Fetching latest device statuses");
        
        List<DeviceStatusLog> latestStatuses = deviceStatusLogService.getLatestDeviceStatuses();
        
        logger.info("✅ Retrieved latest status for {} devices", latestStatuses.size());
        return ResponseEntity.ok(latestStatuses);
        
    } catch (Exception e) {
        logger.error("❌ Failed to fetch latest device statuses: {}", e.getMessage(), e);
        return ResponseEntity.status(500).body(new ArrayList<>());
    }
}

@GetMapping("/sites")
public ResponseEntity<List<String>> getSites() {
    try {
        List<String> sites = deviceStatusLogService.getLatestDeviceStatuses().stream()
                .map(DeviceStatusLog::getSite)
                .filter(site -> site != null && !site.trim().isEmpty())
                .distinct()
                .sorted()
                .toList();
        return ResponseEntity.ok(sites);
    } catch (Exception e) {
        logger.error("Failed to fetch device status sites", e);
        return ResponseEntity.status(500).body(new ArrayList<>());
    }
}

@GetMapping("/google-sheet-logs")
public ResponseEntity<Map<String, Object>> getGoogleSheetLogs(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size,
        @RequestParam(required = false) String site,
        @RequestParam(required = false) String deviceName,
    @RequestParam(required = false) String ip,
        @RequestParam(required = false) String status) {
    try {
        logger.info("📋 Fetching Google Sheet logs - page: {}, size: {}", page, size);
    Map<String, Object> response = googleSheetReadService.fetchLogs(page, size, site, deviceName, ip, status);
        logger.info("✅ Retrieved {} Google Sheet rows", ((List<?>) response.getOrDefault("content", List.of())).size());
        return ResponseEntity.ok(response);
    } catch (Exception e) {
        logger.warn("⚠️ Google Sheet read failed, falling back to DB heartbeat logs: {}", e.getMessage());
        try {
            Page<DeviceStatusLog> logsPage = deviceStatusLogService.getDeviceStatusLogs(
                    page, size, site, null, deviceName, ip, status);

            Map<String, Object> fallbackResponse = new HashMap<>();
            fallbackResponse.put("content", logsPage.getContent());
            fallbackResponse.put("currentPage", logsPage.getNumber());
            fallbackResponse.put("totalItems", logsPage.getTotalElements());
            fallbackResponse.put("totalPages", logsPage.getTotalPages());
            fallbackResponse.put("size", logsPage.getSize());
            fallbackResponse.put("hasNext", logsPage.hasNext());
            fallbackResponse.put("hasPrevious", logsPage.hasPrevious());
            fallbackResponse.put("source", "db_fallback");
            fallbackResponse.put("warning", "Google Sheet unavailable: " + e.getMessage());

            logger.info("✅ Fallback returned {} DB log rows", logsPage.getContent().size());
            return ResponseEntity.ok(fallbackResponse);
        } catch (Exception fallbackError) {
            logger.error("❌ Fallback to DB heartbeat logs also failed: {}", fallbackError.getMessage(), fallbackError);
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to fetch Google Sheet logs");
            errorResponse.put("message", e.getMessage());
            return ResponseEntity.status(500).body(errorResponse);
        }
    }
}

@PostMapping("/google-sheet/sync")
public ResponseEntity<Map<String, Object>> syncGoogleSheetToDatabase() {
    try {
        logger.info("🔄 Manual sync requested: Google Sheet -> PostgreSQL");
        Map<String, Object> result = googleSheetSyncService.syncFromGoogleSheetToDatabase();
        logger.info("✅ Sync completed: synced={}, skipped={}, failed={}",
                result.get("synced"), result.get("skipped"), result.get("failed"));
        return ResponseEntity.ok(result);
    } catch (Exception e) {
        logger.error("❌ Google Sheet sync failed: {}", e.getMessage(), e);
        Map<String, Object> error = new HashMap<>();
        error.put("success", false);
        error.put("error", "Google Sheet sync failed");
        error.put("message", e.getMessage());
        return ResponseEntity.status(500).body(error);
    }
}

@PostMapping("/maintenance/normalize-current-category")
public ResponseEntity<Map<String, Object>> normalizeCurrentStatusCategory(
        @RequestParam String site,
        @RequestParam String fromCategory,
        @RequestParam String toCategory) {
    try {
        Map<String, Object> result = deviceStatusLogService.normalizeCurrentStatusCategory(site, fromCategory, toCategory);
        result.put("success", true);
        return ResponseEntity.ok(result);
    } catch (Exception e) {
        logger.error("❌ Failed to normalize current status category: {}", e.getMessage(), e);
        Map<String, Object> error = new HashMap<>();
        error.put("success", false);
        error.put("error", "Failed to normalize current status category");
        error.put("message", e.getMessage());
        return ResponseEntity.status(500).body(error);
    }
}

@GetMapping("/heartbeat-history")
public ResponseEntity<Map<String, Object>> getHeartbeatHistory(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "50") int size,
        @RequestParam(required = false) String site,
        @RequestParam(required = false) String deviceName,
        @RequestParam(required = false) String status,
        @RequestParam(required = false) String startDate,
        @RequestParam(required = false) String endDate) {
    try {
        Map<String, Object> result = heartbeatHistoryService.getHeartbeatHistory(
                page, size, site, deviceName, status, startDate, endDate);
        return ResponseEntity.ok(result);
    } catch (Exception e) {
        logger.error("❌ Failed to fetch heartbeat history: {}", e.getMessage(), e);
        Map<String, Object> error = new HashMap<>();
        error.put("error", "Failed to fetch heartbeat history");
        error.put("message", e.getMessage());
        return ResponseEntity.status(500).body(error);
    }
}
}
