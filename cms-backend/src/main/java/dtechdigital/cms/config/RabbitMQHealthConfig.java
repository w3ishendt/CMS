package dtechdigital.cms.config;

import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class RabbitMQHealthConfig implements CommandLineRunner {

    @Autowired
    private ConnectionFactory connectionFactory;

    @Override
    public void run(String... args) throws Exception {
        try {
            // Test connection
            connectionFactory.createConnection().close();
            System.out.println("✅ RabbitMQ connection successful!");
        } catch (Exception e) {
            System.err.println("❌ RabbitMQ connection failed: " + e.getMessage());
            System.err.println("🔧 Check if RabbitMQ is running on localhost:5672");
        }
    }}