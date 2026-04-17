import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss'],
  standalone: false
})
export class DashboardComponent implements OnInit {

  adminName: string = 'Adrian';

  constructor() {}

  ngOnInit(): void {}

}