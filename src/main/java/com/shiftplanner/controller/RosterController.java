package com.shiftplanner.controller;

import com.shiftplanner.dto.RosterRequest;
import com.shiftplanner.dto.RosterResponse;
import com.shiftplanner.service.RosterService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/rosters")
@RequiredArgsConstructor
public class RosterController {

    private final RosterService rosterService;

    @PostMapping
    public ResponseEntity<RosterResponse> createRosterAssignment(@Valid @RequestBody RosterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(rosterService.createRosterAssignment(request));
    }

    @GetMapping("/{id}")
    public ResponseEntity<RosterResponse> getRosterById(@PathVariable Long id) {
        return ResponseEntity.ok(rosterService.getRosterById(id));
    }

    @GetMapping("/date/{date}")
    public ResponseEntity<List<RosterResponse>> getRosterForDate(
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(rosterService.getRosterForDate(date));
    }

    @GetMapping("/week")
    public ResponseEntity<List<RosterResponse>> getWeeklyRoster(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate) {
        return ResponseEntity.ok(rosterService.getWeeklyRoster(startDate));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRosterAssignment(@PathVariable Long id) {
        rosterService.deleteRosterAssignment(id);
        return ResponseEntity.noContent().build();
    }
}