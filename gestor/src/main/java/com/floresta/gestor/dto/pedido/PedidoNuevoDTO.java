package com.floresta.gestor.dto.pedido;


import java.time.LocalDate;
import java.util.List;

import com.floresta.gestor.dto.ProductoDTO;


public record PedidoNuevoDTO(
	    String cliente,
	    LocalDate fechaEntrega,
	    String estado,
	    String tipoVenta,
	    List<ProductoDTO> items
) {}