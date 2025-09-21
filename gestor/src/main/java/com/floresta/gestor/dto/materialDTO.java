package com.floresta.gestor.dto;

import java.math.BigDecimal;


import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class materialDTO {

	
	
    private java.sql.Date fecha;  
    private String material;
    private Double cantidad;
    private String proveedor;
    private BigDecimal precioUnitario;
    private BigDecimal precioTotal;
    
}
