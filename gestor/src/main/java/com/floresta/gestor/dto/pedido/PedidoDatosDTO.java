package com.floresta.gestor.dto.pedido;

import java.time.LocalDate;




public record PedidoDatosDTO(
		
	    String cliente,
	    LocalDate fechaEntrega,
	    String estado,
	    String tipoVenta
	) {}
