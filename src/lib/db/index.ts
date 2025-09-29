
import * as firebase from './firebase';
import { DatabaseProvider } from './types';

// This function determines which database provider to use.
const getDbProvider = (): DatabaseProvider => {
    // Default to Firebase mock provider
    return firebase;
}

const db = getDbProvider();

export { db };
