import { OnInit, OnDestroy, Injector, HostBinding } from '@angular/core';
import { BaseComponent } from 'app/shared/base.component';
import { AbstractControl } from '@angular/forms';
import { FormControlLocator } from 'app/shared/form-control-locator';
import { BehaviorSubject, Observable } from 'rxjs';
import { ApiInterceptor } from 'app/core/api.interceptor';

/**
 * Base class implemented by components which are actually 'pages', that is, are displayed in the `<router-outlet>`.
 * Pages generally fetch some data from the server in order to display its content.
 * @param D The data type
 */
export abstract class BasePageComponent<D> extends BaseComponent implements OnInit, OnDestroy {

  @HostBinding('style.display') styleDisplay = 'flex';
  @HostBinding('style.flex-direction') styleFlexDirection = 'column';
  @HostBinding('style.flex-grow') styleFlexGrow = '1';

  data$ = new BehaviorSubject<D>(null);

  get data(): D {
    return this.data$.value;
  }
  set data(data: D) {
    if (this.data == null && data != null) {
      this.onDataInitialized(data);
    }
    this.data$.next(data);
  }

  /**
   * Reloads the current page
   */
  protected reload() {
    this.data = null;
    this.unsubscribe();
    this.ngOnInit();
  }

  /**
   * Callback invoked the first time the data is initialized
   * @param data The data instance
   */
  protected onDataInitialized(data: D) {
  }

  constructor(injector: Injector) {
    super(injector);
  }

  ngOnInit() {
    super.ngOnInit();
    this.layout.currentPage = this;
  }

  ngOnDestroy(): void {
    super.ngOnDestroy();
    if (this.layout.currentPage === this) {
      this.layout.currentPage = null;
    }
  }

  /**
   * Should be implemented by pages to correctly locate a form control.
   * Is important, for example, to match validation errors to fields.
   */
  locateControl(locator: FormControlLocator): AbstractControl {
    return null;
  }
}
