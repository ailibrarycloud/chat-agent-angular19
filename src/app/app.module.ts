import { NgModule } from "@angular/core";
import { BrowserModule } from "@angular/platform-browser";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { OrderByPipe } from './order-by.pipe'; 

@NgModule({
  imports: [
    BrowserModule,
    CommonModule,
    FormsModule,
    OrderByPipe
  ],
  providers: [],
})
export class AppModule {}