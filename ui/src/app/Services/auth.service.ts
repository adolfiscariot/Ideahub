import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  /* 
   * This service is responsible for user authentication.
   * It will run once at app startup when it will be called
   * and a _isLoggedIn behaviorsubject, which will have been
   * instantiated to false, will be update to true if the 
   * jwt token is fetched from local storage meaning the user
   *  has logged in
  */ 

  private _isLoggedIn = new BehaviorSubject<boolean>(false);
  isLoggedIn$: Observable<boolean> = this._isLoggedIn.asObservable();
  
  constructor() {
    const token = localStorage.getItem('authToken');
    if (token){
      this._isLoggedIn.next(true);
    }
   }

   register(): void{
    console.log("User has registered")
   }

   login(): void{
    console.log("User has logged in")
    this._isLoggedIn.next(true);
    localStorage.setItem('authToken', '');
   }

   logout(): void{
    console.log("User has logged out");
    this._isLoggedIn.next(false);
    localStorage.removeItem('authToken');
   }
}
