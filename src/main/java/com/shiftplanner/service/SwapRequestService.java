package com.shiftplanner.service;

import com.shiftplanner.dto.SwapRequestCreate;
import com.shiftplanner.dto.SwapRequestResponse;
import com.shiftplanner.entity.Employee;
import com.shiftplanner.entity.Roster;
import com.shiftplanner.entity.SwapRequest;
import com.shiftplanner.enums.RosterStatus;
import com.shiftplanner.enums.SwapRequestStatus;
import com.shiftplanner.exception.BusinessRuleException;
import com.shiftplanner.exception.DuplicateResourceException;
import com.shiftplanner.exception.InvalidSwapException;
import com.shiftplanner.exception.ResourceNotFoundException;
import com.shiftplanner.repository.EmployeeRepository;
import com.shiftplanner.repository.RosterRepository;
import com.shiftplanner.repository.SwapRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SwapRequestService {

    private static final List<SwapRequestStatus> ACTIVE_STATUSES = List.of(
            SwapRequestStatus.PENDING_COLLEAGUE,
            SwapRequestStatus.COLLEAGUE_ACCEPTED,
            SwapRequestStatus.MANAGER_APPROVED);

    private final SwapRequestRepository swapRequestRepository;
    private final RosterRepository rosterRepository;
    private final EmployeeRepository employeeRepository;

    @Transactional
    public SwapRequestResponse createSwapRequest(SwapRequestCreate request) {
        if (request.requesterId().equals(request.colleagueId())) {
            throw new InvalidSwapException("An employee cannot request a swap with themselves.");
        }

        Roster roster = findRoster(request.rosterId());
        Employee requester = findEmployee(request.requesterId());
        Employee colleague = findEmployee(request.colleagueId());

        if (!requester.isActive()) {
            throw new BusinessRuleException("Requester is inactive and cannot request a swap.");
        }
        if (!colleague.isActive()) {
            throw new BusinessRuleException("Colleague is inactive and cannot be asked for a swap.");
        }
        if (!roster.getEmployee().getId().equals(requester.getId())) {
            throw new BusinessRuleException("Employee is not assigned to the selected roster entry.");
        }
        if (swapRequestRepository.existsByRosterIdAndStatusIn(roster.getId(), ACTIVE_STATUSES)) {
            throw new DuplicateResourceException(
                    "An active swap request already exists for this roster entry.");
        }

        SwapRequest swap = SwapRequest.builder()
                .roster(roster)
                .requester(requester)
                .colleague(colleague)
                .reason(request.reason())
                .status(SwapRequestStatus.PENDING_COLLEAGUE)
                .colleagueApproved(false)
                .managerApproved(false)
                .build();

        return toResponse(swapRequestRepository.save(swap));
    }

    @Transactional
    public SwapRequestResponse acceptSwapRequest(Long id) {
        SwapRequest swap = findSwap(id);

        if (swap.getStatus() != SwapRequestStatus.PENDING_COLLEAGUE) {
            throw new BusinessRuleException(
                    "Only pending swap requests can be accepted. Current status: " + swap.getStatus() + ".");
        }
        if (!swap.getColleague().isActive()) {
            throw new BusinessRuleException("Colleague is inactive and cannot accept a swap request.");
        }

        // The roster is NOT changed here. It changes only after manager approval.
        swap.setColleagueApproved(true);
        swap.setStatus(SwapRequestStatus.COLLEAGUE_ACCEPTED);
        return toResponse(swapRequestRepository.save(swap));
    }

    @Transactional
    public SwapRequestResponse declineSwapRequest(Long id) {
        SwapRequest swap = findSwap(id);

        if (swap.getStatus() != SwapRequestStatus.PENDING_COLLEAGUE) {
            throw new BusinessRuleException(
                    "Only pending swap requests can be declined. Current status: " + swap.getStatus() + ".");
        }

        swap.setColleagueApproved(false);
        swap.setStatus(SwapRequestStatus.COLLEAGUE_DECLINED);
        return toResponse(swapRequestRepository.save(swap));
    }

    /**
     * Applies the swap only when BOTH approvals exist. Everything runs in one
     * transaction, so a failure leaves the roster and the request unchanged.
     */
    @Transactional
    public SwapRequestResponse managerApproveSwap(Long id) {
        SwapRequest swap = findSwap(id);

        if (swap.getStatus() == SwapRequestStatus.PENDING_COLLEAGUE) {
            throw new BusinessRuleException(
                    "Manager approval cannot be given until the colleague accepts the swap request.");
        }
        if (swap.getStatus() != SwapRequestStatus.COLLEAGUE_ACCEPTED || !swap.isColleagueApproved()) {
            throw new BusinessRuleException(
                    "Swap request cannot be approved. Current status: " + swap.getStatus() + ".");
        }

        Roster roster = swap.getRoster();
        Employee requester = swap.getRequester();
        Employee colleague = swap.getColleague();

        // Final validation before touching any data
        if (!roster.getEmployee().getId().equals(requester.getId())) {
            throw new BusinessRuleException(
                    "Swap cannot be applied: the roster entry is no longer assigned to the requester.");
        }
        if (!colleague.isActive()) {
            throw new BusinessRuleException(
                    "Swap cannot be applied: the colleague is inactive.");
        }
        List<Roster> colleagueRosters =
                rosterRepository.findByEmployeeIdAndWorkDate(colleague.getId(), roster.getWorkDate());
        for (Roster other : colleagueRosters) {
            if (!other.getId().equals(roster.getId())
                    && OverlapUtil.overlaps(roster.getShift(), other.getShift())) {
                throw new BusinessRuleException(
                        "Swap cannot be applied: " + colleague.getName()
                                + " is already assigned to an overlapping shift on "
                                + roster.getWorkDate() + ".");
            }
        }

        // Both approvals present and validation passed: apply the swap
        swap.setManagerApproved(true);
        swap.setStatus(SwapRequestStatus.MANAGER_APPROVED);

        roster.setEmployee(colleague);
        roster.setStatus(RosterStatus.SWAPPED);
        rosterRepository.save(roster);

        swap.setStatus(SwapRequestStatus.COMPLETED);
        return toResponse(swapRequestRepository.save(swap));
    }

    @Transactional
    public SwapRequestResponse managerRejectSwap(Long id) {
        SwapRequest swap = findSwap(id);

        if (swap.getStatus() != SwapRequestStatus.COLLEAGUE_ACCEPTED) {
            throw new BusinessRuleException(
                    "Only swap requests accepted by the colleague can be rejected by the manager. Current status: "
                            + swap.getStatus() + ".");
        }

        swap.setManagerApproved(false);
        swap.setStatus(SwapRequestStatus.MANAGER_REJECTED);
        return toResponse(swapRequestRepository.save(swap));
    }

    @Transactional(readOnly = true)
    public SwapRequestResponse getSwapRequest(Long id) {
        return toResponse(findSwap(id));
    }

    @Transactional(readOnly = true)
    public List<SwapRequestResponse> getAllSwapRequests() {
        return swapRequestRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    private SwapRequest findSwap(Long id) {
        return swapRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Swap request not found with id: " + id));
    }

    private Roster findRoster(Long id) {
        return rosterRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Roster entry not found with id: " + id));
    }

    private Employee findEmployee(Long id) {
        return employeeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Employee not found with id: " + id));
    }

    private SwapRequestResponse toResponse(SwapRequest swap) {
        Roster roster = swap.getRoster();
        return new SwapRequestResponse(
                swap.getId(),
                roster.getId(),
                roster.getWorkDate(),
                roster.getShift().getShiftName(),
                roster.getEmployee().getId(),
                swap.getRequester().getId(),
                swap.getRequester().getName(),
                swap.getColleague().getId(),
                swap.getColleague().getName(),
                swap.getReason(),
                swap.getStatus(),
                swap.isColleagueApproved(),
                swap.isManagerApproved(),
                swap.getCreatedAt(),
                swap.getUpdatedAt());
    }
}