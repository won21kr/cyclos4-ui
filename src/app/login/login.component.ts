import { ChangeDetectionStrategy, Component, Injector, OnInit, ViewChild } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { DataForLogin, DataForUi } from 'app/api/models';
import { LoginReason, LoginState } from 'app/core/login-state';
import { BasePageComponent } from 'app/shared/base-page.component';
import { PasswordInputComponent } from 'app/shared/password-input.component';
import { NextRequestState } from 'app/core/next-request-state';

/**
 * Component used to show a login form.
 * Also has a link to the forgot password functionality.
 */
@Component({
  // tslint:disable-next-line:component-selector
  selector: 'login',
  templateUrl: 'login.component.html',
  styleUrls: ['login.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginComponent
  extends BasePageComponent<DataForLogin>
  implements OnInit {

  form: FormGroup;

  @ViewChild('password') passwordInput: PasswordInputComponent;

  get forgotPasswordEnabled(): boolean {
    return (this.data.forgotPasswordMediums || []).length > 0;
  }

  constructor(
    injector: Injector,
    private loginState: LoginState,
    private nextRequestState: NextRequestState
  ) {
    super(injector);
    this.form = this.formBuilder.group({
      principal: '',
      password: ''
    });
  }

  ngOnInit() {
    super.ngOnInit();
    if (this.nextRequestState.sessionToken) {
      this.router.navigateByUrl(this.loginState.redirectUrl || '');
      return;
    }

    // After closing the error notification, clear and focus the password field
    this.addSub(this.notification.onClosed.subscribe(() => {
      this.form.patchValue({ password: '' });
      this.passwordInput.focus();
    }));

    const dataForUi = this.dataForUiHolder.dataForUi;
    if (dataForUi == null || dataForUi.dataForLogin == null) {
      // Either the dataForUi is not loaded (?) or still points to a user. Reload first
      this.dataForUiHolder.reload().subscribe(d4ui => this.initialize(d4ui));
    } else {
      // Can initialize directly
      this.initialize(dataForUi);
    }
  }

  private initialize(dataForUi: DataForUi) {
    this.data = dataForUi.dataForLogin;
  }

  /**
   * Performs the login
   */
  doLogin(): void {
    if (!this.form.valid) {
      return;
    }
    const value = this.form.value;
    this.login.login(value.principal, value.password).subscribe(auth => {
      // Handle the exceptional cases
      let initialUrl = this.loginState.redirectUrl || '';
      if (auth.pendingAgreements) {
        initialUrl = '/pending-agreements';
      } else if (auth.expiredPassword) {
        initialUrl = '/expired-password';
      }
      // Redirect to the correct URL
      this.router.navigateByUrl(initialUrl);
    });
  }

  get loggedOut(): boolean {
    return this.loginState.reason === LoginReason.LOGGED_OUT;
  }
}
