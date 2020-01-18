import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { delay, retryWhen } from 'rxjs/operators';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TzstatsService {
  tzstats_endpoint = 'https://api.babylonnet.tzstats.com/explorer/';

  constructor(private httpClient: HttpClient) { }

  getContractEndPoint(contract: string, endPoint: 'storage' | 'calls'): Promise<any> {
    return this.httpClient.get(this.tzstats_endpoint + 'contract/' + contract + '/' + endPoint).toPromise();
  }

  getOperationEndPoint(operation: string): Observable<any> {
    return this.httpClient.get(this.tzstats_endpoint + 'op/' + operation).pipe(
      delay(30000),
      retryWhen(err => err.pipe(delay(30000)))
    );
  }
}
