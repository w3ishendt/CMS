package dtechdigital.cms.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    // Queue Names
    public static final String DEVICE_STATUS_QUEUE = "device.status.queue";
    public static final String DEVICE_STATUS_DLQ = "device.status.dlq";
    public static final String POWER_TRIP_QUEUE = "power.trip.queue";

    // Exchange Names
    public static final String DEVICE_EXCHANGE = "device.exchange";

    // Routing Keys
    public static final String DEVICE_STATUS_ROUTING_KEY = "device.status";
    public static final String POWER_TRIP_ROUTING_KEY = "power.trip";

    // Exchange
    @Bean
    public TopicExchange deviceExchange() {
        return ExchangeBuilder
                .topicExchange(DEVICE_EXCHANGE)
                .durable(true)
                .build();
    }

    // Queues
    @Bean
    public Queue deviceStatusQueue() {
        return QueueBuilder
                .durable(DEVICE_STATUS_QUEUE)
                .withArgument("x-dead-letter-exchange", "")
                .withArgument("x-dead-letter-routing-key", DEVICE_STATUS_DLQ)
                .withArgument("x-message-ttl", 300000) // 5 minutes
                .build();
    }

    @Bean
    public Queue deviceStatusDLQ() {
        return QueueBuilder
                .durable(DEVICE_STATUS_DLQ)
                .build();
    }

    @Bean
    public Queue powerTripQueue() {
        return QueueBuilder
                .durable(POWER_TRIP_QUEUE)
                .build();
    }

    // Bindings
    @Bean
    public Binding deviceStatusBinding() {
        return BindingBuilder
                .bind(deviceStatusQueue())
                .to(deviceExchange())
                .with(DEVICE_STATUS_ROUTING_KEY);
    }

    @Bean
    public Binding powerTripBinding() {
        return BindingBuilder
                .bind(powerTripQueue())
                .to(deviceExchange())
                .with(POWER_TRIP_ROUTING_KEY);
    }

    // Message Converter
    @Bean
    public Jackson2JsonMessageConverter messageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    // RabbitTemplate
    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(messageConverter());
        return template;
    }
}