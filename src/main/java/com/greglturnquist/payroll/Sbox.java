package com.greglturnquist.payroll;

import java.util.Date;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.Id;
import javax.persistence.ManyToOne;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;

import com.fasterxml.jackson.annotation.JsonFormat;

import lombok.Data;

@Data
@Entity
public class Sbox {

	private @Id @GeneratedValue Long id;
	private String description;
	//private String createdBy;
	private @ManyToOne Manager createdBy;
	private String publishedBy;
	
	@Temporal(TemporalType.DATE)
	@Column(updatable=false)
	private Date createdDate=new Date();
	
	@Temporal(TemporalType.DATE)
	private Date publishedDate;
	private boolean isAnynomous;
	private boolean isPublished;
	
	private Sbox() {}

	public Sbox(String description, Manager createdBy, String publishedBy, Date createdDate,  Date publishedDate, boolean isAnynomous, boolean isPublished) {
		this.publishedBy = publishedBy;
		this.createdBy = createdBy;
		this.description = description;
		this.createdDate = createdDate;
		this.publishedDate = publishedDate;
		this.isAnynomous = isAnynomous;
		this.isPublished = isPublished;
	}
}
