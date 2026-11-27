import {setGlobalOptions} from "firebase-functions";

// Caps containers per function so a traffic spike degrades latency instead
// of cost. Override per function with the `maxInstances` option.
setGlobalOptions({maxInstances: 10});

// Every export is prefixed with "hackaiol": this Firebase project hosts
// other apps' functions too, and function names are project-wide.
export {
  hackaiolRequestCode,
  hackaiolConfirmCode,
} from "./verification";
export {hackaiolSubmitSignup, hackaiolLookupTeam} from "./signup";
export {hackaiolSaveSignupDraft} from "./drafts";
export {hackaiolAdminApi} from "./backoffice";
