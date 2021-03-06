import { BreakpointObserver } from '@angular/cdk/layout';
import { Injectable } from '@angular/core';
import { BasePageComponent } from 'app/shared/base-page.component';
import { BehaviorSubject, Observable } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';

const BREAKPOINTS = {
  xxs: 'screen and (max-width: 325px)',
  xs: 'screen and (min-width: 326px) and (max-width: 575px)',
  sm: 'screen and (min-width: 576px) and (max-width: 767px)',
  md: 'screen and (min-width: 768px) and (max-width: 991px)',
  lg: 'screen and (min-width: 992px) and (max-width: 1199px)',
  xl: 'screen and (min-width: 1200px)',

  'lt-xs': 'screen and (max-width: 325px)',
  'lt-sm': 'screen and (max-width: 575px)',
  'lt-md': 'screen and (max-width: 767px)',
  'lt-lg': 'screen and (max-width: 991px)',
  'lt-xl': 'screen and (max-width: 1199px)',

  'gt-xxs': 'screen and (min-width: 326px)',
  'gt-xs': 'screen and (min-width: 576px)',
  'gt-sm': 'screen and (min-width: 768px)',
  'gt-md': 'screen and (min-width: 992px)',
  'gt-lg': 'screen and (min-width: 1200px)'
};

/**
 * Shared definitions for the application layout
 */
@Injectable({
  providedIn: 'root'
})
export class LayoutService {
  currentPage$ = new BehaviorSubject<BasePageComponent<any>>(null);
  get currentPage(): BasePageComponent<any> {
    return this.currentPage$.value;
  }
  set currentPage(page: BasePageComponent<any>) {
    this.currentPage$.next(page);
  }

  private _canvas: HTMLCanvasElement;
  private _ctx: CanvasRenderingContext2D;

  private activeBreakpoints = new Set<string>();
  private breakpointObservers = new Map<string, Observable<boolean>>();

  private _breakpointChanges = new BehaviorSubject<Set<string>>(new Set());
  breakpointChanges = this._breakpointChanges.asObservable();

  constructor(observer: BreakpointObserver) {
    this.breakpointObservers = new Map();
    for (const name in BREAKPOINTS) {
      if (!BREAKPOINTS.hasOwnProperty(name)) {
        continue;
      }
      const query = BREAKPOINTS[name];
      const breakpointObserver = observer.observe(query).pipe(
        map(res => res.matches),
        distinctUntilChanged()
      );
      this.breakpointObservers.set(name, breakpointObserver);
      // Observe any changes in active breakpoints
      breakpointObserver.subscribe(matches => {
        if (matches) {
          this.activeBreakpoints.add(name);
        } else {
          this.activeBreakpoints.delete(name);
        }
        this._breakpointChanges.next(new Set(this.activeBreakpoints));
      });
      // Set the initial state of the active breakpoints
      if (observer.isMatched(query)) {
        this.activeBreakpoints.add(name);
      }
    }
    this._breakpointChanges.subscribe(activeBreakpoints => this.updateBodyStyles(activeBreakpoints));
    this.updateBodyStyles(this.activeBreakpoints);
  }

  private updateBodyStyles(breakpoints: Set<string>) {
    if (!document) {
      return;
    }
    const classes = document.body.classList;
    for (const name in BREAKPOINTS) {
      if (!BREAKPOINTS.hasOwnProperty(name)) {
        continue;
      }
      if (breakpoints.has(name)) {
        classes.add(name);
      } else {
        classes.remove(name);
      }
    }
  }

  /**
   * Returns the text width, in pixels
   * @param text The text to measure
   */
  textWidth(text: string): number {
    return this.context2d.measureText(text).width;
  }

  private get context2d(): CanvasRenderingContext2D {
    if (this._canvas == null) {
      this._canvas = document.createElement('canvas');
      this._canvas.style.width = '0px';
      this._canvas.style.height = '0px';
      this._canvas.style.visibility = 'hidden';
      document.body.appendChild(this._canvas);
      this._ctx = this._canvas.getContext('2d');
      const bodyStyle = window.getComputedStyle(document.body);
      this._ctx.font = bodyStyle.font;
    }
    return this._ctx;
  }

  /**
   * Returns the document width, in pixels
   */
  get width(): number {
    return Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
  }

  /**
   * Returns the content area width, in pixels
   */
  get contentWidth(): number {
    // For larger screens we should return the container width
    return this.width;
  }

  get height(): number {
    return Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
  }

  /**
   * Returns whether a specific breakpoint is active
   * @param name The breakpoint name
   */
  isActive(name: string) {
    return this.activeBreakpoints.has(name);
  }

  get xxs(): boolean {
    return this.isActive('xxs');
  }
  get xs(): boolean {
    return this.isActive('xs');
  }
  get sm(): boolean {
    return this.isActive('sm');
  }
  get md(): boolean {
    return this.isActive('md');
  }
  get lg(): boolean {
    return this.isActive('lg');
  }
  get xl(): boolean {
    return this.isActive('xl');
  }

  get ltxs(): boolean {
    return this.isActive('lt-xs');
  }
  get ltsm(): boolean {
    return this.isActive('lt-sm');
  }
  get ltmd(): boolean {
    return this.isActive('lt-md');
  }
  get ltlg(): boolean {
    return this.isActive('lt-lg');
  }
  get ltxl(): boolean {
    return this.isActive('lt-xl');
  }

  get gtxxs(): boolean {
    return this.isActive('gt-xxs');
  }
  get gtxs(): boolean {
    return this.isActive('gt-xs');
  }
  get gtsm(): boolean {
    return this.isActive('gt-sm');
  }
  get gtmd(): boolean {
    return this.isActive('gt-md');
  }
  get gtlg(): boolean {
    return this.isActive('gt-lg');
  }

  /**
   * Returns an observable that notifies every time a breakpoint activation changes
   * @param name The breakpoint name
   */
  observeBreakpoint(name: string): Observable<boolean> {
    return this.breakpointObservers.get(name);
  }

  get xxs$(): Observable<boolean> {
    return this.observeBreakpoint('xxs');
  }
  get xs$(): Observable<boolean> {
    return this.observeBreakpoint('xs');
  }
  get sm$(): Observable<boolean> {
    return this.observeBreakpoint('sm');
  }
  get md$(): Observable<boolean> {
    return this.observeBreakpoint('md');
  }
  get lg$(): Observable<boolean> {
    return this.observeBreakpoint('lg');
  }
  get xl$(): Observable<boolean> {
    return this.observeBreakpoint('xl');
  }

  get ltxs$(): Observable<boolean> {
    return this.observeBreakpoint('lt-xs');
  }
  get ltsm$(): Observable<boolean> {
    return this.observeBreakpoint('lt-sm');
  }
  get ltmd$(): Observable<boolean> {
    return this.observeBreakpoint('lt-md');
  }
  get ltlg$(): Observable<boolean> {
    return this.observeBreakpoint('lt-lg');
  }
  get ltxl$(): Observable<boolean> {
    return this.observeBreakpoint('lt-xl');
  }

  get gtxxs$(): Observable<boolean> {
    return this.observeBreakpoint('gt-xxs');
  }
  get gtxs$(): Observable<boolean> {
    return this.observeBreakpoint('gt-xs');
  }
  get gtsm$(): Observable<boolean> {
    return this.observeBreakpoint('gt-sm');
  }
  get gtmd$(): Observable<boolean> {
    return this.observeBreakpoint('gt-md');
  }
  get gtlg$(): Observable<boolean> {
    return this.observeBreakpoint('gt-lg');
  }

}
