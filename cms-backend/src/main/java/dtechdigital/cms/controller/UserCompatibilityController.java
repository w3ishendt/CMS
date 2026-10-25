package dtechdigital.cms.controller;

import dtechdigital.cms.entity.DeviceStatusLog;
import dtechdigital.cms.service.DeviceStatusLogService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@CrossOrigin(origins = "*")
public class UserCompatibilityController {

    @Autowired
    private DeviceStatusLogService deviceStatusLogService;

    @GetMapping("/api/sites/available")
    public ResponseEntity<Map<String, Object>> getAvailableSites() {
        Map<String, Object> response = new HashMap<>();
        response.put("sites", getSiteNames());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/api/users")
    public ResponseEntity<Map<String, Object>> getUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String sortBy,
            @RequestParam(required = false) String sortDir,
            @RequestParam(required = false) Boolean includeHierarchy,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) Boolean active) {

        List<Map<String, Object>> users = new ArrayList<>();
        users.add(localAdminUser());

        if (role != null && !role.isBlank()) {
            users = users.stream()
                    .filter(user -> ((List<?>) user.get("roles")).contains(role))
                    .collect(Collectors.toList());
        }
        if (active != null) {
            users = users.stream()
                    .filter(user -> active.equals(user.get("active")))
                    .collect(Collectors.toList());
        }
        if (search != null && !search.isBlank()) {
            String normalizedSearch = search.toLowerCase();
            users = users.stream()
                    .filter(user ->
                            String.valueOf(user.get("username")).toLowerCase().contains(normalizedSearch)
                                    || String.valueOf(user.get("email")).toLowerCase().contains(normalizedSearch)
                                    || String.valueOf(user.get("firstName")).toLowerCase().contains(normalizedSearch)
                                    || String.valueOf(user.get("lastName")).toLowerCase().contains(normalizedSearch))
                    .collect(Collectors.toList());
        }

        int safeSize = Math.max(size, 1);
        int fromIndex = Math.min(Math.max(page, 0) * safeSize, users.size());
        int toIndex = Math.min(fromIndex + safeSize, users.size());
        List<Map<String, Object>> content = users.subList(fromIndex, toIndex);

        Map<String, Object> response = new HashMap<>();
        response.put("content", content);
        response.put("number", page);
        response.put("size", safeSize);
        response.put("totalElements", users.size());
        response.put("totalPages", (int) Math.ceil((double) users.size() / safeSize));
        response.put("first", page == 0);
        response.put("last", toIndex >= users.size());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/api/users/current")
    public ResponseEntity<Map<String, Object>> getCurrentUser() {
        return ResponseEntity.ok(localAdminUser());
    }

    @GetMapping("/api/users/effective-permissions")
    public ResponseEntity<Map<String, Object>> getEffectivePermissions() {
        Map<String, Object> permissions = new HashMap<>();
        permissions.put("canCreateUsers", true);
        permissions.put("canManageUsers", true);
        permissions.put("canDeleteUsers", true);
        permissions.put("canManageSites", true);
        permissions.put("canAccessAnalytics", true);
        permissions.put("canViewReports", true);
        permissions.put("canManageDevices", true);
        permissions.put("canAccessAdmin", true);
        permissions.put("canViewHistory", true);
        permissions.put("canGenerateScripts", true);
        permissions.put("availableRoles", List.of("ADMINISTRATOR", "DISTRIBUTOR", "MULTI_SITE_OPERATOR", "OPERATOR"));
        return ResponseEntity.ok(permissions);
    }

    @GetMapping("/api/users/distributors")
    public ResponseEntity<List<Map<String, Object>>> getDistributors() {
        return ResponseEntity.ok(List.of());
    }

    @GetMapping("/api/users/{userId}/assignable-sites")
    public ResponseEntity<List<Map<String, Object>>> getAssignableSites(@PathVariable Long userId) {
        List<Map<String, Object>> sites = getSiteNames().stream()
                .map(siteName -> siteInfo(siteName, true))
                .collect(Collectors.toList());
        return ResponseEntity.ok(sites);
    }

    @PostMapping("/api/users")
    public ResponseEntity<Map<String, Object>> createUser(@RequestBody Map<String, Object> request) {
        return ResponseEntity.ok(userFromRequest(2L, request));
    }

    @PutMapping("/api/users/{userId}")
    public ResponseEntity<Map<String, Object>> updateUser(
            @PathVariable Long userId,
            @RequestBody Map<String, Object> request) {
        return ResponseEntity.ok(userFromRequest(userId, request));
    }

    @DeleteMapping("/api/users/{userId}")
    public ResponseEntity<Map<String, Object>> deleteUser(@PathVariable Long userId) {
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "User removed from local compatibility response"
        ));
    }

    private List<String> getSiteNames() {
        Set<String> names = deviceStatusLogService.getLatestDeviceStatuses().stream()
                .map(DeviceStatusLog::getSite)
                .filter(site -> site != null && !site.isBlank())
                .collect(Collectors.toCollection(LinkedHashSet::new));

        return names.stream()
                .sorted(Comparator.naturalOrder())
                .collect(Collectors.toList());
    }

    private Map<String, Object> localAdminUser() {
        Map<String, Object> user = new HashMap<>();
        user.put("id", 1L);
        user.put("username", "local-admin");
        user.put("email", "local-admin@cms.local");
        user.put("firstName", "Local");
        user.put("lastName", "Admin");
        user.put("active", true);
        user.put("locked", false);
        user.put("role", "SUPER_ADMIN");
        user.put("roles", List.of("SUPER_ADMIN"));
        user.put("parentUserId", null);
        user.put("parentUser", null);
        user.put("childUsers", List.of());
        user.put("sites", getSiteNames().stream()
                .map(siteName -> siteInfo(siteName, true))
                .collect(Collectors.toList()));
        user.put("assignedSiteNames", getSiteNames());
        user.put("createdAt", LocalDateTime.now().toString());
        user.put("updatedAt", LocalDateTime.now().toString());
        return user;
    }

    private Map<String, Object> userFromRequest(Long id, Map<String, Object> request) {
        Map<String, Object> user = new HashMap<>();
        user.put("id", id);
        user.put("username", request.getOrDefault("username", "user-" + id));
        user.put("email", request.getOrDefault("email", ""));
        user.put("firstName", request.getOrDefault("firstName", ""));
        user.put("lastName", request.getOrDefault("lastName", ""));
        user.put("active", request.getOrDefault("active", true));
        user.put("locked", false);
        user.put("roles", request.getOrDefault("roles", List.of("OPERATOR")));
        user.put("parentUserId", request.getOrDefault("parentUserId", null));
        user.put("parentUser", null);
        user.put("childUsers", List.of());
        user.put("assignedSiteNames", request.getOrDefault("siteNames", request.getOrDefault("siteIds", List.of())));
        user.put("sites", sitesFromRequest(request));
        user.put("createdAt", LocalDateTime.now().toString());
        user.put("updatedAt", LocalDateTime.now().toString());
        return user;
    }

    private List<Map<String, Object>> sitesFromRequest(Map<String, Object> request) {
        Object rawSites = request.getOrDefault("siteNames", request.get("siteIds"));
        if (!(rawSites instanceof List<?> sites)) {
            return List.of();
        }

        return sites.stream()
                .map(String::valueOf)
                .map(siteName -> siteInfo(siteName, true))
                .collect(Collectors.toList());
    }

    private Map<String, Object> siteInfo(String siteName, boolean canAssign) {
        Map<String, Object> site = new HashMap<>();
        site.put("id", siteName);
        site.put("name", siteName);
        site.put("location", null);
        site.put("description", null);
        site.put("active", true);
        site.put("canAssign", canAssign);
        site.put("assignedToParent", false);
        site.put("createdAt", null);
        site.put("updatedAt", null);
        return site;
    }
}
