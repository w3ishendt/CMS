package dtechdigital.cms.controller;

import java.io.IOException; // ← CHANGED: Use DeviceStatusChange
import java.time.LocalDateTime; // ← ADDED: Repository
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import dtechdigital.cms.entity.DeviceStatusChange;
import dtechdigital.cms.repository.DeviceStatusChangeRepository;
import dtechdigital.cms.service.DeviceHistoryCsvService;

@RestController
@RequestMapping("/api/device-history")
@CrossOrigin(origins = "*")
public class DeviceHistoryController {

    @Autowired
    private DeviceStatusChangeRepository statusChangeRepository; // ← CHANGED: Use repository

    @Autowired
    private DeviceHistoryCsvService csvService;

    private static final Logger logger = LoggerFactory.getLogger(DeviceHistoryController.class);


    /**
     * 🔥 FIXED: Get all device STATUS CHANGES with pagination
     */
    @GetMapping("/all")
public ResponseEntity<Map<String, Object>> getAllDeviceHistory(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "50") int size,
        @RequestParam(defaultValue = "changeTime") String sortBy,
        @RequestParam(defaultValue = "desc") String sortDir,
        @RequestParam(required = false) String site,
        @RequestParam(required = false) String deviceName,
        @RequestParam(required = false) String ip,
        @RequestParam(required = false) String status,
        @RequestParam(required = false) String changeType,
        @RequestParam(required = false) String startDate,
        @RequestParam(required = false) String endDate) {

    try {
        // 🔧 CLEAN ALL PARAMETERS - Remove whitespace and newlines!
        site = cleanParameter(site);
        deviceName = cleanParameter(deviceName);
        ip = cleanParameter(ip);
        status = cleanParameter(status);
        changeType = cleanParameter(changeType);
        startDate = cleanParameter(startDate);
        endDate = cleanParameter(endDate);

        // 🔍 DEBUG: Log cleaned parameters
        logger.info("🔍 CLEANED Device History Request - site: '{}', deviceName: '{}', ip: '{}', status: '{}', changeType: '{}'", 
                site, deviceName, ip, status, changeType);

        Sort sort = Sort.by(Sort.Direction.fromString(sortDir), sortBy);
        Pageable pageable = PageRequest.of(page, size, sort);

        // 🚀 Get total count for debugging
        long totalCount = statusChangeRepository.count();
        logger.info("📊 Total records in database: {}", totalCount);

        Page<DeviceStatusChange> historyPage;
        
        if (hasAnyFilter(site, deviceName, ip, status, changeType, startDate, endDate)) {
            logger.info("🔍 Applying filters...");
            historyPage = getFilteredDeviceHistory(site, deviceName, ip, status, changeType, 
                    startDate, endDate, pageable);
        } else {
            logger.info("🔍 No filters - getting all records");
            historyPage = statusChangeRepository.findAll(pageable);
        }

        logger.info("📊 Found {} total records, returning {} records for page {}", 
                historyPage.getTotalElements(), historyPage.getContent().size(), page);

        Map<String, Object> response = new HashMap<>();
        response.put("content", historyPage.getContent());
        response.put("totalElements", historyPage.getTotalElements());
        response.put("totalPages", historyPage.getTotalPages());
        response.put("currentPage", page);
        response.put("pageSize", size);
        response.put("hasNext", historyPage.hasNext());
        response.put("hasPrevious", historyPage.hasPrevious());
        
        // Add cleaned filters to response for debugging
        response.put("appliedFilters", Map.of(
                "site", site != null ? site : "",
                "deviceName", deviceName != null ? deviceName : "",
                "ip", ip != null ? ip : "",
                "status", status != null ? status : "",
                "changeType", changeType != null ? changeType : "",
                "startDate", startDate != null ? startDate : "",
                "endDate", endDate != null ? endDate : ""
        ));

        return ResponseEntity.ok(response);

    } catch (Exception e) {
        logger.error("❌ Error fetching device history", e);
        
        Map<String, Object> error = new HashMap<>();
        error.put("error", "Failed to fetch device history: " + e.getMessage());
        error.put("details", e.getClass().getSimpleName());
        return ResponseEntity.status(500).body(error);
    }
}

    /**
     * 🔥 FIXED: Get device history for specific device
     */
    @GetMapping("/device")
    public ResponseEntity<List<DeviceStatusChange>> getDeviceHistory(
            @RequestParam String deviceName,
            @RequestParam String ip,
            @RequestParam(defaultValue = "7") int days) {

        try {
            LocalDateTime cutoff = LocalDateTime.now().minusDays(days);
            LocalDateTime now = LocalDateTime.now();

            List<DeviceStatusChange> history = statusChangeRepository
                    .findByDeviceNameAndIpAndChangeTimeBetweenOrderByChangeTimeDesc(
                            deviceName, ip, cutoff, now);

            return ResponseEntity.ok()
                    .header("Cache-Control", "no-cache, no-store, must-revalidate")
                    .body(history);

        } catch (Exception e) {
            return ResponseEntity.status(500).build();
        }
    }


    /**
     * 🔥 FIXED: Get device history for specific site
     */
    @GetMapping("/site")
    public ResponseEntity<List<DeviceStatusChange>> getSiteHistory(
            @RequestParam String site,
            @RequestParam(defaultValue = "7") int days) {

        try {
            LocalDateTime cutoff = LocalDateTime.now().minusDays(days);
            LocalDateTime now = LocalDateTime.now();

            List<DeviceStatusChange> history = statusChangeRepository
                    .findBySiteAndChangeTimeBetweenOrderByChangeTimeDesc(
                            site, cutoff, now);

            return ResponseEntity.ok()
                    .header("Cache-Control", "no-cache, no-store, must-revalidate")
                    .body(history);

        } catch (Exception e) {
            return ResponseEntity.status(500).build();
        }
    }

    /**
     * 🔥 FIXED: Get status transitions
     */
    @GetMapping("/transitions")
    public ResponseEntity<List<DeviceStatusChange>> getStatusTransitions(
            @RequestParam(required = false) String deviceName,
            @RequestParam(required = false) String ip,
            @RequestParam(defaultValue = "7") int days) {

        try {
            LocalDateTime cutoff = LocalDateTime.now().minusDays(days);
            LocalDateTime now = LocalDateTime.now();

            List<DeviceStatusChange> transitions;
            if (deviceName != null && ip != null) {
                transitions = statusChangeRepository
                        .findByDeviceNameAndIpAndChangeTimeBetweenOrderByChangeTimeDesc(
                                deviceName, ip, cutoff, now);
            } else {
                transitions = statusChangeRepository
                        .findByChangeTimeBetweenOrderByChangeTimeDesc(cutoff, now);
            }

            return ResponseEntity.ok()
                    .header("Cache-Control", "no-cache, no-store, must-revalidate")
                    .body(transitions);

        } catch (Exception e) {
            return ResponseEntity.status(500).build();
        }
    }

    /**
     * 🔥 FIXED: Get recent status changes
     */
    @GetMapping("/recent")
    public ResponseEntity<List<DeviceStatusChange>> getRecentStatusChanges(
            @RequestParam(defaultValue = "50") int limit) {

        try {
            List<DeviceStatusChange> recentChanges;
            if (limit <= 20) {
                recentChanges = statusChangeRepository.findTop20ByOrderByChangeTimeDesc();
            } else if (limit <= 50) {
                recentChanges = statusChangeRepository.findTop50ByOrderByChangeTimeDesc();
            } else {
                recentChanges = statusChangeRepository.findTop100ByOrderByChangeTimeDesc();
            }

            return ResponseEntity.ok()
                    .header("Cache-Control", "no-cache, no-store, must-revalidate")
                    .body(recentChanges);

        } catch (Exception e) {
            return ResponseEntity.status(500).build();
        }
    }

    /**
     * 🔥 ADDED: Get filter options
     */
    @GetMapping("/filter-options")
    public ResponseEntity<Map<String, Object>> getFilterOptions() {
        try {
            List<DeviceStatusChange> allRecords = statusChangeRepository.findAll();

            // Extract unique values for filters
            Set<String> sites = allRecords.stream()
                    .map(DeviceStatusChange::getSite)
                    .filter(Objects::nonNull)
                    .collect(Collectors.toSet());

            Set<String> deviceNames = allRecords.stream()
                    .map(DeviceStatusChange::getDeviceName)
                    .filter(Objects::nonNull)
                    .collect(Collectors.toSet());

            Set<String> statuses = new HashSet<>();
            allRecords.forEach(change -> {
                if (change.getOldStatus() != null) statuses.add(change.getOldStatus());
                if (change.getNewStatus() != null) statuses.add(change.getNewStatus());
            });

            // ✅ FIXED: Get changeTypes not reasons
            Set<String> changeTypes = allRecords.stream()
                    .map(DeviceStatusChange::getChangeType)
                    .filter(Objects::nonNull)
                    .collect(Collectors.toSet());

            Map<String, Object> options = new HashMap<>();
            options.put("sites", sites.stream().sorted().collect(Collectors.toList()));
            options.put("deviceNames", deviceNames.stream().sorted().collect(Collectors.toList()));
            options.put("statuses", statuses.stream().sorted().collect(Collectors.toList()));
            options.put("changeTypes", changeTypes.stream().sorted().collect(Collectors.toList())); // ✅ changeTypes
            options.put("totalRecords", allRecords.size());

            return ResponseEntity.ok(options);

        } catch (Exception e) {
            logger.error("Error fetching filter options", e);
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * 🔥 FIXED: Get statistics from status changes
     */
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getHistoryStats(
            @RequestParam(defaultValue = "7") int days) {

        try {
            LocalDateTime cutoff = LocalDateTime.now().minusDays(days);
            LocalDateTime now = LocalDateTime.now();

            Map<String, Object> stats = new HashMap<>();

            // Get counts from status changes
            Long totalChanges = statusChangeRepository.countByChangeTimeBetween(cutoff, now);
            List<Object[]> statusStats = statusChangeRepository.getStatusChangeStats(cutoff, now);
            List<Object[]> changeTypeStats = statusChangeRepository.getChangeTypeStats(cutoff, now);
            List<Object[]> siteStats = statusChangeRepository.getSiteStats(cutoff, now);

            stats.put("totalChanges", totalChanges);
            stats.put("statusStats", statusStats);
            stats.put("changeTypeStats", changeTypeStats);
            stats.put("siteStats", siteStats);
            stats.put("period", days + " days");

            return ResponseEntity.ok()
                    .header("Cache-Control", "no-cache, no-store, must-revalidate")
                    .body(stats);

        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Failed to fetch statistics: " + e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    // ==================== CSV ENDPOINTS ====================

    /**
     * 🔥 FIXED: Generate CSV for all devices
     */
    @PostMapping("/csv/generate")
    public ResponseEntity<Map<String, String>> generateCsv(
            @RequestParam(defaultValue = "7") int days) { // ← ADDED: days parameter
        try {
            String filePath = csvService.generateCsvReport("manual", days); // ← FIXED: Pass days

            Map<String, String> response = new HashMap<>();
            response.put("message", "CSV generated successfully");
            response.put("filePath", filePath);
            response.put("fileName", filePath.substring(filePath.lastIndexOf("/") + 1));
            response.put("records", "Generated for last " + days + " days");

            return ResponseEntity.ok(response);
        } catch (IOException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to generate CSV: " + e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    /**
     * Generate CSV for specific device
     */
    @PostMapping("/csv/device")
    public ResponseEntity<Map<String, String>> generateDeviceCsv(
            @RequestParam String deviceName,
            @RequestParam String ip,
            @RequestParam(defaultValue = "7") int days) {

        try {
            String filePath = csvService.generateDeviceCsv(deviceName, ip, days);

            Map<String, String> response = new HashMap<>();
            response.put("message", "Device CSV generated successfully");
            response.put("filePath", filePath);
            response.put("fileName", filePath.substring(filePath.lastIndexOf("/") + 1));

            return ResponseEntity.ok(response);
        } catch (IOException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to generate device CSV: " + e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    /**
     * Generate CSV for specific site
     */
    @PostMapping("/csv/site")
    public ResponseEntity<Map<String, String>> generateSiteCsv(
            @RequestParam String site,
            @RequestParam(defaultValue = "7") int days) {

        try {
            String filePath = csvService.generateSiteCsv(site, days);

            Map<String, String> response = new HashMap<>();
            response.put("message", "Site CSV generated successfully");
            response.put("filePath", filePath);
            response.put("fileName", filePath.substring(filePath.lastIndexOf("/") + 1));

            return ResponseEntity.ok(response);
        } catch (IOException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to generate site CSV: " + e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    /**
     * Download generated CSV file
     */
    @GetMapping("/csv/download/{fileName}")
    public ResponseEntity<Resource> downloadCsv(@PathVariable String fileName) {
        try {
            String filePath = csvService.getCsvOutputDirectory() + "/" + fileName;
            Resource resource = new FileSystemResource(filePath);

            if (!resource.exists()) {
                return ResponseEntity.notFound().build();
            }

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
                    .contentType(MediaType.APPLICATION_OCTET_STREAM)
                    .body(resource);

        } catch (Exception e) {
            return ResponseEntity.status(500).build();
        }
    }

    /**
     * List all generated CSV files
     */
    @GetMapping("/csv/list")
    public ResponseEntity<List<String>> listCsvFiles() {
        List<String> csvFiles = csvService.getGeneratedCsvFiles();
        return ResponseEntity.ok(csvFiles);
    }

    /**
     * 🔥 FIXED: Generate/Update today's CSV
     */
    @PostMapping("/csv/today")
    public ResponseEntity<Map<String, String>> generateTodaysCsv() {
        try {
            String filePath = csvService.updateDailyCsv(); // ← FIXED: Use correct method name

            Map<String, String> response = new HashMap<>();
            response.put("message", "Today's CSV updated successfully");
            response.put("filePath", filePath);
            response.put("fileName", filePath.substring(filePath.lastIndexOf("/") + 1));

            return ResponseEntity.ok(response);
        } catch (IOException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to update today's CSV: " + e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    /**
     * Generate CSV for specific date
     */
    @PostMapping("/csv/date")
    public ResponseEntity<Map<String, String>> generateDateCsv(
            @RequestParam String date) { // Format: 2025-07-27

        try {
            String filePath = csvService.generateDateCsv(date);

            Map<String, String> response = new HashMap<>();
            response.put("message", "Date CSV generated successfully");
            response.put("filePath", filePath);
            response.put("fileName", filePath.substring(filePath.lastIndexOf("/") + 1));

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to generate date CSV: " + e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    // ==================== PDF ENDPOINTS ====================

    /**
     * 🔥 Generate PDF for all devices
     */
    @PostMapping("/pdf/generate")
    public ResponseEntity<Map<String, String>> generatePdf(
            @RequestParam(defaultValue = "7") int days) {
        try {
            String filePath = csvService.generatePdfReport("manual", days);

            Map<String, String> response = new HashMap<>();
            response.put("message", "PDF generated successfully");
            response.put("filePath", filePath);
            response.put("fileName", filePath.substring(filePath.lastIndexOf("/") + 1));
            response.put("records", "Generated for last " + days + " days");

            return ResponseEntity.ok(response);
        } catch (IOException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to generate PDF: " + e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    /**
     * Generate PDF for specific device
     */
    @PostMapping("/pdf/device")
    public ResponseEntity<Map<String, String>> generateDevicePdf(
            @RequestParam String deviceName,
            @RequestParam String ip,
            @RequestParam(defaultValue = "7") int days) {

        try {
            String filePath = csvService.generateDevicePdf(deviceName, ip, days);

            Map<String, String> response = new HashMap<>();
            response.put("message", "Device PDF generated successfully");
            response.put("filePath", filePath);
            response.put("fileName", filePath.substring(filePath.lastIndexOf("/") + 1));

            return ResponseEntity.ok(response);
        } catch (IOException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to generate device PDF: " + e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    /**
     * Generate PDF for specific site
     */
    @PostMapping("/pdf/site")
    public ResponseEntity<Map<String, String>> generateSitePdf(
            @RequestParam String site,
            @RequestParam(defaultValue = "7") int days) {

        try {
            String filePath = csvService.generateSitePdf(site, days);

            Map<String, String> response = new HashMap<>();
            response.put("message", "Site PDF generated successfully");
            response.put("filePath", filePath);
            response.put("fileName", filePath.substring(filePath.lastIndexOf("/") + 1));

            return ResponseEntity.ok(response);
        } catch (IOException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to generate site PDF: " + e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    /**
     * Generate today's PDF
     */
    @PostMapping("/pdf/today")
    public ResponseEntity<Map<String, String>> generateTodaysPdf() {
        try {
            String filePath = csvService.updateDailyPdf();

            Map<String, String> response = new HashMap<>();
            response.put("message", "Today's PDF updated successfully");
            response.put("filePath", filePath);
            response.put("fileName", filePath.substring(filePath.lastIndexOf("/") + 1));

            return ResponseEntity.ok(response);
        } catch (IOException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to update today's PDF: " + e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    /**
     * Generate PDF for specific date
     */
    @PostMapping("/pdf/date")
    public ResponseEntity<Map<String, String>> generateDatePdf(
            @RequestParam String date) {

        try {
            String filePath = csvService.generateDatePdf(date);

            Map<String, String> response = new HashMap<>();
            response.put("message", "Date PDF generated successfully");
            response.put("filePath", filePath);
            response.put("fileName", filePath.substring(filePath.lastIndexOf("/") + 1));

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to generate date PDF: " + e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    /**
     * Download PDF file
     */
    @GetMapping("/pdf/download/{fileName}")
    public ResponseEntity<Resource> downloadPdf(@PathVariable String fileName) {
        try {
            String filePath = csvService.getCsvOutputDirectory() + "/" + fileName;
            Resource resource = new FileSystemResource(filePath);

            if (!resource.exists()) {
                return ResponseEntity.notFound().build();
            }

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
                    .contentType(MediaType.APPLICATION_PDF)
                    .body(resource);

        } catch (Exception e) {
            return ResponseEntity.status(500).build();
        }
    }

// ==================== WORD/DOCX ENDPOINTS ====================

//    /**
//     * 🔥 Generate Word for all devices
//     */
//    @PostMapping("/docx/generate")
//    public ResponseEntity<Map<String, String>> generateDocx(
//            @RequestParam(defaultValue = "7") int days) {
//        try {
//            String filePath = csvService.generateDocxReport("manual", days);
//
//            Map<String, String> response = new HashMap<>();
//            response.put("message", "Word document generated successfully");
//            response.put("filePath", filePath);
//            response.put("fileName", filePath.substring(filePath.lastIndexOf("/") + 1));
//            response.put("records", "Generated for last " + days + " days");
//
//            return ResponseEntity.ok(response);
//        } catch (IOException e) {
//            Map<String, String> error = new HashMap<>();
//            error.put("error", "Failed to generate Word document: " + e.getMessage());
//            return ResponseEntity.status(500).body(error);
//        }
//    }
//
//    /**
//     * Generate Word for specific device
//     */
//    @PostMapping("/docx/device")
//    public ResponseEntity<Map<String, String>> generateDeviceDocx(
//            @RequestParam String deviceName,
//            @RequestParam String ip,
//            @RequestParam(defaultValue = "7") int days) {
//
//        try {
//            String filePath = csvService.generateDeviceDocx(deviceName, ip, days);
//
//            Map<String, String> response = new HashMap<>();
//            response.put("message", "Device Word document generated successfully");
//            response.put("filePath", filePath);
//            response.put("fileName", filePath.substring(filePath.lastIndexOf("/") + 1));
//
//            return ResponseEntity.ok(response);
//        } catch (IOException e) {
//            Map<String, String> error = new HashMap<>();
//            error.put("error", "Failed to generate device Word document: " + e.getMessage());
//            return ResponseEntity.status(500).body(error);
//        }
//    }
//
//    /**
//     * Generate Word for specific site
//     */
//    @PostMapping("/docx/site")
//    public ResponseEntity<Map<String, String>> generateSiteDocx(
//            @RequestParam String site,
//            @RequestParam(defaultValue = "7") int days) {
//
//        try {
//            String filePath = csvService.generateSiteDocx(site, days);
//
//            Map<String, String> response = new HashMap<>();
//            response.put("message", "Site Word document generated successfully");
//            response.put("filePath", filePath);
//            response.put("fileName", filePath.substring(filePath.lastIndexOf("/") + 1));
//
//            return ResponseEntity.ok(response);
//        } catch (IOException e) {
//            Map<String, String> error = new HashMap<>();
//            error.put("error", "Failed to generate site Word document: " + e.getMessage());
//            return ResponseEntity.status(500).body(error);
//        }
//    }
//
//    /**
//     * Generate today's Word document
//     */
//    @PostMapping("/docx/today")
//    public ResponseEntity<Map<String, String>> generateTodaysDocx() {
//        try {
//            String filePath = csvService.updateDailyDocx();
//
//            Map<String, String> response = new HashMap<>();
//            response.put("message", "Today's Word document updated successfully");
//            response.put("filePath", filePath);
//            response.put("fileName", filePath.substring(filePath.lastIndexOf("/") + 1));
//
//            return ResponseEntity.ok(response);
//        } catch (IOException e) {
//            Map<String, String> error = new HashMap<>();
//            error.put("error", "Failed to update today's Word document: " + e.getMessage());
//            return ResponseEntity.status(500).body(error);
//        }
//    }
//
//    /**
//     * Generate Word for specific date
//     */
//    @PostMapping("/docx/date")
//    public ResponseEntity<Map<String, String>> generateDateDocx(
//            @RequestParam String date) {
//
//        try {
//            String filePath = csvService.generateDateDocx(date);
//
//            Map<String, String> response = new HashMap<>();
//            response.put("message", "Date Word document generated successfully");
//            response.put("filePath", filePath);
//            response.put("fileName", filePath.substring(filePath.lastIndexOf("/") + 1));
//
//            return ResponseEntity.ok(response);
//        } catch (Exception e) {
//            Map<String, String> error = new HashMap<>();
//            error.put("error", "Failed to generate date Word document: " + e.getMessage());
//            return ResponseEntity.status(500).body(error);
//        }
//    }
//
//    /**
//     * Download Word file
//     */
//    @GetMapping("/docx/download/{fileName}")
//    public ResponseEntity<Resource> downloadDocx(@PathVariable String fileName) {
//        try {
//            String filePath = csvService.getCsvOutputDirectory() + "/" + fileName;
//            Resource resource = new FileSystemResource(filePath);
//
//            if (!resource.exists()) {
//                return ResponseEntity.notFound().build();
//            }
//
//            return ResponseEntity.ok()
//                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
//                    .contentType(MediaType.valueOf("application/vnd.openxmlformats-officedocument.wordprocessingml.document"))
//                    .body(resource);
//
//        } catch (Exception e) {
//            return ResponseEntity.status(500).build();
//        }
//    }

// ==================== UNIFIED FILE LISTING ====================

    /**
     * List all generated files (CSV, PDF, DOCX)
     */
    @GetMapping("/files/list")
    public ResponseEntity<Map<String, List<String>>> listAllFiles() {
        try {
            Map<String, List<String>> files = new HashMap<>();
            files.put("csv", csvService.getGeneratedCsvFiles());
            files.put("pdf", csvService.getGeneratedPdfFiles());
//            files.put("docx", csvService.getGeneratedDocxFiles());

            return ResponseEntity.ok(files);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(new HashMap<>());
        }
    }

    /**
     * 🔥 Generate ALL formats at once
     */
    @PostMapping("/reports/generate-all")
    public ResponseEntity<Map<String, Object>> generateAllFormats(
            @RequestParam String type, // "all", "site", "device", "today", "date"
            @RequestParam(required = false) String site,
            @RequestParam(required = false) String deviceName,
            @RequestParam(required = false) String ip,
            @RequestParam(required = false) String date,
            @RequestParam(defaultValue = "7") int days) {

        try {
            Map<String, Object> response = new HashMap<>();
            Map<String, String> files = new HashMap<>();

            switch (type.toLowerCase()) {
                case "all":
                    files.put("csv", csvService.generateCsvReport("manual", days));
                    files.put("pdf", csvService.generatePdfReport("manual", days));
//                    files.put("docx", csvService.generateDocxReport("manual", days));
                    break;

                case "site":
                    if (site == null) throw new IllegalArgumentException("Site parameter required");
                    files.put("csv", csvService.generateSiteCsv(site, days));
                    files.put("pdf", csvService.generateSitePdf(site, days));
//                    files.put("docx", csvService.generateSiteDocx(site, days));
                    break;

                case "device":
                    if (deviceName == null || ip == null) throw new IllegalArgumentException("Device name and IP required");
                    files.put("csv", csvService.generateDeviceCsv(deviceName, ip, days));
                    files.put("pdf", csvService.generateDevicePdf(deviceName, ip, days));
//                    files.put("docx", csvService.generateDeviceDocx(deviceName, ip, days));
                    break;

                case "today":
                    files.put("csv", csvService.updateDailyCsv());
                    files.put("pdf", csvService.updateDailyPdf());
//                    files.put("docx", csvService.updateDailyDocx());
                    break;

                case "date":
                    if (date == null) throw new IllegalArgumentException("Date parameter required");
                    files.put("csv", csvService.generateDateCsv(date));
                    files.put("pdf", csvService.generateDatePdf(date));
//                    files.put("docx", csvService.generateDateDocx(date));
                    break;

                default:
                    throw new IllegalArgumentException("Invalid type: " + type);
            }

            response.put("message", "All reports generated successfully");
            response.put("files", files);
            response.put("type", type);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Failed to generate reports: " + e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    // 🔧 HELPER: Check if any filters are applied - FIXED
    private boolean hasAnyFilter(String site, String deviceName, String ip, String status,
                                 String changeType, String startDate, String endDate) { // ✅ changeType
        return (site != null && !site.isEmpty()) ||
                (deviceName != null && !deviceName.isEmpty()) ||
                (ip != null && !ip.isEmpty()) ||
                (status != null && !status.isEmpty()) ||
                (changeType != null && !changeType.isEmpty()) || // ✅ changeType
                (startDate != null && !startDate.isEmpty()) ||
                (endDate != null && !endDate.isEmpty());
    }

    // 🚀 CUSTOM FILTERING METHOD - FIXED
    private Page<DeviceStatusChange> getFilteredDeviceHistory(String site, String deviceName, String ip,
                                                              String status, String changeType, String startDate, String endDate, Pageable pageable) { // ✅ changeType

        List<DeviceStatusChange> allRecords = statusChangeRepository.findAll();

        Stream<DeviceStatusChange> filtered = allRecords.stream();

        if (site != null && !site.isEmpty() && !"ALL_SITES".equals(site)) {
            filtered = filtered.filter(change -> site.equals(change.getSite()));
        }

        if (deviceName != null && !deviceName.isEmpty()) {
            filtered = filtered.filter(change ->
                    change.getDeviceName().toLowerCase().contains(deviceName.toLowerCase()));
        }

        if (ip != null && !ip.isEmpty()) {
            filtered = filtered.filter(change ->
                    change.getIp().toLowerCase().contains(ip.toLowerCase()));
        }

        if (status != null && !status.isEmpty()) {
            filtered = filtered.filter(change ->
                    status.equals(change.getNewStatus()) || status.equals(change.getOldStatus()));
        }

        // ✅ FIXED: Use changeType instead of reason
        if (changeType != null && !changeType.isEmpty()) {
            filtered = filtered.filter(change ->
                    change.getChangeType().toLowerCase().contains(changeType.toLowerCase()));
        }

        if (startDate != null && !startDate.isEmpty()) {
            LocalDateTime start = LocalDateTime.parse(startDate);
            filtered = filtered.filter(change -> !change.getChangeTime().isBefore(start));
        }

        if (endDate != null && !endDate.isEmpty()) {
            LocalDateTime end = LocalDateTime.parse(endDate);
            filtered = filtered.filter(change -> !change.getChangeTime().isAfter(end));
        }

        List<DeviceStatusChange> filteredList = filtered.collect(Collectors.toList());

        // Apply sorting
        if (pageable.getSort().isSorted()) {
            Sort.Order order = pageable.getSort().iterator().next();
            Comparator<DeviceStatusChange> comparator = null;

            switch (order.getProperty()) {
                case "changeTime":
                    comparator = Comparator.comparing(DeviceStatusChange::getChangeTime);
                    break;
                case "deviceName":
                    comparator = Comparator.comparing(DeviceStatusChange::getDeviceName);
                    break;
                case "site":
                    comparator = Comparator.comparing(DeviceStatusChange::getSite);
                    break;
                case "newStatus":
                    comparator = Comparator.comparing(DeviceStatusChange::getNewStatus);
                    break;
                case "changeType": // ✅ Add sorting by changeType
                    comparator = Comparator.comparing(DeviceStatusChange::getChangeType);
                    break;
                default:
                    comparator = Comparator.comparing(DeviceStatusChange::getChangeTime);
            }

            if (order.getDirection() == Sort.Direction.DESC) {
                comparator = comparator.reversed();
            }

            filteredList.sort(comparator);
        }

        int start = (int) pageable.getOffset();
        int end = Math.min(start + pageable.getPageSize(), filteredList.size());

        List<DeviceStatusChange> pageContent = filteredList.subList(start, end);

        return new PageImpl<>(pageContent, pageable, filteredList.size());
    }

    // 🔧 ADD THIS HELPER METHOD TO CLEAN PARAMETERS
private String cleanParameter(String param) {
    if (param == null) {
        return null;
    }
    
    // Remove all whitespace characters (spaces, newlines, tabs, etc.) from start and end
    String cleaned = param.trim()
            .replaceAll("\\r?\\n", "") // Remove newlines
            .replaceAll("\\t", "")     // Remove tabs
            .trim();                   // Final trim
    
    // Return null if empty after cleaning
    return cleaned.isEmpty() ? null : cleaned;
}
}