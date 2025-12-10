import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ShareIdeaModalComponent } from './share-idea-modal.component';

describe('ShareIdeaModalComponent', () => {
  let component: ShareIdeaModalComponent;
  let fixture: ComponentFixture<ShareIdeaModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShareIdeaModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ShareIdeaModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
