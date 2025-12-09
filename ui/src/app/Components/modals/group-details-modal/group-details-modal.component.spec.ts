import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GroupDetailsModalComponentTsComponent } from './group-details-modal.component';

describe('GroupDetailsModalComponentTsComponent', () => {
  let component: GroupDetailsModalComponentTsComponent;
  let fixture: ComponentFixture<GroupDetailsModalComponentTsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GroupDetailsModalComponentTsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GroupDetailsModalComponentTsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
