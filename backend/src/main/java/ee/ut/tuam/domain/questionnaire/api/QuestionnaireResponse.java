package ee.ut.tuam.domain.questionnaire.api;

import ee.ut.tuam.domain.validationanswer.api.ValidationAnswerResponse;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.util.List;

@Getter
@Setter
@ToString
@NoArgsConstructor
@AllArgsConstructor
public class QuestionnaireResponse {

  private Integer id;
  private String name;
  private List<ValidationAnswerResponse> validationAnswers;
}
