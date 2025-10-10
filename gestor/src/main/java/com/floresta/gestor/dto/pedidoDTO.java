package com.floresta.gestor.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import jakarta.persistence.Column;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*; // 
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class pedidoDTO {

	
	@NotBlank
    private String cliente;

	@NotNull
    @FutureOrPresent
    private LocalDate fechaEntrega;

    private String estado;

    private String tipoVenta;
    
    @NotEmpty @Valid 
    private List<ProductoDTO> items;
}
