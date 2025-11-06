package com.floresta.gestor.dto.venta;

import java.math.BigDecimal;
import java.time.LocalDate;



public record VentaResponseDTO(
		
	    Long idVenta,
		
		Long idPedido,

		String cliente,

		LocalDate fechaEntrega,
	    
	    BigDecimal total,
	    
	    String tipoVenta
	    ) 
{}
