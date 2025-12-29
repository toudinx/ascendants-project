import { Injectable } from "@angular/core";
import { Subject } from "rxjs";
import { BattleFxEvent } from "./battle-fx.types";

@Injectable()
export class BattleFxBusService {
  private readonly subject = new Subject<BattleFxEvent>();
  readonly events$ = this.subject.asObservable();

  emit(event: BattleFxEvent): void {
    this.subject.next(event);
  }
}
