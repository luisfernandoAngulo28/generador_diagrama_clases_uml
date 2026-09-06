export function renderOpenApiConfig(
  packageName: string,
  projectName: string,
): string {
  return `package ${packageName}.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("${projectName} API")
                        .version("1.0.0")
                        .description("API REST generada automáticamente a partir del Diagrama de Clases UML - Arquitectura de 4 Capas")
                        .contact(new Contact().name("Herramienta CASE Colaborativa"))
                        .license(new License().name("Apache 2.0")));
    }
}
`;
}
