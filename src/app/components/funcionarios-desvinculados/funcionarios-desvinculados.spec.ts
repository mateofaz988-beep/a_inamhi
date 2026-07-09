import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { FuncionariosDesvinculadosComponent } from './funcionarios-desvinculados';
import { AdminModule } from '../../modules/admin/admin-module';

describe('FuncionariosDesvinculadosComponent', () => {
  let component: FuncionariosDesvinculadosComponent;
  let fixture: ComponentFixture<FuncionariosDesvinculadosComponent>;

  beforeEach(async () => {
    // jsdom does not implement matchMedia; sweetalert2 (triggered synchronously from
    // ngOnInit when the current user is not an admin) needs it to render its icon.
    if (!window.matchMedia) {
      window.matchMedia = (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList;
    }

    await TestBed.configureTestingModule({
      imports: [AdminModule],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(FuncionariosDesvinculadosComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
