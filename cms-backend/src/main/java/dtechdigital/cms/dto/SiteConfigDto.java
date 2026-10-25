package dtechdigital.cms.dto;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

public class SiteConfigDto {
    
    @NotBlank(message = "Site name is required")
    @Size(min = 2, max = 100, message = "Site name must be between 2 and 100 characters")
    private String site;
    
    @NotEmpty(message = "At least one device is required")
    @Size(max = 1000, message = "Maximum 1000 devices per site")
    @Valid
    private List<DeviceDto> devices;

    @Size(max = 512, message = "Google credentials path is too long")
    private String googleCredentialsPath;

    @Size(max = 256, message = "Google Sheet ID is too long")
    private String googleSheetId;

    @Size(max = 128, message = "Google worksheet name is too long")
    private String googleWorksheetName;

    @Size(max = 32, message = "Google integration mode is too long")
    private String googleIntegrationMode;

    @Size(max = 512, message = "Apps Script URL is too long")
    private String googleAppScriptUrl;

    @Size(max = 256, message = "Apps Script API key is too long")
    private String googleAppScriptApiKey;
    
    public SiteConfigDto() {}
    
    public SiteConfigDto(String site, List<DeviceDto> devices) {
        this.site = site;
        this.devices = devices;
    }
    
    public String getSite() {
        return site;
    }
    
    public void setSite(String site) {
        this.site = site;
    }
    
    public List<DeviceDto> getDevices() {
        return devices;
    }
    
    public void setDevices(List<DeviceDto> devices) {
        this.devices = devices;
    }

    public String getGoogleCredentialsPath() {
        return googleCredentialsPath;
    }

    public void setGoogleCredentialsPath(String googleCredentialsPath) {
        this.googleCredentialsPath = googleCredentialsPath;
    }

    public String getGoogleSheetId() {
        return googleSheetId;
    }

    public void setGoogleSheetId(String googleSheetId) {
        this.googleSheetId = googleSheetId;
    }

    public String getGoogleWorksheetName() {
        return googleWorksheetName;
    }

    public void setGoogleWorksheetName(String googleWorksheetName) {
        this.googleWorksheetName = googleWorksheetName;
    }

    public String getGoogleIntegrationMode() {
        return googleIntegrationMode;
    }

    public void setGoogleIntegrationMode(String googleIntegrationMode) {
        this.googleIntegrationMode = googleIntegrationMode;
    }

    public String getGoogleAppScriptUrl() {
        return googleAppScriptUrl;
    }

    public void setGoogleAppScriptUrl(String googleAppScriptUrl) {
        this.googleAppScriptUrl = googleAppScriptUrl;
    }

    public String getGoogleAppScriptApiKey() {
        return googleAppScriptApiKey;
    }

    public void setGoogleAppScriptApiKey(String googleAppScriptApiKey) {
        this.googleAppScriptApiKey = googleAppScriptApiKey;
    }
    
    @Override
    public String toString() {
        return "SiteConfigDto{" +
                "site='" + site + '\'' +
                ", devices=" + devices +
            ", googleCredentialsPath='" + googleCredentialsPath + '\'' +
            ", googleSheetId='" + googleSheetId + '\'' +
            ", googleWorksheetName='" + googleWorksheetName + '\'' +
            ", googleIntegrationMode='" + googleIntegrationMode + '\'' +
            ", googleAppScriptUrl='" + googleAppScriptUrl + '\'' +
            ", googleAppScriptApiKey='" + googleAppScriptApiKey + '\'' +
                '}';
    }
}
