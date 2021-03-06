import { Injectable } from '@angular/core';
import { Router, NavigationStart } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { filter } from 'rxjs/operators';
import { map } from 'rxjs/operators';
import { DataForUiHolder } from 'app/core/data-for-ui-holder';

const IGNORE_BREADCRUMB = ['', '/home', '/login', '/forgot-password'];

/**
 * Service used to navigate between pages and managing the component state
 */
@Injectable({
  providedIn: 'root'
})
export class BreadcrumbService {

  /**
   * The current breadcrumb entries
   */
  breadcrumb$ = new BehaviorSubject<string[]>([]);

  constructor(
    private router: Router,
    dataForUiHolder: DataForUiHolder) {
    dataForUiHolder.subscribe(() => this.clear());
    router.events
      .pipe(
        filter(e => e instanceof NavigationStart),
        map(e => e as NavigationStart)
      )
      .subscribe(event => {
        this.onRouterEvent(event);
      });
  }

  /**
   * Clears the navigation state
   */
  clear(): void {
    this.breadcrumb$.next([]);
  }

  private onRouterEvent(event: NavigationStart): void {
    if (IGNORE_BREADCRUMB.includes(event.url)) {
      // Ignore the breadcrumb for this URL
      return;
    }

    let entries = this.breadcrumb$.value;

    // Find the breadcrumb entry for this path
    let index = -1;
    for (let i = 0; i < entries.length; i++) {
      if (entries[i] === event.url) {
        index = i;
        break;
      }
    }
    if (index >= 0) {
      // Going back to an URL that was previously in navigation
      entries.splice(index + 1, entries.length - index - 1);
    } else {
      // Going to a new URL
      entries = entries.slice();
      entries.push(event.url);
    }
    this.breadcrumb$.next(entries);
  }

  /**
   * Goes back one level
   */
  back() {
    const breadcrumb = this.breadcrumb$.value;
    if (breadcrumb.length > 1) {
      this.router.navigateByUrl(breadcrumb[breadcrumb.length - 2]);
    }
  }
}
