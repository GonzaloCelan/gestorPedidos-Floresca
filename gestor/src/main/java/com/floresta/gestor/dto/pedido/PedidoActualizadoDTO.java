package com.floresta.gestor.dto.pedido;

import java.time.LocalDate;
import java.util.List;

import com.floresta.gestor.dto.ProductoDTO;

import jakarta.validation.Valid;
import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import lombok.Data;


@Data
@Builder
public class PedidoActualizadoDTO {

	
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
