package com.pcs.core.entities;

import javax.persistence.*;
import javax.validation.constraints.NotNull;
import javax.validation.constraints.DecimalMin;
import javax.validation.constraints.Size;
import javax.validation.constraints.Pattern;

import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.Where;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Entity class representing an invoice in the Port Community System.
 * Implements comprehensive financial tracking with security, validation, and audit capabilities.
 */
@Entity
@Table(name = "invoices", indexes = {
    @Index(name = "idx_invoice_company", columnList = "company_id"),
    @Index(name = "idx_invoice_status", columnList = "status"),
    @Index(name = "idx_invoice_number", columnList = "invoice_number", unique = true)
})
@SQLDelete(sql = "UPDATE invoices SET deleted = true WHERE id = ?")
@Where(clause = "deleted = false")
@EntityListeners(AuditingEntityListener.class)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Invoice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Version
    private Long version;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @NotNull
    @DecimalMin(value = "0.0", inclusive = false)
    @Column(nullable = false, precision = 19, scale = 4)
    private BigDecimal amount;

    @NotNull
    @Size(max = 50)
    @Column(name = "invoice_number", nullable = false, unique = true)
    private String invoiceNumber;

    @Size(max = 500)
    @Column(length = 500)
    private String description;

    @NotNull
    @Column(name = "due_date", nullable = false)
    private LocalDateTime dueDate;

    @NotNull
    @Pattern(regexp = "^(PENDING|PAID|OVERDUE|CANCELLED|PARTIALLY_PAID)$")
    @Column(nullable = false, length = 20)
    private String status;

    @NotNull
    @Pattern(regexp = "^[A-Z]{3}$")
    @Column(nullable = false, length = 3)
    private String currency;

    @Size(max = 100)
    @Column(name = "payment_reference", length = 100)
    private String paymentReference;

    @Column(nullable = false)
    private Boolean deleted = false;

    @CreatedBy
    @Column(name = "created_by", nullable = false, updatable = false, length = 50)
    private String createdBy;

    @LastModifiedBy
    @Column(name = "last_modified_by", nullable = false, length = 50)
    private String lastModifiedBy;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    /**
     * JPA lifecycle method to set creation timestamp and initial values
     */
    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
        this.status = this.status == null ? "PENDING" : this.status;
        this.deleted = false;
        
        if (this.invoiceNumber == null) {
            this.invoiceNumber = generateInvoiceNumber();
        }
    }

    /**
     * JPA lifecycle method to update timestamp
     */
    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    /**
     * Generates a unique invoice number using UUID and timestamp
     * @return formatted invoice number
     */
    private String generateInvoiceNumber() {
        return "INV-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase() + 
               "-" + System.currentTimeMillis() % 10000;
    }
}