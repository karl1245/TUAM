import {Component} from '@angular/core';
import {HttpClientModule} from "@angular/common/http";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  providers: [HttpClientModule]
})
export class AppComponent {

}
