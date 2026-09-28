package com.shiftplanner.dto;

import com.shiftplanner.enums.RosterStatus;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

public record RosterResponse(
        Long id,
        Long employeeId,
        String employeeName,
        Long shiftId,
        String shiftName,
        LocalTime startTime,
        LocalTime endTime,
        LocalDate workDate,
        RosterStatus status,
        LocalDateTime createdAt
) {
}