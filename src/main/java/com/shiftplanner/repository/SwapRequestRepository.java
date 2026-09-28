package com.shiftplanner.repository;

import com.shiftplanner.entity.SwapRequest;
import com.shiftplanner.enums.SwapRequestStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface SwapRequestRepository extends JpaRepository<SwapRequest, Long> {

    List<SwapRequest> findByRequesterId(Long employeeId);

    List<SwapRequest> findByColleagueId(Long employeeId);

    List<SwapRequest> findByStatus(SwapRequestStatus status);

    boolean existsByRosterIdAndStatusIn(Long rosterId, Collection<SwapRequestStatus> statuses);
}