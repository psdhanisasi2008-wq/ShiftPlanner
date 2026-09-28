package com.shiftplanner.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record SwapRequestCreate(
        @NotNull(message = "Roster id is required") @Positive(message = "Roster id must be positive") Long rosterId,
        @NotNull(message = "Requester id is required") @Positive(message = "Requester id must be positive") Long requesterId,
        @NotNull(message = "Colleague id is required") @Positive(message = "Colleague id must be positive") Long colleagueId,
        @Size(max = 500, message = "Reason must be at most 500 characters") String reason
) {
}