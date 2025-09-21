package com.floresta.gestor.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;


@Configuration
public class securityConfig {

	
	 @Bean
	    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
	        http
	            .csrf().disable() // Desactiva CSRF (para probar con Postman)
	            .authorizeHttpRequests()
	            .anyRequest().permitAll(); // Permite todo sin login
	        return http.build();
	    }
}
