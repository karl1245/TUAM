package ee.ut.euim.domain.featureprecondition.api;

import ee.ut.euim.domain.feature.api.FeatureResponse;
import ee.ut.euim.domain.featureprecondition.service.FeaturePreconditionService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import static ee.ut.euim.domain.featureprecondition.api.FeaturePreconditionMapper.toResponse;

@Slf4j
@Validated
@RestController
@RequiredArgsConstructor
@CrossOrigin(origins =  {"${app.dev.frontend.local}"})
@RequestMapping(value = "/api/feature-precondition", produces = MediaType.APPLICATION_JSON_VALUE)
public class FeaturePreconditionController {

  private final FeaturePreconditionService featurePreconditionService;

  @PostMapping
  public FeaturePreconditionResponse create(@RequestBody @Valid FeaturePreconditionRequest featurePreconditionRequest) {
    log.info("Creating feature precondition : {}", featurePreconditionRequest);

    return toResponse(featurePreconditionService.create(featurePreconditionRequest.getAnswer()));
  }

  @PutMapping("/{id}")
  public FeaturePreconditionResponse update(
    @RequestBody @Valid FeaturePreconditionRequest featurePreconditionRequest,
    @PathVariable(value = "id") @NotNull Integer id
  ) {
    log.info("Updating feature precondition with id: {}, with values: {}",id, featurePreconditionRequest);

    return toResponse(featurePreconditionService.update(id, featurePreconditionRequest.getAnswer()));
  }
}
