package dtechdigital.cms.service;

import dtechdigital.cms.entity.DeviceStatusLog;
import dtechdigital.cms.repository.DeviceStatusLogRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class AlertService {

    @Autowired
    private DeviceStatusLogRepository deviceRepository;

    /**
     * Get recent alerts (status changes)
     */
    public List<Map<String, Object>> getRecentAlerts(int limit) {
        LocalDateTime since = LocalDateTime.now().minusHours(24);
        List<DeviceStatusLog> recentLogs = deviceRepository.findTop50ByLogTimeAfterOrderByLogTimeDesc(since);

        List<Map<String, Object>> alerts = new ArrayList<>();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("HH:mm:ss");

        for (DeviceStatusLog log : recentLogs) {
            if (alerts.size() >= limit) break;

            Map<String, Object> alert = new HashMap<>();
            alert.put("id", log.getId());
            alert.put("timestamp", log.getLogTime().format(formatter));
            alert.put("deviceName", log.getDeviceName());
            alert.put("ip", log.getIp());
            alert.put("status", log.getStatus());

            String message = "";
            String severity = "INFO";

            switch (log.getStatus()) {
                case "STALE":
                    message = "Device went STALE - No activity detected";
                    severity = "WARNING";
                    break;
                case "OFFLINE":
                    message = "Device went OFFLINE";
                    severity = "ERROR";
                    break;
                case "ONLINE":
                    message = "Device came ONLINE";
                    severity = "SUCCESS";
                    break;
            }

            alert.put("message", message);
            alert.put("severity", severity);

            alerts.add(alert);
        }

        return alerts;
    }
}