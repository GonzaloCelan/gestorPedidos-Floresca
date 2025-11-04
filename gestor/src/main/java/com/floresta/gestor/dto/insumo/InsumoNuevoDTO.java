package com.floresta.gestor.dto.insumo;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class InsumoNuevoDTO {

	
	@NotNull
    @FutureOrPresent
    private LocalDate fecha;  
	
	@NotBlank
    private String material;
	
	@NotNull
    @Min(value = 1, message = "La cantidad mínima es 1")
    private Double cantidad;
	
	
    private String proveedor;
    
    @NotNull
    @PositiveOrZero
    private BigDecimal precioUnitario;
    
    @NotNull
    @PositiveOrZero
    private BigDecimal precioTotal;
    
}
