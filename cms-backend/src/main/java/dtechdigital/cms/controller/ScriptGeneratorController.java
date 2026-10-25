package dtechdigital.cms.controller;

import dtechdigital.cms.dto.CsvUploadResultDto;
import dtechdigital.cms.dto.SiteConfigDto;
import dtechdigital.cms.service.PythonScriptGeneratorService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.Map;

@RestController
@RequestMapping("/api/script-generator")
@CrossOrigin(origins = "*") // Configure appropriately for production
public class ScriptGeneratorController {
    
    @Autowired
    private PythonScriptGeneratorService scriptGeneratorService;

    @PostMapping("/generate")
    public ResponseEntity<Resource> generateScript(@Valid @RequestBody SiteConfigDto config) {
        try {
            String scriptContent = scriptGeneratorService.generateScript(config);
            
            String filename = scriptGeneratorService.generateFilename(config.getSite());
            
            byte[] scriptBytes = scriptContent.getBytes(StandardCharsets.UTF_8);
            ByteArrayResource resource = new ByteArrayResource(scriptBytes);
            
            HttpHeaders headers = new HttpHeaders();
            headers.add(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"");
            headers.add(HttpHeaders.CONTENT_TYPE, "application/x-python");
            
            return ResponseEntity.ok()
                    .headers(headers)
                    .contentLength(scriptBytes.length)
                    .contentType(MediaType.APPLICATION_OCTET_STREAM)
                    .body(resource);
                    
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @PostMapping("/preview")
    public ResponseEntity<String> previewScript(@Valid @RequestBody SiteConfigDto config) {
        try {
            String scriptContent = scriptGeneratorService.generateScript(config);
            return ResponseEntity.ok()
                    .contentType(MediaType.TEXT_PLAIN)
                    .body(scriptContent);
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body("Error generating script: " + e.getMessage());
        }
    }

    @PostMapping(value = "/upload-csv", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadCsv(@RequestParam("file") MultipartFile file) {
        try {
            CsvUploadResultDto result = scriptGeneratorService.parseCsv(file);
            return ResponseEntity.ok(result);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Error processing CSV: " + e.getMessage()));
        }
    }

    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("Script Generator Service is running");
    }
}
