import {
  Validator,
  ValidatorFn,
  ValidationErrors,
  AbstractControl,
} from '@angular/forms';

export const confirmPasswordValidator: ValidatorFn = (
  control: AbstractControl
): ValidationErrors | null => {
  const passwordControl = control.get('password');
  const confirmPasswordControl = control.get('confirmPassword');

  //Check if password and confirmpassword are empty
  if (passwordControl?.value === '' || confirmPasswordControl?.value === '') {
    return null;
  }

  //Check if passwords are equal
  if (
    passwordControl?.value &&
    confirmPasswordControl?.value &&
    passwordControl?.value !== confirmPasswordControl?.value
  ) {
    confirmPasswordControl?.setErrors({ passwordsDontMatch: true });
  } else {
    if (confirmPasswordControl?.errors) {
      confirmPasswordControl.setErrors(null);
    }
  }

  return null;
};
