package dtechdigital.cms.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "device_status_changes")
public class DeviceStatusChange {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "site")
    private String site;

    @Column(name = "category")
    private String category;

    @Column(name = "device_name")
    private String deviceName;

    @Column(name = "ip")
    private String ip;

    @Column(name = "old_status")
    private String oldStatus;

    @Column(name = "new_status")
    private String newStatus;

    @Column(name = "duration")
    private String duration;

    @Column(name = "change_type")
    private String changeType;

    @Column(name = "change_time")
    private LocalDateTime changeTime;

    @Column(name = "current_record_id")
    private Long currentRecordId;

    // 🔧 CONSTRUCTORS
    public DeviceStatusChange() {}

    public DeviceStatusChange(String site, String category, String deviceName, String ip,
                              String oldStatus, String newStatus, String duration,
                              String changeType, Long currentRecordId) {
        this.site = site;
        this.category = category;
        this.deviceName = deviceName;
        this.ip = ip;
        this.oldStatus = oldStatus;
        this.newStatus = newStatus;
        this.duration = duration;
        this.changeType = changeType;
        this.changeTime = LocalDateTime.now();
        this.currentRecordId = currentRecordId;
    }

    // 🔧 GETTERS AND SETTERS
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

    public String getOldStatus() {
        return oldStatus;
    }

    public void setOldStatus(String oldStatus) {
        this.oldStatus = oldStatus;
    }

    public String getNewStatus() {
        return newStatus;
    }

    public void setNewStatus(String newStatus) {
        this.newStatus = newStatus;
    }

    public String getDuration() {
        return duration;
    }

    public void setDuration(String duration) {
        this.duration = duration;
    }

    public String getChangeType() {
        return changeType;
    }

    public void setChangeType(String changeType) {
        this.changeType = changeType;
    }

    public LocalDateTime getChangeTime() {
        return changeTime;
    }

    public void setChangeTime(LocalDateTime changeTime) {
        this.changeTime = changeTime;
    }

    public Long getCurrentRecordId() {
        return currentRecordId;
    }

    public void setCurrentRecordId(Long currentRecordId) {
        this.currentRecordId = currentRecordId;
    }

    @Override
    public String toString() {
        return String.format("DeviceStatusChange{id=%d, device='%s', ip='%s', %s→%s, type='%s', time=%s}",
                id, deviceName, ip, oldStatus, newStatus, changeType, changeTime);
    }
}