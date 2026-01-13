// utils/char-count.util.ts
import { FormGroup } from '@angular/forms';

export function updateCharCount(
  form: FormGroup,
  field: string,
  max: number
): { count: number; limitReached: boolean } {

  const control = form.get(field);
  const value: string = control?.value || '';

  if (value.length > max) {
    control?.setValue(value.substring(0, max), { emitEvent: false });
    return { count: max, limitReached: true };
  }

  return { count: value.length, limitReached: false };
}
