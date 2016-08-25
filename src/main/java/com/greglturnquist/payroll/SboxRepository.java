package com.greglturnquist.payroll;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.PagingAndSortingRepository;
import org.springframework.data.repository.query.Param;
import org.springframework.data.rest.core.annotation.RestResource;
import org.springframework.security.access.prepost.PostAuthorize;
import org.springframework.security.access.prepost.PostFilter;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PathVariable;

@PreAuthorize("hasAnyRole('ROLE_USER','ROLE_MANAGER')")
public interface SboxRepository extends PagingAndSortingRepository<Sbox, Long> {
	
	@Override
	@PreAuthorize("#sbox?.createdBy == null or #sbox?.createdBy?.name == authentication?.name")
	Sbox save(@Param("sbox") Sbox sbox);
	
	//@PostAuthorize ("#sbox?.createdBy == null or #sbox?.createdBy?.name == authentication?.name")
	List<Sbox> findByCreatedBy(Manager createdBy);
	
	Page<Sbox> findByCreatedBy(Manager createdBy, Pageable pageable);
	
}