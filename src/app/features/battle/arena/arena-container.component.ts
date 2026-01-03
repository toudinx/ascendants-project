import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  inject,
} from "@angular/core";
import { BattleCameraService } from "./battle-camera.service";

@Component({
  selector: "app-arena-container",
  standalone: true,
  templateUrl: "./arena-container.component.html",
  styleUrls: ["./arena-container.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArenaContainerComponent implements AfterViewInit, OnDestroy {
  @ViewChild("cameraTarget", { static: true })
  private readonly cameraTarget?: ElementRef<HTMLDivElement>;
  private readonly camera = inject(BattleCameraService);

  ngAfterViewInit(): void {
    this.camera.connect(this.cameraTarget?.nativeElement ?? null);
  }

  ngOnDestroy(): void {
    this.camera.disconnect(this.cameraTarget?.nativeElement ?? null);
  }
}
