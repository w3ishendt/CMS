package dtechdigital.cms.service;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import dtechdigital.cms.dto.CsvRowErrorDto;
import dtechdigital.cms.dto.CsvUploadResultDto;
import dtechdigital.cms.dto.DeviceDto;
import dtechdigital.cms.dto.SiteConfigDto;

@Service
public class PythonScriptGeneratorService {
    private static final Pattern IP_PATTERN = Pattern.compile("^(?:(?:25[0-5]|2[0-4][0-9]|1?[0-9]{1,2})\\.){3}(?:25[0-5]|2[0-4][0-9]|1?[0-9]{1,2})$");
    
private static final String SCRIPT_TEMPLATE = """
import os
import sys
import time
import ctypes
import atexit
import hashlib
import subprocess
from datetime import datetime

import requests  # pip install requests

API_URL = "http://localhost:8082/api/device-status/log"
MUTEX_NAME = "Global\\\\CMS_DEVICE_MONITOR_%s"

config = {
    "site": "%s",
    "google": {
        "mode": "APPS_SCRIPT",
        "app_script_url": "",
        "app_script_api_key": "",
        "credentials_path": "",
        "sheet_id": "",
        "worksheet": "Sheet1"
    },
    "devices": [
%s
    ]
}

_mutex_handle = None


def minimize_window_on_startup():
    '''Auto-minimize console window on Windows startup runs.'''
    if os.name != "nt":
        return
    try:
        user32 = ctypes.windll.user32
        kernel32 = ctypes.windll.kernel32
        hwnd = kernel32.GetConsoleWindow()
        if hwnd:
            user32.ShowWindow(hwnd, 6)  # SW_MINIMIZE
    except Exception:
        pass


def acquire_single_instance_lock():
    '''Prevent duplicate process instances, especially when packaged as .exe.'''
    global _mutex_handle
    if os.name == "nt":
        kernel32 = ctypes.windll.kernel32
        handle = kernel32.CreateMutexW(None, False, MUTEX_NAME)
        already_exists = kernel32.GetLastError() == 183  # ERROR_ALREADY_EXISTS
        if already_exists:
            print("Another monitor instance is already running. Exiting.")
            sys.exit(1)
        _mutex_handle = handle
        return

    lock_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".cms_device_monitor.lock")
    if os.path.exists(lock_path):
        print("Another monitor instance is already running. Exiting.")
        sys.exit(1)
    with open(lock_path, "w", encoding="utf-8") as lock_file:
        lock_file.write(str(os.getpid()))

    def _cleanup_lock():
        try:
            if os.path.exists(lock_path):
                os.remove(lock_path)
        except Exception:
            pass

    atexit.register(_cleanup_lock)


def release_single_instance_lock():
    global _mutex_handle
    if os.name == "nt" and _mutex_handle:
        ctypes.windll.kernel32.CloseHandle(_mutex_handle)
        _mutex_handle = None


def ping(ip):
    '''Ping device and return status.'''
    ping_args = ["ping", "-n", "1", ip] if os.name == "nt" else ["ping", "-c", "1", ip]
    try:
        kwargs = {
            "capture_output": True,
            "text": True,
            "timeout": 3
        }
        if os.name == "nt":
            kwargs["creationflags"] = subprocess.CREATE_NO_WINDOW
            startupinfo = subprocess.STARTUPINFO()
            startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
            kwargs["startupinfo"] = startupinfo
        result = subprocess.run(ping_args, **kwargs)
        return "ONLINE" if result.returncode == 0 else "OFFLINE"
    except Exception:
        return "OFFLINE"


def calculate_duration(start_time, current_time):
    '''Calculate duration in HH:MM:SS format.'''
    delta = (current_time - start_time).total_seconds()
    h, rem = divmod(int(delta), 3600)
    m, s = divmod(rem, 60)
    return f"{h:02d}:{m:02d}:{s:02d}"


def log_error(msg):
    '''Log errors to file.'''
    with open("error_log.txt", "a", encoding="utf-8") as f:
        f.write(f"[{datetime.now().isoformat()}] {msg}\\n")


def build_event_id(site, category, name, ip, status, log_time):
    '''Create a deterministic event identifier for traceability in sheets.'''
    normalized = f"{site}|{category}|{name}|{ip}|{status}|{log_time}"
    return hashlib.sha1(normalized.encode("utf-8")).hexdigest()


def post_status(site, category, name, ip, status, duration, log_time, event_id, station_id=None):
    '''Send device status to API.'''
    if not (API_URL or "").strip():
        return True

    payload = {
        "site": site,
        "category": category,
        "deviceName": name,
        "ip": ip,
        "status": status,
        "duration": duration,
        "logTime": log_time,
        "eventide": event_id
    }
    if station_id:
        payload["stationId"] = station_id

    try:
        headers = {
            "Content-Type": "application/json",
            "ngrok-skip-browser-warning": "true"
        }
        resp = requests.post(API_URL, json=payload, headers=headers, timeout=5)
        if resp.status_code == 200:
            return True

        error_msg = f"API error {resp.status_code}: {resp.text} | Device: {name}"
        print(error_msg)
        log_error(error_msg)
        return False
    except Exception as e:
        error_msg = f"Failed to post to API: {e} | Device: {name}"
        print(error_msg)
        log_error(error_msg)
        return False


def init_google_sheet(google_cfg):
    '''Initialize Google Sheets client using service account credentials.'''
    creds_path = (google_cfg.get("credentials_path") or "").strip()
    sheet_id = (google_cfg.get("sheet_id") or "").strip()
    worksheet_name = (google_cfg.get("worksheet") or "").strip() or "Sheet1"

    if not creds_path or not sheet_id:
        return None

    try:
        import gspread  # pip install gspread google-auth
        from google.oauth2.service_account import Credentials

        scopes = ["https://www.googleapis.com/auth/spreadsheets"]
        credentials = Credentials.from_service_account_file(creds_path, scopes=scopes)
        client = gspread.authorize(credentials)
        spreadsheet = client.open_by_key(sheet_id)
        worksheet = spreadsheet.worksheet(worksheet_name)

        expected_headers = [
            "site", "category", "deviceName", "ip", "status", "duration", "logTime", "eventide", "stationId"
        ]
        current_headers = worksheet.row_values(1)
        if [h.strip() for h in current_headers[:len(expected_headers)]] != expected_headers:
            worksheet.update("A1:I1", [expected_headers])

        return worksheet
    except Exception as e:
        log_error(f"Google Sheet init failed: {e}")
        return None


def append_to_google_sheet(worksheet, row_values):
    if worksheet is None:
        return False
    try:
        worksheet.append_row(row_values, value_input_option="RAW")
        return True
    except Exception as e:
        log_error(f"Google Sheet append failed: {e}")
        return False


def append_via_apps_script(google_cfg, row_payload):
    '''Send row payload to Apps Script web app endpoint.'''
    app_script_url = (google_cfg.get("app_script_url") or "").strip()
    app_script_api_key = (google_cfg.get("app_script_api_key") or "").strip()
    if not app_script_url:
        return False

    headers = {"Content-Type": "application/json"}
    payload = dict(row_payload)
    if app_script_api_key:
        payload["apiKey"] = app_script_api_key

    try:
        resp = requests.post(app_script_url, json=payload, headers=headers, timeout=10)
        if resp.status_code in (200, 201):
            return True
        log_error(f"Apps Script error {resp.status_code}: {resp.text}")
        return False
    except Exception as e:
        log_error(f"Apps Script append failed: {e}")
        return False


def monitor_continuous_heartbeat(config):
    '''Continuous monitoring - sends heartbeat every 5 minutes for all devices.'''
    site = config["site"]
    devices = config["devices"]
    google_cfg = config.get("google", {})
    integration_mode = (google_cfg.get("mode") or "SERVICE_ACCOUNT").upper()
    worksheet = init_google_sheet(google_cfg) if integration_mode != "APPS_SCRIPT" else None

    device_status_start_time = {}
    cycle_count = 0

    print(f"Starting continuous heartbeat monitoring for {len(devices)} devices")
    print(f"Site: {site}")

    while True:
        cycle_count += 1
        current_time = datetime.now()
        successful_posts = 0

        print(f"\\n--- HEARTBEAT CYCLE #{cycle_count} - {current_time.strftime('%%Y-%%m-%%d %%H:%%M:%%S')} ---")

        for device in devices:
            name = device["name"]
            ip = device["ip"]
            category = device["category"]
            station_id = device.get("stationId")
            device_key = f"{category}_{name}_{ip}"

            current_status = ping(ip)

            if device_key not in device_status_start_time:
                device_status_start_time[device_key] = {
                    "status": current_status,
                    "start_time": current_time
                }
                duration = "00:00:00"
            else:
                previous_data = device_status_start_time[device_key]
                if previous_data["status"] != current_status:
                    device_status_start_time[device_key] = {
                        "status": current_status,
                        "start_time": current_time
                    }
                    duration = "00:00:00"
                else:
                    duration = calculate_duration(previous_data["start_time"], current_time)

            log_time = current_time.strftime("%%Y-%%m-%%d %%H:%%M:%%S")
            event_id = build_event_id(site, category, name, ip, current_status, log_time)

            sheet_payload = {
                "site": site,
                "category": category,
                "deviceName": name,
                "ip": ip,
                "status": current_status,
                "duration": duration,
                "logTime": log_time,
                "eventide": event_id
            }
            if station_id:
                sheet_payload["stationId"] = station_id

            api_ok = post_status(site, category, name, ip, current_status, duration, log_time, event_id, station_id)
            sheet_ok = append_via_apps_script(google_cfg, sheet_payload) if integration_mode == "APPS_SCRIPT" else append_to_google_sheet(
                worksheet,
                [site, category, name, ip, current_status, duration, log_time, event_id, station_id or ""]
            )

            if api_ok:
                successful_posts += 1

            print(
                f"HEARTBEAT: {name} ({ip}) - {current_status} - Duration: {duration} "
                f"| API={'OK' if api_ok else 'FAIL'} | SHEET={'OK' if sheet_ok else 'SKIP/FAIL'}"
            )

        total_devices = len(devices)
        failed_posts = total_devices - successful_posts
        print(f"CYCLE SUMMARY: {successful_posts}/{total_devices} successful, {failed_posts} failed")
        time.sleep(300)


if __name__ == "__main__":
    try:
        minimize_window_on_startup()
        acquire_single_instance_lock()
        monitor_continuous_heartbeat(config)
    except KeyboardInterrupt:
        print("\\nMonitoring stopped by user")
    except Exception as e:
        error_msg = f"Critical error: {e}"
        print(error_msg)
        log_error(error_msg)
    finally:
        release_single_instance_lock()
""";
    

    public String generateScript(SiteConfigDto config) {
        String siteName = config.getSite();
        String mutexName = siteName.replaceAll("[^a-zA-Z0-9]", "_").toUpperCase(Locale.ROOT);
        StringBuilder devicesCode = new StringBuilder();
        
        // Generate device entries
        for (int i = 0; i < config.getDevices().size(); i++) {
            DeviceDto device = config.getDevices().get(i);
            String stationId = device.getStationId();
            String stationIdSegment = (stationId == null || stationId.isBlank())
                ? ""
                : String.format(", \"stationId\": \"%s\"", escapeString(stationId));
            devicesCode.append(String.format(
                "        { \"name\": \"%s\", \"ip\": \"%s\", \"category\": \"%s\"%s }",
                escapeString(device.getName()),
                device.getIp(),
                escapeString(device.getCategory()),
                stationIdSegment
            ));
            
            // Add comma if not the last device
            if (i < config.getDevices().size() - 1) {
                devicesCode.append(",");
            }
            devicesCode.append("\n");  // Use actual newline, not escaped
        }
        
        // Format the complete script
        return String.format(SCRIPT_TEMPLATE, 
            escapeString(mutexName),
            escapeString(siteName), 
            devicesCode.toString()
        );
    }

    public String generateFilename(String siteName) {
        // Sanitize site name for filename
        String sanitized = siteName
            .replaceAll("[^a-zA-Z0-9\\s-_]", "") // Remove special chars
            .replaceAll("\\s+", "_") // Replace spaces with underscores
            .toLowerCase();
        
        return sanitized + ".py";
    }

    public CsvUploadResultDto parseCsv(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("CSV file is required");
        }

        String filename = file.getOriginalFilename();
        if (filename != null && !filename.toLowerCase(Locale.ROOT).endsWith(".csv")) {
            throw new IllegalArgumentException("Only .csv files are supported");
        }

        CsvUploadResultDto result = new CsvUploadResultDto();
        Map<String, List<DeviceDto>> groupedDevices = new LinkedHashMap<>();

        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
            String headerLine = reader.readLine();
            if (headerLine == null || headerLine.trim().isEmpty()) {
                throw new IllegalArgumentException("CSV file is empty");
            }

            Map<String, Integer> headers = mapHeaders(parseCsvLine(stripBom(headerLine)));
            validateRequiredHeaders(headers);

            String line;
            int rowNumber = 1;
            while ((line = reader.readLine()) != null) {
                rowNumber++;
                if (line.trim().isEmpty()) {
                    continue;
                }

                result.setTotalRows(result.getTotalRows() + 1);
                List<String> columns = parseCsvLine(line);
                RowData rowData = readRow(columns, headers);
                String error = validateRow(rowData);

                if (error != null) {
                    result.getErrors().add(new CsvRowErrorDto(rowNumber, error));
                    continue;
                }

                DeviceDto device = new DeviceDto(rowData.deviceName(), rowData.ip(), rowData.category(), rowData.stationId());
                groupedDevices.computeIfAbsent(rowData.site(), key -> new ArrayList<>()).add(device);
                result.setValidRows(result.getValidRows() + 1);
            }
        }

        for (Map.Entry<String, List<DeviceDto>> entry : groupedDevices.entrySet()) {
            result.getSites().add(new SiteConfigDto(entry.getKey(), entry.getValue()));
        }

        return result;
    }

    private Map<String, Integer> mapHeaders(List<String> headers) {
        Map<String, Integer> headerMap = new LinkedHashMap<>();
        for (int i = 0; i < headers.size(); i++) {
            headerMap.put(headers.get(i).trim().toLowerCase(Locale.ROOT), i);
        }
        return headerMap;
    }

    private void validateRequiredHeaders(Map<String, Integer> headers) {
        List<String> missing = new ArrayList<>();
        for (String required : List.of("site", "device_name", "ip", "category")) {
            if (!headers.containsKey(required)) {
                missing.add(required);
            }
        }

        if (!missing.isEmpty()) {
            throw new IllegalArgumentException("Missing required CSV column(s): " + String.join(", ", missing));
        }
    }

    private RowData readRow(List<String> columns, Map<String, Integer> headers) {
        return new RowData(
            valueAt(columns, headers.get("site")),
            valueAt(columns, headers.get("device_name")),
            valueAt(columns, headers.get("ip")),
            valueAt(columns, headers.get("category")),
            valueAt(columns, firstHeaderIndex(headers, "station_id", "stationid"))
        );
    }

    private String validateRow(RowData row) {
        if (row.site().isBlank()) {
            return "Site is required";
        }
        if (row.site().length() < 2 || row.site().length() > 100) {
            return "Site must be between 2 and 100 characters";
        }
        if (row.deviceName().isBlank()) {
            return "Device name is required";
        }
        if (row.ip().isBlank()) {
            return "IP address is required";
        }
        if (!IP_PATTERN.matcher(row.ip()).matches()) {
            return "Invalid IP address format";
        }
        if (row.category().isBlank()) {
            return "Category is required";
        }
        return null;
    }

    private String valueAt(List<String> columns, int index) {
        if (index < 0 || index >= columns.size()) {
            return "";
        }
        return columns.get(index).trim();
    }

    private int firstHeaderIndex(Map<String, Integer> headers, String... names) {
        for (String name : names) {
            Integer index = headers.get(name);
            if (index != null) {
                return index;
            }
        }
        return -1;
    }

    private String stripBom(String value) {
        if (value != null && value.startsWith("\uFEFF")) {
            return value.substring(1);
        }
        return value;
    }

    private List<String> parseCsvLine(String line) {
        List<String> values = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        boolean inQuotes = false;

        for (int i = 0; i < line.length(); i++) {
            char c = line.charAt(i);
            if (c == '"') {
                if (inQuotes && i + 1 < line.length() && line.charAt(i + 1) == '"') {
                    current.append('"');
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (c == ',' && !inQuotes) {
                values.add(current.toString());
                current.setLength(0);
            } else {
                current.append(c);
            }
        }

        values.add(current.toString());
        return values;
    }

    private record RowData(String site, String deviceName, String ip, String category, String stationId) {}

    private String escapeString(String input) {
        if (input == null) {
            return "";
        }
        return input
            .replace("\\", "\\\\")
            .replace("\"", "\\\"")
            .replace("\\n", "\\\\n")
            .replace("\\r", "\\\\r")
            .replace("\\t", "\\\\t");
    }
}
