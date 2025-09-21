package com.floresta.gestor.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class entregaDTO {

    
    private String cliente;
    private String producto;
    private Integer cantidad;
    private LocalDate fechaEntrega;
    private String estado;
    private BigDecimal total;
}
