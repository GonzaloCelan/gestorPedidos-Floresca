package com.floresta.gestor.dto;

import java.time.LocalDate;
import java.util.List;

import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PedidoDatosDTO {

	@NotBlank
    private String cliente;

	@NotNull
    @FutureOrPresent
    private LocalDate fechaEntrega;

    private String estado;

    private String tipoVenta;
}
