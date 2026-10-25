package dtechdigital.cms.service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import dtechdigital.cms.dto.DeviceStatusLogDto;
import dtechdigital.cms.entity.DeviceHeartbeatHistory;
import dtechdigital.cms.repository.DeviceHeartbeatHistoryRepository;

@Service
public class DeviceHeartbeatHistoryService {

    @Autowired
    private DeviceHeartbeatHistoryRepository historyRepository;

    public void saveHeartbeatEvent(DeviceStatusLogDto dto, String eventId) {
        if (dto == null) {
            return;
        }

        if (StringUtils.hasText(eventId) && historyRepository.existsByEventId(eventId)) {
            return;
        }

        DeviceHeartbeatHistory history = new DeviceHeartbeatHistory();
        history.setSite(dto.getSite());
        history.setCategory(dto.getCategory());
        history.setDeviceName(dto.getDeviceName());
        history.setIp(dto.getIp());
        history.setStatus(dto.getStatus());
        history.setDuration(dto.getDuration());
        history.setEventId(StringUtils.hasText(eventId) ? eventId : null);
        history.setLogTime(parseLogTime(dto.getLogTime()));

        historyRepository.save(history);
    }

    public Map<String, Object> getHeartbeatHistory(
            int page,
            int size,
            String site,
            String deviceName,
            String status,
            String startDate,
            String endDate) {
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, size), Sort.by("logTime").descending());

        LocalDateTime start = parseDateOrDefault(startDate, LocalDateTime.now().minusDays(1));
        LocalDateTime end = parseDateOrDefault(endDate, LocalDateTime.now());

        Page<DeviceHeartbeatHistory> pageData;
        if (StringUtils.hasText(site)) {
            pageData = historyRepository.findBySiteContainingIgnoreCaseAndLogTimeBetween(site, start, end, pageable);
        } else if (StringUtils.hasText(deviceName)) {
            pageData = historyRepository.findByDeviceNameContainingIgnoreCaseAndLogTimeBetween(deviceName, start, end, pageable);
        } else if (StringUtils.hasText(status)) {
            pageData = historyRepository.findByStatusIgnoreCaseAndLogTimeBetween(status, start, end, pageable);
        } else {
            pageData = historyRepository.findByLogTimeBetween(start, end, pageable);
        }

        Map<String, Object> response = new HashMap<>();
        response.put("content", pageData.getContent());
        response.put("currentPage", pageData.getNumber());
        response.put("totalItems", pageData.getTotalElements());
        response.put("totalPages", pageData.getTotalPages());
        response.put("size", pageData.getSize());
        response.put("hasNext", pageData.hasNext());
        response.put("hasPrevious", pageData.hasPrevious());
        return response;
    }

    private LocalDateTime parseLogTime(String raw) {
        if (!StringUtils.hasText(raw)) {
            return LocalDateTime.now();
        }

        try {
            return LocalDateTime.parse(raw, DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        } catch (Exception ignored) {
        }

        try {
            return LocalDateTime.parse(raw);
        } catch (Exception ignored) {
        }

        return LocalDateTime.now();
    }

    private LocalDateTime parseDateOrDefault(String raw, LocalDateTime fallback) {
        if (!StringUtils.hasText(raw)) {
            return fallback;
        }

        try {
            return LocalDateTime.parse(raw);
        } catch (Exception ignored) {
        }

        try {
            return LocalDateTime.parse(raw, DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        } catch (Exception ignored) {
        }

        return fallback;
    }
}
