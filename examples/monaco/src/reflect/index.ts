import type {AuthHandler, ReflectServerOptions} from '@rocicorp/reflect/server';
import {mutators as yjsMutators, Mutators} from '@rocicorp/reflect-yjs';

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
  return {
    mutators: yjsMutators,
    authHandler,
    logLevel: 'debug',
  };
}

export {makeOptions as default};
