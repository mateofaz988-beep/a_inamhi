import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TablaEmpleadosComponent } from './components/tabla-empleados/tabla-empleados';

@NgModule({
  declarations: [
    TablaEmpleadosComponent
  ],
  imports: [
    CommonModule,
    FormsModule
  ],
  exports: [
    TablaEmpleadosComponent,
    CommonModule,
    FormsModule
  ]
})
export class SharedModule { }