import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { Registration } from '../../Interfaces/Registration/registration-interface';

@Injectable({
  providedIn: 'root'
})

  /* 
   * This service is responsible for user authentication.
   * It will run once at app startup when it will be called
   * and a _isLoggedIn behaviorsubject, which will have been
   * instantiated to false, will be update to true if the 
   * jwt token is fetched from local storage meaning the user
   *  has logged in
  */ 

export class AuthService {
  private readonly authUrl = "http://localhost:5000/api/auth";

  private _isLoggedIn = new BehaviorSubject<boolean>(false);
  isLoggedIn$: Observable<boolean> = this._isLoggedIn.asObservable();

  constructor(private http: HttpClient) {}

  register(registrationData: Registration): Observable<any>{
    console.log("Registration taking place...")

    return this.http.post(`${this.authUrl}/register`, registrationData).pipe(
      tap(response => {
        console.log(
          `${registrationData.email} has registered successfully: `, 
          response
        )
      }),
      catchError((e => { throw new Error(`Registration failed: ${e}`) }))
    )
  }
}
