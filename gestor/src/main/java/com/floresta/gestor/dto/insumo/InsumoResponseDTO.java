package com.floresta.gestor.dto.insumo;

import java.math.BigDecimal;
import java.time.LocalDate;

import lombok.Builder;
import lombok.Data;


@Data
@Builder
public class InsumoResponseDTO {

	
    private Long idInsumo;
	
	
    private LocalDate fecha;  

    
    private String material;

  
    private Double cantidad;
    
  
    private String proveedor;

    
    private BigDecimal precioUnitario;
   
    private BigDecimal precioTotal;

}
