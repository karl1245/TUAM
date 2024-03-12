import { Component, Input, OnInit } from '@angular/core';
import { ValidationService } from './service/validation.service';
import { Validation, ValidationType } from './model/validation';
import { ValidationRow } from './model/validation-row';
import { ValidationCombinationResult } from './model/validation-combination-result';
import { firstValueFrom, Observable } from 'rxjs';
import { ValidationValue, ValidationValue2LabelMapping } from './model/validation-value';
import { ValidationSummary } from './model/validation-summary';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { GlobalConstants } from '../constants/global-constants';
import { FeatureGroupResponse } from '../feature-group/model/feature-group-response';
import { FeatureService } from '../feature/service/feature.service';
import { ValidationAnswer } from './model/validation-answer';
import { FeatureRowSpan } from './model/feature-row-span';
import { FeatureResponse } from '../feature/model/feature';
import { FeatureToDisplay } from './model/feature-to-display';
import { StakeholderResponse } from '../stakeholder/model/stakeholder-response';
import { FeaturePreCondition } from '../feature/model/feature-pre-condition';
import { FeaturePreConditionService } from '../feature/service/feature-pre-condition.service';

@Component({
  selector: 'app-validation',
  templateUrl: './validation.component.html',
  styleUrls: ['./validation.component.css']
})
export class ValidationComponent implements OnInit{

  private TIMEOUT_BEFORE_SENDING_ANSWER_UPDATE = 400;
  questionnaireId: number;
  loading: boolean = true;
  translate: boolean = false;
  validations: Validation[] = [];
  validationSummaries: ValidationSummary[] = [];
  validationRowValues: ValidationRow[] = [];
  validationCombinationResults: ValidationCombinationResult[] = [];
  validationValue2LabelMapping = ValidationValue2LabelMapping;
  validationValues = Object.values(ValidationValue);
  featureRowSpans: FeatureRowSpan[] = [];
  featurePreConditionSpans: FeatureRowSpan[] = [];
  featuresAlreadyDisplayed: FeatureToDisplay[] = [];
  featurePreconditionsAlreadyDisplayed: FeatureToDisplay[] = [];

  selectedStakeholder: StakeholderResponse;

  @Input() columns: string[] = [];
  @Input() featureGroup: FeatureGroupResponse;
  @Input() stakeholders: StakeholderResponse[];

  constructor(
    private validationService: ValidationService,
    private route: ActivatedRoute,
    private router: Router,
    private translateService: TranslateService,
    private featureService: FeatureService,
    private featurePreconditionService: FeaturePreConditionService

  ) {}

  ngOnInit(): void {
    const questionnaireId = this.route.snapshot.queryParamMap.get('questionnaireId');
    if (!questionnaireId  || isNaN(Number(questionnaireId))) {
      this.router.navigate(['questionnaire']);
      return;
    }

    this.questionnaireId = +questionnaireId;
    this.getData();
  }

  getData(): void {
    const finished = new Observable(subscriber => {
      this.getValidations(subscriber)
      this.getValidationSummaries(subscriber)
      this.getValidationCombinationResults(subscriber);
    })
    finished.subscribe(_ => {
      if (
        this.validations.length > 0 &&
        this.validationCombinationResults.length > 0 &&
        this.validationSummaries.length > 0
      ) {
        this.getValidationAnswers();
        this.loading = false;
      }
    })
  }

  getValidations(subscriber: any): void {
    this.validationService
      .getValidations()
      .subscribe((next) => {
        this.validations = next.sort((a,b) => a.weight - b.weight);
        subscriber.next(this.validations);
      });
  }
  getValidationSummaries(subscriber: any): void {
    this.validationService
      .getValidationSummaries()
      .subscribe((next) => {
        this.validationSummaries = next.sort((a,b) => a.weight - b.weight);
        subscriber.next(this.validationSummaries);
      });
  }

  getValidationCombinationResults(subscriber: any): void {
    this.validationService.getValidationCombinationResults().subscribe((next) => {
      this.validationCombinationResults = next
      subscriber.next(this.validationCombinationResults);
    });
  }

  getValidationAnswers(): void {
    this.validationService.getValidationAnswersByFeatureGroupId(this.featureGroup.id).subscribe(
      next => {
        if (next.length === 0) {
          this.addValidationRow();
        } else {
          this.validationRowValues = this.mapValidationAnswersToRows(next)
            .sort((a, b) => a.answers[0].feature.id - b.answers[0].feature.id || a.rowId - b.rowId);
          this.mapFeatureRowSpans();
        }
      }
    );
    this.loading = false;
  }


  mapValidationAnswersToRows(validationAnswers: ValidationAnswer[]) {
    const result: { rowId: number; answers: ValidationAnswer[]; }[] = [];
    for (const validationAnswer of validationAnswers) {
      const existingRow = result.find(va => va.rowId === validationAnswer.rowId);
      if (existingRow) {
        existingRow.answers.push(validationAnswer)
        continue;
      }
      result.push({rowId: validationAnswer.rowId, answers: [validationAnswer]})
    }

    return result;
  }


  async addValidationRow(existingFeature?: FeatureResponse, existingPreCondition?: FeaturePreCondition, stakeholder?: StakeholderResponse) {
    let validationRow: ValidationAnswer[] = [];
    let maxRowId = 0;
    if (this.validationRowValues.length > 0) {
      maxRowId = this.validationRowValues.reduce(function(prev, current) {
        return (prev.rowId > current.rowId) ? prev : current
      }).rowId;
    }
    const feature = existingFeature ?? await firstValueFrom(
      this.featureService.create("")
    );
    const featurePrecondition = existingPreCondition ?? await firstValueFrom(
      this.featurePreconditionService.create("")
    );

    for (const v of this.validations) {
      const answer = await firstValueFrom(
        this.validationService.saveValidationAnswer({
        id: null,
        rowId: maxRowId + 1,
        validationId: v.id,
        answer: this.getPrefilledValidationRowAnswer(v.type, feature, existingPreCondition),
        type: v.type,
        questionnaireId: this.questionnaireId,
        featureGroupId: this.featureGroup.id,
        featurePrecondition: featurePrecondition,
        feature: {answer: feature.answer, id: feature.id},
        stakeholder: stakeholder
        })
      );
      validationRow.push(answer);
    }
    this.validationRowValues.push({answers: validationRow, rowId: maxRowId + 1});
    this.validationRowValues = this.validationRowValues.sort((a, b) => a.answers[0].feature.id - b.answers[0].feature.id || a.rowId - b.rowId);

    this.mapFeatureRowSpans();
  }

  getPrefilledValidationRowAnswer(validationType: ValidationType, featureResponse?: FeatureResponse, featurePreCondition?: FeaturePreCondition, stakeholder?: StakeholderResponse): string {
    if (validationType === ValidationType.FEATURE_PRECONDITION) {
      return featurePreCondition?.answer ? featurePreCondition.answer : '';
    }
    if (validationType === ValidationType.FEATURE) {
      return featureResponse?.answer ? featureResponse.answer : '';
    }
    if (validationType === ValidationType.STAKEHOLDER) {
      return stakeholder?.name ? stakeholder.name : '';
    }
    return '';
  }


  getValidationRowAnswer(validation: Validation, validationRowValue: ValidationRow) {
    return validationRowValue.answers.filter(answer => answer.validationId === validation.id)[0];
  }

  isValidationSelectable(validation: Validation): boolean {
    return validation.type === ValidationType.SELECT;
  }

  isValidationTextField(validation: Validation): boolean {
    return validation.type === ValidationType.TEXT || validation.type === ValidationType.DO;
  }

  isValidationFeature(validation: Validation): boolean {
    return validation.type === ValidationType.FEATURE;
  }

  isValidationAutofill(validation: Validation): boolean {
    return validation.type === ValidationType.FILL;
  }

  isValidationStakeholder(validation: Validation): boolean {
    return validation.type === ValidationType.STAKEHOLDER;
  }

  isValidationFeaturePrecondition(validation: Validation): boolean {
    return validation.type === ValidationType.FEATURE_PRECONDITION;
  }

  async onValidationRowValueChange(eventValue: any, validationRowAnswer: ValidationAnswer, validation: Validation, validationRowValue: ValidationRow) {
      validationRowAnswer.answer = eventValue;
    if (validation.type === ValidationType.FEATURE) {
      await firstValueFrom(
        this.featureService.update(validationRowAnswer.feature.id, eventValue)
      );
    }

    if (validation.type === ValidationType.FEATURE_PRECONDITION) {
      await firstValueFrom(
        this.featurePreconditionService.update(validationRowAnswer.featurePrecondition.id, eventValue)
      );
    }

    this.setRelatedRowSpanAnswers(validation, validationRowAnswer, eventValue, validationRowValue);

    setTimeout(() => {
      this.validationService.saveValidationAnswer(validationRowAnswer).subscribe(
        next => {
          this.updateRelatedValidationAnswers(validation, validationRowValue);
        }
      );
    }, this.TIMEOUT_BEFORE_SENDING_ANSWER_UPDATE)
  }

  private setRelatedRowSpanAnswers(validation: Validation, validationRowAnswer: ValidationAnswer, eventValue: any, validationRowValue: ValidationRow) {
    if (validation.type === ValidationType.DO || ValidationType.FEATURE_PRECONDITION || ValidationType.STAKEHOLDER) {
      for (let validationRow of this.validationRowValues) {
        for (let answer of validationRow.answers) {
          if (answer.featurePrecondition.id === validationRowAnswer.featurePrecondition.id && answer.id !== validationRowAnswer.id) {
            if (validation.type === ValidationType.FEATURE_PRECONDITION && answer.type === ValidationType.FEATURE_PRECONDITION) {
              answer.answer = eventValue
            }
            if (validation.type === ValidationType.DO && answer.type === ValidationType.DO) {
              if (this.translateService.currentLang === GlobalConstants.ET) {
                answer.answer = "Kas"
              } else {
                answer.answer = "Do"
              }
            }

            if (validation.type === ValidationType.STAKEHOLDER && answer.type === ValidationType.STAKEHOLDER) {
              answer.stakeholder = validationRowAnswer.stakeholder
              if (answer.stakeholder) {
                answer.answer = answer.stakeholder.name
              }
            }

            setTimeout(() => {
              this.validationService.saveValidationAnswer(answer).subscribe(
                next => {
                  this.updateRelatedValidationAnswers(validation, validationRow);
                }
              );
            }, this.TIMEOUT_BEFORE_SENDING_ANSWER_UPDATE)
          }
        }
      }
    }
  }

  updateRelatedValidationAnswers(validation: Validation, validationRowValue: ValidationRow): void {
    const validationsFilledByAnswer = this.validations.filter(foundValidation =>
      foundValidation.validationAutofillList.some(autofill =>
        autofill.validationFilledById !== null && autofill.validationFilledById === validation.id
      )
    );

    for (let validationFilledByAnswer of validationsFilledByAnswer) {
      if (validationFilledByAnswer) {
        this.setAutoFillAnswers(validationFilledByAnswer, validationRowValue);
      }
    }
  }

  private setAutoFillAnswers(validationFilledByAnswer: Validation, validationRowValue: ValidationRow) {
    if (!this.allRequiredAnswersFilled(validationFilledByAnswer, validationRowValue)) {
      return;
    }

    const answerValues = []
    let isAutofillTypeCombination = true;
    let isAutoFillFromSelect = true;
    for (let validationFilledBy of validationFilledByAnswer.validationAutofillList) {
      if (validationFilledBy.type !== 'COMBINATION') {
        isAutofillTypeCombination = false;
      }
      const answer = validationRowValue.answers.find(a => a.validationId === validationFilledBy.validationFilledById);
      if (answer != null) {
        if (answer.type !== 'SELECT') {
          isAutoFillFromSelect = false;
        }
        answerValues.push({
          validationId: answer.validationId,
          value: answer.answer,
          weight: validationFilledBy.weight,
          hasMatch: false
        })
      }
    }

    const answerValuesSortedByWeight = answerValues.sort(({ weight: a }, { weight: b }) => a - b);

    if (isAutofillTypeCombination && isAutoFillFromSelect) {
      this.updateCombinationAutoFillAnswers(answerValuesSortedByWeight, validationRowValue, validationFilledByAnswer);

      return;
    }

    const answerToFill = validationRowValue.answers.find(a => a.validationId === validationFilledByAnswer.id);
    if (answerToFill) {
      answerToFill.answer = this.getAnswerToSet(answerValuesSortedByWeight);
      this.validationService.saveValidationAnswer(answerToFill).subscribe(next => {});
    }
  }

   getAnswerToSet(answerValuesSortedByWeight: any[]) {
    if (answerValuesSortedByWeight.length > 0) {
      let combinationAnswer = '';
      for (let answerValueSortedByWeight of answerValuesSortedByWeight) {
        combinationAnswer += ' ' + answerValueSortedByWeight.value;
      }
      return combinationAnswer;
    }

    return answerValuesSortedByWeight[0].value
  }

  allRequiredAnswersFilled(validationFilledByAnswer: Validation, validationRowValue: ValidationRow): boolean {
    for (let validationFilledBy of validationFilledByAnswer.validationAutofillList) {
      const answer = validationRowValue.answers.find(a => a.validationId === validationFilledBy.validationFilledById);
      if (answer == null || answer.answer == '' || answer.answer == null) {
        return false;
      }
    }

    return true;
  }

  updateCombinationAutoFillAnswers(answerValuesSortedByWeight: any[], validationRowValue: ValidationRow, validationFilledByAnswer: Validation) {
    for (let combinationResult of this.validationCombinationResults) {
      if (this.hasMatchingCombination(combinationResult, answerValuesSortedByWeight)) {
        const correctAnswer = validationRowValue.answers.find(a => a.validationId === validationFilledByAnswer.id);
        if (correctAnswer) {
          correctAnswer.answer = this.getTranslation(combinationResult);
          this.validationService.saveValidationAnswer(correctAnswer).subscribe(next => {
            this.updateRelatedValidationAnswers(validationFilledByAnswer, validationRowValue);
          });
        }
        return;
      }
    }
  }

  hasMatchingCombination(combinationResult: ValidationCombinationResult, answerValuesSortedByWeight: any[]) {
    for (let combination of combinationResult.validationCombinations) {
      const foundAnswer = answerValuesSortedByWeight.find(av => av.validationId == combination.validationResponse.id && av.value == combination.validationValue);
      if (foundAnswer) {
        foundAnswer.hasMatch = true;
      }
    }
    let hasMatch = true;
    for (let answerValue of answerValuesSortedByWeight) {
      if (!answerValue.hasMatch) {
        hasMatch = false;
      }
    }
    return hasMatch;
  }

  deleteRow(rowId: number) {
    this.validationService.deleteValidationAnswersByQuestionnaireIdAndRowId(this.questionnaireId, rowId).subscribe(
      next => this.validationRowValues = this.validationRowValues.filter(vrv => vrv.rowId !== rowId)
    );
  }

  getTranslation(value: any): string {
    if (this.isCurrentLangEt) {
      return value.nameEt ? value.nameEt : value.resultEt;
    }

    return value.nameEn ? value.nameEn : value.resultEn;
  }

  get isCurrentLangEt(): boolean {
    return this.translateService.currentLang === GlobalConstants.ET;
  }


  mapFeatureRowSpans():void {
    const featureRowSpans: FeatureRowSpan[] = [];
    const featurePreConditionRowSpans: FeatureRowSpan[] = [];
    for (let validationRow of this.validationRowValues) {
      for (let validationAnswer of validationRow.answers) {
        if (!featureRowSpans.map(a => a.featureId).includes(validationAnswer.feature.id)){
          featureRowSpans.push({featureId: validationAnswer.feature.id, rowIdsSpanningFeature: [validationAnswer.rowId]});
        } else {
          const featureRowSpan = featureRowSpans.find(o => o.featureId === validationAnswer.feature.id);
          if (featureRowSpan != null && !featureRowSpan.rowIdsSpanningFeature.includes(validationAnswer.rowId)) {
            featureRowSpan.rowIdsSpanningFeature.push(validationAnswer.rowId);
          }
        }

        if (!featurePreConditionRowSpans.map(a => a.featureId).includes(validationAnswer.featurePrecondition.id)){
          featurePreConditionRowSpans.push({featureId: validationAnswer.featurePrecondition.id, rowIdsSpanningFeature: [validationAnswer.rowId]});
        } else {
          const featureRowSpan = featurePreConditionRowSpans.find(o => o.featureId === validationAnswer.featurePrecondition.id);
          if (featureRowSpan != null && !featureRowSpan.rowIdsSpanningFeature.includes(validationAnswer.rowId)) {
            featureRowSpan.rowIdsSpanningFeature.push(validationAnswer.rowId);
          }
        }
      }
    }
    this.featurePreConditionSpans = featurePreConditionRowSpans;
    this.featureRowSpans = featureRowSpans;
  }


  getAnswerRowSpanAndMapAsDisplayed(validation: Validation, validationRow: ValidationRow): number {
    if (validation.type === ValidationType.FEATURE) {
      const featureId = validationRow.answers[0].feature.id;
      return this.featureRowSpans.find(a => a.featureId === featureId)?.rowIdsSpanningFeature.length ?? 1;
    }
    if (validation.type === ValidationType.FEATURE_PRECONDITION || validation.type === ValidationType.STAKEHOLDER || validation.type === ValidationType.DO) {
      const featureId = validationRow.answers[0].featurePrecondition.id;
      return this.featurePreConditionSpans.find(a => a.featureId === featureId)?.rowIdsSpanningFeature.length ?? 1;
    }
    return 1;
  }

  isAnswerNotDisplayed(validation: Validation, validationRow: ValidationRow): boolean {
    if (validation.type === ValidationType.FEATURE) {
      const featureId = validationRow.answers[0].feature.id;
      const existingFeatureToDisplay = this.featuresAlreadyDisplayed.find(f => f.featureId === featureId)
      if (!existingFeatureToDisplay) {
        this.featuresAlreadyDisplayed.push({featureId: featureId, rowIdToDisplayOn: validationRow.rowId});
        return true;
      }
      return existingFeatureToDisplay?.rowIdToDisplayOn === validationRow.rowId;
    }
    if (validation.type === ValidationType.FEATURE_PRECONDITION) {
      const featureId = validationRow.answers[0].featurePrecondition.id;
      const existingFeaturePreconditionToDisplay = this.featurePreconditionsAlreadyDisplayed.find(f => f.featureId === featureId)
      if (!existingFeaturePreconditionToDisplay) {
        this.featurePreconditionsAlreadyDisplayed.push({featureId: featureId, rowIdToDisplayOn: validationRow.rowId});
        return true;
      }
      return existingFeaturePreconditionToDisplay?.rowIdToDisplayOn === validationRow.rowId;
    }

    if (validation.type === ValidationType.STAKEHOLDER || validation.type === ValidationType.DO) {
      const featureId = validationRow.answers[0].featurePrecondition.id;
      const existingFeaturePreconditionToDisplay = this.featurePreconditionsAlreadyDisplayed.find(f => f.featureId === featureId)
      if (!existingFeaturePreconditionToDisplay) {
        return true;
      }
      return existingFeaturePreconditionToDisplay?.rowIdToDisplayOn === validationRow.rowId;
    }
    return true;
  }

  getStickyClassByIndex(i: number): string {
    if (i === 0) {
      return 'content-cell-first-child'
    } else if (i === 1) {
      return 'content-cell-second-child'
    } else if (i === 2) {
      return 'content-cell-third-child'
    } else if (i === 3) {
      return 'content-cell-fourth-child'
    }

    return '';
  }

  onStakeholderChange(stakeholder: any, validation: Validation, validationRowValue: ValidationRow) {
    const validationAnswer = this.getValidationRowAnswer(validation, validationRowValue)
    validationAnswer.stakeholder = stakeholder;
    this.onValidationRowValueChange(stakeholder.name, validationAnswer, validation, validationRowValue);
  }
}
