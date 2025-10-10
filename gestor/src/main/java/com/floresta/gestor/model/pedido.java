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
@Table(name = "pedidos") 
@NoArgsConstructor
@AllArgsConstructor
public class pedido {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "idPedido")
    private Integer idPedido;

    @Column(name = "cliente", nullable = false, length = 100)
    private String cliente;

    @Column(name = "fecha_entrega", nullable = false)
    private LocalDate fechaEntrega;

    @Column(name = "estado", nullable = false, length = 20)
    private String estado;
    
    @Column(name = "total", nullable = false)
    private BigDecimal total;
    
    @Column(name = "tipo_venta")
    private String tipoVenta;
}