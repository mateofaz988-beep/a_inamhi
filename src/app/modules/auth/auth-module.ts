import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // <--- INDISPENSABLE para el login
import { AuthRoutingModule } from './auth-routing-module';
import { LoginComponent } from './pages/login/login';

@NgModule({
  declarations: [
    LoginComponent
  ],
  imports: [
    CommonModule,
    AuthRoutingModule,
    FormsModule // <--- Permite usar ngModel en el HTML
  ]
})
export class AuthModule { }