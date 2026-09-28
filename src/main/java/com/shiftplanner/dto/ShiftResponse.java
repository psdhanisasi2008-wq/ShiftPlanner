package com.shiftplanner.dto;

import java.time.LocalTime;

public record ShiftResponse(
        Long id,
        String shiftName,
        LocalTime startTime,
        LocalTime endTime
) {
}