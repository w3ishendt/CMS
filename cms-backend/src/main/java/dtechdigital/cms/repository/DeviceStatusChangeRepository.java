package dtechdigital.cms.repository;

import dtechdigital.cms.entity.DeviceStatusChange;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface DeviceStatusChangeRepository extends JpaRepository<DeviceStatusChange, Long> {

    // 🎯 BASIC DATE RANGE QUERIES
    List<DeviceStatusChange> findByChangeTimeBetweenOrderByChangeTimeDesc(
            LocalDateTime start, LocalDateTime end);

    // 🎯 DEVICE-SPECIFIC QUERIES
    List<DeviceStatusChange> findByDeviceNameAndIpAndChangeTimeBetweenOrderByChangeTimeDesc(
            String deviceName, String ip, LocalDateTime start, LocalDateTime end);

    List<DeviceStatusChange> findByDeviceNameAndIpOrderByChangeTimeDesc(
            String deviceName, String ip);

    Page<DeviceStatusChange> findByDeviceNameAndIpOrderByChangeTimeDesc(
            String deviceName, String ip, Pageable pageable);

    // 🎯 SITE-SPECIFIC QUERIES
    List<DeviceStatusChange> findBySiteAndChangeTimeBetweenOrderByChangeTimeDesc(
            String site, LocalDateTime start, LocalDateTime end);

    List<DeviceStatusChange> findBySiteOrderByChangeTimeDesc(String site);

    // 🎯 CHANGE TYPE QUERIES (THIS WAS MISSING!)
    List<DeviceStatusChange> findByChangeTypeAndChangeTimeBetweenOrderByChangeTimeDesc(
            String changeType, LocalDateTime start, LocalDateTime end);

    List<DeviceStatusChange> findByChangeTypeOrderByChangeTimeDesc(String changeType);

    // 🎯 STATUS QUERIES
    List<DeviceStatusChange> findByOldStatusAndChangeTimeBetweenOrderByChangeTimeDesc(
            String oldStatus, LocalDateTime start, LocalDateTime end);

    List<DeviceStatusChange> findByNewStatusAndChangeTimeBetweenOrderByChangeTimeDesc(
            String newStatus, LocalDateTime start, LocalDateTime end);

    // 🎯 RECENT CHANGES (for real-time dashboard)
    List<DeviceStatusChange> findTop100ByOrderByChangeTimeDesc();

    List<DeviceStatusChange> findTop50ByOrderByChangeTimeDesc();

    List<DeviceStatusChange> findTop20ByOrderByChangeTimeDesc();

    // 🎯 COMBINED FILTERS
    List<DeviceStatusChange> findBySiteAndChangeTypeAndChangeTimeBetweenOrderByChangeTimeDesc(
            String site, String changeType, LocalDateTime start, LocalDateTime end);

    List<DeviceStatusChange> findByDeviceNameAndChangeTypeAndChangeTimeBetweenOrderByChangeTimeDesc(
            String deviceName, String changeType, LocalDateTime start, LocalDateTime end);

    // 🎯 STATISTICS QUERIES
    @Query("SELECT c.newStatus, COUNT(c) FROM DeviceStatusChange c " +
            "WHERE c.changeTime BETWEEN :start AND :end GROUP BY c.newStatus")
    List<Object[]> getStatusChangeStats(@Param("start") LocalDateTime start,
                                        @Param("end") LocalDateTime end);

    @Query("SELECT c.changeType, COUNT(c) FROM DeviceStatusChange c " +
            "WHERE c.changeTime BETWEEN :start AND :end GROUP BY c.changeType")
    List<Object[]> getChangeTypeStats(@Param("start") LocalDateTime start,
                                      @Param("end") LocalDateTime end);

    @Query("SELECT c.site, COUNT(c) FROM DeviceStatusChange c " +
            "WHERE c.changeTime BETWEEN :start AND :end GROUP BY c.site")
    List<Object[]> getSiteStats(@Param("start") LocalDateTime start,
                                @Param("end") LocalDateTime end);

    // 🎯 COUNT METHODS
    Long countByChangeTimeBetween(LocalDateTime start, LocalDateTime end);

    Long countByDeviceNameAndIpAndChangeTimeBetween(
            String deviceName, String ip, LocalDateTime start, LocalDateTime end);

    Long countBySiteAndChangeTimeBetween(
            String site, LocalDateTime start, LocalDateTime end);

    Long countByChangeTypeAndChangeTimeBetween(
            String changeType, LocalDateTime start, LocalDateTime end);

    // 🎯 EXISTENCE CHECKS
    boolean existsByDeviceNameAndIp(String deviceName, String ip);

    boolean existsBySite(String site);

    // 🎯 FIND UNIQUE VALUES (for dropdown filters)
    @Query("SELECT DISTINCT c.site FROM DeviceStatusChange c ORDER BY c.site")
    List<String> findAllUniqueSites();

    @Query("SELECT DISTINCT c.changeType FROM DeviceStatusChange c ORDER BY c.changeType")
    List<String> findAllUniqueChangeTypes();

    @Query("SELECT DISTINCT c.category FROM DeviceStatusChange c ORDER BY c.category")
    List<String> findAllUniqueCategories();

    @Query("SELECT DISTINCT c.newStatus FROM DeviceStatusChange c " +
            "UNION SELECT DISTINCT c.oldStatus FROM DeviceStatusChange c ORDER BY 1")
    List<String> findAllUniqueStatuses();

    // 🎯 LATEST CHANGE PER DEVICE
    @Query("SELECT c FROM DeviceStatusChange c WHERE c.changeTime = " +
            "(SELECT MAX(c2.changeTime) FROM DeviceStatusChange c2 " +
            "WHERE c2.deviceName = c.deviceName AND c2.ip = c.ip)")
    List<DeviceStatusChange> findLatestChangePerDevice();

    // 🎯 FIND STALE DEVICES (devices that haven't changed in X minutes)
    @Query("SELECT c FROM DeviceStatusChange c WHERE c.changeTime = " +
            "(SELECT MAX(c2.changeTime) FROM DeviceStatusChange c2 " +
            "WHERE c2.deviceName = c.deviceName AND c2.ip = c.ip) " +
            "AND c.changeTime < :threshold")
    List<DeviceStatusChange> findStaleDevices(@Param("threshold") LocalDateTime threshold);

    Page<DeviceStatusChange> findByDeviceNameAndIpAndChangeTimeBetween(
            String deviceName,
            String ip,
            LocalDateTime startTime,
            LocalDateTime endTime,
            Pageable pageable);

    /**
     * 🔥 2. Find by site and change time between dates
     */
    Page<DeviceStatusChange> findBySiteAndChangeTimeBetween(
            String site,
            LocalDateTime startTime,
            LocalDateTime endTime,
            Pageable pageable);

    /**
     * 🔥 3. Find by change type and change time between dates
     */
    Page<DeviceStatusChange> findByChangeTypeAndChangeTimeBetween(
            String changeType,
            LocalDateTime startTime,
            LocalDateTime endTime,
            Pageable pageable);

    /**
     * 🔥 4. Find by change time between dates (all records)
     */
    Page<DeviceStatusChange> findByChangeTimeBetween(
            LocalDateTime startTime,
            LocalDateTime endTime,
            Pageable pageable);

    @Query("SELECT MAX(c.changeTime) FROM DeviceStatusChange c WHERE c.site = :site")
    LocalDateTime findMaxChangeTimeForSite(@Param("site") String site);

    @Query("SELECT MAX(c.changeTime) FROM DeviceStatusChange c WHERE c.deviceName = :deviceName AND c.ip = :ip")
    LocalDateTime findMaxChangeTimeForDevice(@Param("deviceName") String deviceName, @Param("ip") String ip);

    // Find status changes within time range
    List<DeviceStatusChange> findByChangeTimeBetweenOrderByChangeTime(LocalDateTime startTime, LocalDateTime endTime);

    // Find recent changes for site discovery
    List<DeviceStatusChange> findByChangeTimeAfter(LocalDateTime startTime);

    // Find changes by site and time range
    List<DeviceStatusChange> findBySiteAndChangeTimeBetween(String site, LocalDateTime startTime, LocalDateTime endTime);

    // 🚀 NEW: Get latest change to find actual data range
    List<DeviceStatusChange> findTop1ByOrderByChangeTimeDesc();

    // Also useful: Get earliest change
    List<DeviceStatusChange> findTop1ByOrderByChangeTimeAsc();
}