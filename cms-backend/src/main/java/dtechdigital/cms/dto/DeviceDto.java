package dtechdigital.cms.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public class DeviceDto {
    
    @NotBlank(message = "Device name is required")
    private String name;
    
    @NotBlank(message = "IP address is required")
    @Pattern(regexp = "^(?:(?:25[0-5]|2[0-4][0-9]|1?[0-9]{1,2})\\.){3}(?:25[0-5]|2[0-4][0-9]|1?[0-9]{1,2})$", message = "Invalid IP address format")
    private String ip;
    
    @NotBlank(message = "Category is required")
    private String category;

    private String stationId;
    
    public DeviceDto() {}
    
    public DeviceDto(String name, String ip, String category) {
        this.name = name;
        this.ip = ip;
        this.category = category;
    }

    public DeviceDto(String name, String ip, String category, String stationId) {
        this.name = name;
        this.ip = ip;
        this.category = category;
        this.stationId = stationId;
    }
    
    // Getters and setters
    public String getName() {
        return name;
    }
    
    public void setName(String name) {
        this.name = name;
    }
    
    public String getIp() {
        return ip;
    }
    
    public void setIp(String ip) {
        this.ip = ip;
    }
    
    public String getCategory() {
        return category;
    }
    
    public void setCategory(String category) {
        this.category = category;
    }

    public String getStationId() {
        return stationId;
    }

    public void setStationId(String stationId) {
        this.stationId = stationId;
    }
    
    @Override
    public String toString() {
        return "DeviceDto{" +
                "name='" + name + '\'' +
                ", ip='" + ip + '\'' +
                ", category='" + category + '\'' +
            ", stationId='" + stationId + '\'' +
                '}';
    }
}
