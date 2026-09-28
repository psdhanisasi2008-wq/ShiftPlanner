package com.shiftplanner.service;

import com.shiftplanner.dto.ShiftRequest;
import com.shiftplanner.dto.ShiftResponse;
import com.shiftplanner.entity.Shift;
import com.shiftplanner.exception.BusinessRuleException;
import com.shiftplanner.exception.ResourceNotFoundException;
import com.shiftplanner.repository.RosterRepository;
import com.shiftplanner.repository.ShiftRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ShiftService {

    private final ShiftRepository shiftRepository;
    private final RosterRepository rosterRepository;

    @Transactional
    public ShiftResponse createShift(ShiftRequest request) {
        validateTimes(request);

        Shift shift = Shift.builder()
                .shiftName(request.shiftName())
                .startTime(request.startTime())
                .endTime(request.endTime())
                .build();

        return toResponse(shiftRepository.save(shift));
    }

    @Transactional(readOnly = true)
    public ShiftResponse getShift(Long id) {
        return toResponse(findShift(id));
    }

    @Transactional(readOnly = true)
    public List<ShiftResponse> getAllShifts() {
        return shiftRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public ShiftResponse updateShift(Long id, ShiftRequest request) {
        Shift shift = findShift(id);
        validateTimes(request);

        shift.setShiftName(request.shiftName());
        shift.setStartTime(request.startTime());
        shift.setEndTime(request.endTime());

        return toResponse(shiftRepository.save(shift));
    }

    @Transactional
    public void deleteShift(Long id) {
        Shift shift = findShift(id);
        if (rosterRepository.existsByShiftId(id)) {
            throw new BusinessRuleException(
                    "Shift is used in roster assignments and cannot be deleted.");
        }
        shiftRepository.delete(shift);
    }

    private void validateTimes(ShiftRequest request) {
        if (request.startTime().equals(request.endTime())) {
            throw new BusinessRuleException("Shift start time and end time cannot be the same.");
        }
    }

    private Shift findShift(Long id) {
        return shiftRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Shift not found with id: " + id));
    }

    private ShiftResponse toResponse(Shift shift) {
        return new ShiftResponse(
                shift.getId(),
                shift.getShiftName(),
                shift.getStartTime(),
                shift.getEndTime());
    }
}