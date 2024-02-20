import { Component, OnInit } from '@angular/core';
import { QuestionnaireService } from './service/questionnaire.service';
import { QuestionnaireResponse } from './model/questionnaire-response';
import { BsModalRef, BsModalService } from 'ngx-bootstrap/modal';
import { DeleteQuestionnaireModalComponent } from './modal/delete-questionnaire-modal/delete-questionnaire-modal.component';
import { EditQuestionnaireModalComponent } from './modal/edit-questionnaire-name-modal/edit-questionnaire-name-modal.component';
@Component({
  selector: 'app-questionnaire',
  templateUrl: './questionnaire.component.html',
  styleUrls: ['./questionnaire.component.css']
})
export class QuestionnaireComponent implements OnInit {

  loading: boolean = true;
  isToggled: boolean = false;
  isOpen: boolean = false
  questionnaires: QuestionnaireResponse[] = [];
  questionnaireName: string = '';
  currentlyEditingQuestionnaires: any[] = [];
  validationPath = "/validation"
  // @ts-ignore
  modalRef: BsModalRef;


  constructor(
    private questionnaireService: QuestionnaireService,
    private modalService: BsModalService,
  ) {}

  ngOnInit(): void {
    this.getQuestionnaires();
  }

  getQuestionnaires(): void {
    this.loading = true;
    this.questionnaireService.getQuestionnaires().subscribe(
      next => {
        this.questionnaires = next;
        this.loading = false;
      }
    );
  }

  addNewQuestionnaire(questionnaireName: string) {
    this.questionnaireService.saveQuestionnaire({id: null, name: questionnaireName}).subscribe(
      next => {
        this.getQuestionnaires();
      }
    )
  }
  
  toggleAddNewQuistionnaire(): void {
    this.isToggled = !this.isToggled;
  }
  
  openActionButtonsMenu(): void {
    this.isOpen = !this.isOpen;
  }

  deleteQuestionnaire(questionnaire: QuestionnaireResponse) {
    const initialState = {
      questionnaireName: questionnaire.name
    };
    this.modalRef = this.modalService.show(DeleteQuestionnaireModalComponent, {
      class: 'modal-box modal-md', initialState
    });
    this.modalRef.content.onClose.subscribe((result: any) => {
      if (result.deleteQuestionnaire) {
        this.loading = true;
        this.questionnaireService.deleteQuestionnaire(questionnaire.id).subscribe( next => {
          this.questionnaires = this.questionnaires.filter(q => q.id !== questionnaire.id);
          this.loading = false;

          }, () => this.loading = false
        )
      }
    });
  }

  editQuestionnaire(questionnaire: QuestionnaireResponse) {
    const initialState = {
      questionnaire: questionnaire,
      questionnairesList: this.questionnaires,
    };
    this.modalRef = this.modalService.show(EditQuestionnaireModalComponent, {
      class: 'modal-box modal-md', initialState
    });
    this.modalRef.content.onClose.subscribe((result: any) => {
      if (result.deleteQuestionnaire) {
        this.loading = true;
        this.questionnaireService.deleteQuestionnaire(questionnaire.id).subscribe( next => {
          this.questionnaires = this.questionnaires.filter(q => q.id !== questionnaire.id);
          this.loading = false;

          }, () => this.loading = false
        )
      }
    });
  }

  getActions(questionnaire: any):{name: string, icon: string, onClick: any}[] {
    return [
      {name: "menu.edit", icon: 'edit', onClick: () => this.editQuestionnaire(questionnaire)},
      {name: "menu.delete", icon: 'delete', onClick: () => this.deleteQuestionnaire(questionnaire)},
    ];
  }
  
  
}
