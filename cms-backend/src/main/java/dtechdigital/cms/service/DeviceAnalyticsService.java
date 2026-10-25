package dtechdigital.cms.service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import dtechdigital.cms.entity.DeviceHeartbeatHistory;
import dtechdigital.cms.entity.DeviceStatusChange;
import dtechdigital.cms.entity.DeviceStatusLog;
import dtechdigital.cms.repository.DeviceHeartbeatHistoryRepository;
import dtechdigital.cms.repository.DeviceStatusChangeRepository;

@Service
public class DeviceAnalyticsService {

    private static final Logger logger = LoggerFactory.getLogger(DeviceAnalyticsService.class);

    // ✅ FIXED: Use DeviceStatusLogRepository for current status
    // @Autowired
    // private DeviceStatusLogRepository deviceRepository;

    @Autowired
    private DeviceStatusLogService deviceService;

    // ✅ FIXED: Use DeviceStatusChangeRepository for history/charts
    @Autowired
    private DeviceStatusChangeRepository deviceStatusChangeRepository;

    @Autowired
    private DeviceHeartbeatHistoryRepository heartbeatHistoryRepository;

    private record StatusPoint(String deviceKey, String status, LocalDateTime time) {}

    private boolean shouldIncludeChangeInChart(DeviceStatusChange change) {
        String changeType = change.getChangeType() == null ? "" : change.getChangeType().trim().toUpperCase();
        String newStatus = change.getNewStatus() == null ? "" : change.getNewStatus().trim().toUpperCase();

        if ("STALE".equals(newStatus)
                && ("SCHEDULED_STALE".equals(changeType) || "STALE_DETECTED".equals(changeType))) {
            return false;
        }

        return true;
    }

    /**
     * Get device status summary for KPI cards
     */
    public Map<String, Object> getDeviceSummary() {
        List<DeviceStatusLog> allDevices = deviceService.getLatestDeviceStatuses();

        long total = allDevices.size();
        long online = allDevices.stream().filter(d -> "ONLINE".equals(d.getStatus())).count();
        long offline = allDevices.stream().filter(d -> "OFFLINE".equals(d.getStatus())).count();
        long stale = allDevices.stream().filter(d -> "STALE".equals(d.getStatus())).count();

        double uptime = total > 0 ? (double) online / total * 100 : 0;

        Map<String, Object> summary = new HashMap<>();
        summary.put("total", total);
        summary.put("online", online);
        summary.put("offline", offline);
        summary.put("stale", stale);
        summary.put("uptime", Math.round(uptime * 10.0) / 10.0);

        return summary;
    }

    /**
     * 🔥 FIXED: Get timeline data using DeviceStatusChange (history table)
     */
    public List<Map<String, Object>> getStatusTimeline(int hours) {
        LocalDateTime endTime = LocalDateTime.now();
        LocalDateTime startTime = endTime.minusHours(hours);

        // ✅ FIXED: Use deviceStatusChangeRepository instead of deviceRepository
        List<DeviceStatusChange> changes = deviceStatusChangeRepository
                .findByChangeTimeBetweenOrderByChangeTime(startTime, endTime);

        // Group by hour and track device statuses
        Map<String, Map<String, Long>> timelineData = new LinkedHashMap<>();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("HH:mm");

        // Initialize hours
        for (int i = 0; i < hours; i++) {
            LocalDateTime time = startTime.plusHours(i);
            String timeKey = time.format(formatter);
            timelineData.put(timeKey, new HashMap<>());
            timelineData.get(timeKey).put("online", 0L);
            timelineData.get(timeKey).put("offline", 0L);
            timelineData.get(timeKey).put("stale", 0L);
        }

        // Track device status changes per hour
        Map<String, String> deviceCurrentStatus = new HashMap<>();

        for (DeviceStatusChange change : changes) {
            String timeKey = change.getChangeTime().format(formatter);
            deviceCurrentStatus.put(change.getIp(), change.getNewStatus());

            if (timelineData.containsKey(timeKey)) {
                // Count current statuses of all devices at this time
                Map<String, Long> statusCounts = deviceCurrentStatus.values().stream()
                        .collect(Collectors.groupingBy(
                                status -> status.toLowerCase(),
                                Collectors.counting()
                        ));

                timelineData.put(timeKey, statusCounts);
            }
        }

        // Convert to list format
        List<Map<String, Object>> result = new ArrayList<>();
        for (Map.Entry<String, Map<String, Long>> entry : timelineData.entrySet()) {
            Map<String, Object> point = new HashMap<>();
            point.put("time", entry.getKey());
            point.put("online", entry.getValue().getOrDefault("online", 0L));
            point.put("offline", entry.getValue().getOrDefault("offline", 0L));
            point.put("stale", entry.getValue().getOrDefault("stale", 0L));
            result.add(point);
        }

        return result;
    }

    /**
     * Get site health matrix
     */
    public List<Map<String, Object>> getSiteHealth() {
        List<DeviceStatusLog> allDevices = deviceService.getLatestDeviceStatuses();

        Map<String, Map<String, Long>> siteStats = allDevices.stream()
                .collect(Collectors.groupingBy(
                        DeviceStatusLog::getSite,
                        Collectors.groupingBy(
                                DeviceStatusLog::getStatus,
                                Collectors.counting()
                        )
                ));

        List<Map<String, Object>> result = new ArrayList<>();
        for (Map.Entry<String, Map<String, Long>> entry : siteStats.entrySet()) {
            Map<String, Object> siteHealth = new HashMap<>();
            siteHealth.put("site", entry.getKey());

            long online = entry.getValue().getOrDefault("ONLINE", 0L);
            long offline = entry.getValue().getOrDefault("OFFLINE", 0L);
            long stale = entry.getValue().getOrDefault("STALE", 0L);
            long total = online + offline + stale;

            siteHealth.put("total", total);
            siteHealth.put("online", online);
            siteHealth.put("offline", offline);
            siteHealth.put("stale", stale);
            siteHealth.put("healthScore", total > 0 ? Math.round((double) online / total * 100) : 0);

            result.add(siteHealth);
        }

        return result;
    }

    /**
     * Get category performance
     */
    public List<Map<String, Object>> getCategoryPerformance() {
        List<DeviceStatusLog> allDevices = deviceService.getLatestDeviceStatuses();

        Map<String, Map<String, Long>> categoryStats = allDevices.stream()
                .collect(Collectors.groupingBy(
                        DeviceStatusLog::getCategory,
                        Collectors.groupingBy(
                                DeviceStatusLog::getStatus,
                                Collectors.counting()
                        )
                ));

        List<Map<String, Object>> result = new ArrayList<>();
        for (Map.Entry<String, Map<String, Long>> entry : categoryStats.entrySet()) {
            Map<String, Object> categoryPerf = new HashMap<>();
            categoryPerf.put("category", entry.getKey());
            categoryPerf.put("online", entry.getValue().getOrDefault("ONLINE", 0L));
            categoryPerf.put("offline", entry.getValue().getOrDefault("OFFLINE", 0L));
            categoryPerf.put("stale", entry.getValue().getOrDefault("STALE", 0L));

            long total = entry.getValue().values().stream().mapToLong(Long::longValue).sum();
            categoryPerf.put("total", total);

            result.add(categoryPerf);
        }

        return result;
    }

    /**
     * 🔥 FIXED: Get stale detection trends using DeviceStatusChange
     */
    public List<Map<String, Object>> getStaleTrends(String period) {
        LocalDateTime endTime = LocalDateTime.now();
        LocalDateTime startTime = endTime.minusHours(24); // Last 24 hours

        // ✅ FIXED: Use deviceStatusChangeRepository for stale changes
        List<DeviceStatusChange> staleChanges = deviceStatusChangeRepository
                .findByChangeTimeBetweenOrderByChangeTime(startTime, endTime)
                .stream()
                .filter(change -> "STALE".equals(change.getNewStatus()) ||
                        "SCHEDULED_STALE".equals(change.getChangeType()))
                .collect(Collectors.toList());

        // Group by hour
        Map<String, Long> hourlyStale = staleChanges.stream()
                .collect(Collectors.groupingBy(
                        change -> change.getChangeTime().format(DateTimeFormatter.ofPattern("HH:mm")),
                        Collectors.counting()
                ));

        List<Map<String, Object>> result = new ArrayList<>();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("HH:mm");

        for (int i = 0; i < 24; i++) {
            LocalDateTime time = startTime.plusHours(i);
            String timeKey = time.format(formatter);

            Map<String, Object> point = new HashMap<>();
            point.put("hour", timeKey);
            point.put("staleCount", hourlyStale.getOrDefault(timeKey, 0L));
            result.add(point);
        }

        return result;
    }

    /**
     * 🔥 FIXED: Get problem devices using DeviceStatusChange
     */
    public List<Map<String, Object>> getProblemDevices(String period) {
        LocalDateTime startTime = LocalDateTime.now().minusDays(7); // Last 7 days

        // ✅ FIXED: Use deviceStatusChangeRepository for problem tracking
        List<DeviceStatusChange> problemChanges = deviceStatusChangeRepository
                .findByChangeTimeAfter(startTime)
                .stream()
                .filter(change -> "OFFLINE".equals(change.getNewStatus()) ||
                        "STALE".equals(change.getNewStatus()))
                .collect(Collectors.toList());

        Map<String, Long> deviceIssues = problemChanges.stream()
                .collect(Collectors.groupingBy(
                        change -> change.getDeviceName() + " (" + change.getIp() + ")",
                        Collectors.counting()
                ));

        List<Map<String, Object>> result = deviceIssues.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .limit(10)
                .map(entry -> {
                    Map<String, Object> device = new HashMap<>();
                    device.put("device", entry.getKey());
                    device.put("issueCount", entry.getValue());
                    return device;
                })
                .collect(Collectors.toList());

        return result;
    }

    /**
     * Get network health by subnet
     */
    public List<Map<String, Object>> getNetworkHealth() {
        List<DeviceStatusLog> allDevices = deviceService.getLatestDeviceStatuses();

        Map<String, List<DeviceStatusLog>> subnetDevices = allDevices.stream()
                .collect(Collectors.groupingBy(device -> {
                    String ip = device.getIp();
                    String[] parts = ip.split("\\.");
                    return parts[0] + "." + parts[1] + "." + parts[2] + ".x";
                }));

        List<Map<String, Object>> result = new ArrayList<>();
        for (Map.Entry<String, List<DeviceStatusLog>> entry : subnetDevices.entrySet()) {
            List<DeviceStatusLog> devices = entry.getValue();
            long onlineCount = devices.stream().filter(d -> "ONLINE".equals(d.getStatus())).count();

            Map<String, Object> subnetHealth = new HashMap<>();
            subnetHealth.put("subnet", entry.getKey());
            subnetHealth.put("deviceCount", devices.size());
            subnetHealth.put("healthScore", devices.size() > 0 ?
                    Math.round((double) onlineCount / devices.size() * 100) : 0);

            result.add(subnetHealth);
        }

        return result;
    }

    /**
     * 🔥 FIXED: Get system KPIs using DeviceStatusChange for incidents
     */
    public Map<String, Object> getSystemKPIs() {
        Map<String, Object> summary = getDeviceSummary();

        // ✅ FIXED: Calculate incidents today using DeviceStatusChange
        LocalDateTime todayStart = LocalDateTime.now().toLocalDate().atStartOfDay();
        List<DeviceStatusChange> todayIncidents = deviceStatusChangeRepository
                .findByChangeTimeAfter(todayStart)
                .stream()
                .filter(change -> "OFFLINE".equals(change.getNewStatus()) ||
                        "STALE".equals(change.getNewStatus()))
                .collect(Collectors.toList());

        Map<String, Object> kpis = new HashMap<>();
        kpis.put("totalDevices", summary.get("total"));
        kpis.put("uptimePercentage", summary.get("uptime"));
        kpis.put("avgResponseTime", "2.3s"); // Placeholder
        kpis.put("incidentsToday", todayIncidents.size());
        kpis.put("overallHealthScore", summary.get("uptime"));

        return kpis;
    }

    /**
     * 🔥 FIXED: Site performance timeline using DeviceStatusChange
     */
    public Map<String, Object> getSitePerformanceTimeline(List<String> selectedSites, int hours) {
        LocalDateTime endTime = LocalDateTime.now();
        LocalDateTime startTime = endTime.minusHours(hours);

        // ✅ FIXED: Use deviceStatusChangeRepository
        List<DeviceStatusChange> changes = deviceStatusChangeRepository
                .findByChangeTimeBetweenOrderByChangeTime(startTime, endTime);

        final DateTimeFormatter timeFormatter = DateTimeFormatter.ofPattern("HH:mm");

        // Get all available sites if none selected
        if (selectedSites == null || selectedSites.isEmpty()) {
            selectedSites = changes.stream()
                    .map(DeviceStatusChange::getSite)
                    .distinct()
                    .limit(10)
                    .collect(Collectors.toList());
        }

        final List<String> finalSelectedSites = selectedSites;
        Map<String, Map<String, Double>> siteTimelines = new HashMap<>();

        // Initialize timelines for selected sites
        for (String site : finalSelectedSites) {
            siteTimelines.put(site, new LinkedHashMap<>());

            for (int i = 0; i < hours; i++) {
                LocalDateTime time = startTime.plusHours(i);
                String timeKey = time.format(timeFormatter);
                siteTimelines.get(site).put(timeKey, 0.0);
            }
        }

        // Calculate health score per site per hour using status changes
        Map<String, Map<String, List<DeviceStatusChange>>> siteHourlyChanges = changes.stream()
                .filter(change -> finalSelectedSites.contains(change.getSite()))
                .collect(Collectors.groupingBy(
                        DeviceStatusChange::getSite,
                        Collectors.groupingBy(change -> change.getChangeTime().format(timeFormatter))
                ));

        // Calculate health percentage for each site at each hour
        for (Map.Entry<String, Map<String, List<DeviceStatusChange>>> siteEntry : siteHourlyChanges.entrySet()) {
            String siteName = siteEntry.getKey();

            for (Map.Entry<String, List<DeviceStatusChange>> hourEntry : siteEntry.getValue().entrySet()) {
                String hour = hourEntry.getKey();
                List<DeviceStatusChange> hourChanges = hourEntry.getValue();

                // Get latest status for each device in this hour
                Map<String, DeviceStatusChange> latestDeviceStatus = hourChanges.stream()
                        .collect(Collectors.toMap(
                                change -> change.getDeviceName() + "_" + change.getIp(),
                                change -> change,
                                (existing, replacement) ->
                                        existing.getChangeTime().isAfter(replacement.getChangeTime()) ? existing : replacement
                        ));

                // Calculate health score
                long totalDevices = latestDeviceStatus.size();
                long onlineDevices = latestDeviceStatus.values().stream()
                        .filter(change -> "ONLINE".equals(change.getNewStatus()))
                        .count();

                double healthScore = totalDevices > 0 ? (double) onlineDevices / totalDevices * 100 : 0;
                siteTimelines.get(siteName).put(hour, Math.round(healthScore * 10.0) / 10.0);
            }
        }

        // Convert to chart format
        List<String> timeLabels = new ArrayList<>();
        for (int i = 0; i < hours; i++) {
            timeLabels.add(startTime.plusHours(i).format(timeFormatter));
        }

        List<Map<String, Object>> datasets = new ArrayList<>();
        String[] colors = {"#ff6384", "#36a2eb", "#cc65fe", "#ffce56", "#4bc0c0",
                "#9966ff", "#ff9f40", "#ff6384", "#c9cbcf", "#4bc0c0"};

        int colorIndex = 0;
        for (String site : finalSelectedSites) {
            Map<String, Object> dataset = new HashMap<>();
            dataset.put("label", site);
            dataset.put("data", siteTimelines.get(site).values());
            dataset.put("borderColor", colors[colorIndex % colors.length]);
            dataset.put("backgroundColor", colors[colorIndex % colors.length] + "20");
            dataset.put("fill", false);
            dataset.put("tension", 0.4);
            colorIndex++;

            datasets.add(dataset);
        }

        Map<String, Object> result = new HashMap<>();
        result.put("labels", timeLabels);
        result.put("datasets", datasets);
        result.put("availableSites", getAllSiteNames());

        return result;
    }

    public List<String> getAllSiteNames() {
        return deviceService.getLatestDeviceStatuses().stream()
                .map(DeviceStatusLog::getSite)
                .distinct()
                .sorted()
                .collect(Collectors.toList());
    }
    /**
     * Generate report by status and date range
     */
    public List<DeviceStatusChange> generateReportByStatusAndDate(
            String status, 
            LocalDateTime startDate, 
            LocalDateTime endDate, 
            String site) {
        
        logger.info("📊 Generating report - Status: {}, Date Range: {} to {}, Site: {}", 
                status, startDate, endDate, site);
        
        // Get all changes in date range
        List<DeviceStatusChange> changes = deviceStatusChangeRepository
                .findByChangeTimeBetweenOrderByChangeTimeDesc(startDate, endDate);
        
        // Filter by status if specified (check both oldStatus and newStatus)
        if (status != null && !status.isEmpty() && !"ALL".equals(status)) {
            changes = changes.stream()
                    .filter(change -> status.equals(change.getOldStatus()) || status.equals(change.getNewStatus()))
                    .collect(Collectors.toList());
        }
        
        // Filter by site if specified
        if (site != null && !site.isEmpty() && !"ALL_SITES".equals(site)) {
            changes = changes.stream()
                    .filter(change -> site.equals(change.getSite()))
                    .collect(Collectors.toList());
        }
        
        logger.info("📋 Report generated with {} records", changes.size());
        return changes;
    }

    /**
     * 🔥 MAIN CHART METHOD - COMPLETELY FIXED
     */
    public Map<String, Object> getHourlyDeviceStatusChart(String selectedSite, int hours, String endDate) {

    LocalDateTime now = LocalDateTime.now();
    LocalDateTime currentHour = now.withMinute(0).withSecond(0).withNano(0);
    LocalDateTime startTime = currentHour.minusHours(hours - 1); // Include current hour
    long seedWindowHours = Math.min(Math.max(hours, 1), 24);
    LocalDateTime queryStartTime = startTime.minusHours(seedWindowHours);

    logger.info("🕒 Chart Range: {} to {} (now: {})", startTime, currentHour, now);
    logger.info("🕒 Chart query window: {} to {} (seed buffer: {}h)", queryStartTime, now, seedWindowHours);
    boolean hasSiteFilter = selectedSite != null && !selectedSite.isEmpty() && !"ALL_SITES".equals(selectedSite);

        List<DeviceStatusLog> latestSnapshot = deviceService.getLatestDeviceStatuses();
        if (hasSiteFilter) {
            latestSnapshot = latestSnapshot.stream()
                    .filter(device -> device.getSite() != null && device.getSite().equalsIgnoreCase(selectedSite))
                    .collect(Collectors.toList());
        }

        Set<String> activeDeviceKeys = latestSnapshot.stream()
                .map(device -> buildDeviceKey(device.getSite(), device.getCategory(), device.getDeviceName(), device.getIp()))
                .collect(Collectors.toSet());

    List<DeviceHeartbeatHistory> heartbeatRows = hasSiteFilter
            ? heartbeatHistoryRepository.findBySiteContainingIgnoreCaseAndLogTimeBetweenOrderByLogTimeAsc(selectedSite, queryStartTime, now)
            : heartbeatHistoryRepository.findByLogTimeBetweenOrderByLogTimeAsc(queryStartTime, now);

    List<DeviceStatusChange> changeRows = deviceStatusChangeRepository
            .findByChangeTimeBetweenOrderByChangeTime(queryStartTime, now);
    if (hasSiteFilter) {
        changeRows = changeRows.stream()
                .filter(change -> change.getSite() != null && change.getSite().equalsIgnoreCase(selectedSite))
                .collect(Collectors.toList());
    }
    changeRows = changeRows.stream()
            .filter(this::shouldIncludeChangeInChart)
                .collect(Collectors.toList());

    logger.info("📊 Found {} heartbeat rows and {} status changes for chart calculation", heartbeatRows.size(), changeRows.size());

    List<StatusPoint> points = new ArrayList<>(heartbeatRows.size() + changeRows.size());
    for (DeviceHeartbeatHistory row : heartbeatRows) {
        String deviceKey = buildDeviceKey(row.getSite(), row.getCategory(), row.getDeviceName(), row.getIp());
        if (!activeDeviceKeys.isEmpty() && !activeDeviceKeys.contains(deviceKey)) {
            continue;
        }
        points.add(new StatusPoint(deviceKey, row.getStatus(), row.getLogTime()));
    }
    for (DeviceStatusChange change : changeRows) {
        String deviceKey = buildDeviceKey(change.getSite(), change.getCategory(), change.getDeviceName(), change.getIp());
        if (!activeDeviceKeys.isEmpty() && !activeDeviceKeys.contains(deviceKey)) {
            continue;
        }
        points.add(new StatusPoint(deviceKey, change.getNewStatus(), change.getChangeTime()));
    }
    points.sort(Comparator.comparing(StatusPoint::time));

    // Track when each device first appeared so we do not backfill history before first observation.
    Map<String, LocalDateTime> firstSeenByDevice = new HashMap<>();

    // Track device status hour by hour, seeded from snapshots before chart start.
    Map<String, String> deviceCurrentStatus = new HashMap<>();

    if (!points.isEmpty()) {
        for (StatusPoint point : points) {
            firstSeenByDevice.merge(
                    point.deviceKey(),
                    point.time(),
                    (existing, candidate) -> existing.isBefore(candidate) ? existing : candidate
            );
            if (point.time().isBefore(startTime)) {
                deviceCurrentStatus.put(point.deviceKey(), point.status());
            }
        }
    } else {
        logger.info("📊 No status points found for requested range/site");
    }

    logger.info("📊 Found {} unique devices in chart dataset", firstSeenByDevice.size());

    // Build hourly data - SIMPLE ARRAYS ONLY
    List<Integer> onlineData = new ArrayList<>();
    List<Integer> offlineData = new ArrayList<>();
    List<Integer> staleData = new ArrayList<>();
    List<String> timestamps = new ArrayList<>(); // ISO timestamps for frontend

    int pointIndex = 0;

    for (int i = 0; i < hours; i++) {
        LocalDateTime hourStart = startTime.plusHours(i);
        LocalDateTime hourEnd = hourStart.plusHours(1);

        while (pointIndex < points.size() && points.get(pointIndex).time().isBefore(hourEnd)) {
            StatusPoint point = points.get(pointIndex);
            String status = point.status() == null ? "" : point.status().trim().toUpperCase();
            if ("ONLINE".equals(status) || "OFFLINE".equals(status) || "STALE".equals(status)) {
                deviceCurrentStatus.put(point.deviceKey(), status);
            }
            pointIndex++;
        }

        // Count by status
        int online = 0, offline = 0, stale = 0;
        for (String deviceKey : activeDeviceKeys) {
            LocalDateTime firstSeen = firstSeenByDevice.get(deviceKey);
            if (firstSeen == null || firstSeen.isAfter(hourEnd)) {
                continue;
            }

            String hourlyStatus = deviceCurrentStatus.get(deviceKey);
            switch (hourlyStatus) {
                case "ONLINE" -> online++;
                case "OFFLINE" -> offline++;
                case "STALE" -> stale++;
                default -> {
                }
            }
        }
        
        onlineData.add(online);
        offlineData.add(offline);
        staleData.add(stale);
        timestamps.add(hourStart.toString()); // Let frontend format this!
    }

    // 🔥 CLEAN RESPONSE - NO UI STUFF!
    Map<String, Object> result = new HashMap<>();
    
    // Raw data only
    result.put("timestamps", timestamps); // ISO format timestamps
    result.put("onlineData", onlineData);
    result.put("offlineData", offlineData);
    result.put("staleData", staleData);

        int currentOnline = (int) latestSnapshot.stream()
            .filter(device -> "ONLINE".equalsIgnoreCase(device.getStatus()))
            .count();
        int currentOffline = (int) latestSnapshot.stream()
            .filter(device -> "OFFLINE".equalsIgnoreCase(device.getStatus()))
            .count();
        int currentStale = (int) latestSnapshot.stream()
            .filter(device -> "STALE".equalsIgnoreCase(device.getStatus()))
            .count();
        int totalDevices = latestSnapshot.size();

    if (!onlineData.isEmpty()) {
        int lastIndex = onlineData.size() - 1;
        onlineData.set(lastIndex, currentOnline);
        offlineData.set(lastIndex, currentOffline);
        staleData.set(lastIndex, currentStale);
    }
    
    result.put("currentOnline", currentOnline);
    result.put("currentOffline", currentOffline);  
    result.put("currentStale", currentStale);
    result.put("totalDevices", totalDevices);
    
    // Metadata
    result.put("selectedSite", selectedSite != null ? selectedSite : "ALL_SITES");
    result.put("startTime", startTime.toString());
    result.put("endTime", now.toString());
    result.put("hoursRequested", hours);
    
    logger.info("📊 FINAL: {} devices total, Current status: Online={}, Offline={}, Stale={}", 
            totalDevices, currentOnline, currentOffline, currentStale);
    
    return result;
}

    /**
     * Get all available sites for dropdown
     */
    public List<Map<String, Object>> getAvailableSitesForChart() {
        List<DeviceStatusLog> latestDevices = deviceService.getLatestDeviceStatuses();

        Map<String, Set<String>> siteDeviceMap = new HashMap<>();

        for (DeviceStatusLog device : latestDevices) {
            String site = device.getSite();
            if (site != null && !site.trim().isEmpty()) {
                String deviceKey = buildDeviceKey(device.getSite(), device.getCategory(), device.getDeviceName(), device.getIp());
                siteDeviceMap.computeIfAbsent(site, k -> new HashSet<>())
                        .add(deviceKey);
            }
        }

        List<Map<String, Object>> siteOptions = new ArrayList<>();

        int totalUniqueDevices = siteDeviceMap.values().stream()
                .flatMap(Set::stream)
                .collect(Collectors.toSet())
                .size();

        Map<String, Object> allSites = new HashMap<>();
        allSites.put("value", "ALL_SITES");
        allSites.put("label", "All Sites Combined");
        allSites.put("deviceCount", totalUniqueDevices);
        siteOptions.add(allSites);

        for (Map.Entry<String, Set<String>> entry : siteDeviceMap.entrySet()) {
            String site = entry.getKey();
            int deviceCount = entry.getValue().size();

            Map<String, Object> siteOption = new HashMap<>();
            siteOption.put("value", site);
            siteOption.put("label", site + " (" + deviceCount + " devices)");
            siteOption.put("deviceCount", deviceCount);
            siteOptions.add(siteOption);
        }

        siteOptions.sort((a, b) -> {
            if ("ALL_SITES".equals(a.get("value"))) return -1;
            if ("ALL_SITES".equals(b.get("value"))) return 1;
            return Integer.compare((Integer) b.get("deviceCount"), (Integer) a.get("deviceCount"));
        });

        return siteOptions;
    }

    /**
     * DEBUG: Check device status change data
     */
    public Map<String, Object> debugDeviceStatusChangeData(String selectedSite, int hours) {
        LocalDateTime endTime = LocalDateTime.now();
        LocalDateTime startTime = endTime.minusHours(hours);

        List<DeviceStatusChange> allChanges = deviceStatusChangeRepository.findAll();
        List<DeviceStatusChange> recentChanges = deviceStatusChangeRepository
                .findByChangeTimeBetweenOrderByChangeTime(startTime, endTime);

        Map<String, Object> debug = new HashMap<>();
        debug.put("totalChangesInDb", allChanges.size());
        debug.put("recentChangesCount", recentChanges.size());
        debug.put("startTime", startTime.toString());
        debug.put("endTime", endTime.toString());
        debug.put("selectedSite", selectedSite);

        debug.put("sampleRecentChanges", recentChanges.stream()
                .limit(10)
                .map(change -> {
                    Map<String, Object> changeInfo = new HashMap<>();
                    changeInfo.put("id", change.getId());
                    changeInfo.put("site", change.getSite());
                    changeInfo.put("category", change.getCategory());
                    changeInfo.put("deviceName", change.getDeviceName());
                    changeInfo.put("ip", change.getIp());
                    changeInfo.put("oldStatus", change.getOldStatus());
                    changeInfo.put("newStatus", change.getNewStatus());
                    changeInfo.put("duration", change.getDuration());
                    changeInfo.put("changeType", change.getChangeType());
                    changeInfo.put("changeTime", change.getChangeTime().toString());
                    changeInfo.put("currentRecordId", change.getCurrentRecordId());
                    return changeInfo;
                })
                .collect(Collectors.toList()));

        List<String> sites = recentChanges.stream()
                .map(DeviceStatusChange::getSite)
                .filter(Objects::nonNull)
                .distinct()
                .collect(Collectors.toList());
        debug.put("availableSites", sites);

        Map<String, Long> statusDistribution = recentChanges.stream()
                .filter(change -> change.getNewStatus() != null)
                .collect(Collectors.groupingBy(
                        DeviceStatusChange::getNewStatus,
                        Collectors.counting()
                ));
        debug.put("statusDistribution", statusDistribution);

        return debug;
    }

    // Helper method: Get latest change time from DB
    private LocalDateTime getLatestChangeTime() {
        try {
            List<DeviceStatusChange> latest = deviceStatusChangeRepository.findAll();
            if (!latest.isEmpty()) {
                return latest.stream()
                        .map(DeviceStatusChange::getChangeTime)
                        .max(LocalDateTime::compareTo)
                        .orElse(LocalDateTime.now());
            }
        } catch (Exception e) {
            logger.error("Error getting latest change time", e);
        }
        return LocalDateTime.now();
    }

    private String buildDeviceKey(String site, String category, String deviceName, String ip) {
        return (site == null ? "" : site.trim().toLowerCase())
                + "|" + (category == null ? "" : category.trim().toLowerCase())
                + "|" + (deviceName == null ? "" : deviceName.trim().toLowerCase())
                + "|" + (ip == null ? "" : ip.trim());
    }
}
