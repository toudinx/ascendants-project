import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

export type HomeNavTone = 'expedition' | 'simulation' | 'kaelis' | 'recruit';

export interface HomeNavItem {
  id: string;
  title: string;
  subtitle: string;
  route?: string;
  tone: HomeNavTone;
}

@Component({
  selector: 'app-home-main-navigation',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home-main-navigation.component.html',
  styleUrls: ['./home-main-navigation.component.scss']
})
export class HomeMainNavigationComponent {
  @Input() items: HomeNavItem[] = [];
}
