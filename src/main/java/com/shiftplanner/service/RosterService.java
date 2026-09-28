package com.shiftplanner.service;

import com.shiftplanner.dto.RosterRequest;
import com.shiftplanner.dto.RosterResponse;
import com.shiftplanner.entity.Employee;
import com.shiftplanner.entity.Roster;
import com.shiftplanner.entity.Shift;
import com.shiftplanner.enums.RosterStatus;
import com.shiftplanner.enums.SwapRequestStatus;
import com.shiftplanner.exception.BusinessRuleException;
import com.shiftplanner.exception.ResourceNotFoundException;
import com.shiftplanner.repository.EmployeeRepository;
import com.shiftplanner.repository.RosterRepository;
import com.shiftplanner.repository.ShiftRepository;
import com.shiftplanner.repository.SwapRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class RosterService {

    private final RosterRepository rosterRepository;
    private final EmployeeRepository employeeRepository;
    private final ShiftRepository shiftRepository;
    private final SwapRequestRepository swapRequestRepository;

    @Transactional
    public RosterResponse createRosterAssignment(RosterRequest request) {
        Employee employee = employeeRepository.findById(request.employeeId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Employee not found with id: " + request.employeeId()));

        if (!employee.isActive()) {
            throw new BusinessRuleException(
                    "Employee is inactive and cannot be assigned to a shift.");
        }

        Shift shift = shiftRepository.findById(request.shiftId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Shift not found with id: " + request.shiftId()));

        List<Roster> existing = rosterRepository
                .findByEmployeeIdAndWorkDate(employee.getId(), request.workDate());
        for (Roster other : existing) {
            if (OverlapUtil.overlaps(shift, other.getShift())) {
                throw new BusinessRuleException(
                        "Employee is already assigned to an overlapping shift on "
                                + request.workDate() + ".");
            }
        }

        Roster roster = Roster.builder()
                .employee(employee)
                .shift(shift)
                .workDate(request.workDate())
                .status(RosterStatus.ASSIGNED)
                .build();

        return toResponse(rosterRepository.save(roster));
    }

    @Transactional(readOnly = true)
    public RosterResponse getRosterById(Long id) {
        return toResponse(findRoster(id));
    }

    @Transactional(readOnly = true)
    public List<RosterResponse> getRosterForDate(LocalDate date) {
        return rosterRepository.findByWorkDate(date).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<RosterResponse> getWeeklyRoster(LocalDate startDate) {
        LocalDate endDate = startDate.plusDays(6);
        return rosterRepository.findByWorkDateBetween(startDate, endDate).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public void deleteRosterAssignment(Long id) {
        Roster roster = findRoster(id);

        boolean hasOpenSwap = swapRequestRepository.existsByRosterIdAndStatusIn(id,
                List.of(SwapRequestStatus.PENDING_COLLEAGUE,
                        SwapRequestStatus.COLLEAGUE_ACCEPTED,
                        SwapRequestStatus.MANAGER_APPROVED));
        if (hasOpenSwap) {
            throw new BusinessRuleException(
                    "Roster entry has an active swap request and cannot be deleted.");
        }

        rosterRepository.delete(roster);
    }

    private Roster findRoster(Long id) {
        return rosterRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Roster entry not found with id: " + id));
    }

    private RosterResponse toResponse(Roster roster) {
        return new RosterResponse(
                roster.getId(),
                roster.getEmployee().getId(),
                roster.getEmployee().getName(),
                roster.getShift().getId(),
                roster.getShift().getShiftName(),
                roster.getShift().getStartTime(),
                roster.getShift().getEndTime(),
                roster.getWorkDate(),
                roster.getStatus(),
                roster.getCreatedAt());
    }
}