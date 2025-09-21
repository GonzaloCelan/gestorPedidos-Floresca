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
@Table(name = "log_ingresos") 
@NoArgsConstructor
@AllArgsConstructor
public class logIngreso {
	
	 	@Id
	    @GeneratedValue(strategy = GenerationType.IDENTITY)
	    @Column(name = "id")
	    private Integer id;

	    @Column(name = "id_pedido")
	    private Integer idPedido;

	    @Column(name = "cliente")
	    private String cliente;

	    @Column(name = "producto")
	    private String producto;

	    @Column(name = "cantidad")
	    private int cantidad;

	    @Column(name = "total")
	    private BigDecimal total;
	    
	    @Column(name = "fecha_entrega")
	    private LocalDate fechaEntrega;
	    
	    @Column(name = "fecha_registro")
	    private LocalDate fechaRegistro;

}
