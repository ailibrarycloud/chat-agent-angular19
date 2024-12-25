/*
 *  Protractor support is deprecated in Angular.
 *  Protractor is used in this example for compatibility with Angular documentation tools.
 */
import { bootstrapApplication } from '@angular/platform-browser';
import { PlaygroundAssistantStreamComponent } from './app/app.component';

bootstrapApplication(PlaygroundAssistantStreamComponent)
  .catch(err => console.error(err));
