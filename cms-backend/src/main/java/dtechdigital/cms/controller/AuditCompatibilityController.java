package dtechdigital.cms.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@RestController
@RequestMapping("/api/audit")
@CrossOrigin(origins = "*")
public class AuditCompatibilityController {

    @GetMapping
    public ResponseEntity<Map<String, Object>> getAuditLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "timestamp") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String level,
            @RequestParam(required = false) String status) {
        return ResponseEntity.ok(pageResponse(filterLogs(action, level, status, null), page, size, sortBy, sortDir));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getAuditLogById(@PathVariable Long id) {
        return auditLogs().stream()
                .filter(log -> id.equals(log.get("id")))
                .findFirst()
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/recent")
    public ResponseEntity<Map<String, Object>> getRecentAuditLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(pageResponse(auditLogs(), page, size, "timestamp", "desc"));
    }

    @GetMapping("/search")
    public ResponseEntity<Map<String, Object>> searchAuditLogs(
            @RequestParam(required = false) String query,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(pageResponse(filterLogs(null, null, null, query), page, size, "timestamp", "desc"));
    }

    @GetMapping("/statistics")
    public ResponseEntity<Map<String, Object>> getAuditStatistics() {
        Map<String, Object> statistics = new HashMap<>();
        statistics.put("totalEvents", auditLogs().size());
        statistics.put("successEvents", auditLogs().stream().filter(log -> "SUCCESS".equals(log.get("status"))).count());
        statistics.put("failureEvents", auditLogs().stream().filter(log -> "FAILED".equals(log.get("status"))).count());
        statistics.put("warningEvents", auditLogs().stream().filter(log -> "WARNING".equals(log.get("level"))).count());
        return ResponseEntity.ok(statistics);
    }

    @PostMapping("/filter")
    public ResponseEntity<Map<String, Object>> filterAuditLogs(
            @RequestBody(required = false) Map<String, Object> filters,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "timestamp") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {
        String action = getStringFilter(filters, "action");
        String level = getStringFilter(filters, "level");
        String status = getStringFilter(filters, "status");
        String query = getStringFilter(filters, "query");
        return ResponseEntity.ok(pageResponse(filterLogs(action, level, status, query), page, size, sortBy, sortDir));
    }

    private Map<String, Object> pageResponse(List<Map<String, Object>> logs, int page, int size, String sortBy, String sortDir) {
        int safePage = Math.max(0, page);
        int safeSize = Math.max(1, size);
        List<Map<String, Object>> sortedLogs = new ArrayList<>(logs);

        Comparator<Map<String, Object>> comparator = Comparator.comparing(log -> String.valueOf(log.getOrDefault(sortBy, "")));
        if ("desc".equalsIgnoreCase(sortDir)) {
            comparator = comparator.reversed();
        }
        sortedLogs.sort(comparator);

        int fromIndex = Math.min(safePage * safeSize, sortedLogs.size());
        int toIndex = Math.min(fromIndex + safeSize, sortedLogs.size());
        List<Map<String, Object>> content = sortedLogs.subList(fromIndex, toIndex);

        Map<String, Object> response = new HashMap<>();
        response.put("content", content);
        response.put("totalElements", sortedLogs.size());
        response.put("totalPages", (int) Math.ceil(sortedLogs.size() / (double) safeSize));
        response.put("size", safeSize);
        response.put("number", safePage);
        response.put("first", safePage == 0);
        response.put("last", toIndex >= sortedLogs.size());
        response.put("empty", content.isEmpty());
        return response;
    }

    private List<Map<String, Object>> filterLogs(String action, String level, String status, String query) {
        String normalizedQuery = normalize(query);
        return auditLogs().stream()
                .filter(log -> matches(log, "action", action))
                .filter(log -> matches(log, "level", level))
                .filter(log -> matches(log, "status", status))
                .filter(log -> normalizedQuery == null || log.values().stream()
                        .map(String::valueOf)
                        .map(this::normalize)
                        .anyMatch(value -> value != null && value.contains(normalizedQuery)))
                .toList();
    }

    private boolean matches(Map<String, Object> log, String field, String expected) {
        String normalizedExpected = normalize(expected);
        if (normalizedExpected == null) {
            return true;
        }
        return normalizedExpected.equals(normalize(String.valueOf(log.get(field))));
    }

    private String getStringFilter(Map<String, Object> filters, String key) {
        if (filters == null || !filters.containsKey(key) || filters.get(key) == null) {
            return null;
        }
        return String.valueOf(filters.get(key));
    }

    private String normalize(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim().toLowerCase(Locale.ROOT);
    }

    private List<Map<String, Object>> auditLogs() {
        List<Map<String, Object>> logs = new ArrayList<>();
        logs.add(auditLog(
                1L,
                "SYSTEM_READY",
                "System",
                "local",
                "local-admin",
                1L,
                "ALL_SITES",
                "127.0.0.1",
                "INFO",
                "SUCCESS",
                "Local compatibility audit endpoint is active."
        ));
        return logs;
    }

    private Map<String, Object> auditLog(
            Long id,
            String action,
            String resource,
            String resourceId,
            String username,
            Long userId,
            String siteName,
            String ipAddress,
            String level,
            String status,
            String details) {
        Map<String, Object> log = new HashMap<>();
        log.put("id", id);
        log.put("action", action);
        log.put("resource", resource);
        log.put("resourceId", resourceId);
        log.put("username", username);
        log.put("userId", userId);
        log.put("siteName", siteName);
        log.put("ipAddress", ipAddress);
        log.put("level", level);
        log.put("status", status);
        log.put("timestamp", LocalDateTime.now().minusMinutes(5).toString());
        log.put("details", details);
        return log;
    }
}
