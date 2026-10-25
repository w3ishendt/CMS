package dtechdigital.cms.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

@Entity
@Table(name = "device_status_logs")
public class DeviceStatusLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(nullable = false)
    private String site;

    @NotBlank
    @Column(nullable = false, length = 50)
    private String category;

    @NotBlank
    @Column(name = "device_name", nullable = false)
    private String deviceName;

    @NotBlank
    @Column(nullable = false)
    private String ip;

    @NotBlank
    @Pattern(regexp = "ONLINE|OFFLINE|STALE", message = "Status must be ONLINE, OFFLINE, or STALE")
    @Column(nullable = false, length = 10)
    private String status;

    @Column(name = "duration")
    private String duration;

    @NotNull
    @Column(name = "log_time", nullable = false)
    private LocalDateTime logTime;

    @Column(name = "last_duration")
    private String lastDuration;

    @Column(name = "duration_changed_at")
    private LocalDateTime durationChangedAt;

    @Column(name = "station_id", length = 64)
    private String stationId;

    // Default constructor
    public DeviceStatusLog() {}

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
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

    public LocalDateTime getLogTime() {
        return logTime;
    }

    public void setLogTime(LocalDateTime logTime) {
        this.logTime = logTime;
    }

    public String getLastDuration() {
        return lastDuration;
    }

    public void setLastDuration(String lastDuration) {
        this.lastDuration = lastDuration;
    }

    public LocalDateTime getDurationChangedAt() {
        return durationChangedAt;
    }

    public void setDurationChangedAt(LocalDateTime durationChangedAt) {
        this.durationChangedAt = durationChangedAt;
    }

    public String getStationId() {
        return stationId;
    }

    public void setStationId(String stationId) {
        this.stationId = stationId;
    }
}