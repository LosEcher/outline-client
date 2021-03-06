// Copyright 2018 The Outline Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import * as Raven from 'raven-js';

export interface OutlineErrorReporter {
  report(userFeedback: string, feedbackCategory: string, userEmail?: string): Promise<void>;
}

export class SentryErrorReporter implements OutlineErrorReporter {
  constructor(appVersion: string, dsn: string, tags: {[id: string]: string;}) {
    console.debug('Initializing error reporting');

    // Raven stores all console.* logs as breadcrumbs to be sent with error
    // reports. Since it does not provide an API to control this setting,
    // save the original console.debug function and override the Raven wrapper
    // once it gets installed.
    const originalConsoleDebug = console.debug;
    Raven.config(dsn, {release: appVersion, 'tags': tags}).install();
    console.debug = originalConsoleDebug;

    this.setUpUnhandledRejectionListener();
  }

  report(userFeedback: string, feedbackCategory: string, userEmail?: string): Promise<void> {
    Raven.setUserContext({email: userEmail || ''});
    Raven.captureMessage(userFeedback, {tags: {category: feedbackCategory}});
    Raven.setUserContext();  // Reset the user context, don't cache the email
    return Promise.resolve();
  }

  private setUpUnhandledRejectionListener() {
    // Chrome is the only browser that supports the unhandledrejection event.
    // This is fine for Android, but will not work in iOS.
    const unhandledRejection = 'unhandledrejection';
    window.addEventListener(unhandledRejection, (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const msg = reason.stack ? reason.stack : reason;
      Raven.captureBreadcrumb({message: msg, category: unhandledRejection});
    });
  }
}

export class FakeErrorReporter implements OutlineErrorReporter {
  report(userFeedback: string, feedbackCategory: string, userEmail?: string): Promise<void> {
    userEmail = userEmail || '(email not given)';
    console.debug(`Reporting fake feedback: ${userFeedback} by ${userEmail}, ${feedbackCategory}`);
    return Promise.resolve();
  }
}
