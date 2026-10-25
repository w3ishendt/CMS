package dtechdigital.cms.repository;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import dtechdigital.cms.entity.DeviceHeartbeatHistory;

@Repository
public interface DeviceHeartbeatHistoryRepository extends JpaRepository<DeviceHeartbeatHistory, Long> {

    boolean existsByEventId(String eventId);

        long countByLogTimeAfter(LocalDateTime after);

    Page<DeviceHeartbeatHistory> findByLogTimeBetween(LocalDateTime start, LocalDateTime end, Pageable pageable);

    Page<DeviceHeartbeatHistory> findBySiteContainingIgnoreCaseAndLogTimeBetween(
            String site,
            LocalDateTime start,
            LocalDateTime end,
            Pageable pageable);

    Page<DeviceHeartbeatHistory> findByDeviceNameContainingIgnoreCaseAndLogTimeBetween(
            String deviceName,
            LocalDateTime start,
            LocalDateTime end,
            Pageable pageable);

    Page<DeviceHeartbeatHistory> findByStatusIgnoreCaseAndLogTimeBetween(
            String status,
            LocalDateTime start,
            LocalDateTime end,
            Pageable pageable);

    List<DeviceHeartbeatHistory> findByLogTimeBetweenOrderByLogTimeAsc(LocalDateTime start, LocalDateTime end);

    List<DeviceHeartbeatHistory> findBySiteContainingIgnoreCaseAndLogTimeBetweenOrderByLogTimeAsc(
            String site,
            LocalDateTime start,
            LocalDateTime end);
}
