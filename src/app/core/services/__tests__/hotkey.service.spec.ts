import { TestBed } from '@angular/core/testing';
import { HotkeyService } from '../hotkey.service';

describe('HotkeyService', () => {
  let service: HotkeyService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [HotkeyService]
    });
    service = TestBed.inject(HotkeyService);
  });

  afterEach(() => {
    service.unregisterAll();
  });

  it('triggers the registered handler for a hotkey', () => {
    const handler = jasmine.createSpy('handler');
    service.register({ '1': handler });

    const event = new KeyboardEvent('keydown', {
      key: '1',
      code: 'Digit1',
      bubbles: true
    });
    document.dispatchEvent(event);

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('ignores hotkeys when typing in input elements', () => {
    const handler = jasmine.createSpy('handler');
    service.register({ '1': handler });

    const input = document.createElement('input');
    document.body.appendChild(input);

    const event = new KeyboardEvent('keydown', {
      key: '1',
      code: 'Digit1',
      bubbles: true
    });
    input.dispatchEvent(event);

    expect(handler).not.toHaveBeenCalled();
    document.body.removeChild(input);
  });
});
