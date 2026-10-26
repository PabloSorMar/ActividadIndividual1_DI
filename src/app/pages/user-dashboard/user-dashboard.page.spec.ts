import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { UserDashboardPage } from './user-dashboard.page';

describe('UserDashboardPage', () => {
  let component: UserDashboardPage;
  let fixture: ComponentFixture<UserDashboardPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserDashboardPage],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(UserDashboardPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
