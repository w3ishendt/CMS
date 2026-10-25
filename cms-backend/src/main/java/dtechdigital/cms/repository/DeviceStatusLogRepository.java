package dtechdigital.cms.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import dtechdigital.cms.entity.DeviceStatusLog;
import jakarta.transaction.Transactional;

@Repository
public interface DeviceStatusLogRepository extends JpaRepository<DeviceStatusLog, Long>, JpaSpecificationExecutor<DeviceStatusLog> {
    
    /**
     * Find device record by unique identifier (site + category + deviceName + ip)
     */
    Optional<DeviceStatusLog> findBySiteAndCategoryAndDeviceNameAndIp(
            String site, String category, String deviceName, String ip);

    Optional<DeviceStatusLog> findByDeviceNameAndIp(String deviceName, String ip);

    Optional<DeviceStatusLog> findFirstByDeviceNameAndIpOrderByLogTimeDesc(String deviceName, String ip);
    List<DeviceStatusLog> findByStatusNot(String status);
    /**
     * Find all devices for a specific site
     */
    List<DeviceStatusLog> findBySite(String site);

        List<DeviceStatusLog> findBySiteAndCategory(String site, String category);

        List<DeviceStatusLog> findBySiteAndDeviceNameAndIp(String site, String deviceName, String ip);

    List<DeviceStatusLog> findAllByOrderByLogTimeDesc();
    @Query("SELECT d FROM DeviceStatusLog d WHERE d.site = :site AND d.deviceName = :deviceName")
    Optional<DeviceStatusLog> findBySiteAndDeviceName(@Param("site") String site, @Param("deviceName") String deviceName);

    
    /**
     * Find sites that haven't sent heartbeat in X minutes
     */
    @Query("SELECT DISTINCT d.site FROM DeviceStatusLog d WHERE d.logTime < :cutoffTime")
    List<String> findSitesWithNoRecentHeartbeat(@Param("cutoffTime") LocalDateTime cutoffTime);
    
    /**
     * Update all devices in a site to OFFLINE
     */
    @Modifying  // Add this annotation for UPDATE/DELETE queries
    @Query("UPDATE DeviceStatusLog d SET d.status = 'OFFLINE', d.logTime = :currentTime WHERE d.site = :site")
    int markSiteAsOffline(@Param("site") String site, @Param("currentTime") LocalDateTime currentTime);

//    @Query("SELECT d FROM DeviceStatusLog d WHERE d.durationLastUpdated < :cutoffTime AND d.status != 'STALE'")
//    List<DeviceStatusLog> findDevicesWithStaleDuration(@Param("cutoffTime") LocalDateTime cutoffTime);

    @Query("SELECT d FROM DeviceStatusLog d WHERE d.durationChangedAt < :cutoffTime AND d.status != 'STALE'")
    List<DeviceStatusLog> findDevicesWithStaleDuration(@Param("cutoffTime") LocalDateTime cutoffTime);

    @Modifying
    @Transactional
    @Query("UPDATE DeviceStatusLog d SET d.durationChangedAt = d.logTime, d.lastDuration = d.duration WHERE d.durationChangedAt IS NULL")
    int updateNullDurationTimestamps();

    List<DeviceStatusLog> findByLogTimeBetweenOrderByLogTime(LocalDateTime start, LocalDateTime end);

    List<DeviceStatusLog> findByStatusAndLogTimeBetween(String status, LocalDateTime start, LocalDateTime end);

    List<DeviceStatusLog> findByLogTimeAfterAndStatusIn(LocalDateTime after, List<String> statuses);

    List<DeviceStatusLog> findTop50ByLogTimeAfterOrderByLogTimeDesc(LocalDateTime after);

    List<DeviceStatusLog> findByLogTimeAfterOrderByLogTimeDesc(LocalDateTime after);

    List<DeviceStatusLog> findByDeviceNameAndIpAndLogTimeAfterOrderByLogTimeDesc(
            String deviceName, String ip, LocalDateTime after);

    List<DeviceStatusLog> findBySiteAndLogTimeAfterOrderByLogTimeDesc(
            String site, LocalDateTime after);



    // For pagination
    Page<DeviceStatusLog> findAllByOrderByLogTimeDesc(Pageable pageable);

// For PostgreSQL - Use || operator
    @Query("SELECT COUNT(DISTINCT (d.deviceName || '_' || d.ip)) FROM DeviceStatusLog d WHERE d.logTime > :after")
    Long countDistinctDevicesSince(@Param("after") LocalDateTime after);



    @Query("SELECT d.status, COUNT(d) FROM DeviceStatusLog d WHERE d.logTime > :after GROUP BY d.status")
    List<Object[]> countByStatusSince(@Param("after") LocalDateTime after);

    Long countByLogTimeAfter(LocalDateTime after);


    // Find latest log for specific device
    @Query("SELECT d FROM DeviceStatusLog d " +
            "WHERE d.deviceName = :deviceName AND d.ip = :ip " +
            "ORDER BY d.logTime DESC")
    List<DeviceStatusLog> findByDeviceNameAndIpOrderByLogTimeDesc(
            @Param("deviceName") String deviceName,
            @Param("ip") String ip,
            Pageable pageable);

    default DeviceStatusLog findLatestByDeviceNameAndIp(String deviceName, String ip) {
        List<DeviceStatusLog> results = findByDeviceNameAndIpOrderByLogTimeDesc(
                deviceName, ip, PageRequest.of(0, 1));
        return results.isEmpty() ? null : results.get(0);
    }
    List<DeviceStatusLog> findByLogTimeBetweenOrderByLogTimeDesc(
            LocalDateTime start, LocalDateTime end);

}

