package dtechdigital.cms.controller;

//import dtechdigital.cms.repository.DeviceStatusChangeRepository; // UNUSED
import dtechdigital.cms.service.DeviceAnalyticsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.HashMap;
import java.util.Map;
import java.util.List;

@RestController
@RequestMapping("/api/analytics")
@CrossOrigin(origins = "*")
public class DeviceAnalyticsController {

    private static final Logger logger = LoggerFactory.getLogger(DeviceAnalyticsController.class);
    @Autowired
    private DeviceAnalyticsService analyticsService;



    /**
     * Get device status summary for KPI cards
     */
    @GetMapping("/summary")
    public ResponseEntity<Map<String, Object>> getDeviceSummary() {
        Map<String, Object> summary = analyticsService.getDeviceSummary();
        return ResponseEntity.ok(summary);
    }

    /**
     * Get timeline data for status chart
     */
    @GetMapping("/timeline")
    public ResponseEntity<List<Map<String, Object>>> getStatusTimeline(
            @RequestParam(defaultValue = "24") int hours) {
        List<Map<String, Object>> timeline = analyticsService.getStatusTimeline(hours);
        return ResponseEntity.ok(timeline);
    }

    /**
     * Get site health matrix for heatmap
     */
    @GetMapping("/site-health")
    public ResponseEntity<List<Map<String, Object>>> getSiteHealth() {
        List<Map<String, Object>> siteHealth = analyticsService.getSiteHealth();
        return ResponseEntity.ok(siteHealth);
    }

    /**
     * Get category performance for stacked bar chart
     */
    @GetMapping("/category-performance")
    public ResponseEntity<List<Map<String, Object>>> getCategoryPerformance() {
        List<Map<String, Object>> categoryPerf = analyticsService.getCategoryPerformance();
        return ResponseEntity.ok(categoryPerf);
    }

    /**
     * Get stale detection trends
     */
    @GetMapping("/stale-trends")
    public ResponseEntity<List<Map<String, Object>>> getStaleTrends(
            @RequestParam(defaultValue = "24") String period) {
        List<Map<String, Object>> trends = analyticsService.getStaleTrends(period);
        return ResponseEntity.ok(trends);
    }

    /**
     * Get problem devices list
     */
    @GetMapping("/problem-devices")
    public ResponseEntity<List<Map<String, Object>>> getProblemDevices(
            @RequestParam(defaultValue = "7d") String period) {
        List<Map<String, Object>> problemDevices = analyticsService.getProblemDevices(period);
        return ResponseEntity.ok(problemDevices);
    }

    /**
     * Get network health by subnet
     */
    @GetMapping("/network-health")
    public ResponseEntity<List<Map<String, Object>>> getNetworkHealth() {
        List<Map<String, Object>> networkHealth = analyticsService.getNetworkHealth();
        return ResponseEntity.ok(networkHealth);
    }

    /**
     * Get system KPIs
     */
    @GetMapping("/kpis")
    public ResponseEntity<Map<String, Object>> getSystemKPIs() {
        Map<String, Object> kpis = analyticsService.getSystemKPIs();
        return ResponseEntity.ok(kpis);
    }

    /**
     * Get site performance timeline - Like Dota 2 networth chart!
     * Users can select which sites to compare
     */
    @GetMapping("/site-performance")
    public ResponseEntity<Map<String, Object>> getSitePerformanceTimeline(
            @RequestParam(required = false) List<String> sites,
            @RequestParam(defaultValue = "24") int hours) {
        Map<String, Object> result = analyticsService.getSitePerformanceTimeline(sites, hours);
        return ResponseEntity.ok(result);
    }

//    /**
//     * 📊 Get hourly device status bar chart data
//     */
//    @GetMapping("/hourly-status-chart")
//    public ResponseEntity<Map<String, Object>> getHourlyStatusChart(
//            @RequestParam(required = false, defaultValue = "ALL_SITES") String site,
//            @RequestParam(defaultValue = "24") int hours) {
//
//        try {
//            Map<String, Object> chartData = analyticsService.getHourlyDeviceStatusChart(site, hours);
//            return ResponseEntity.ok(chartData);
//        } catch (Exception e) {
//            logger.error("Error fetching hourly status chart data", e);
//            return ResponseEntity.status(500).build();
//        }
//    }

    /**
     * 📋 Get available sites for chart selector
     */
    @GetMapping("/available-sites")
    public ResponseEntity<List<Map<String, Object>>> getAvailableSites() {
        try {
            List<Map<String, Object>> sites = analyticsService.getAvailableSitesForChart();
            return ResponseEntity.ok(sites);
        } catch (Exception e) {
            logger.error("Error fetching available sites", e);
            return ResponseEntity.status(500).build();
        }
    }
    /**
     * 🔍 DEBUG: Check device status change data
     */
    @GetMapping("/debug-status-changes")
    public ResponseEntity<Map<String, Object>> debugDeviceStatusChangeData(
            @RequestParam(required = false, defaultValue = "ALL_SITES") String site,
            @RequestParam(defaultValue = "24") int hours) {

        try {
            Map<String, Object> debugData = analyticsService.debugDeviceStatusChangeData(site, hours);
            return ResponseEntity.ok(debugData);
        } catch (Exception e) {
            logger.error("Error fetching debug status change data", e);
            return ResponseEntity.status(500).build();
        }
    }
    /**
     * 📊 Get hourly device status bar chart data
     */
    @GetMapping("/hourly-status-chart")
    public ResponseEntity<Map<String, Object>> getHourlyStatusChart(
            @RequestParam(required = false, defaultValue = "ALL_SITES") String site,
            @RequestParam(defaultValue = "24") int hours,
            @RequestParam(required = false) String endDate) { // ADD THIS PARAMETER

        try {
            // Pass the endDate parameter to service
            Map<String, Object> chartData = analyticsService.getHourlyDeviceStatusChart(site, hours, endDate);
            return ResponseEntity.ok(chartData);
        } catch (Exception e) {
            logger.error("Error fetching hourly status chart data", e);
            return ResponseEntity.status(500).build();
        }
    }

    /**
     * 📋 Generate report by device status and date range
     */
    @GetMapping("/generate-report")
    @CrossOrigin(origins = "*")
    public ResponseEntity<Map<String, Object>> generateReport(
            @RequestParam(required = false, defaultValue = "ALL") String status,
            @RequestParam String startDate,
            @RequestParam String endDate,
            @RequestParam(required = false, defaultValue = "ALL_SITES") String site) {
        
        try {
            // Parse date strings to LocalDateTime
            java.time.format.DateTimeFormatter formatter = java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
            java.time.LocalDateTime startDateTime;
            java.time.LocalDateTime endDateTime;
            
            try {
                // Try full datetime format first
                startDateTime = java.time.LocalDateTime.parse(startDate, formatter);
                endDateTime = java.time.LocalDateTime.parse(endDate, formatter);
            } catch (Exception e) {
                // Fallback to date-only format
                java.time.format.DateTimeFormatter dateFormatter = java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd");
                startDateTime = java.time.LocalDate.parse(startDate, dateFormatter).atStartOfDay();
                endDateTime = java.time.LocalDate.parse(endDate, dateFormatter).atTime(23, 59, 59);
            }
            
            // Validate status parameter
            if (status != null && !status.isEmpty() && !"ALL".equals(status)) {
                if (!"ONLINE".equals(status) && !"OFFLINE".equals(status) && !"STALE".equals(status)) {
                    Map<String, Object> error = new HashMap<>();
                    error.put("error", "Invalid status. Must be ONLINE, OFFLINE, STALE, or ALL");
                    return ResponseEntity.badRequest().body(error);
                }
            }
            
            // Generate report
            List<dtechdigital.cms.entity.DeviceStatusChange> reportData = analyticsService.generateReportByStatusAndDate(
                    status, startDateTime, endDateTime, site);
            
            // Prepare response
            Map<String, Object> response = new HashMap<>();
            response.put("data", reportData);
            response.put("totalRecords", reportData.size());
            response.put("filters", Map.of(
                    "status", status,
                    "startDate", startDate,
                    "endDate", endDate,
                    "site", site
            ));
            response.put("generatedAt", java.time.LocalDateTime.now().toString());
            
            logger.info("📋 Report generated successfully with {} records", reportData.size());
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            logger.error("❌ Error generating report", e);
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Failed to generate report: " + e.getMessage());
            error.put("details", e.getClass().getSimpleName());
            return ResponseEntity.status(500).body(error);
        }
    }
}
