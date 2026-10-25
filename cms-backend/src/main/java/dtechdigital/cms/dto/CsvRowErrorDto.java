package dtechdigital.cms.dto;

public class CsvRowErrorDto {
    private int row;
    private String message;

    public CsvRowErrorDto() {}

    public CsvRowErrorDto(int row, String message) {
        this.row = row;
        this.message = message;
    }

    public int getRow() {
        return row;
    }

    public void setRow(int row) {
        this.row = row;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}
