import type {
  AuthHandler,
  ReflectServerOptions,
} from "@rocicorp/reflect/server";
import { mutators as yjsMutators, Mutators } from "@rocicorp/reflect-yjs";
import { WriteTransaction } from "@rocicorp/reflect";

const authHandler: AuthHandler = (auth: string, _roomID: string) => {
  if (auth) {
    // A real implementation could:
    // 1. if using session auth make a fetch call to a service to
    //    look up the userID by `auth` in a session database.
    // 2. if using stateless JSON Web Token auth, decrypt and validate the token
    //    and return the sub field value for userID (i.e. subject field).
    // It should also check that the user with userID is authorized
    // to access the room with roomID.
    return {
      userID: auth,
    };
  }
  return null;
};

function makeOptions(): ReflectServerOptions<Mutators> {
  // default seed text base64 encoded for the ydoc
  const defaultDocText =
    "AAMAAwAG3//5mQsICgACQgAyAkKKFQIAEQcBBAAoAIcABwAEAIcABwAExQe5B2RlZmF1bHRoZWFkaW5nQ2hhcHRlciBUd2VsdmU6IEhvbGRlbmxldmVscGFyYWdyYXBoVGhlIFRyYW5zcG9ydCBVbmlvbiBjb21wdHJvbGxlcuKAmXMgb2ZmaWNlcyB3ZXJlIGJ1cmllZCB0aHJlZSBsZXZlbHMgZGVlcCBpbiB0aGUgdGhpY2sgd2FsbHMgb2YgTWVkaW5hIFN0YXRpb27igJlzIHJvdGF0aW5nIGRydW0uIEl0IG1hZGUgdGhlIENvcmlvbGlzIHNsaWdodGx5IGxlc3Mgbm90aWNlYWJsZSB0aGFuIGluc2lkZSB0aGUgZHJ1bSwgYnV0IGFsc28gbWVhbnQgdGhhdCB0aGV5IHdlcmUgaW5zaWRlIGdyYXkgbWV0YWwgY3ViZXMgd2l0aCBkZXNrcyBpbiB0aGVtIGFuZCBubyBzY3JlZW5zIHRvIGV2ZW4gZ2l2ZSB0aGUgaWxsdXNpb24gb2YgYSB3aW5kb3cuIEhvbGRlbiBjb3VsZG7igJl0IHNheSBmb3Igc3VyZSB3aHkgaXQgZmVsdCBtb3JlIGRlcHJlc3NpbmcgdGhhbiBzaXR0aW5nIGluIHRoZSBtZXRhbCBjdWJlcyBvZiBhIHNwYWNlc2hpcCBjb21wYXJ0bWVudCwgYnV0IGl0IHdhcy4gTmFvbWkgc2F0IGJlc2lkZSBoaW0sIHdhdGNoaW5nIHRoZSBuZXdzZmVlZHMgb24gaGVyIGhhbmQgdGVybWluYWwsIHVuYWZmZWN0ZWQgYnkgdGhlIGdyaW0gbG9jYWxlLiBUaGUgUm9jaW5hbnRlIHdhcyBkb2luZyBhIG1hbmRhdG9yeSBzZWN1cml0eSBjb250cmFjdC4gVGhlIGZpcnN0IGdpZyBzaW5jZSB0aGV54oCZZCBsZWZ0LiBNYXliZSB0aGF0IHdhcyB3aGF0IGhlIHdhcyByZWFjdGluZyB0by5wYXJhZ3JhcGjigJxGb3JtIDQwMTEtRCB0cmFuc2ZlcnMgeW91ciByZXRhaW5lciBhbmQgZnV0dXJlIGNvbnRyYWN0cyB0byBSb2JlcnRhIFcuIERyYXBlciwgYW5kIHN0YXRlcyB0aGF0IHNoZSBpcyBub3cgdGhlIGxlZ2FsIGNhcHRhaW4gb2YgdGhlIFJvY2luYW50ZSwgYW5kIHByZXNpZGVudCBvZiBSb2NpY29ycCwgYSBDZXJlcy1yZWdpc3RlcmVkIGNvcnBvcmF0ZSBlbnRpdHku4oCdRwAWBQmjCgmPAwMBAAAGAwYDBgMGAQEBCgB9AQA=";
  return {
    mutators: yjsMutators,
    authHandler,
    roomStartHandler: async (tx: WriteTransaction, _roomID: string) => {
      await yjsMutators.updateYJS(tx, {
        name: "one",
        id: crypto.randomUUID(),
        update: defaultDocText,
      });
    },
    logLevel: "debug",
  };
}

export { makeOptions as default };
