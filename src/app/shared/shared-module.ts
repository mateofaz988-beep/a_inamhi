import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // <--- ESTA ES LA CLAVE
import { HttpClientModule } from '@angular/common/http';
import { TablaEmpleadosComponent } from './components/tabla-empleados/tabla-empleados';

@NgModule({
  declarations: [
    TablaEmpleadosComponent
  ],
  imports: [
    CommonModule,
    FormsModule,       // <--- Importarlo aquí habilita [(ngModel)]
    HttpClientModule
  ],
  exports: [
    TablaEmpleadosComponent,
    CommonModule,
    FormsModule        // <--- Exportarlo ayuda a otros módulos
  ]
})
export class SharedModule { }