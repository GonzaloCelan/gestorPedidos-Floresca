package com.floresta.gestor.dto.pedido;

import java.time.LocalDate;
import java.util.List;

import com.floresta.gestor.dto.ProductoDTO;

public record PedidoDetalleDTO (
		
		String cliente,
	    LocalDate fechaEntrega,
	    String tipoVenta,
	    List<ProductoDTO> items
	   ) 
{}
