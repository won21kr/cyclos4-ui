import { Directive, ElementRef, AfterViewInit, ChangeDetectorRef, Input, Optional, Inject } from '@angular/core';
import { truthyAttr } from 'app/shared/helper';
import { NG_VALUE_ACCESSOR, DefaultValueAccessor } from '@angular/forms';
import { BaseFormFieldComponent } from 'app/shared/base-form-field.component';

/**
 * Input fields with this directive will receive an initial focus
 */
@Directive({
  selector: '[focused]'
})
export class FocusedDirective implements AfterViewInit {
  constructor(
    @Optional() private el: ElementRef,
    @Optional() @Inject(NG_VALUE_ACCESSOR) private valueAccessor,
    private changeDetector: ChangeDetectorRef
  ) { }

  _focused: boolean | string = false;
  @Input() get focused(): boolean | string {
    return this._focused;
  }
  set focused(focused: boolean | string) {
    this._focused = truthyAttr(focused);
  }

  ngAfterViewInit(): void {
    this.setFocus();
  }

  private setFocus() {
    if (this._focused) {
      let toFocus = null;
      if (this.valueAccessor instanceof Array) {
        toFocus = this.valueAccessor[0];
      } else if (this.valueAccessor) {
        toFocus = this.valueAccessor;
      } else if (this.el) {
        toFocus = this.el;
      }
      if (toFocus instanceof DefaultValueAccessor) {
        toFocus = (<any>toFocus)._elementRef;
      }
      if (toFocus instanceof ElementRef) {
        toFocus = toFocus.nativeElement;
      }
      if (toFocus) {
        setTimeout(() => {
          try {
            toFocus.focus();
            this.changeDetector.detectChanges();
          } catch (ex) {
          }
        }, 100);
      }
    }
  }
}
