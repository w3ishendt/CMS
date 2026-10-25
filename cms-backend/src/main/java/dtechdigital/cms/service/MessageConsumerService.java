package dtechdigital.cms.service;

import dtechdigital.cms.config.RabbitMQConfig;
import dtechdigital.cms.dto.DeviceStatusLogDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class MessageConsumerService {

    private static final Logger logger = LoggerFactory.getLogger(MessageConsumerService.class);

    @Autowired
    private DeviceStatusLogService deviceStatusLogService;

    /**
     * Process device status messages from RabbitMQ
     * This runs asynchronously with 10-20 concurrent consumers
     */
    @RabbitListener(queues = RabbitMQConfig.DEVICE_STATUS_QUEUE)
    public void processDeviceStatus(DeviceStatusLogDto deviceStatus) {
        try {
            logger.info("📥 Processing from RabbitMQ: {} - {} - {}",
                    deviceStatus.getDeviceName(), deviceStatus.getStatus(), deviceStatus.getSite());

            // Validate required fields before processing
            if (deviceStatus.getCategory() == null || deviceStatus.getCategory().trim().isEmpty()) {
                logger.error("❌ Missing category for device: {}", deviceStatus.getDeviceName());
                return; // Skip processing this message
            }

            if (deviceStatus.getIp() == null || deviceStatus.getIp().trim().isEmpty()) {
                logger.error("❌ Missing IP address for device: {}", deviceStatus.getDeviceName());
                return; // Skip processing this message
            }

            // Log what we received for debugging
            logger.debug("🔍 Device data: category={}, ip={}, device={}",
                    deviceStatus.getCategory(), deviceStatus.getIp(), deviceStatus.getDeviceName());

            // Process the device status
            deviceStatusLogService.saveDeviceStatusLog(deviceStatus);

            logger.info("✅ Message processed successfully: {}", deviceStatus.getDeviceName());

        } catch (Exception e) {
            logger.error("❌ Error processing message: {} - {}",
                    deviceStatus.getDeviceName(), e.getMessage(), e);
            // Don't rethrow to avoid infinite retry loops
        }
    }

    /**
     * Process power trip alerts
     */
    @RabbitListener(queues = RabbitMQConfig.POWER_TRIP_QUEUE, concurrency = "2-5")
    public void processPowerTripAlert(DeviceStatusLogDto deviceStatus) {
        try {
            logger.warn("⚡ Processing POWER TRIP: {} - {}", deviceStatus.getDeviceName(), deviceStatus.getSite());

            // For power trips, we still want to create a specific log entry
            deviceStatusLogService.saveDeviceStatusLog(deviceStatus);

            // You can add additional power trip handling here
            // e.g., send notifications, alerts, etc.

            logger.warn("✅ Power trip alert processed: {}", deviceStatus.getDeviceName());

        } catch (Exception e) {
            logger.error("❌ Error processing power trip alert: {}", deviceStatus.getDeviceName(), e);
            throw e;
        }
    }
}