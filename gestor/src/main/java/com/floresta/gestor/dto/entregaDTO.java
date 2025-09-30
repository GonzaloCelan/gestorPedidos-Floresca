package com.floresta.gestor.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.validation.constraints.*; // 
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class entregaDTO {

	
	@NotBlank(message = "El cliente es obligatorio")
    private String cliente;

    @NotBlank(message = "El producto es obligatorio")
    private String producto;

    @NotNull(message = "La cantidad es obligatoria")
    @Min(value = 1, message = "La cantidad mínima es 1")
    private Integer cantidad;

    @NotNull(message = "La fecha de entrega es obligatoria")
    @FutureOrPresent(message = "La fecha no puede ser anterior a hoy")
    private LocalDate fechaEntrega;

    private String estado;

    @NotNull(message = "El total es obligatorio")
    @PositiveOrZero(message = "El total no puede ser negativo")
    private BigDecimal total;
}
