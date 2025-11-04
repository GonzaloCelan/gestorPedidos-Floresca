package com.floresta.gestor.dto.pedido;




public record PedidoEstadoDTO (
 Long idPedido,
 String estadoAnterior,
 String estadoNuevo
 ){}
