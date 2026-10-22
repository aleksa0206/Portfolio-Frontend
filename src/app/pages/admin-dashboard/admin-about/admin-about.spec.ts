import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminAbout } from './admin-about';
import { provideRouter } from '@angular/router';

describe('AdminAbout', () => {
  let component: AdminAbout;
  let fixture: ComponentFixture<AdminAbout>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminAbout],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminAbout);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
