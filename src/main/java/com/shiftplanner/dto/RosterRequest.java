package com.shiftplanner.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.time.LocalDate;

public record RosterRequest(
        @NotNull(message = "Employee id is required") @Positive(message = "Employee id must be positive") Long employeeId,
        @NotNull(message = "Shift id is required") @Positive(message = "Shift id must be positive") Long shiftId,
        @NotNull(message = "Work date is required") LocalDate workDate
) {
}