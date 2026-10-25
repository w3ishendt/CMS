package dtechdigital.cms.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public class DeviceStatusLogDto {
    
    @NotBlank(message = "Site is required")
    private String site;
    
    @NotBlank(message = "Category is required")
    private String category;
    
    @NotBlank(message = "Device name is required")
    private String deviceName;
    
    @NotBlank(message = "IP address is required")
    private String ip;
    
    @NotBlank(message = "Status is required")
    @Pattern(regexp = "ONLINE|OFFLINE", message = "Status must be ONLINE or OFFLINE")
    private String status;
    
    private String duration; // e.g., "(3h 21m 15s)"
    
    private String logTime; // ISO timestamp from client

    private String eventide;

    private String stationId;
    
    public DeviceStatusLogDto() {}
    
    public DeviceStatusLogDto(String site, String category, String deviceName, String ip, String status, String duration, String logTime) {
        this.site = site;
        this.category = category;
        this.deviceName = deviceName;
        this.ip = ip;
        this.status = status;
        this.duration = duration;
        this.logTime = logTime;
    }
    
    public String getSite() {
        return site;
    }
    
    public void setSite(String site) {
        this.site = site;
    }
    
    public String getCategory() {
        return category;
    }
    
    public void setCategory(String category) {
        this.category = category;
    }
    
    public String getDeviceName() {
        return deviceName;
    }
    
    public void setDeviceName(String deviceName) {
        this.deviceName = deviceName;
    }
    
    public String getIp() {
        return ip;
    }
    
    public void setIp(String ip) {
        this.ip = ip;
    }
    
    public String getStatus() {
        return status;
    }
    
    public void setStatus(String status) {
        this.status = status;
    }
    
    public String getDuration() {
        return duration;
    }
    
    public void setDuration(String duration) {
        this.duration = duration;
    }
    
    public String getLogTime() {
        return logTime;
    }
    
    public void setLogTime(String logTime) {
        this.logTime = logTime;
    }

    public String getEventide() {
        return eventide;
    }

    public void setEventide(String eventide) {
        this.eventide = eventide;
    }

    public String getStationId() {
        return stationId;
    }

    public void setStationId(String stationId) {
        this.stationId = stationId;
    }
    
    @Override
    public String toString() {
        return "DeviceStatusLogDto{" +
                "site='" + site + '\'' +
                ", category='" + category + '\'' +
                ", deviceName='" + deviceName + '\'' +
                ", ip='" + ip + '\'' +
                ", status='" + status + '\'' +
                ", duration='" + duration + '\'' +
                ", logTime='" + logTime + '\'' +
                ", eventide='" + eventide + '\'' +
                ", stationId='" + stationId + '\'' +
                '}';
    }
}
