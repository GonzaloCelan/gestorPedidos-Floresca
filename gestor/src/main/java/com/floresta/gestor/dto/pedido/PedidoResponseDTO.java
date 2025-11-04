package com.floresta.gestor.dto.pedido;

import java.math.BigDecimal;
import java.time.LocalDate;



public record PedidoResponseDTO(
		long idPedido,
		String cliente,
		LocalDate fechaEntrega,
		String estado,
		BigDecimal total,
		String tipoVenta
		) {}
