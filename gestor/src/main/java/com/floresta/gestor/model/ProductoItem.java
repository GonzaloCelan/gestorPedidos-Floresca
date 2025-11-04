package com.floresta.gestor.model;

import java.math.BigDecimal;


import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;


@Entity
@Data
@Builder
@Table(name = "producto_item") 
@NoArgsConstructor
@AllArgsConstructor
public class ProductoItem {

	
	@Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "idProducto")
    private Long idProducto;
	
	 @Column(name = "id_pedido")
	 private Long idPedido;
	 
	 @Column(name = "producto_nombre")
	 private String productoNombre;
	 
	 @Column(name = "cantidad")
	 private Integer cantidad;
	 
	 @Column(name = "precio_unit")
	 private BigDecimal precioUnit;
	 
	 @Column(name = "subtotal")
	 private BigDecimal subtotal;
}
