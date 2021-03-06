import {
  Component, ChangeDetectionStrategy, Injector, ViewChild, Input, OnInit, Output, EventEmitter
} from '@angular/core';

import { BaseComponent } from 'app/shared/base.component';
import { PhonesService } from 'app/api/services';
import { CodeVerificationStatusEnum, PhoneEditWithId } from 'app/api/models';
import { FormBuilder, Validators, FormControl } from '@angular/forms';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { BehaviorSubject } from 'rxjs';
import { InputFieldComponent } from 'app/shared/input-field.component';
import { validateBeforeSubmit } from 'app/shared/helper';

/**
 * Form used to verify a phone
 */
@Component({
  selector: 'verify-phone',
  templateUrl: 'verify-phone.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VerifyPhoneComponent extends BaseComponent implements OnInit {

  @Input() phone: PhoneEditWithId;
  @Output() verified = new EventEmitter<boolean>();

  code: FormControl;
  message$ = new BehaviorSubject('');
  disabled = false;

  @ViewChild('codeField') codeField: InputFieldComponent;

  constructor(
    injector: Injector,
    public modalRef: BsModalRef,
    private phonesService: PhonesService) {
    super(injector);

    this.code = this.formBuilder.control(null, Validators.required);
  }

  ngOnInit() {
    super.ngOnInit();
    this.message = this.i18n('Click the button above to send the verification code to your phone');
  }

  /** Sends the verification code */
  sendCode() {
    this.phonesService.sendPhoneVerificationCode(this.phone.id).subscribe(number => {
      this.message = this.i18n('The verification code has been sent');
      this.code.setValue(null);
      this.codeField.focus();
    });
  }

  private set message(message: string) {
    this.message$.next(message);
  }

  /**
   * Performs the phone verification
   */
  verify() {
    if (!validateBeforeSubmit(this.code)) {
      return;
    }
    this.phonesService.verifyPhone({
      id: this.phone.id,
      code: this.code.value
    }).subscribe(status => {
      switch (status) {
        case CodeVerificationStatusEnum.CODE_NOT_SENT:
        case CodeVerificationStatusEnum.EXPIRED:
          this.notification.error(this.i18n(`The verification code was not sent or has expired.<br>
          Please, send the code again to your phone and restart the process.`));
          break;
        case CodeVerificationStatusEnum.FAILED:
          this.notification.error(this.i18n('Invalid verification code'));
          break;
        case CodeVerificationStatusEnum.MAX_ATTEMPTS_REACHED:
          this.notification.error(this.i18n(`You have exceeded the number of allowed attempts.<br>
          Please, send the code again to your phone and restart the process.`));
          break;
        case CodeVerificationStatusEnum.SUCCESS:
          this.disabled = true;
          this.verified.emit(true);
          break;
      }
    });
  }
}
