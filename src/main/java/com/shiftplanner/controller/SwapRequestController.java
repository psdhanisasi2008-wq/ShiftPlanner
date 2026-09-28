package com.shiftplanner.controller;

import com.shiftplanner.dto.SwapRequestCreate;
import com.shiftplanner.dto.SwapRequestResponse;
import com.shiftplanner.service.SwapRequestService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/swaps")
@RequiredArgsConstructor
public class SwapRequestController {

    private final SwapRequestService swapRequestService;

    @PostMapping
    public ResponseEntity<SwapRequestResponse> createSwapRequest(@Valid @RequestBody SwapRequestCreate request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(swapRequestService.createSwapRequest(request));
    }

    @GetMapping
    public ResponseEntity<List<SwapRequestResponse>> getAllSwapRequests() {
        return ResponseEntity.ok(swapRequestService.getAllSwapRequests());
    }

    @GetMapping("/{id}")
    public ResponseEntity<SwapRequestResponse> getSwapRequest(@PathVariable Long id) {
        return ResponseEntity.ok(swapRequestService.getSwapRequest(id));
    }

    @PutMapping("/{id}/accept")
    public ResponseEntity<SwapRequestResponse> acceptSwapRequest(@PathVariable Long id) {
        return ResponseEntity.ok(swapRequestService.acceptSwapRequest(id));
    }

    @PutMapping("/{id}/decline")
    public ResponseEntity<SwapRequestResponse> declineSwapRequest(@PathVariable Long id) {
        return ResponseEntity.ok(swapRequestService.declineSwapRequest(id));
    }

    @PutMapping("/{id}/manager/approve")
    public ResponseEntity<SwapRequestResponse> managerApproveSwap(@PathVariable Long id) {
        return ResponseEntity.ok(swapRequestService.managerApproveSwap(id));
    }

    @PutMapping("/{id}/manager/reject")
    public ResponseEntity<SwapRequestResponse> managerRejectSwap(@PathVariable Long id) {
        return ResponseEntity.ok(swapRequestService.managerRejectSwap(id));
    }
}