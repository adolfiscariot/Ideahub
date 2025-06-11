import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LandingPageButtonsComponent } from './buttons.component';

describe('LandingPageButtonsComponent', () => {
  let component: LandingPageButtonsComponent;
  let fixture: ComponentFixture<LandingPageButtonsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LandingPageButtonsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LandingPageButtonsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
