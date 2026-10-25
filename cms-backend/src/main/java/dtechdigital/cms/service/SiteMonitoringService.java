//package dtechdigital.cms.service;
//
//import dtechdigital.cms.dto.DeviceStatusLogDto;
//import dtechdigital.cms.entity.DeviceStatusLog;
//import dtechdigital.cms.repository.DeviceStatusLogRepository;
//import org.springframework.beans.factory.annotation.Autowired;
//import org.springframework.scheduling.annotation.Scheduled;
//import org.springframework.stereotype.Service;
//import org.springframework.transaction.annotation.Transactional;
//
//import java.io.FileWriter;
//import java.io.IOException;
//import java.time.LocalDate;
//import java.time.LocalDateTime;
//import java.time.format.DateTimeFormatter;
//import java.util.List;
//
//@Service
//public class SiteMonitoringService {
//
//    @Autowired
//    private DeviceStatusLogRepository repository;
//
//    @Autowired
//    private DeviceStatusLogService deviceStatusLogService;
//
//    private static final String LOG_DIR = "logs/";
//    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd");
//    private static final DateTimeFormatter DATETIME_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
//
//    @Scheduled(fixedRate = 30000)
//    @Transactional
//    public void checkInactiveSites() {
//        LocalDateTime cutoffTime = LocalDateTime.now().minusMinutes(2);
//
//        List<String> inactiveSites = repository.findSitesWithNoRecentHeartbeat(cutoffTime);
//
//        for (String site : inactiveSites) {
//            // Instead of using repository.markSiteAsOffline(),
//            // use your DeviceStatusLogService to update properly
//            markSiteDevicesOffline(site);
//
//            logPowerTripEvent(site);
//
//            System.out.println("🚨 No heartbeat received: Site '" + site + "' marked as OFFLINE due to no heartbeat for 2 minutes");
//        }
//    }
//
//    private void markSiteDevicesOffline(String siteName) {
//        // Get all latest devices for this site
//        List<DeviceStatusLog> siteDevices = deviceStatusLogService.getDevicesBySite(siteName);
//
//        for (DeviceStatusLog device : siteDevices) {
//            if ("ONLINE".equals(device.getStatus())) {
//                // Use the same service that handles updates properly
//                DeviceStatusLogDto offlineDto = new DeviceStatusLogDto();
//                offlineDto.setSite(device.getSite());
//                offlineDto.setCategory(device.getCategory());
//                offlineDto.setDeviceName(device.getDeviceName());
//                offlineDto.setIp(device.getIp());
//                offlineDto.setStatus("OFFLINE");
//                offlineDto.setDuration("00:00:00");
//
//                deviceStatusLogService.saveDeviceStatusLog(offlineDto);
//            }
//        }
//    }
//
//    private void logPowerTripEvent(String site) {
//        try {
//            java.nio.file.Files.createDirectories(java.nio.file.Paths.get(LOG_DIR));
//
//            String today = LocalDate.now().format(DATE_FORMAT);
//            String filename = LOG_DIR + today + "_noheartbeat.csv";
//
//            boolean isNewFile = !java.nio.file.Files.exists(java.nio.file.Paths.get(filename));
//
//            try (FileWriter writer = new FileWriter(filename, true)) {
//                // Write headers if new file
//                if (isNewFile) {
//                    writer.append("timestamp,site,event_type,description\n");
//                }
//
//                writer.append(String.format("%s,%s,%s,%s\n",
//                        LocalDateTime.now().format(DATETIME_FORMAT),
//                        escapeCsv(site),
//                        "NO HEARTBEAT",
//                        "Site marked offline due to no heartbeat for 30 seconds"
//                ));
//            }
//
//        } catch (IOException e) {
//            System.err.println("Failed to write power trip event to CSV: " + e.getMessage());
//        }
//    }
//
//
//    private String escapeCsv(String value) {
//        if (value == null) return "";
//        if (value.contains(",") || value.contains("\"") || value.contains("\n")) {
//            return "\"" + value.replace("\"", "\"\"") + "\"";
//        }
//        return value;
//    }
//}