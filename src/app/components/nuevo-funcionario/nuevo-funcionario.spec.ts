import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NuevoFuncionario } from './nuevo-funcionario';

describe('NuevoFuncionario', () => {
  let component: NuevoFuncionario;
  let fixture: ComponentFixture<NuevoFuncionario>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NuevoFuncionario],
    }).compileComponents();

    fixture = TestBed.createComponent(NuevoFuncionario);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
