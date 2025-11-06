package com.floresta.gestor.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;


public record ProductoDTO (
		@NotBlank 
		 String producto, 
		  
		@NotNull @Min(1) 
		  Integer cantidad,
		
		@NotNull @PositiveOrZero 
		 BigDecimal precioUnitario,
		
		@NotNull @PositiveOrZero 
		 BigDecimal subTotal
) {}
