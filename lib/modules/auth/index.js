// @flow
import { NativeModules, NativeEventEmitter } from 'react-native';

import User from './user';
import { Base } from './../base';
import { nativeSDKMissing } from './../../utils';

// providers
import EmailAuthProvider from './providers/Email';
import PhoneAuthProvider from './providers/Phone';
import GoogleAuthProvider from './providers/Google';
import FacebookAuthProvider from './providers/Facebook';
import TwitterAuthProvider from './providers/Twitter';
import GithubAuthProvider from './providers/Github';

const FirebaseAuth = NativeModules.RNFirebaseAuth;
const FirebaseAuthEvt = FirebaseAuth && new NativeEventEmitter(FirebaseAuth);

export default class Auth extends Base {
  _user: User | null;
  _authResult: AuthResultType | null;
  authenticated: boolean;

  constructor(firebase: Object, options: Object = {}) {
    super(firebase, options);
    if (!FirebaseAuth) {
      return nativeSDKMissing('auth');
    }

    this._user = null;
    this._authResult = null;
    this.authenticated = false;

    // start listening immediately for auth changes
    FirebaseAuthEvt.addListener('onAuthStateChanged', this._onAuthStateChanged.bind(this));
    FirebaseAuth.addAuthStateListener();
  }

  /**
   * Internal auth changed listener
   * @param auth
   * @param emit
   * @private
   */
  _onAuthStateChanged(auth: AuthResultType, emit: boolean = true) {
    this._authResult = auth;
    this.authenticated = auth ? auth.authenticated || false : false;
    if (auth && auth.user && !this._user) this._user = new User(this, auth);
    else if ((!auth || !auth.user) && this._user) this._user = null;
    else if (this._user) this._user._updateValues(auth);
    if (emit) this.emit('onAuthStateChanged', this._user);
    return auth ? this._user : null;
  }


  /**
   * Remove auth change listener
   * @param listener
   */
  _offAuthStateChanged(listener: Function) {
    this.log.info('Removing onAuthStateChanged listener');
    this.removeListener('onAuthStateChanged', listener);
  }

  /**
   * Intercept all user actions and send their results to
   * auth state change before resolving
   * @param promise
   * @returns {Promise.<TResult>|*}
   * @private
   */
  _interceptUserValue(promise) {
    return promise.then((result) => {
      if (!result) return this._onAuthStateChanged(null, false);
      if (result.user) return this._onAuthStateChanged(result, false);
      if (result.uid) return this._onAuthStateChanged({ authenticated: true, user: result }, false);
      return result;
    });
  }

  /*
   * WEB API
   */

  /**
   * Listen for auth changes.
   * @param listener
   */
  onAuthStateChanged(listener: Function) {
    this.log.info('Creating onAuthStateChanged listener');
    this.on('onAuthStateChanged', listener);
    if (this._authResult) listener(this._user || null);
    return this._offAuthStateChanged.bind(this, listener);
  }

  /**
   * Sign the current user out
   * @return {Promise}
   */
  signOut(): Promise<null> {
    return this._interceptUserValue(FirebaseAuth.signOut());
  }

  /**
   * Sign a user in anonymously
   * @return {Promise} A promise resolved upon completion
   */
  signInAnonymously(): Promise<Object> {
    return this._interceptUserValue(FirebaseAuth.signInAnonymously());
  }

  /**
   * Create a user with the email/password functionality
   * @param  {string} email    The user's email
   * @param  {string} password The user's password
   * @return {Promise}         A promise indicating the completion
   */
  createUserWithEmailAndPassword(email: string, password: string): Promise<Object> {
    return this._interceptUserValue(FirebaseAuth.createUserWithEmailAndPassword(email, password));
  }

  /**
   * Sign a user in with email/password
   * @param  {string} email    The user's email
   * @param  {string} password The user's password
   * @return {Promise}         A promise that is resolved upon completion
   */
  signInWithEmailAndPassword(email: string, password: string): Promise<Object> {
    return this._interceptUserValue(FirebaseAuth.signInWithEmailAndPassword(email, password));
  }

  /**
     * Verify User Phone Number
     * @param  {string} phoneNumber
     * @return {Promise}           A promise resolved upon completion
     */
  verifyPhoneNumber(phoneNumber: string): Promise<Object> {
    return this._interceptUserValue(
      FirebaseAuth.verifyPhoneNumber(phoneNumber)
    );
  }

  /**
     * Sign the user in with phone credential
     * @param  {string} verificationId
     * @param  {string} verificationCode
     * @return {Promise}           A promise resolved upon completion
     */
  signInWithPhone(
    verificationId: string,
    verificationCode: string
  ): Promise<Object> {
    return this._interceptUserValue(
      FirebaseAuth.signInWithPhone(verificationId, verificationCode)
    );
  }

  /**
   * Sign the user in with a custom auth token
   * @param  {string} customToken  A self-signed custom auth token.
   * @return {Promise}             A promise resolved upon completion
   */
  signInWithCustomToken(customToken: string): Promise<Object> {
    return this._interceptUserValue(FirebaseAuth.signInWithCustomToken(customToken));
  }

  /**
   * Sign the user in with a third-party authentication provider
   * @return {Promise}           A promise resolved upon completion
   */
  signInWithCredential(credential: CredentialType): Promise<Object> {
    return this._interceptUserValue(FirebaseAuth.signInWithCredential(credential.provider, credential.token, credential.secret));
  }

  /**
   * Send reset password instructions via email
   * @param {string} email The email to send password reset instructions
   */
  sendPasswordResetEmail(email: string): Promise<Object> {
    return FirebaseAuth.sendPasswordResetEmail(email);
  }

  /**
   * Completes the password reset process, given a confirmation code and new password.
   *
   * @link https://firebase.google.com/docs/reference/js/firebase.auth.Auth#confirmPasswordReset
   * @param code
   * @param newPassword
   * @return {Promise.<Null>}
   */
  confirmPasswordReset(code: string, newPassword: string): Promise<Null> {
    return FirebaseAuth.confirmPasswordReset(code, newPassword);
  }

  /**
   * Applies a verification code sent to the user by email or other out-of-band mechanism.
   *
   * @link https://firebase.google.com/docs/reference/js/firebase.auth.Auth#applyActionCode
   * @param code
   * @return {Promise.<Null>}
   */
  applyActionCode(code: string): Promise<Any> {
    return FirebaseAuth.applyActionCode(code);
  }

  /**
   * Checks a verification code sent to the user by email or other out-of-band mechanism.
   *
   * @link https://firebase.google.com/docs/reference/js/firebase.auth.Auth#checkActionCode
   * @param code
   * @return {Promise.<Any>|Promise<ActionCodeInfo>}
   */
  checkActionCode(code: string): Promise<Any> {
    return FirebaseAuth.checkActionCode(code);
  }

  /**
   * Get the currently signed in user
   * @return {Promise}
   */
  getCurrentUser(): Promise<Object> {
    return this._interceptUserValue(FirebaseAuth.getCurrentUser());
  }

  /**
   * Returns a list of authentication providers that can be used to sign in a given user (identified by its main email address).
   * @return {Promise}
   */
  fetchProvidersForEmail(email: string): Promise<Array<String>> {
    return FirebaseAuth.fetchProvidersForEmail(email);
  }

  /**
   * Get the currently signed in user
   * @return {Promise}
   */
  get currentUser(): User | null {
    return this._user;
  }

  get namespace(): string {
    return 'firebase:auth';
  }
}

export const statics = {
  GoogleAuthProvider,
  EmailAuthProvider,
  PhoneAuthProvider,
  FacebookAuthProvider,
  TwitterAuthProvider,
  GithubAuthProvider,
};
