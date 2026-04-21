import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SolicitudPermisos } from './solicitud-permisos';

describe('SolicitudPermisos', () => {
  let component: SolicitudPermisos;
  let fixture: ComponentFixture<SolicitudPermisos>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SolicitudPermisos],
    }).compileComponents();

    fixture = TestBed.createComponent(SolicitudPermisos);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
