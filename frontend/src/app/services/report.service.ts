import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ApiService } from './api.service';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ReportService {
  constructor(private http: HttpClient, private apiService: ApiService) {}

  exportTransactions(months: string[]) {
    let params = new HttpParams();
    months.forEach(month => {
      params = params.append('months[]', month);
    });

    const url = `${environment.apiUrl}/reports/export`;

    return this.http.get(url, {
      params: params,
      responseType: 'blob' as 'json',
      observe: 'response'
    }).pipe(
      map(response => {
        const contentDisposition = response.headers.get('Content-Disposition');
        let fileName = 'report.xlsx';
        if (contentDisposition) {
          const fileNameMatch = contentDisposition.match(/filename="?(.+)"?/);
          if (fileNameMatch && fileNameMatch.length > 1) {
            fileName = fileNameMatch[1];
          }
        }
        return {
          blob: response.body as unknown as Blob,
          fileName: fileName
        };
      })
    );
  }

  downloadFile(blob: Blob, fileName: string) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }
}
