package dtechdigital.cms.controller;

import dtechdigital.cms.service.AlertService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/alerts")
@CrossOrigin(origins = "*")
public class AlertController {

    @Autowired
    private AlertService alertService;

    /**
     * Get recent alerts for live feed
     */
    @GetMapping("/recent")
    public ResponseEntity<List<Map<String, Object>>> getRecentAlerts(
            @RequestParam(defaultValue = "10") int limit) {
        List<Map<String, Object>> alerts = alertService.getRecentAlerts(limit);
        return ResponseEntity.ok(alerts);
    }
}