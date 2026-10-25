package dtechdigital.cms.dto;

import java.util.ArrayList;
import java.util.List;

public class CsvUploadResultDto {
    private List<SiteConfigDto> sites = new ArrayList<>();
    private List<CsvRowErrorDto> errors = new ArrayList<>();
    private int totalRows;
    private int validRows;

    public List<SiteConfigDto> getSites() {
        return sites;
    }

    public void setSites(List<SiteConfigDto> sites) {
        this.sites = sites;
    }

    public List<CsvRowErrorDto> getErrors() {
        return errors;
    }

    public void setErrors(List<CsvRowErrorDto> errors) {
        this.errors = errors;
    }

    public int getTotalRows() {
        return totalRows;
    }

    public void setTotalRows(int totalRows) {
        this.totalRows = totalRows;
    }

    public int getValidRows() {
        return validRows;
    }

    public void setValidRows(int validRows) {
        this.validRows = validRows;
    }
}
