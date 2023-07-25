package ee.ut.tuam.domain.validationcombinationresult.service;

import ee.ut.tuam.domain.validationcombinationresult.persistence.ValidationCombinationResult;
import ee.ut.tuam.domain.validationcombinationresult.persistence.ValidationCombinationResultRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class ValidationCombinationResultService {

  private final ValidationCombinationResultRepository validationCombinationResultRepository;

  public List<ValidationCombinationResult> get() {
    return validationCombinationResultRepository.findAll();
  }
}
