package com.shiftplanner.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI shiftPlannerOpenApi() {
        return new OpenAPI().info(new Info()
                .title("ShiftPlanner API")
                .version("0.0.1")
                .description("Employee shift roster and swap request management. "
                        + "Swap workflow: request, colleague accepts or declines, "
                        + "manager approves or rejects, then the swap is applied to the roster."));
    }
}