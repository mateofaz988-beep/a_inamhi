import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../../core/services/auth';
import { SharedModule } from '../../../../shared/shared-module';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    RouterModule,
    SharedModule
  ],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss']
})
export class DashboardComponent {

  constructor(public authService: AuthService) {}

  logout() {
    this.authService.logout();
  }
}