//package dtechdigital.cms.service;
//
//import dtechdigital.cms.entity.DeviceStatusLog;
//import dtechdigital.cms.repository.DeviceStatusLogRepository;
//import org.slf4j.Logger;
//import org.slf4j.LoggerFactory;
//import org.springframework.beans.factory.annotation.Autowired;
//import org.springframework.scheduling.annotation.Scheduled;
//import org.springframework.stereotype.Service;
//import org.springframework.transaction.annotation.Propagation;
//import org.springframework.transaction.annotation.Transactional;
//
//import java.time.LocalDateTime;
//import java.util.List;
//
//@Service
//public class StaleDeviceService {
//
//    private static final Logger logger = LoggerFactory.getLogger(StaleDeviceService.class);
//
//    @Autowired
//    private DeviceStatusLogRepository deviceStatusLogRepository;
//
//    @Scheduled(fixedRate = 10000)
//    public void checkStaleDevices() {
//        // 🔧 Don't put @Transactional on @Scheduled method
//        // Call a separate transactional method instead
//        doStaleCheck();
//    }
//
//    @Transactional(propagation = Propagation.REQUIRES_NEW)
//    public void doStaleCheck() {
//        LocalDateTime staleThreshold = LocalDateTime.now().minusSeconds(20);
//
//        try {
//            // 🔧 Use repository query that returns fresh entities
//            List<DeviceStatusLog> allDevices = deviceStatusLogRepository.findAll();
//
//            for (DeviceStatusLog device : allDevices) {
//                try {
//                    // Process each device in the same transaction
//                    processStaleDevice(device, staleThreshold);
//                } catch (Exception e) {
//                    logger.error("❌ Error processing device {}: {}", device.getDeviceName(), e.getMessage());
//                }
//            }
//
//        } catch (Exception e) {
//            logger.error("❌ Error in stale check: {}", e.getMessage());
//        }
//    }
//
//    private void processStaleDevice(DeviceStatusLog device, LocalDateTime staleThreshold) {
//        boolean needsUpdate = false;
//
//        if (device.getDurationChangedAt() == null || device.getLastDuration() == null) {
//            device.setDurationChangedAt(device.getLogTime());
//            device.setLastDuration(device.getDuration());
//            needsUpdate = true;
//        }
//
//        if (device.getDurationChangedAt() != null) {
//            boolean isStale = device.getDurationChangedAt().isBefore(staleThreshold);
//            boolean notAlreadyStale = !"STALE".equals(device.getStatus());
//
//            if (isStale && notAlreadyStale) {
//                logger.warn("⚠️ Device STALE: {} ({})", device.getDeviceName(), device.getIp());
//                device.setStatus("STALE");
//                device.setLogTime(LocalDateTime.now());
//                needsUpdate = true;
//            }
//        }
//
//        if (needsUpdate) {
//            deviceStatusLogRepository.save(device);
//        }
//    }
//}