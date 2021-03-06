import {
  Component, ChangeDetectionStrategy, Input, ViewChild,
  ElementRef, Output, EventEmitter, ChangeDetectorRef, OnDestroy
} from '@angular/core';
import { BehaviorSubject, Subscription, Observable, forkJoin } from 'rxjs';
import { Image, TempImageTargetEnum, CustomField, DataForUi } from 'app/api/models';
import { HttpClient, HttpEventType } from '@angular/common/http';
import { ApiConfiguration } from 'app/api/api-configuration';
import { ImagesService } from 'app/api/services';
import { LoginService } from 'app/core/login.service';
import { resizeImage, ResizeResult } from 'app/shared/helper';
import { DataForUiHolder } from 'app/core/data-for-ui-holder';

/**
 * Represents an image file being uploaded
 */
export class ImageToUpload {
  progress$ = new BehaviorSubject(0);
  subscription: Subscription;
  uploadDone = false;
  image: Image;

  constructor(
    public name: string,
    public width: number,
    public height: number,
    public content: Blob) {
  }

  get totalSize(): number {
    return this.content.size;
  }

  get progress(): number {
    return this.progress$.value;
  }

  set progress(progress: number) {
    this.progress$.next(progress);
  }
}

/**
 * Component used to upload temporary images
 */
@Component({
  selector: 'image-upload',
  templateUrl: 'image-upload.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImageUploadComponent implements OnDestroy {

  uploading$ = new BehaviorSubject(false);

  @Input() containerClass = '';
  @Input() max = 1;
  @Input() target: TempImageTargetEnum;
  @Input() user = '';
  @Input() customField: CustomField;
  @Output() uploadDone = new EventEmitter<Image[]>();
  @ViewChild('inputField') inputField: ElementRef;

  files = new BehaviorSubject<ImageToUpload[]>(null);
  private urlsToRevoke: string[] = [];
  private subscription: Subscription;

  constructor(
    private http: HttpClient,
    private apiConfiguration: ApiConfiguration,
    private login: LoginService,
    private dataForUiHolder: DataForUiHolder,
    private changeDetector: ChangeDetectorRef) {
  }

  ngOnDestroy() {
    for (const url of this.urlsToRevoke) {
      URL.revokeObjectURL(url);
    }
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  /**
   * Shows a file picker to the user.
   * When the user selects, immediately uploads the images.
   * Once the images are uploaded, emit the `uploadDone` event.
   */
  perform() {
    if (this.uploading$.value) {
      // Already uploading
      return;
    }

    // The click event is blocking
    const el = this.inputField.nativeElement as HTMLInputElement;
    el.click();
  }

  filesSelected(fileList: FileList) {
    if (fileList.length === 0) {
      // No files were selected
      return;
    }

    // Upload each file
    this.uploading$.next(true);

    const dataForUi = this.dataForUiHolder.dataForUi;
    const maxWidth = (dataForUi || {}).maxImageWidth || 2000;
    const maxHeight = (dataForUi || {}).maxImageHeight || 2000;

    this.files.next([]);

    // First resize each image
    const resizeObservables: Observable<any>[] = [];
    const names: string[] = [];
    const max = Math.min(this.max, fileList.length);
    for (let i = 0; i < max; i++) {
      const file = fileList.item(i);
      resizeObservables.push(resizeImage(file, maxWidth, maxHeight));
      names.push(file.name);
    }
    // Once all images are resized, perform the upload
    this.subscription = forkJoin<ResizeResult>(resizeObservables).subscribe(results => {
      this.subscription.unsubscribe();

      this.changeDetector.detectChanges();

      const observables = [];
      const files = [];
      for (let i = 0; i < results.length; i++) {
        const name = names[i];
        const result = results[i];
        const toUpload = new ImageToUpload(name, result.width, result.height, result.content);
        files.push(toUpload);
        observables.push(this.doUpload(toUpload));
      }
      this.files.next(files);

      // Join all requests in a single subscription
      this.subscription = forkJoin<Image>(observables).subscribe(images => {
        this.subscription.unsubscribe();
        this.files.next([]);
        this.uploading$.next(false);
        this.uploadDone.emit(images);
        this.changeDetector.detectChanges();
      });
    });
  }

  doUpload(file: ImageToUpload): Observable<Image> {
    return new Observable(observer => {
      const url = `${this.apiConfiguration.rootUrl}/images/temp`;
      const data = new FormData();
      data.append('image', file.content, file.name);

      file.subscription = this.http.post(url, data, {
        observe: 'events',
        reportProgress: true,
        responseType: 'text',
        params: {
          target: this.target,
          guestKey: this.login.guestKey,
          user: this.user,
          customField: this.customField == null ? null : this.customField.id,
          customFieldKind: this.customField == null ? null : this.customField.kind,
        }
      }).subscribe(event => {
        if (event.type === HttpEventType.UploadProgress) {
          file.progress = event.loaded;
        } else if (event.type === HttpEventType.Response) {
          // Once the upload is complete, we have to fetch the image model
          file.subscription.unsubscribe();
          file.uploadDone = true;
          const blobUrl = URL.createObjectURL(file.content);
          this.urlsToRevoke.push(blobUrl);
          file.image = {
            id: event.body,
            name: file.name,
            contentType: file.content.type,
            height: file.height,
            width: file.width,
            length: file.content.size,
            url: blobUrl
          };
          observer.next(file.image);
          observer.complete();
          this.changeDetector.detectChanges();
        }
      }, err => {
        (this.files.value || []).forEach(f => {
          if (f.subscription) {
            f.subscription.unsubscribe();
          }
        });
        this.files.next([]);
        this.uploading$.next(false);
        observer.error(err);
        observer.complete();
        this.changeDetector.detectChanges();
      });
    });
  }
}
