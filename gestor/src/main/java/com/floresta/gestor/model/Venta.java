package com.floresta.gestor.model;

import java.math.BigDecimal;
import java.time.LocalDate;

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
@Table(name = "ventas") 
@NoArgsConstructor
@AllArgsConstructor
public class Venta {
	
	
	@Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "idVenta")
    private Long idVenta;
	
	 @Column(name = "id_pedido", nullable = false)
	  private Long idPedido;

    @Column(name = "cliente", nullable = false, length = 120)
    private String cliente;

    @Column(name = "fecha_entrega", nullable = false)
    private LocalDate fechaEntrega;
    
    @Column(name = "total", nullable = false)
    private BigDecimal total;
    
    @Column(name = "tipo_venta")
    private String tipoVenta;
    

}
