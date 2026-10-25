package dtechdigital.cms.service;

import dtechdigital.cms.entity.DeviceStatusChange;
import dtechdigital.cms.repository.DeviceStatusChangeRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.apache.pdfbox.pdmodel.*;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;

import java.io.FileWriter;
import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class DeviceHistoryCsvService {

    private static final Logger logger = LoggerFactory.getLogger(DeviceHistoryCsvService.class);

    @Autowired
    private DeviceStatusChangeRepository statusChangeRepository;

    @Value("${csv.output.directory:./csv-exports}")
    private String csvOutputDirectory;

    private static final DateTimeFormatter DAILY_DATE_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter CSV_DATE_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private static final DateTimeFormatter FILE_DATE_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd_HH-mm-ss");

    /**
     * Update daily CSV every 30 minutes - SAME FILE PER DAY
     */
    @Scheduled(fixedRate = 1800000) // 30 minutes (changed from 10 seconds)
    public void generateScheduledCsv() {
        try {
            updateDailyCsv();
            logger.info("✅ Daily CSV updated successfully");
        } catch (Exception e) {
            logger.error("❌ Daily CSV update failed: {}", e.getMessage(), e);
        }
    }

    public String generateCsvReport(String trigger) throws IOException {
        return generateCsvReport(trigger, 7); // Default to 7 days
    }

    /**
     * Update today's CSV file (or create if doesn't exist) - USING STATUS CHANGES
     */
    public String updateDailyCsv() throws IOException {
        LocalDateTime now = LocalDateTime.now();
        String todayDate = now.format(DAILY_DATE_FORMAT);
        String fileName = String.format("device-status-changes_%s.csv", todayDate);

        // Create directory if not exists
        java.io.File directory = new java.io.File(csvOutputDirectory);
        if (!directory.exists()) {
            directory.mkdirs();
            logger.info("📁 Created CSV directory: {}", csvOutputDirectory);
        }

        String filePath = csvOutputDirectory + "/" + fileName;

        // Get today's STATUS CHANGES (from midnight to now)
        LocalDateTime startOfDay = now.toLocalDate().atStartOfDay();
        List<DeviceStatusChange> todaysChanges = statusChangeRepository.findByChangeTimeBetweenOrderByChangeTimeDesc(
                startOfDay, now);

        logger.info("📊 Updating daily CSV with {} status changes for {}", todaysChanges.size(), todayDate);

        // OVERWRITE the file with all today's data
        try (FileWriter writer = new FileWriter(filePath, false)) {
            // Write CSV header for STATUS CHANGES
            writer.append("Site,Device Type,Device Name,IP Address,Old Status,New Status,Duration,Change Type,Change Time\n");

            // Write all today's status changes
            for (DeviceStatusChange change : todaysChanges) {
                writer.append(String.format("%s,%s,%s,%s,%s,%s,%s,%s,%s\n",
                        escapeCsv(change.getSite()),
                        escapeCsv(change.getCategory()),
                        escapeCsv(change.getDeviceName()),
                        escapeCsv(change.getIp()),
                        escapeCsv(change.getOldStatus()),
                        escapeCsv(change.getNewStatus()),
                        escapeCsv(change.getDuration()),
                        escapeCsv(change.getChangeType()),
                        change.getChangeTime().format(CSV_DATE_FORMAT)
                ));
            }
        }

        logger.info("📁 Daily CSV updated: {} ({} status changes)", fileName, todaysChanges.size());
        return filePath;
    }

    /**
     * Manual trigger for today's CSV
     */
    public String generateTodaysCsv() throws IOException {
        return updateDailyCsv();
    }

    /**
     * Generate CSV for specific date - STATUS CHANGES
     */
    public String generateDateCsv(String date) throws IOException {
        LocalDate targetDate = LocalDate.parse(date, DAILY_DATE_FORMAT);
        LocalDateTime startOfDay = targetDate.atStartOfDay();
        LocalDateTime endOfDay = targetDate.atTime(23, 59, 59);

        String fileName = String.format("device-status-changes_%s.csv", date);
        String filePath = csvOutputDirectory + "/" + fileName;

        List<DeviceStatusChange> dateChanges = statusChangeRepository.findByChangeTimeBetweenOrderByChangeTimeDesc(
                startOfDay, endOfDay);

        java.io.File directory = new java.io.File(csvOutputDirectory);
        if (!directory.exists()) {
            directory.mkdirs();
        }

        try (FileWriter writer = new FileWriter(filePath, false)) {
            writer.append("Site,Device Type,Device Name,IP Address,Old Status,New Status,Duration,Change Type,Change Time\n");

            for (DeviceStatusChange change : dateChanges) {
                writer.append(String.format("%s,%s,%s,%s,%s,%s,%s,%s,%s\n",
                        escapeCsv(change.getSite()),
                        escapeCsv(change.getCategory()),
                        escapeCsv(change.getDeviceName()),
                        escapeCsv(change.getIp()),
                        escapeCsv(change.getOldStatus()),
                        escapeCsv(change.getNewStatus()),
                        escapeCsv(change.getDuration()),
                        escapeCsv(change.getChangeType()),
                        change.getChangeTime().format(CSV_DATE_FORMAT)
                ));
            }
        }

        logger.info("📁 Date CSV generated: {} ({} status changes)", fileName, dateChanges.size());
        return filePath;
    }

    /**
     * Generate CSV for all status changes (last N days)
     */
    public String generateCsvReport(String trigger, int days) throws IOException {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime cutoff = now.minusDays(days);
        String timestamp = now.format(FILE_DATE_FORMAT);
        String fileName = String.format("status-changes_%s_%ddays_%s.csv", trigger, days, timestamp);

        // Create directory if not exists
        java.io.File directory = new java.io.File(csvOutputDirectory);
        if (!directory.exists()) {
            directory.mkdirs();
            logger.info("📁 Created CSV directory: {}", csvOutputDirectory);
        }

        String filePath = csvOutputDirectory + "/" + fileName;

        // Get status changes from last N days
        List<DeviceStatusChange> allChanges = statusChangeRepository.findByChangeTimeBetweenOrderByChangeTimeDesc(
                cutoff, now);

        logger.info("📊 Generating CSV with {} status changes from last {} days", allChanges.size(), days);

        try (FileWriter writer = new FileWriter(filePath)) {
            // Write CSV header
            writer.append("Site,Device Type,Device Name,IP Address,Old Status,New Status,Duration,Change Type,Change Time\n");

            // Write data rows
            for (DeviceStatusChange change : allChanges) {
                writer.append(String.format("%s,%s,%s,%s,%s,%s,%s,%s,%s\n",
                        escapeCsv(change.getSite()),
                        escapeCsv(change.getCategory()),
                        escapeCsv(change.getDeviceName()),
                        escapeCsv(change.getIp()),
                        escapeCsv(change.getOldStatus()),
                        escapeCsv(change.getNewStatus()),
                        escapeCsv(change.getDuration()),
                        escapeCsv(change.getChangeType()),
                        change.getChangeTime().format(CSV_DATE_FORMAT)
                ));
            }
        }

        logger.info("📁 CSV generated: {} ({} status changes)", fileName, allChanges.size());
        return filePath;
    }

    /**
     * Generate CSV for specific device - STATUS CHANGES ONLY
     */
    public String generateDeviceCsv(String deviceName, String ip, int days) throws IOException {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(days);
        LocalDateTime now = LocalDateTime.now();

        List<DeviceStatusChange> deviceChanges = statusChangeRepository.findByDeviceNameAndIpAndChangeTimeBetweenOrderByChangeTimeDesc(
                deviceName, ip, cutoff, now);

        String timestamp = LocalDateTime.now().format(FILE_DATE_FORMAT);
        String fileName = String.format("device-changes-%s_%s_%ddays_%s.csv",
                deviceName.replaceAll("[^a-zA-Z0-9]", "-"),
                ip.replaceAll("\\.", "-"),
                days,
                timestamp);

        java.io.File directory = new java.io.File(csvOutputDirectory);
        if (!directory.exists()) {
            directory.mkdirs();
        }

        String filePath = csvOutputDirectory + "/" + fileName;

        try (FileWriter writer = new FileWriter(filePath)) {
            writer.append("Site,Device Type,Device Name,IP Address,Old Status,New Status,Duration,Change Type,Change Time\n");

            for (DeviceStatusChange change : deviceChanges) {
                writer.append(String.format("%s,%s,%s,%s,%s,%s,%s,%s,%s\n",
                        escapeCsv(change.getSite()),
                        escapeCsv(change.getCategory()),
                        escapeCsv(change.getDeviceName()),
                        escapeCsv(change.getIp()),
                        escapeCsv(change.getOldStatus()),
                        escapeCsv(change.getNewStatus()),
                        escapeCsv(change.getDuration()),
                        escapeCsv(change.getChangeType()),
                        change.getChangeTime().format(CSV_DATE_FORMAT)
                ));
            }
        }

        logger.info("📁 Device CSV generated: {} ({} status changes)", fileName, deviceChanges.size());
        return filePath;
    }

    /**
     * Generate CSV for specific site - STATUS CHANGES ONLY
     */
    public String generateSiteCsv(String site, int days) throws IOException {
        // Use the latest changeTime in the DB as the upper bound for the query
        LocalDateTime now = statusChangeRepository.findMaxChangeTimeForSite(site);
        if (now == null) {
            now = LocalDateTime.now(); // fallback if no data
        }
        LocalDateTime cutoff = now.minusDays(days);

        List<DeviceStatusChange> siteChanges = statusChangeRepository
                .findBySiteAndChangeTimeBetweenOrderByChangeTimeDesc(site, cutoff, now);

        String timestamp = LocalDateTime.now().format(FILE_DATE_FORMAT);
        String fileName = String.format("site-changes-%s_%ddays_%s.csv",
                site.replaceAll("[^a-zA-Z0-9]", "-"),
                days,
                timestamp);

        java.io.File directory = new java.io.File(csvOutputDirectory);
        if (!directory.exists()) {
            directory.mkdirs();
        }

        String filePath = csvOutputDirectory + "/" + fileName;

        try (FileWriter writer = new FileWriter(filePath)) {
            writer.append("Site,Device Type,Device Name,IP Address,Old Status,New Status,Duration,Change Type,Change Time\n");

            for (DeviceStatusChange change : siteChanges) {
                writer.append(String.format("%s,%s,%s,%s,%s,%s,%s,%s,%s\n",
                        escapeCsv(change.getSite()),
                        escapeCsv(change.getCategory()),
                        escapeCsv(change.getDeviceName()),
                        escapeCsv(change.getIp()),
                        escapeCsv(change.getOldStatus()),
                        escapeCsv(change.getNewStatus()),
                        escapeCsv(change.getDuration()),
                        escapeCsv(change.getChangeType()),
                        change.getChangeTime().format(CSV_DATE_FORMAT)
                ));
            }
        }

        logger.info("📁 Site CSV generated: {} ({} status changes)", fileName, siteChanges.size());
        return filePath;
    }

    /**
     * 🔥 GENERATE CSV FOR SPECIFIC CHANGE TYPES (NEW!)
     */
    public String generateChangeTypeCsv(String changeType, int days) throws IOException {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(days);
        LocalDateTime now = LocalDateTime.now();

        List<DeviceStatusChange> typeChanges = statusChangeRepository.findByChangeTypeAndChangeTimeBetweenOrderByChangeTimeDesc(
                changeType, cutoff, now);

        String timestamp = LocalDateTime.now().format(FILE_DATE_FORMAT);
        String fileName = String.format("changes-%s_%ddays_%s.csv",
                changeType.replaceAll("[^a-zA-Z0-9]", "-"),
                days,
                timestamp);

        java.io.File directory = new java.io.File(csvOutputDirectory);
        if (!directory.exists()) {
            directory.mkdirs();
        }

        String filePath = csvOutputDirectory + "/" + fileName;

        try (FileWriter writer = new FileWriter(filePath)) {
            writer.append("Site,Device Type,Device Name,IP Address,Old Status,New Status,Duration,Change Type,Change Time\n");

            for (DeviceStatusChange change : typeChanges) {
                writer.append(String.format("%s,%s,%s,%s,%s,%s,%s,%s,%s\n",
                        escapeCsv(change.getSite()),
                        escapeCsv(change.getCategory()),
                        escapeCsv(change.getDeviceName()),
                        escapeCsv(change.getIp()),
                        escapeCsv(change.getOldStatus()),
                        escapeCsv(change.getNewStatus()),
                        escapeCsv(change.getDuration()),
                        escapeCsv(change.getChangeType()),
                        change.getChangeTime().format(CSV_DATE_FORMAT)
                ));
            }
        }

        logger.info("📁 Change Type CSV generated: {} ({} changes)", fileName, typeChanges.size());
        return filePath;
    }

    private String escapeCsv(String value) {
        if (value == null) return "";
        if (value.contains(",") || value.contains("\"") || value.contains("\n")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }
        return value;
    }

    /**
     * Get list of generated CSV files
     */
    public List<String> getGeneratedCsvFiles() {
        java.io.File directory = new java.io.File(csvOutputDirectory);
        if (!directory.exists()) {
            return java.util.Collections.emptyList();
        }

        return java.util.Arrays.stream(directory.listFiles())
                .filter(file -> file.getName().endsWith(".csv"))
                .map(java.io.File::getName)
                .sorted((a, b) -> b.compareTo(a)) // Latest first
                .collect(java.util.stream.Collectors.toList());
    }

    public String getCsvOutputDirectory() {
        return csvOutputDirectory;
    }

    public String generateSitePdf(String site, int days) throws IOException {
        // Get data
        LocalDateTime now = statusChangeRepository.findMaxChangeTimeForSite(site);
        if (now == null) now = LocalDateTime.now();
        LocalDateTime cutoff = now.minusDays(days);

        List<DeviceStatusChange> siteChanges = statusChangeRepository
                .findBySiteAndChangeTimeBetweenOrderByChangeTimeDesc(site, cutoff, now);

        // Create filename
        String timestamp = LocalDateTime.now().format(FILE_DATE_FORMAT);
        String fileName = String.format("site-changes-%s_%ddays_%s.pdf",
                site.replaceAll("[^a-zA-Z0-9]", "-"), days, timestamp);
        String filePath = csvOutputDirectory + "/" + fileName;

        PDDocument doc = new PDDocument();
        try {
            // 🔥 LANDSCAPE ORIENTATION for wider table
            PDPage page = new PDPage(new PDRectangle(PDRectangle.A4.getHeight(), PDRectangle.A4.getWidth()));
            doc.addPage(page);

            PDPageContentStream content = new PDPageContentStream(doc, page); // Remove final

            float margin = 30; // Reduced margin for more space
            float yPosition = 550; // Adjusted for landscape
            float tableTop = yPosition - 50;
            float bottomMargin = 70;

            // Title
            content.setFont(PDType1Font.HELVETICA_BOLD, 16);
            content.beginText();
            content.newLineAtOffset(margin, yPosition);
            content.showText("Device Status Changes Report");
            content.endText();

            content.setFont(PDType1Font.HELVETICA, 12);
            content.beginText();
            content.newLineAtOffset(margin, yPosition - 20);
            content.showText("Site: " + site + " | Period: " + days + " days | Generated: " +
                    LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")));
            content.endText();

            content.beginText();
            content.newLineAtOffset(margin, yPosition - 35);
            content.showText("Total Records: " + siteChanges.size());
            content.endText();

            // 🔥 WIDER COLUMN WIDTHS for landscape orientation
            float[] columnWidths = {80, 90, 120, 100, 80, 80, 70, 90, 130}; // Increased widths
            String[] headers = {"Site", "Device Type", "Device Name", "IP Address",
                    "Old Status", "New Status", "Duration", "Change Type", "Change Time"};

            float currentY = tableTop;
            float currentX = margin;

            // Calculate total width
            float totalWidth = 0;
            for (float width : columnWidths) {
                totalWidth += width;
            }

            // Draw header background
            content.setNonStrokingColor(0.9f, 0.9f, 0.9f);
            content.addRect(margin, currentY - 15, totalWidth, 15);
            content.fill();

            // Header text
            content.setNonStrokingColor(0, 0, 0);
            content.setFont(PDType1Font.HELVETICA_BOLD, 8);
            currentX = margin;
            for (int i = 0; i < headers.length; i++) {
                content.beginText();
                content.newLineAtOffset(currentX + 2, currentY - 12);
                content.showText(headers[i]);
                content.endText();
                currentX += columnWidths[i];
            }

            currentY -= 20;

            // Data rows
            content.setFont(PDType1Font.HELVETICA, 7);
            int rowCount = 0;

            for (DeviceStatusChange change : siteChanges) {
                if (currentY < bottomMargin) {
                    // Add new page if needed
                    content.close(); // Close current content stream
                    // 🔥 LANDSCAPE for new pages too
                    page = new PDPage(new PDRectangle(PDRectangle.A4.getHeight(), PDRectangle.A4.getWidth()));
                    doc.addPage(page);
                    content = new PDPageContentStream(doc, page); // Create new content stream
                    currentY = 550; // Adjusted for landscape
                    content.setFont(PDType1Font.HELVETICA, 7); // Reset font after new page
                }

                // Alternate row colors
                if (rowCount % 2 == 0) {
                    content.setNonStrokingColor(0.95f, 0.95f, 0.95f);
                    content.addRect(margin, currentY - 12, totalWidth, 12);
                    content.fill();
                }

                content.setNonStrokingColor(0, 0, 0);
                currentX = margin;

                String[] rowData = {
                        truncateText(change.getSite(), 8),
                        truncateText(change.getCategory(), 12),
                        truncateText(change.getDeviceName(), 15),
                        change.getIp(),
                        truncateText(change.getOldStatus(), 10),
                        truncateText(change.getNewStatus(), 10),
                        change.getDuration(),
                        truncateText(change.getChangeType(), 12),
                        change.getChangeTime().format(DateTimeFormatter.ofPattern("MM-dd HH:mm:ss"))
                };

                for (int i = 0; i < rowData.length; i++) {
                    content.beginText();
                    content.newLineAtOffset(currentX + 2, currentY - 10);
                    content.showText(rowData[i]);
                    content.endText();
                    currentX += columnWidths[i];
                }

                currentY -= 15;
                rowCount++;
            }

            content.close(); // Close the final content stream
            doc.save(filePath);

        } finally {
            doc.close(); // Always close the document
        }

        logger.info("📄 Site PDF generated: {} ({} status changes)", fileName, siteChanges.size());
        return filePath;
    }

    private String truncateText(String text, int maxLength) {
        if (text == null) return "";
        return text.length() > maxLength ? text.substring(0, maxLength - 3) + "..." : text;
    }
    // ==================== PDF GENERATION METHODS ====================

    /**
     * Generate PDF report for all devices
     */
    public String generatePdfReport(String trigger, int days) throws IOException {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime cutoff = now.minusDays(days);

        List<DeviceStatusChange> allChanges = statusChangeRepository
                .findByChangeTimeBetweenOrderByChangeTimeDesc(cutoff, now);

        String timestamp = LocalDateTime.now().format(FILE_DATE_FORMAT);
        String fileName = String.format("device-changes-all_%ddays_%s.pdf", days, timestamp);
        String filePath = csvOutputDirectory + "/" + fileName;

        generatePdfDocument(allChanges, filePath, "All Devices", days);

        logger.info("📄 All devices PDF generated: {} ({} status changes)", fileName, allChanges.size());
        return filePath;
    }

    /**
     * Generate PDF for specific device
     */
    public String generateDevicePdf(String deviceName, String ip, int days) throws IOException {
        LocalDateTime now = statusChangeRepository.findMaxChangeTimeForDevice(deviceName, ip);
        if (now == null) now = LocalDateTime.now();
        LocalDateTime cutoff = now.minusDays(days);

        List<DeviceStatusChange> deviceChanges = statusChangeRepository
                .findByDeviceNameAndIpAndChangeTimeBetweenOrderByChangeTimeDesc(deviceName, ip, cutoff, now);

        String timestamp = LocalDateTime.now().format(FILE_DATE_FORMAT);
        String fileName = String.format("device-changes-%s-%s_%ddays_%s.pdf",
                deviceName.replaceAll("[^a-zA-Z0-9]", "-"),
                ip.replace(".", "-"), days, timestamp);
        String filePath = csvOutputDirectory + "/" + fileName;

        generatePdfDocument(deviceChanges, filePath, deviceName + " (" + ip + ")", days);

        logger.info("📄 Device PDF generated: {} ({} status changes)", fileName, deviceChanges.size());
        return filePath;
    }

    /**
     * Generate today's PDF
     */
    public String updateDailyPdf() throws IOException {
        LocalDateTime startOfDay = LocalDateTime.now().toLocalDate().atStartOfDay();
        LocalDateTime endOfDay = startOfDay.plusDays(1).minusSeconds(1);

        List<DeviceStatusChange> todaysChanges = statusChangeRepository
                .findByChangeTimeBetweenOrderByChangeTimeDesc(startOfDay, endOfDay);

        String dateStr = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
        String fileName = String.format("device-changes-daily_%s.pdf", dateStr);
        String filePath = csvOutputDirectory + "/" + fileName;

        generatePdfDocument(todaysChanges, filePath, "Today's Report", 1);

        logger.info("📄 Daily PDF updated: {} ({} status changes)", fileName, todaysChanges.size());
        return filePath;
    }

    /**
     * Generate PDF for specific date
     */
    public String generateDatePdf(String date) throws IOException {
        LocalDate targetDate = LocalDate.parse(date);
        LocalDateTime startOfDay = targetDate.atStartOfDay();
        LocalDateTime endOfDay = startOfDay.plusDays(1).minusSeconds(1);

        List<DeviceStatusChange> dateChanges = statusChangeRepository
                .findByChangeTimeBetweenOrderByChangeTimeDesc(startOfDay, endOfDay);

        String fileName = String.format("device-changes-date_%s.pdf", date);
        String filePath = csvOutputDirectory + "/" + fileName;

        generatePdfDocument(dateChanges, filePath, "Report for " + date, 1);

        logger.info("📄 Date PDF generated: {} ({} status changes)", fileName, dateChanges.size());
        return filePath;
    }

    /**
     * Helper method to generate PDF document
     */
    private void generatePdfDocument(List<DeviceStatusChange> changes, String filePath, String title, int days) throws IOException {
        PDDocument doc = new PDDocument();
        try {
            // 🔥 LANDSCAPE ORIENTATION for wider table
            PDPage page = new PDPage(new PDRectangle(PDRectangle.A4.getHeight(), PDRectangle.A4.getWidth()));
            doc.addPage(page);

            PDPageContentStream content = new PDPageContentStream(doc, page);

            float margin = 30; // Reduced margin for more space
            float yPosition = 550; // Adjusted for landscape
            float tableTop = yPosition - 50;
            float bottomMargin = 70;

            // Title
            content.setFont(PDType1Font.HELVETICA_BOLD, 16);
            content.beginText();
            content.newLineAtOffset(margin, yPosition);
            content.showText("Device Status Changes Report - " + title);
            content.endText();

            content.setFont(PDType1Font.HELVETICA, 12);
            content.beginText();
            content.newLineAtOffset(margin, yPosition - 20);
            content.showText("Period: " + days + " days | Generated: " +
                    LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")));
            content.endText();

            content.beginText();
            content.newLineAtOffset(margin, yPosition - 35);
            content.showText("Total Records: " + changes.size());
            content.endText();

            // 🔥 WIDER COLUMN WIDTHS for landscape orientation
            float[] columnWidths = {80, 90, 120, 100, 80, 80, 70, 90, 130}; // Increased widths
            String[] headers = {"Site", "Device Type", "Device Name", "IP Address",
                    "Old Status", "New Status", "Duration", "Change Type", "Change Time"};

            float currentY = tableTop;
            float currentX = margin;

            // Calculate total width
            float totalWidth = 0;
            for (float width : columnWidths) {
                totalWidth += width;
            }

            // Draw header background
            content.setNonStrokingColor(0.9f, 0.9f, 0.9f);
            content.addRect(margin, currentY - 15, totalWidth, 15);
            content.fill();

            // Header text
            content.setNonStrokingColor(0, 0, 0);
            content.setFont(PDType1Font.HELVETICA_BOLD, 8);
            currentX = margin;
            for (int i = 0; i < headers.length; i++) {
                content.beginText();
                content.newLineAtOffset(currentX + 2, currentY - 12);
                content.showText(headers[i]);
                content.endText();
                currentX += columnWidths[i];
            }

            currentY -= 20;

            // Data rows
            content.setFont(PDType1Font.HELVETICA, 7);
            int rowCount = 0;

            for (DeviceStatusChange change : changes) {
                if (currentY < bottomMargin) {
                    content.close();
                    // 🔥 LANDSCAPE for new pages too
                    page = new PDPage(new PDRectangle(PDRectangle.A4.getHeight(), PDRectangle.A4.getWidth()));
                    doc.addPage(page);
                    content = new PDPageContentStream(doc, page);
                    currentY = 550; // Adjusted for landscape
                    content.setFont(PDType1Font.HELVETICA, 7);
                }

                // Alternate row colors
                if (rowCount % 2 == 0) {
                    content.setNonStrokingColor(0.95f, 0.95f, 0.95f);
                    content.addRect(margin, currentY - 12, totalWidth, 12);
                    content.fill();
                }

                content.setNonStrokingColor(0, 0, 0);
                currentX = margin;

                String[] rowData = {
                        truncateText(change.getSite(), 8),
                        truncateText(change.getCategory(), 12),
                        truncateText(change.getDeviceName(), 15),
                        change.getIp(),
                        truncateText(change.getOldStatus(), 10),
                        truncateText(change.getNewStatus(), 10),
                        change.getDuration(),
                        truncateText(change.getChangeType(), 12),
                        change.getChangeTime().format(DateTimeFormatter.ofPattern("MM-dd HH:mm:ss"))
                };

                for (int i = 0; i < rowData.length; i++) {
                    content.beginText();
                    content.newLineAtOffset(currentX + 2, currentY - 10);
                    content.showText(rowData[i]);
                    content.endText();
                    currentX += columnWidths[i];
                }

                currentY -= 15;
                rowCount++;
            }

            content.close();
            doc.save(filePath);

        } finally {
            doc.close();
        }
    }

    // ==================== DOCX GENERATION METHODS (COMMENTED OUT) ====================

    /**
     * Generate DOCX report for all devices - COMMENTED OUT
     */
    /*
    public String generateDocxReport(String trigger, int days) throws IOException {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime cutoff = now.minusDays(days);

        List<DeviceStatusChange> allChanges = statusChangeRepository
                .findByChangeTimeBetweenOrderByChangeTimeDesc(cutoff, now);

        String timestamp = LocalDateTime.now().format(FILE_DATE_FORMAT);
        String fileName = String.format("device-changes-all_%ddays_%s.docx", days, timestamp);
        String filePath = csvOutputDirectory + "/" + fileName;

        generateDocxDocument(allChanges, filePath, "All Devices", days);

        logger.info("📝 All devices DOCX generated: {} ({} status changes)", fileName, allChanges.size());
        return filePath;
    }
    */

    /**
     * Generate DOCX for specific device - COMMENTED OUT
     */
    /*
    public String generateDeviceDocx(String deviceName, String ip, int days) throws IOException {
        LocalDateTime now = statusChangeRepository.findMaxChangeTimeForDevice(deviceName, ip);
        if (now == null) now = LocalDateTime.now();
        LocalDateTime cutoff = now.minusDays(days);

        List<DeviceStatusChange> deviceChanges = statusChangeRepository
                .findByDeviceNameAndIpAndChangeTimeBetweenOrderByChangeTimeDesc(deviceName, ip, cutoff, now);

        String timestamp = LocalDateTime.now().format(FILE_DATE_FORMAT);
        String fileName = String.format("device-changes-%s-%s_%ddays_%s.docx",
                deviceName.replaceAll("[^a-zA-Z0-9]", "-"),
                ip.replace(".", "-"), days, timestamp);
        String filePath = csvOutputDirectory + "/" + fileName;

        generateDocxDocument(deviceChanges, filePath, deviceName + " (" + ip + ")", days);

        logger.info("📝 Device DOCX generated: {} ({} status changes)", fileName, deviceChanges.size());
        return filePath;
    }
    */

    /**
     * Generate today's DOCX - COMMENTED OUT
     */
    /*
    public String updateDailyDocx() throws IOException {
        LocalDateTime startOfDay = LocalDateTime.now().toLocalDate().atStartOfDay();
        LocalDateTime endOfDay = startOfDay.plusDays(1).minusSeconds(1);

        List<DeviceStatusChange> todaysChanges = statusChangeRepository
                .findByChangeTimeBetweenOrderByChangeTimeDesc(startOfDay, endOfDay);

        String dateStr = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
        String fileName = String.format("device-changes-daily_%s.docx", dateStr);
        String filePath = csvOutputDirectory + "/" + fileName;

        generateDocxDocument(todaysChanges, filePath, "Today's Report", 1);

        logger.info("📝 Daily DOCX updated: {} ({} status changes)", fileName, todaysChanges.size());
        return filePath;
    }
    */

    /**
     * Generate DOCX for specific date - COMMENTED OUT
     */
    /*
    public String generateDateDocx(String date) throws IOException {
        LocalDate targetDate = LocalDate.parse(date);
        LocalDateTime startOfDay = targetDate.atStartOfDay();
        LocalDateTime endOfDay = startOfDay.plusDays(1).minusSeconds(1);

        List<DeviceStatusChange> dateChanges = statusChangeRepository
                .findByChangeTimeBetweenOrderByChangeTimeDesc(startOfDay, endOfDay);

        String fileName = String.format("device-changes-date_%s.docx", date);
        String filePath = csvOutputDirectory + "/" + fileName;

        generateDocxDocument(dateChanges, filePath, "Report for " + date, 1);

        logger.info("📝 Date DOCX generated: {} ({} status changes)", fileName, dateChanges.size());
        return filePath;
    }
    */

    /**
     * Helper method to generate DOCX document - COMMENTED OUT
     */
    /*
    private void generateDocxDocument(List<DeviceStatusChange> changes, String filePath, String title, int days) throws IOException {
        try (XWPFDocument doc = new XWPFDocument()) {
            
            // 🔧 Set landscape orientation IMMEDIATELY after document creation
            CTSectPr sectPr = doc.getDocument().getBody().addNewSectPr();
            CTPageSz pageSize = sectPr.addNewPgSz();
            
            // 🎯 LANDSCAPE: Swap width and height from portrait A4
            pageSize.setW(BigInteger.valueOf(16838)); // 11.69 inches in twentieths of a point
            pageSize.setH(BigInteger.valueOf(11906)); // 8.27 inches in twentieths of a point  
            pageSize.setOrient(STPageOrientation.LANDSCAPE);
            
            // Set narrow margins for more space
            CTPageMar pageMar = sectPr.addNewPgMar();
            pageMar.setLeft(BigInteger.valueOf(720));  // 0.5 inch
            pageMar.setRight(BigInteger.valueOf(720)); // 0.5 inch
            pageMar.setTop(BigInteger.valueOf(720));   // 0.5 inch
            pageMar.setBottom(BigInteger.valueOf(720)); // 0.5 inch
            
            // ... rest of method commented out for brevity
            
            // Save document
            try (FileOutputStream out = new FileOutputStream(filePath)) {
                doc.write(out);
            }
        }
    }
    */

    /**
     * Get list of generated PDF files
     */
    public List<String> getGeneratedPdfFiles() {
        java.io.File directory = new java.io.File(csvOutputDirectory);
        if (!directory.exists()) {
            return java.util.Collections.emptyList();
        }

        return java.util.Arrays.stream(directory.listFiles())
                .filter(file -> file.getName().endsWith(".pdf"))
                .map(java.io.File::getName)
                .sorted((a, b) -> b.compareTo(a))
                .collect(java.util.stream.Collectors.toList());
    }

    /**
     * Get list of generated DOCX files - COMMENTED OUT
     */
    /*
    public List<String> getGeneratedDocxFiles() {
        java.io.File directory = new java.io.File(csvOutputDirectory);
        if (!directory.exists()) {
            return java.util.Collections.emptyList();
        }

        return java.util.Arrays.stream(directory.listFiles())
                .filter(file -> file.getName().endsWith(".docx"))
                .map(java.io.File::getName)
                .sorted((a, b) -> b.compareTo(a))
                .collect(java.util.stream.Collectors.toList());
    }
    */
    /**
     * Generate DOCX for specific site - COMMENTED OUT
     */
    /*
    public String generateSiteDocx(String site, int days) throws IOException {
        // Get data
        LocalDateTime now = statusChangeRepository.findMaxChangeTimeForSite(site);
        if (now == null) now = LocalDateTime.now();
        LocalDateTime cutoff = now.minusDays(days);

        List<DeviceStatusChange> siteChanges = statusChangeRepository
                .findBySiteAndChangeTimeBetweenOrderByChangeTimeDesc(site, cutoff, now);

        // Create filename
        String timestamp = LocalDateTime.now().format(FILE_DATE_FORMAT);
        String fileName = String.format("site-changes-%s_%ddays_%s.docx",
                site.replaceAll("[^a-zA-Z0-9]", "-"), days, timestamp);
        String filePath = csvOutputDirectory + "/" + fileName;

        try (XWPFDocument doc = new XWPFDocument()) {
            // ... rest of method implementation
        }

        logger.info("📝 Site DOCX generated: {} ({} status changes)", fileName, siteChanges.size());
        return filePath;
    }
    */
}