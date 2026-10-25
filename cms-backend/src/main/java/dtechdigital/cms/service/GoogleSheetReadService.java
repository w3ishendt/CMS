package dtechdigital.cms.service;

import java.net.URI;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

@Service
public class GoogleSheetReadService {

    private static final Logger logger = LoggerFactory.getLogger(GoogleSheetReadService.class);

    @Value("${google.sheet.read.url:}")
    private String appsScriptReadUrl;

    @Value("${google.sheet.read.api-key:}")
    private String appsScriptApiKey;

    public Map<String, Object> fetchLogs(int page, int size, String site, String deviceName, String ip, String status) {
        if (!StringUtils.hasText(appsScriptReadUrl)) {
            throw new IllegalStateException("google.sheet.read.url is not configured");
        }

        List<Map<String, Object>> normalizedRows = fetchAndNormalizeRows();
        List<Map<String, Object>> filteredRows = applyFilters(normalizedRows, site, deviceName, ip, status);

        filteredRows.sort(Comparator.comparing(this::extractLogTimeForSort).reversed());

        int safePage = Math.max(0, page);
        int safeSize = Math.max(1, size);
        int totalItems = filteredRows.size();
        int totalPages = totalItems == 0 ? 0 : (int) Math.ceil((double) totalItems / safeSize);
        int fromIndex = Math.min(safePage * safeSize, totalItems);
        int toIndex = Math.min(fromIndex + safeSize, totalItems);

        List<Map<String, Object>> pageContent = filteredRows.subList(fromIndex, toIndex);

        Map<String, Object> response = new HashMap<>();
        response.put("content", pageContent);
        response.put("currentPage", safePage);
        response.put("totalItems", totalItems);
        response.put("totalPages", totalPages);
        response.put("size", safeSize);
        response.put("hasNext", safePage + 1 < totalPages);
        response.put("hasPrevious", safePage > 0);
        response.put("source", "google_sheet");

        return response;
    }

    public List<Map<String, Object>> fetchAllRowsForSync() {
        if (!StringUtils.hasText(appsScriptReadUrl)) {
            throw new IllegalStateException("google.sheet.read.url is not configured");
        }
        return fetchAndNormalizeRows();
    }

    private List<Map<String, Object>> fetchAndNormalizeRows() {
        ResponseEntity<Object> response = tryGetReadMode();
        if (response == null || response.getStatusCode() != HttpStatus.OK || response.getBody() == null) {
            response = tryPostReadMode();
        }

        if (response == null || response.getStatusCode() != HttpStatus.OK || response.getBody() == null) {
            throw new IllegalStateException("Failed to fetch rows from Apps Script");
        }

        List<?> rawRows = extractRows(response.getBody());
        List<Map<String, Object>> normalized = new ArrayList<>();
        for (Object rawRow : rawRows) {
            if (!(rawRow instanceof Map<?, ?> rowMap)) {
                continue;
            }
            normalized.add(normalizeRow(rowMap));
        }
        return normalized;
    }

    private ResponseEntity<Object> tryGetReadMode() {
        try {
            UriComponentsBuilder builder = UriComponentsBuilder.fromUriString(appsScriptReadUrl)
                .queryParam("mode", "read");
            if (StringUtils.hasText(appsScriptApiKey)) {
                builder.queryParam("apiKey", appsScriptApiKey);
            }
            URI uri = builder.build(true).toUri();

            logger.info("Reading Google Sheet via GET Apps Script: {}", uri);
            return restTemplate().exchange(uri, HttpMethod.GET, null, Object.class);
        } catch (Exception e) {
            logger.warn("GET read mode failed: {}", e.getMessage());
            return null;
        }
    }

    private ResponseEntity<Object> tryPostReadMode() {
        try {
            Map<String, Object> body = new HashMap<>();
            body.put("mode", "read");
            if (StringUtils.hasText(appsScriptApiKey)) {
                body.put("apiKey", appsScriptApiKey);
            }

            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

            logger.info("Reading Google Sheet via POST Apps Script");
            return restTemplate().exchange(appsScriptReadUrl, HttpMethod.POST, request, Object.class);
        } catch (Exception e) {
            logger.warn("POST read mode failed: {}", e.getMessage());
            return null;
        }
    }

    private List<?> extractRows(Object responseBody) {
        if (responseBody instanceof List<?> listBody) {
            return listBody;
        }

        if (responseBody instanceof Map<?, ?> mapBody) {
            Object rows = firstNonNull(
                mapBody.get("rows"),
                mapBody.get("data"),
                mapBody.get("content"),
                mapBody.get("values")
            );
            if (rows instanceof List<?> rowList) {
                return rowList;
            }
        }

        return List.of();
    }

    private Object firstNonNull(Object... values) {
        for (Object value : values) {
            if (value != null) {
                return value;
            }
        }
        return null;
    }

    private Map<String, Object> normalizeRow(Map<?, ?> row) {
        Map<String, Object> out = new HashMap<>();

        out.put("site", asString(row, "site", "Site"));
        out.put("category", asString(row, "category", "Category", "deviceType"));
        out.put("deviceName", asString(row, "deviceName", "device_name", "Device", "name"));
        out.put("ip", asString(row, "ip", "IP", "ipAddress"));
        out.put("status", asString(row, "status", "Status"));
        out.put("duration", asString(row, "duration", "Duration"));
        out.put("stationId", asString(row, "stationId", "station_id", "StationID", "station"));

        String logTime = asString(row, "logTime", "timestamp", "time", "changeTime", "dateTime");
        out.put("logTime", normalizeTimestamp(logTime));

        String eventId = asString(row, "eventide", "eventId", "id");
        out.put("id", StringUtils.hasText(eventId) ? eventId : syntheticId(out));
        out.put("changeType", "HEARTBEAT");

        return out;
    }

    private String asString(Map<?, ?> source, String... keys) {
        for (String key : keys) {
            Object value = source.get(key);
            if (value != null) {
                String text = String.valueOf(value).trim();
                if (!text.isEmpty()) {
                    return text;
                }
            }
        }
        return "";
    }

    private String normalizeTimestamp(String raw) {
        if (!StringUtils.hasText(raw)) {
            return LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);
        }

        String trimmed = raw.trim();

        try {
            return LocalDateTime.parse(trimmed, DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"))
                .format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);
        } catch (Exception ignored) {
        }

        try {
            return LocalDateTime.parse(trimmed, DateTimeFormatter.ISO_LOCAL_DATE_TIME)
                .format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);
        } catch (Exception ignored) {
        }

        try {
            return LocalDateTime.ofInstant(
                OffsetDateTime.parse(trimmed).toInstant(),
                ZoneId.systemDefault()
            ).format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);
        } catch (Exception ignored) {
        }

        return trimmed;
    }

    private String syntheticId(Map<String, Object> row) {
        return String.format(
            Locale.ROOT,
            "%s|%s|%s|%s",
            safePart(row.get("site")),
            safePart(row.get("deviceName")),
            safePart(row.get("ip")),
            safePart(row.get("logTime"))
        );
    }

    private String safePart(Object value) {
        return value == null ? "" : String.valueOf(value);
    }

    private LocalDateTime extractLogTimeForSort(Map<String, Object> row) {
        Object raw = row.get("logTime");
        if (raw == null) {
            return LocalDateTime.MIN;
        }
        String text = String.valueOf(raw).trim();
        try {
            return LocalDateTime.parse(text, DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        } catch (Exception ignored) {
        }
        try {
            return LocalDateTime.parse(text, DateTimeFormatter.ISO_LOCAL_DATE_TIME);
        } catch (Exception ignored) {
        }
        try {
            return LocalDateTime.ofInstant(OffsetDateTime.parse(text).toInstant(), ZoneId.systemDefault());
        } catch (Exception ignored) {
        }
        return LocalDateTime.MIN;
    }

    private List<Map<String, Object>> applyFilters(List<Map<String, Object>> rows, String site, String deviceName, String ip, String status) {
        String siteFilter = trimLower(site);
        String deviceFilter = trimLower(deviceName);
        String ipFilter = trimLower(ip);
        String statusFilter = trimLower(status);

        List<Map<String, Object>> filtered = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            if (StringUtils.hasText(siteFilter) && !safeLower(row.get("site")).contains(siteFilter)) {
                continue;
            }
            if (StringUtils.hasText(deviceFilter) && !safeLower(row.get("deviceName")).contains(deviceFilter)) {
                continue;
            }
            if (StringUtils.hasText(ipFilter) && !safeLower(row.get("ip")).contains(ipFilter)) {
                continue;
            }
            if (StringUtils.hasText(statusFilter) && !safeLower(row.get("status")).equals(statusFilter)) {
                continue;
            }
            filtered.add(row);
        }
        return filtered;
    }

    private String trimLower(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    private String safeLower(Object value) {
        return value == null ? "" : String.valueOf(value).toLowerCase(Locale.ROOT);
    }

    private RestTemplate restTemplate() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(10000);
        factory.setReadTimeout(15000);
        return new RestTemplate(factory);
    }
}
