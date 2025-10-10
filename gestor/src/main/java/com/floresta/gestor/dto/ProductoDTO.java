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

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductoDTO {

	
	@NotBlank 
	private String producto;     
	  
	@NotNull @Min(1) 
	 private Integer cantidad;
	
	@NotNull @PositiveOrZero 
	private BigDecimal precioUnitario;
	
	@NotNull @PositiveOrZero 
	private BigDecimal subTotal;
}
