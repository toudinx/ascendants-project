import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppHeaderComponent } from '../../../shared/components';
import { RunStateService } from '../../../core/services/run-state.service';

@Component({
  selector: 'app-run-prep-page',
  standalone: true,
  imports: [CommonModule, AppHeaderComponent],
  template: `
    <app-header title="Intermission" subtitle="Redirecting..." kicker="Run"></app-header>
  `
})
export class RunPrepPageComponent implements OnInit {
  protected readonly run = inject(RunStateService);

  ngOnInit(): void {
    this.run.goToIntermission();
  }
}
