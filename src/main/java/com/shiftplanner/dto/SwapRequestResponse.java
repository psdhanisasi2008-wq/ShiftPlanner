package com.shiftplanner.dto;

import com.shiftplanner.enums.SwapRequestStatus;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record SwapRequestResponse(
        Long id,
        Long rosterId,
        LocalDate workDate,
        String shiftName,
        Long currentRosterEmployeeId,
        Long requesterId,
        String requesterName,
        Long colleagueId,
        String colleagueName,
        String reason,
        SwapRequestStatus status,
        boolean colleagueApproved,
        boolean managerApproved,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}