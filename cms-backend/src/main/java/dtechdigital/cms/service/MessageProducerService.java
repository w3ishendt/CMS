package dtechdigital.cms.service;

import dtechdigital.cms.config.RabbitMQConfig;
import dtechdigital.cms.dto.DeviceStatusLogDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class MessageProducerService {
    
    private static final Logger logger = LoggerFactory.getLogger(MessageProducerService.class);
    
    @Autowired
    private RabbitTemplate rabbitTemplate;
    
    /**
     * Send device status to RabbitMQ (NON-BLOCKING)
     */
    public void sendDeviceStatus(DeviceStatusLogDto deviceStatus) {
        try {
            logger.info("🚀 Sending to RabbitMQ: {} - {} - {}", 
                deviceStatus.getDeviceName(), deviceStatus.getStatus(), deviceStatus.getSite());
            
            rabbitTemplate.convertAndSend(
                RabbitMQConfig.DEVICE_EXCHANGE,
                RabbitMQConfig.DEVICE_STATUS_ROUTING_KEY,
                deviceStatus
            );
            
            logger.info("✅ Message sent to RabbitMQ successfully: {}", deviceStatus.getDeviceName());
            
        } catch (Exception e) {
            logger.error("❌ Failed to send message to RabbitMQ: {}", deviceStatus.getDeviceName(), e);
            throw e;
        }
    }
    
    /**
     * Send power trip alert
     */
    public void sendPowerTripAlert(DeviceStatusLogDto deviceStatus) {
        try {
            logger.warn("⚡ POWER TRIP ALERT: {} - {}", deviceStatus.getDeviceName(), deviceStatus.getSite());
            
            rabbitTemplate.convertAndSend(
                RabbitMQConfig.DEVICE_EXCHANGE,
                RabbitMQConfig.POWER_TRIP_ROUTING_KEY,
                deviceStatus
            );
            
            logger.info("✅ Power trip alert sent to RabbitMQ: {}", deviceStatus.getDeviceName());
            
        } catch (Exception e) {
            logger.error("❌ Failed to send power trip alert: {}", deviceStatus.getDeviceName(), e);
            throw e;
        }
    }
}